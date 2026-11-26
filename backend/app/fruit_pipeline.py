"""AgriVision-Fruit — pipeline ONNX en 2 étapes : détecteur de fruits / légumes (YOLO11, 1 classe) → classifieur (timm).

Remplace `YoloOnnx` côté backend : même méthode `predict(img, conf, iou)` et même schéma de sortie
(+ champs `top3`, `det_confidence`, `healthy`, `produce`, `state`). Dépendances : numpy, onnxruntime, Pillow.

    pipe = AgriVisionFruitPipeline("fruit_detector.onnx", "classifier.onnx", "pipeline_config.json")
    result = pipe.predict(PIL.Image.open("fruit.jpg"))
"""

import base64
import io
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw, ImageFont

PALETTE = ["#e6194b", "#3cb44b", "#f58231", "#4363d8", "#911eb4", "#46a6a6",
           "#f032e6", "#9a6324", "#800000", "#808000", "#000075", "#ff7f50"]  # fmt: skip


def _letterbox(img: Image.Image, size: Tuple[int, int]):
    h, w = size
    iw, ih = img.size
    r = min(w / iw, h / ih)
    nw, nh = int(round(iw * r)), int(round(ih * r))
    canvas = Image.new("RGB", (w, h), (114, 114, 114))
    px, py = (w - nw) / 2, (h - nh) / 2
    canvas.paste(img.resize((nw, nh), Image.BILINEAR), (int(round(px - 0.1)), int(round(py - 0.1))))
    arr = np.asarray(canvas, dtype=np.float32) / 255.0
    return np.ascontiguousarray(np.transpose(arr, (2, 0, 1))[None]), r, (px, py)


def _iou_one_to_many(box, boxes):
    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    a = (box[2] - box[0]) * (box[3] - box[1])
    b = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
    return inter / (a + b - inter + 1e-9)


def _nms(boxes, scores, iou_thr):
    order = np.argsort(-scores)
    keep = []
    while order.size:
        i = order[0]
        keep.append(int(i))
        if order.size == 1:
            break
        order = order[1:][_iou_one_to_many(boxes[i], boxes[order[1:]]) <= iou_thr]
    return keep


def _softmax(x, axis=-1):
    e = np.exp(x - x.max(axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)


def _session(path):
    avail = ort.get_available_providers()
    return ort.InferenceSession(
        str(path), providers=[p for p in ("CUDAExecutionProvider", "CPUExecutionProvider") if p in avail]
    )


class AgriVisionFruitPipeline:
    def __init__(self, det_path, cls_path, config_path):
        self.cfg = json.loads(Path(config_path).read_text(encoding="utf-8"))
        self.classes: List[str] = self.cfg["classes"]
        self.healthy = set(self.cfg.get("healthy_classes", []))
        self.det, self.cls = _session(det_path), _session(cls_path)
        self.det_in = self.det.get_inputs()[0].name
        self.cls_in = self.cls.get_inputs()[0].name
        hw = self.det.get_inputs()[0].shape
        self.det_hw = (
            int(hw[2]) if isinstance(hw[2], int) else int(self.cfg["det_imgsz"]),
            int(hw[3]) if isinstance(hw[3], int) else int(self.cfg["det_imgsz"]),
        )
        self.S = int(self.cfg["cls_imgsz"])
        self.mean = np.array(self.cfg["mean"], dtype=np.float32).reshape(1, 3, 1, 1)
        self.std = np.array(self.cfg["std"], dtype=np.float32).reshape(1, 3, 1, 1)
        self.temp = float(self.cfg.get("temperature", 1.0))
        self.pad = float(self.cfg.get("crop_pad", 0.10))
        self.alpha = float(self.cfg.get("alpha", 1.0))
        self.version = str(self.cfg.get("version", "fruit-two-stage"))
        self.conf_default = float(self.cfg.get("det_conf", 0.25))
        self.iou_default = float(self.cfg.get("det_iou", 0.5))

    # ── étape 1 : fruits / légumes
    def _detect(self, img: Image.Image, conf: float, iou: float, max_det: int = 30):
        tensor, ratio, pad = _letterbox(img, self.det_hw)
        out = self.det.run(None, {self.det_in: tensor})[0][0].T  # (N, 4+1)
        keep = out[:, 4] >= conf
        if not keep.any():
            return np.zeros((0, 4)), np.zeros(0)
        b, s = out[keep, :4], out[keep, 4]
        xyxy = np.stack([b[:, 0] - b[:, 2] / 2, b[:, 1] - b[:, 3] / 2, b[:, 0] + b[:, 2] / 2, b[:, 1] + b[:, 3] / 2], 1)
        xyxy[:, [0, 2]] = np.clip((xyxy[:, [0, 2]] - pad[0]) / ratio, 0, img.size[0])
        xyxy[:, [1, 3]] = np.clip((xyxy[:, [1, 3]] - pad[1]) / ratio, 0, img.size[1])
        k = _nms(xyxy, s, iou)[:max_det]
        return xyxy[k], s[k]

    # ── étape 2 : classification des recadrages
    def _classify(self, img: Image.Image, boxes: np.ndarray, tta: bool = False) -> np.ndarray:
        W, H = img.size
        xs = []
        for x0, y0, x1, y1 in boxes:
            w, h = x1 - x0, y1 - y0
            cx0, cy0 = int(max(0, x0 - self.pad * w)), int(max(0, y0 - self.pad * h))
            cx1, cy1 = int(min(W, x1 + self.pad * w)), int(min(H, y1 + self.pad * h))
            cr = img.crop((cx0, cy0, max(cx1, cx0 + 2), max(cy1, cy0 + 2))).resize((self.S, self.S), Image.BILINEAR)
            xs.append(np.transpose(np.asarray(cr, dtype=np.float32) / 255.0, (2, 0, 1)))
        x = (np.stack(xs) - self.mean) / self.std
        lg = self.cls.run(None, {self.cls_in: x.astype(np.float32)})[0]
        if tta:
            lg = (lg + self.cls.run(None, {self.cls_in: np.ascontiguousarray(x[..., ::-1]).astype(np.float32)})[0]) / 2
        return _softmax(lg / self.temp)

    def predict(
        self, img: Image.Image, conf: Optional[float] = None, iou: Optional[float] = None, tta: bool = False
    ) -> Dict:
        conf = self.conf_default if conf is None else conf
        iou = self.iou_default if iou is None else iou
        t0 = time.perf_counter()
        boxes, dconf = self._detect(img, conf, iou)
        fallback = len(boxes) == 0
        if fallback:  # aucun fruit détecté → on classe l'image entière
            boxes, dconf = np.array([[0, 0, img.size[0], img.size[1]]], dtype=np.float32), np.array([conf])
        probs = self._classify(img, boxes, tta)
        dets = []
        for b, dc, p in zip(boxes, dconf, probs):
            order = np.argsort(-p)[:3]
            k = int(order[0])
            dets.append(
                {
                    "class_id": k,
                    "label": self.classes[k],
                    "confidence": float(p[k]),
                    "det_confidence": float(dc),
                    "score": float(dc) ** self.alpha * float(p[k]),
                    "produce": self.classes[k].split("__")[0],
                    "state": self.classes[k].split("__")[-1],
                    "healthy": self.classes[k] in self.healthy,  # « healthy » = état « fresh »
                    "fallback_full_image": bool(fallback),
                    "top3": [
                        {"class_id": int(j), "label": self.classes[int(j)], "confidence": float(p[j])} for j in order
                    ],
                    "box": {"x1": float(b[0]), "y1": float(b[1]), "x2": float(b[2]), "y2": float(b[3])},
                }
            )
        dets.sort(key=lambda d: -d["score"])
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
            "server_latency_ms": round((time.perf_counter() - t0) * 1000, 2),
            "model_version": self.version,
        }

    def annotate(self, img: Image.Image, dets: List[Dict]) -> str:
        out = img.copy()
        draw = ImageDraw.Draw(out)
        font = ImageFont.load_default()
        lw = max(2, img.size[0] // 200)
        for d in dets:
            col = PALETTE[d["class_id"] % len(PALETTE)]
            b = d["box"]
            draw.rectangle([b["x1"], b["y1"], b["x2"], b["y2"]], outline=col, width=lw)
            txt = f"{d['label']} {d['confidence']:.0%}"
            tw = draw.textlength(txt, font=font)
            draw.rectangle([b["x1"], max(0, b["y1"] - 12), b["x1"] + tw + 6, max(12, b["y1"])], fill=col)
            draw.text((b["x1"] + 3, max(0, b["y1"] - 12)), txt, fill="white", font=font)
        buf = io.BytesIO()
        out.save(buf, format="JPEG", quality=88)
        return base64.b64encode(buf.getvalue()).decode()
