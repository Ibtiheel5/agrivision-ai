import cv2
import numpy as np


def letterbox(img_rgb, size=640, color=114):
    # Redimensionne en gardant le ratio, puis complète avec du gris (comme à l'entraînement YOLO).
    h, w = img_rgb.shape[:2]
    r = min(size / h, size / w)
    nh, nw = int(round(h * r)), int(round(w * r))
    resized = cv2.resize(img_rgb, (nw, nh), interpolation=cv2.INTER_LINEAR)
    top, left = (size - nh) // 2, (size - nw) // 2
    canvas = np.full((size, size, 3), color, dtype=np.uint8)
    canvas[top : top + nh, left : left + nw] = resized
    return canvas, r, left, top


def preprocess(img_rgb, size=640):
    canvas, r, left, top = letterbox(img_rgb, size)
    x = canvas.astype(np.float32) / 255.0
    x = np.transpose(x, (2, 0, 1))[None]
    return np.ascontiguousarray(x), (r, left, top)


def decode(output, meta, orig_hw, conf=0.25, iou=0.45, agnostic=False, topk=3, max_det=100):
    # output : sortie YOLOv8/11 de forme (1, 4 + nc, N) ; boîtes (cx, cy, w, h) en pixels 640.
    # Retourne une liste de dicts : cls, conf, box (x1, y1, x2, y2 dans l'image d'origine),
    # alternatives (top-k classes avec leurs scores indépendants, non normalisés).
    r, left, top = meta
    h0, w0 = orig_hw
    pred = np.asarray(output)[0].T
    scores = pred[:, 4:]
    best = scores.max(axis=1)
    keep = best >= conf
    if not keep.any():
        return []
    pred, scores, best = pred[keep], scores[keep], best[keep]
    cls = scores.argmax(axis=1)
    cx, cy, w, h = pred[:, 0], pred[:, 1], pred[:, 2], pred[:, 3]
    x1 = np.clip((cx - w / 2 - left) / r, 0, w0)
    y1 = np.clip((cy - h / 2 - top) / r, 0, h0)
    x2 = np.clip((cx + w / 2 - left) / r, 0, w0)
    y2 = np.clip((cy + h / 2 - top) / r, 0, h0)
    offset = np.zeros_like(cls, dtype=np.float32) if agnostic else cls.astype(np.float32) * 10000.0
    rects = np.stack([x1 + offset, y1, x2 - x1, y2 - y1], axis=1).astype(float).tolist()
    idx = cv2.dnn.NMSBoxes(rects, best.astype(float).tolist(), conf, iou)
    idx = np.array(idx).flatten()[:max_det]
    out = []
    for i in idx:
        order = np.argsort(-scores[i])[:topk]
        out.append(
            {
                "cls": int(cls[i]),
                "conf": float(best[i]),
                "box": [float(x1[i]), float(y1[i]), float(x2[i]), float(y2[i])],
                "alternatives": [(int(c), float(scores[i, c])) for c in order],
            }
        )
    return out
