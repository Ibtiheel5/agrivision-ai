"""Pipeline AgriVision v5 : detecteur de feuilles (YOLO ONNX, 1 classe) + classifieur plante/maladie (ONNX).

Meme interface que YoloOnnx (open_image / predict / annotate, attributs classes, gpu, version, metadata,
input_hw, conf_default, iou_default) : on peut l'utiliser a la place dans main.py.

Fichiers attendus dans MODEL_DIR :
  detector.onnx           detecteur de feuilles, sortie (1, 4+1, N)         [notebook AgriVision_v5_detector]
  detector_config.json    (optionnel) conf, iou, metriques
  classifier.onnx         entree RGB 0..1 (N,3,S,S), sortie probabilites calibrees  [notebook AgriVision_v5_train]
  classes.json            liste [{id, label, plant, disease}]
  inference_config.json   imgsz, accept (seuil de rejet), temperature, topk
  metrics.json            (optionnel) metriques du classifieur, affichees par /model/metadata
"""

import base64
import io
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw, ImageFont, ImageOps

from .inference import InvalidImageError, ModelNotLoadedError

logger = logging.getLogger("agrivision.pipeline")

PALETTE = [
    "#e6194b", "#3cb44b", "#f58231", "#4363d8", "#911eb4", "#46a6a6",
    "#f032e6", "#9a6324", "#800000", "#808000", "#000075", "#ff7f50",
]  # fmt: skip
UNKNOWN_COLOR = "#8a8f87"


def _letterbox(img: Image.Image, size: Tuple[int, int]) -> Tuple[np.ndarray, float, Tuple[float, float]]:
    h, w = size
    iw, ih = img.size
    r = min(w / iw, h / ih)
    nw, nh = int(round(iw * r)), int(round(ih * r))
    canvas = Image.new("RGB", (w, h), (114, 114, 114))
    px, py = (w - nw) / 2, (h - nh) / 2
    canvas.paste(img.resize((nw, nh), Image.BILINEAR), (int(round(px - 0.1)), int(round(py - 0.1))))
    arr = np.transpose(np.asarray(canvas, dtype=np.float32) / 255.0, (2, 0, 1))[None]
    return np.ascontiguousarray(arr), r, (px, py)


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_thr: float) -> List[int]:
    order = np.argsort(-scores)
    keep: List[int] = []
    while order.size:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        rest = order[1:]
        x1 = np.maximum(boxes[i, 0], boxes[rest, 0]); y1 = np.maximum(boxes[i, 1], boxes[rest, 1])
        x2 = np.minimum(boxes[i, 2], boxes[rest, 2]); y2 = np.minimum(boxes[i, 3], boxes[rest, 3])
        inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
        a = (boxes[i, 2] - boxes[i, 0]) * (boxes[i, 3] - boxes[i, 1])
        b = (boxes[rest, 2] - boxes[rest, 0]) * (boxes[rest, 3] - boxes[rest, 1])
        order = rest[inter / (a + b - inter + 1e-9) <= iou_thr]
    return keep


def _decode_leaves(output, ratio, pad, orig_size, conf_thr, iou_thr, max_det) -> List[Tuple[float, float, float, float, float]]:
    """Sortie YOLO (1, 4+nc, N) -> [(x1, y1, x2, y2, conf)] dans l'image d'origine (NMS sans distinction de classe)."""
    pred = np.asarray(output)[0].T
    conf = pred[:, 4:].max(axis=1)
    m = conf >= conf_thr
    if not m.any():
        return []
    b, s = pred[m, :4], conf[m]
    xyxy = np.stack([b[:, 0] - b[:, 2] / 2, b[:, 1] - b[:, 3] / 2, b[:, 0] + b[:, 2] / 2, b[:, 1] + b[:, 3] / 2], axis=1)
    xyxy[:, [0, 2]] = (xyxy[:, [0, 2]] - pad[0]) / ratio
    xyxy[:, [1, 3]] = (xyxy[:, [1, 3]] - pad[1]) / ratio
    w, h = orig_size
    xyxy[:, [0, 2]] = np.clip(xyxy[:, [0, 2]], 0, w)
    xyxy[:, [1, 3]] = np.clip(xyxy[:, [1, 3]], 0, h)
    keep = _nms(xyxy, s, iou_thr)[:max_det]
    return [(*map(float, xyxy[i]), float(s[i])) for i in keep]


def _providers() -> List[str]:
    avail = ort.get_available_providers()
    return [p for p in ("CUDAExecutionProvider", "CPUExecutionProvider") if p in avail]


class TwoStagePipeline:
    def __init__(self, model_dir: Path, max_leaves: int = 6, min_side_px: int = 24, crop_pad: float = 0.10):
        self.dir = Path(model_dir)
        need = ["detector.onnx", "classifier.onnx", "classes.json", "inference_config.json"]
        missing = [n for n in need if not (self.dir / n).exists()]
        if missing:
            raise ModelNotLoadedError(f"Fichiers manquants dans {self.dir} : {', '.join(missing)}")
        cfg = json.loads((self.dir / "inference_config.json").read_text(encoding="utf-8"))
        det_cfg = self._json("detector_config.json")
        self.info: List[Dict] = json.loads((self.dir / "classes.json").read_text(encoding="utf-8"))
        self.classes = [c["label"] for c in self.info]
        self.img = int(cfg["imgsz"])
        self.accept = float(cfg.get("accept", 0.5))
        self.topk = int(cfg.get("topk", 3))
        self.leaf_conf = float(det_cfg.get("conf", 0.25))
        self.det_iou = float(det_cfg.get("iou", 0.5))
        self.max_leaves, self.min_side_px, self.crop_pad = max_leaves, min_side_px, crop_pad

        prov = _providers()
        self.det = ort.InferenceSession(str(self.dir / "detector.onnx"), providers=prov)
        self.cls = ort.InferenceSession(str(self.dir / "classifier.onnx"), providers=prov)
        self.gpu = "CUDAExecutionProvider" in self.cls.get_providers()
        self.det_in, self.cls_in = self.det.get_inputs()[0].name, self.cls.get_inputs()[0].name
        h, w = self.det.get_inputs()[0].shape[2], self.det.get_inputs()[0].shape[3]
        self.input_hw = (int(h) if isinstance(h, int) else 640, int(w) if isinstance(w, int) else 640)
        n_out = self.cls.get_outputs()[0].shape[1]
        if isinstance(n_out, int) and n_out != len(self.classes):
            raise ModelNotLoadedError(f"Incoherence : classifieur a {n_out} sorties, classes.json en a {len(self.classes)}")

        metrics = self._json("metrics.json")
        test = metrics.get("test", {})
        self.version = f"{cfg.get('model', 'v5')}+leaf"
        self.conf_default, self.iou_default = self.accept, self.det_iou      # 'conf' de l'API = seuil de rejet du classifieur
        self.metadata = {
            "name": "AgriVision IA v5",
            "architecture": f"detecteur de feuilles (YOLO11) + classifieur ({cfg.get('backbone', 'CNN')})",
            "version": self.version,
            "validation_metrics": {k: float(v) for k, v in test.items() if isinstance(v, (int, float))},
            "extra": {
                "classes": str(len(self.classes)),
                "plantes": str(len({c["plant"] for c in self.info})),
                "seuil_rejet": str(self.accept),
                "detecteur": str(det_cfg.get("metrics", {}).get("mAP50", "n/a")),
            },
        }
        logger.info("Pipeline charge : %d classes, imgsz=%d, accept=%.2f, gpu=%s", len(self.classes), self.img, self.accept, self.gpu)

    def _json(self, name: str) -> Dict:
        p = self.dir / name
        try:
            return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
        except (OSError, json.JSONDecodeError):
            return {}

    @staticmethod
    def open_image(data: bytes) -> Image.Image:
        try:
            img = Image.open(io.BytesIO(data))
            img.verify()
            return ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        except Exception as exc:  # noqa: BLE001
            raise InvalidImageError("Le fichier n'est pas une image valide") from exc

    # ------------------------------------------------------------------ inference
    def _classify(self, imgs: List[Image.Image]) -> np.ndarray:
        batch = np.stack([
            np.transpose(np.asarray(im.resize((self.img, self.img), Image.BILINEAR), dtype=np.float32) / 255.0, (2, 0, 1))
            for im in imgs
        ])
        return self.cls.run(None, {self.cls_in: np.ascontiguousarray(batch)})[0]

    def _crop(self, img: Image.Image, box) -> Image.Image:
        x1, y1, x2, y2, _ = box
        pw, ph = (x2 - x1) * self.crop_pad, (y2 - y1) * self.crop_pad
        return img.crop((int(max(0, x1 - pw)), int(max(0, y1 - ph)), int(min(img.size[0], x2 + pw)), int(min(img.size[1], y2 + ph))))

    def _leaf(self, box, probs: np.ndarray, accept: float, source: str) -> Dict:
        order = np.argsort(-probs)[: self.topk]
        top = int(order[0])
        info = self.info[top]
        return {
            "box": {"x1": box[0], "y1": box[1], "x2": box[2], "y2": box[3]},
            "leaf_confidence": float(box[4]),
            "recognized": bool(probs[top] >= accept),
            "class_id": top,
            "label": info["label"],
            "plant": info["plant"],
            "disease": info["disease"],
            "confidence": float(probs[top]),
            "alternatives": [{"label": self.info[int(i)]["label"], "confidence": float(probs[int(i)])} for i in order],
            "source": source,
        }

    def predict(self, img: Image.Image, conf: Optional[float] = None, iou: Optional[float] = None) -> Dict:
        accept = self.accept if conf is None else float(conf)
        iou = self.det_iou if iou is None else float(iou)
        W, H = img.size
        t0 = time.perf_counter()

        tensor, ratio, pad = _letterbox(img, self.input_hw)
        out = self.det.run(None, {self.det_in: tensor})[0]
        boxes = [b for b in _decode_leaves(out, ratio, pad, (W, H), self.leaf_conf, iou, self.max_leaves)
                 if min(b[2] - b[0], b[3] - b[1]) >= self.min_side_px]

        probs = self._classify([self._crop(img, b) for b in boxes] + [img])   # le dernier = image entiere
        whole = probs[-1]
        if boxes:
            leaves = [self._leaf(b, p, accept, "crop") for b, p in zip(boxes, probs[:-1])]
            # une seule feuille mal cadree par le detecteur : l'image entiere peut etre plus parlante
            if len(leaves) == 1 and not leaves[0]["recognized"] and whole.max() >= accept:
                leaves[0] = {**self._leaf((*[leaves[0]["box"][k] for k in ("x1", "y1", "x2", "y2")], leaves[0]["leaf_confidence"]),
                                          whole, accept, "image")}
        else:                                                                  # aucune feuille detectee : on classe l'image entiere
            leaves = [self._leaf((0.0, 0.0, float(W), float(H), 0.0), whole, accept, "image")]
        latency = (time.perf_counter() - t0) * 1000

        dets, scores = [], {}
        for lf in leaves:
            if lf["recognized"]:
                dets.append({"class_id": lf["class_id"], "label": lf["label"], "confidence": lf["confidence"], "box": lf["box"],
                             "plant": lf["plant"], "disease": lf["disease"], "source": lf["source"]})
                scores[lf["label"]] = max(scores.get(lf["label"], 0.0), lf["confidence"])
        dets.sort(key=lambda d: -d["confidence"])
        return {
            "detections": dets,
            "class_scores": scores,
            "image_width": W,
            "image_height": H,
            "conf_threshold": accept,
            "iou_threshold": iou,
            "server_latency_ms": round(latency, 2),
            "model_version": self.version,
            "status": "ok" if dets else "non_reconnu",
            "leaves": leaves,
        }

    # ------------------------------------------------------------------ dessin
    def annotate(self, img: Image.Image, dets: List[Dict], leaves: Optional[List[Dict]] = None) -> str:
        out = img.copy()
        draw = ImageDraw.Draw(out)
        font = ImageFont.load_default()
        lw = max(2, img.size[0] // 200)
        items = leaves if leaves is not None else [{**d, "recognized": True} for d in dets]
        for d in items:
            b = d["box"]
            col = PALETTE[d["class_id"] % len(PALETTE)] if d["recognized"] else UNKNOWN_COLOR
            draw.rectangle([b["x1"], b["y1"], b["x2"], b["y2"]], outline=col, width=lw)
            txt = f"{d['label']} {d['confidence']:.0%}" if d["recognized"] else f"non reconnu ({d['confidence']:.0%})"
            tw = draw.textlength(txt, font=font)
            draw.rectangle([b["x1"], max(0, b["y1"] - 12), b["x1"] + tw + 6, max(12, b["y1"])], fill=col)
            draw.text((b["x1"] + 3, max(0, b["y1"] - 12)), txt, fill="white", font=font)
        buf = io.BytesIO()
        out.save(buf, format="JPEG", quality=88)
        return base64.b64encode(buf.getvalue()).decode()
