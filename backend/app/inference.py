"""Inférence ONNX Runtime pour un modèle YOLO Ultralytics (YOLOv8 / YOLO11, détection) :
prétraitement, NMS, conversion des coordonnées.

Format de sortie attendu du modèle exporté par Ultralytics : (1, 4 + nc, N), avec 4 = cx, cy, w, h
exprimés en pixels de l'image d'entrée (letterbox) puis nc scores de classe
(pas de score d'objectness).
"""

from __future__ import annotations

import colorsys
import hashlib
import io
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Sequence

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw, ImageFont, ImageOps

PAD_VALUE = 114  # gris utilisé par Ultralytics pour le letterbox
CLASS_OFFSET = 4096.0  # décalage de boîtes par classe pour un NMS « class-aware »


@dataclass
class Prediction:
    class_id: int
    label: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float


@dataclass
class Top3Prediction:
    """Une boîte avec ses meilleures classes (id, libellé, score) et un statut (ok / incertain)."""

    x1: float
    y1: float
    x2: float
    y2: float
    candidates: list  # [(class_id, label, score), ...] triés par score décroissant
    margin: float  # écart de score entre la 1re et la 2e classe
    status: str  # "ok" ou "incertain"


# ----------------------------------------------------------------------------- images
def load_image(data: bytes) -> Image.Image:
    """Décode des octets en image RGB (EXIF corrigé). Lève une exception si invalide."""
    img = Image.open(io.BytesIO(data))
    img.load()  # force le décodage complet (détecte les fichiers tronqués)
    return ImageOps.exif_transpose(img).convert("RGB")


def load_classes(path: Path | str) -> list[str]:
    return [
        line.strip() for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()
    ]


# ----------------------------------------------------------------------------- prétraitement
def letterbox(img: Image.Image, size: tuple[int, int]) -> tuple[Image.Image, float, int, int]:
    """Redimensionne en gardant le rapport et centre sur un canevas gris (hauteur, largeur) = size.

    Retourne (image, ratio, pad_x, pad_y)."""
    th, tw = size
    w0, h0 = img.size
    r = min(tw / w0, th / h0)
    nw, nh = max(1, round(w0 * r)), max(1, round(h0 * r))
    resized = img.resize((nw, nh), Image.BILINEAR)
    canvas = Image.new("RGB", (tw, th), (PAD_VALUE,) * 3)
    px, py = (tw - nw) // 2, (th - nh) // 2
    canvas.paste(resized, (px, py))
    return canvas, r, px, py


def to_tensor(img: Image.Image) -> np.ndarray:
    """RGB (H, W, 3) uint8 -> float32 (1, 3, H, W) dans [0, 1]."""
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return np.ascontiguousarray(arr.transpose(2, 0, 1)[None])


# ----------------------------------------------------------------------------- post-traitement
def nms(boxes: np.ndarray, scores: np.ndarray, iou_thr: float, max_det: int = 300) -> np.ndarray:
    """NMS glouton sur des boîtes xyxy. Retourne les indices conservés (par score décroissant)."""
    if len(boxes) == 0:
        return np.zeros(0, dtype=int)
    x1, y1, x2, y2 = boxes.T
    areas = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
    order = scores.argsort()[::-1]
    keep: list[int] = []
    while order.size and len(keep) < max_det:
        i = order[0]
        keep.append(int(i))
        rest = order[1:]
        if rest.size == 0:
            break
        w = np.maximum(0, np.minimum(x2[i], x2[rest]) - np.maximum(x1[i], x1[rest]))
        h = np.maximum(0, np.minimum(y2[i], y2[rest]) - np.maximum(y1[i], y1[rest]))
        inter = w * h
        iou = inter / (areas[i] + areas[rest] - inter + 1e-9)
        order = rest[iou <= iou_thr]
    return np.array(keep, dtype=int)


def decode(
    output: np.ndarray,
    classes: Sequence[str],
    conf_thr: float,
    iou_thr: float,
    ratio: float,
    pad_x: int,
    pad_y: int,
    orig_w: int,
    orig_h: int,
    max_det: int = 100,
) -> list[Prediction]:
    """Sortie brute du modèle -> prédictions dans le repère de l'image d'origine."""
    nc = len(classes)
    p = output[0] if output.ndim == 3 else output
    if p.shape[0] == 4 + nc:
        p = p.T  # (N, 4 + nc)
    if p.shape[1] != 4 + nc:
        raise ValueError(f"Sortie inattendue {output.shape} pour {nc} classes")

    cls_scores = p[:, 4:]
    scores = cls_scores.max(axis=1)
    keep = scores >= conf_thr
    if not keep.any():
        return []
    p, scores, cids = p[keep], scores[keep], cls_scores[keep].argmax(axis=1)

    cx, cy, w, h = p[:, 0], p[:, 1], p[:, 2], p[:, 3]
    xyxy = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=1)
    idx = nms(xyxy + cids[:, None].astype(np.float32) * CLASS_OFFSET, scores, iou_thr, max_det)

    out: list[Prediction] = []
    for i in idx:
        x1, y1, x2, y2 = xyxy[i]
        x1, x2 = np.clip([(x1 - pad_x) / ratio, (x2 - pad_x) / ratio], 0, orig_w)
        y1, y2 = np.clip([(y1 - pad_y) / ratio, (y2 - pad_y) / ratio], 0, orig_h)
        if x2 - x1 < 1 or y2 - y1 < 1:
            continue
        c = int(cids[i])
        out.append(
            Prediction(
                c,
                classes[c],
                float(scores[i]),
                float(x1),
                float(y1),
                float(x2),
                float(y2),
            )
        )
    return out


def decode_top3(
    output: np.ndarray,
    classes: Sequence[str],
    conf_min: float,
    iou_thr: float,
    ratio: float,
    pad_x: int,
    pad_y: int,
    orig_w: int,
    orig_h: int,
    topk: int = 3,
    accept: float = 0.30,
    margin_min: float = 0.10,
    max_det: int = 20,
) -> list[Top3Prediction]:
    """Comme decode(), mais garde les `topk` meilleures classes par boîte et un statut de fiabilité.

    NMS SANS distinction de classe (une zone = une boîte) ; les scores YOLO sont des sigmoïdes
    indépendantes, pas des probabilités qui somment à 1. Une boîte est « ok » si le meilleur
    score >= accept ET l'écart avec la 2e classe >= margin_min, sinon « incertain »."""
    nc = len(classes)
    p = output[0] if output.ndim == 3 else output
    if p.shape[0] == 4 + nc:
        p = p.T
    if p.shape[1] != 4 + nc:
        raise ValueError(f"Sortie inattendue {output.shape} pour {nc} classes")
    scores_all = p[:, 4:]
    best = scores_all.max(axis=1)
    keep = best >= conf_min
    if not keep.any():
        return []
    p, scores_all, best = p[keep], scores_all[keep], best[keep]
    cx, cy, w, h = p[:, 0], p[:, 1], p[:, 2], p[:, 3]
    xyxy = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=1)
    idx = nms(xyxy, best, iou_thr, max_det)

    out: list[Top3Prediction] = []
    for i in idx:
        x1, y1, x2, y2 = xyxy[i]
        x1, x2 = np.clip([(x1 - pad_x) / ratio, (x2 - pad_x) / ratio], 0, orig_w)
        y1, y2 = np.clip([(y1 - pad_y) / ratio, (y2 - pad_y) / ratio], 0, orig_h)
        if x2 - x1 < 1 or y2 - y1 < 1:
            continue
        s = scores_all[i]
        order = np.argsort(-s)[:topk]
        cands = [(int(c), classes[int(c)], float(s[c])) for c in order]
        margin = float(s[order[0]] - s[order[1]]) if len(order) > 1 else 1.0
        ok = cands[0][2] >= accept and margin >= margin_min
        out.append(
            Top3Prediction(
                float(x1),
                float(y1),
                float(x2),
                float(y2),
                cands,
                margin,
                "ok" if ok else "incertain",
            )
        )
    return out


def overall_status(preds: Sequence[Top3Prediction]) -> str:
    """Statut global : "aucune_detection", "ok" (toutes fiables) ou "incertain" (>= 1 douteuse)."""
    if not preds:
        return "aucune_detection"
    return "ok" if all(p.status == "ok" for p in preds) else "incertain"


# ----------------------------------------------------------------------------- détecteur
class Detector:
    """Enveloppe d'une session ONNX Runtime, chargée une seule fois au démarrage de l'API."""

    def __init__(
        self,
        model_path: Path | str,
        classes: Sequence[str],
        providers: Optional[list[str]] = None,
    ):
        if not classes:
            raise ValueError("Liste de classes vide")
        self.classes = list(classes)
        avail = ort.get_available_providers()
        self.providers = providers or [
            p for p in ("CUDAExecutionProvider", "CPUExecutionProvider") if p in avail
        ]
        self.session = ort.InferenceSession(str(model_path), providers=self.providers)
        inp = self.session.get_inputs()[0]
        self.input_name = inp.name
        h, w = inp.shape[2], inp.shape[3]
        self.size = (h if isinstance(h, int) else 640, w if isinstance(w, int) else 640)

        out_shape = self.session.get_outputs()[
            0
        ].shape  # ex. [1, 33, 8400] pour 29 classes (4 + nc)
        if isinstance(out_shape[1], int) and out_shape[1] != 4 + len(self.classes):
            raise ValueError(
                f"Le modèle prédit {out_shape[1] - 4} classes mais classes.txt en contient "
                f"{len(self.classes)} : "
                "fichiers de modèle et de classes désynchronisés."
            )
        self.warmup()

    def warmup(self, n: int = 2) -> None:
        """Inférences à blanc : la 1re requête réelle ne paie pas l'initialisation d'ORT."""
        x = np.zeros((1, 3, *self.size), dtype=np.float32)
        for _ in range(n):
            self.session.run(None, {self.input_name: x})

    @property
    def gpu(self) -> bool:
        return "CUDAExecutionProvider" in self.session.get_providers()

    def predict(
        self,
        img: Image.Image,
        conf: float = 0.25,
        iou: float = 0.45,
        max_det: int = 100,
    ) -> tuple[list[Prediction], dict[str, float]]:
        t0 = time.perf_counter()
        canvas, ratio, px, py = letterbox(img, self.size)
        x = to_tensor(canvas)
        t1 = time.perf_counter()
        raw = self.session.run(None, {self.input_name: x})[0]
        t2 = time.perf_counter()
        preds = decode(raw, self.classes, conf, iou, ratio, px, py, img.width, img.height, max_det)
        t3 = time.perf_counter()
        return preds, {
            "preprocess_ms": (t1 - t0) * 1000,
            "inference_ms": (t2 - t1) * 1000,
            "postprocess_ms": (t3 - t2) * 1000,
            "total_ms": (t3 - t0) * 1000,
        }

    def predict_top3(
        self,
        img: Image.Image,
        conf_min: float = 0.10,
        iou: float = 0.45,
        accept: float = 0.30,
        margin_min: float = 0.10,
        topk: int = 3,
        max_det: int = 20,
    ) -> tuple[list[Top3Prediction], dict[str, float]]:
        """Top-3 par boîte + statut (ok / incertain), même session que predict()."""
        t0 = time.perf_counter()
        canvas, ratio, px, py = letterbox(img, self.size)
        x = to_tensor(canvas)
        t1 = time.perf_counter()
        raw = self.session.run(None, {self.input_name: x})[0]
        t2 = time.perf_counter()
        preds = decode_top3(
            raw,
            self.classes,
            conf_min,
            iou,
            ratio,
            px,
            py,
            img.width,
            img.height,
            topk,
            accept,
            margin_min,
            max_det,
        )
        t3 = time.perf_counter()
        return preds, {
            "preprocess_ms": (t1 - t0) * 1000,
            "inference_ms": (t2 - t1) * 1000,
            "postprocess_ms": (t3 - t2) * 1000,
            "total_ms": (t3 - t0) * 1000,
        }


# ----------------------------------------------------------------------------- visualisation
def class_color(class_id: int) -> tuple[int, int, int]:
    """Couleur stable par classe."""
    hue = (int(hashlib.md5(str(class_id).encode()).hexdigest(), 16) % 360) / 360
    r, g, b = colorsys.hsv_to_rgb(hue, 0.75, 0.95)
    return int(r * 255), int(g * 255), int(b * 255)


def draw_detections(img: Image.Image, preds: Sequence[Prediction]) -> Image.Image:
    out = img.copy()
    d = ImageDraw.Draw(out)
    lw = max(2, round(min(out.size) / 300))
    try:
        font = ImageFont.load_default(size=max(12, round(min(out.size) / 35)))
    except TypeError:  # Pillow < 10.1
        font = ImageFont.load_default()
    for p in preds:
        col = class_color(p.class_id)
        d.rectangle([p.x1, p.y1, p.x2, p.y2], outline=col, width=lw)
        text = f"{p.label} {p.confidence:.2f}"
        l, t, r, b = d.textbbox((0, 0), text, font=font)
        ty = max(0, p.y1 - (b - t) - 4)
        d.rectangle([p.x1, ty, p.x1 + (r - l) + 6, ty + (b - t) + 4], fill=col)
        d.text((p.x1 + 3, ty + 1), text, fill=(255, 255, 255), font=font)
    return out
