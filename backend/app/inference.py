"""Wrapper ONNX Runtime pour un modèle YOLO (Ultralytics) exporté en ONNX.

Sortie attendue du modèle : tenseur (1, 4 + nc, N) avec boîtes xywh en pixels
de l'image d'entrée (letterbox), scores de classes déjà sigmoïdés (export
Ultralytics standard, sans NMS intégré).
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
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger("agrivision.inference")

PALETTE = [
    "#e6194b", "#3cb44b", "#f58231", "#4363d8", "#911eb4", "#46a6a6",
    "#f032e6", "#9a6324", "#800000", "#808000", "#000075", "#ff7f50",
]  # fmt: skip


class ModelNotLoadedError(RuntimeError):
    pass


class InvalidImageError(ValueError):
    pass


def color_for(class_id: int) -> str:
    return PALETTE[class_id % len(PALETTE)]


def letterbox(img: Image.Image, size: Tuple[int, int]) -> Tuple[np.ndarray, float, Tuple[float, float]]:
    """Redimensionne en conservant le ratio + padding gris (114). size=(h, w)."""
    h, w = size
    iw, ih = img.size
    r = min(w / iw, h / ih)
    nw, nh = int(round(iw * r)), int(round(ih * r))
    resized = img.resize((nw, nh), Image.BILINEAR)
    canvas = Image.new("RGB", (w, h), (114, 114, 114))
    px, py = (w - nw) / 2, (h - nh) / 2
    canvas.paste(resized, (int(round(px - 0.1)), int(round(py - 0.1))))
    arr = np.asarray(canvas, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))[None]
    return np.ascontiguousarray(arr), r, (px, py)


def iou_one_to_many(box: np.ndarray, boxes: np.ndarray) -> np.ndarray:
    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    a = (box[2] - box[0]) * (box[3] - box[1])
    b = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    return inter / (a + b - inter + 1e-9)


def nms(boxes: np.ndarray, scores: np.ndarray, classes: np.ndarray, iou_thr: float) -> List[int]:
    """NMS par classe (class-aware)."""
    keep: List[int] = []
    for c in np.unique(classes):
        idx = np.where(classes == c)[0]
        order = idx[np.argsort(-scores[idx])]
        while order.size:
            i = order[0]
            keep.append(int(i))
            if order.size == 1:
                break
            ious = iou_one_to_many(boxes[i], boxes[order[1:]])
            order = order[1:][ious <= iou_thr]
    return sorted(keep, key=lambda i: -scores[i])


def postprocess(
    output: np.ndarray,
    ratio: float,
    pad: Tuple[float, float],
    orig_size: Tuple[int, int],
    conf_thr: float,
    iou_thr: float,
    max_det: int = 100,
) -> List[Dict]:
    pred = output[0].T  # (4+nc, N) -> (N, 4+nc), layout Ultralytics
    boxes_xywh, cls_scores = pred[:, :4], pred[:, 4:]
    class_ids = cls_scores.argmax(1)
    confs = cls_scores.max(1)
    mask = confs >= conf_thr
    if not mask.any():
        return []
    b, s, c = boxes_xywh[mask], confs[mask], class_ids[mask]
    xyxy = np.stack(
        [b[:, 0] - b[:, 2] / 2, b[:, 1] - b[:, 3] / 2, b[:, 0] + b[:, 2] / 2, b[:, 1] + b[:, 3] / 2],
        axis=1,
    )
    xyxy[:, [0, 2]] = (xyxy[:, [0, 2]] - pad[0]) / ratio
    xyxy[:, [1, 3]] = (xyxy[:, [1, 3]] - pad[1]) / ratio
    w, h = orig_size
    xyxy[:, [0, 2]] = np.clip(xyxy[:, [0, 2]], 0, w)
    xyxy[:, [1, 3]] = np.clip(xyxy[:, [1, 3]], 0, h)
    keep = nms(xyxy, s, c, iou_thr)[:max_det]
    return [{"class_id": int(c[i]), "confidence": float(s[i]), "box": [float(v) for v in xyxy[i]]} for i in keep]


class YoloOnnx:
    def __init__(self, model_path: Path, classes_path: Path, metadata_path: Optional[Path] = None):
        self.model_path, self.classes_path = Path(model_path), Path(classes_path)
        self.metadata: Dict = {}
        if metadata_path and Path(metadata_path).exists():
            self.metadata = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
        if not self.model_path.exists():
            raise ModelNotLoadedError(f"Modèle introuvable : {self.model_path}")
        if not self.classes_path.exists():
            raise ModelNotLoadedError(f"classes.txt introuvable : {self.classes_path}")
        self.classes = [ln.strip() for ln in self.classes_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
        available = ort.get_available_providers()
        providers = [p for p in ("CUDAExecutionProvider", "CPUExecutionProvider") if p in available]
        self.session = ort.InferenceSession(str(self.model_path), providers=providers)
        self.gpu = "CUDAExecutionProvider" in self.session.get_providers()
        inp = self.session.get_inputs()[0]
        self.input_name = inp.name
        h, w = inp.shape[2], inp.shape[3]
        self.input_hw = (int(h) if isinstance(h, int) else 640, int(w) if isinstance(w, int) else 640)
        n_out = self.session.get_outputs()[0].shape[1]
        if isinstance(n_out, int) and n_out - 4 != len(self.classes):
            raise ModelNotLoadedError(
                f"Incohérence : le modèle a {n_out - 4} classes, classes.txt en a {len(self.classes)}"
            )
        self.version = str(self.metadata.get("version", "unversioned"))
        self.conf_default = float(self.metadata.get("conf_threshold", 0.30))
        self.iou_default = float(self.metadata.get("iou_threshold", 0.45))
        logger.info("Modèle chargé : %s (%d classes, gpu=%s)", self.model_path.name, len(self.classes), self.gpu)

    @staticmethod
    def open_image(data: bytes) -> Image.Image:
        try:
            img = Image.open(io.BytesIO(data))
            img.verify()
            img = Image.open(io.BytesIO(data))
            from PIL import ImageOps

            return ImageOps.exif_transpose(img).convert("RGB")
        except Exception as exc:  # noqa: BLE001
            raise InvalidImageError("Le fichier n'est pas une image valide") from exc

    def predict(self, img: Image.Image, conf: Optional[float] = None, iou: Optional[float] = None) -> Dict:
        conf = self.conf_default if conf is None else conf
        iou = self.iou_default if iou is None else iou
        tensor, ratio, pad = letterbox(img, self.input_hw)
        t0 = time.perf_counter()
        out = self.session.run(None, {self.input_name: tensor})[0]
        dets = postprocess(out, ratio, pad, img.size, conf, iou)
        latency = (time.perf_counter() - t0) * 1000
        for d in dets:
            d["label"] = self.classes[d["class_id"]]
            x1, y1, x2, y2 = d["box"]
            d["box"] = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
        scores: Dict[str, float] = {}
        for d in dets:
            scores[d["label"]] = max(scores.get(d["label"], 0.0), d["confidence"])
        return {
            "detections": dets,
            "class_scores": scores,
            "image_width": img.size[0],
            "image_height": img.size[1],
            "conf_threshold": conf,
            "iou_threshold": iou,
            "server_latency_ms": round(latency, 2),
            "model_version": self.version,
        }

    def annotate(self, img: Image.Image, dets: List[Dict]) -> str:
        out = img.copy()
        draw = ImageDraw.Draw(out)
        font = ImageFont.load_default()
        lw = max(2, img.size[0] // 200)
        for d in dets:
            col = color_for(d["class_id"])
            b = d["box"]
            x1, y1, x2, y2 = b["x1"], b["y1"], b["x2"], b["y2"]
            draw.rectangle([x1, y1, x2, y2], outline=col, width=lw)
            txt = f"{d['label']} {d['confidence']:.0%}"
            tw = draw.textlength(txt, font=font)
            draw.rectangle([x1, max(0, y1 - 12), x1 + tw + 6, max(12, y1)], fill=col)
            draw.text((x1 + 3, max(0, y1 - 12)), txt, fill="white", font=font)
        buf = io.BytesIO()
        out.save(buf, format="JPEG", quality=88)
        return base64.b64encode(buf.getvalue()).decode()
