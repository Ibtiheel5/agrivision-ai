"""AgriVision : inférence ONNX avec top-3 par détection et refus explicite ("incertain").

Aucun réentraînement : on relit directement les scores de classes du modèle
(sortie brute YOLO11 (1, 4+nc, 8400)) au lieu de ne garder que la meilleure classe.
Les scores YOLO sont des sigmoïdes indépendantes : ce ne sont PAS des probabilités
qui somment à 1. Sers-t'en pour classer et pour l'écart entre 1re et 2e classe.
"""
from pathlib import Path
import cv2
import numpy as np


def letterbox(img, size=640, color=114):
    h, w = img.shape[:2]
    r = min(size / h, size / w)
    nh, nw = round(h * r), round(w * r)
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LINEAR)
    top, left = (size - nh) // 2, (size - nw) // 2
    canvas = np.full((size, size, 3), color, np.uint8)
    canvas[top:top + nh, left:left + nw] = resized
    return canvas, r, left, top


def postprocess(out, r, left, top, orig_hw, classes, conf_min=0.10, iou=0.45,
                topk=3, accept=0.30, margin_min=0.10, max_det=20):
    """out : sortie brute du modèle, shape (1, 4+nc, N). Retourne une liste de détections."""
    pred = out[0].T if out.shape[1] < out.shape[2] else out[0]          # (N, 4+nc)
    xywh, scores = pred[:, :4], pred[:, 4:]
    assert scores.shape[1] == len(classes), f"{scores.shape[1]} scores pour {len(classes)} classes"
    best = scores.max(1)
    idx = np.where(best >= conf_min)[0]
    if idx.size == 0:
        return []
    xywh, scores, best = xywh[idx], scores[idx], best[idx]
    tl = np.stack([xywh[:, 0] - xywh[:, 2] / 2, xywh[:, 1] - xywh[:, 3] / 2, xywh[:, 2], xywh[:, 3]], 1)
    keep = cv2.dnn.NMSBoxes(tl.tolist(), best.tolist(), conf_min, iou)   # NMS sans distinction de classe
    keep = np.array(keep, dtype=int).reshape(-1)[:max_det]
    H, W = orig_hw
    dets = []
    for k in keep:
        s = scores[k]
        order = np.argsort(-s)[:topk]
        cands = [dict(classe=classes[c], score=round(float(s[c]), 3)) for c in order]
        gap = float(s[order[0]] - s[order[1]]) if len(order) > 1 else 1.0
        x1 = float(np.clip((tl[k, 0] - left) / r, 0, W)); y1 = float(np.clip((tl[k, 1] - top) / r, 0, H))
        x2 = float(np.clip((tl[k, 0] + tl[k, 2] - left) / r, 0, W)); y2 = float(np.clip((tl[k, 1] + tl[k, 3] - top) / r, 0, H))
        sure = cands[0]["score"] >= accept and gap >= margin_min
        dets.append(dict(box=[round(x1), round(y1), round(x2), round(y2)], candidats=cands,
                         ecart=round(gap, 3), statut="ok" if sure else "incertain"))
    return dets


class Detector:
    def __init__(self, onnx_path, classes, imgsz=640, **post):
        import onnxruntime as ort
        self.sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        self.inp = self.sess.get_inputs()[0].name
        self.classes, self.imgsz, self.post = list(classes), imgsz, post

    def detect(self, img_bgr):
        lb, r, left, top = letterbox(img_bgr, self.imgsz)
        x = lb[:, :, ::-1].transpose(2, 0, 1)[None].astype(np.float32) / 255.0
        out = self.sess.run(None, {self.inp: np.ascontiguousarray(x)})[0]
        return postprocess(out, r, left, top, img_bgr.shape[:2], self.classes, **self.post)

    def analyse(self, img_bgr):
        dets = self.detect(img_bgr)
        if not dets:
            return dict(statut="aucune_detection", detections=[])
        statut = "ok" if all(d["statut"] == "ok" for d in dets) else "incertain"
        return dict(statut=statut, detections=dets)


def _iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter + 1e-9)


def calibrate(det, images_dir, labels_dir, classes, iou_match=0.5):
    """À lancer sur la VALIDATION (jamais le test). Pour chaque boîte vérité retrouvée par le
    modèle, note score, écart 1re-2e classe, et si la 1re/top-3 est juste. Puis balaie les seuils :
    couverture = part des réponses affichées, précision = part juste parmi elles."""
    import pandas as pd
    rows, missed = [], 0
    for p in sorted(Path(images_dir).glob("*.*")):
        img = cv2.imread(str(p)); lab = Path(labels_dir) / f"{p.stem}.txt"
        if img is None or not lab.exists():
            continue
        H, W = img.shape[:2]; dets = det.detect(img)
        for line in lab.read_text().splitlines():
            v = line.split()
            if len(v) < 5:
                continue
            c = int(v[0]); cx, cy, bw, bh = (float(t) for t in v[1:5])
            gt = [(cx - bw / 2) * W, (cy - bh / 2) * H, (cx + bw / 2) * W, (cy + bh / 2) * H]
            ious = [_iou(gt, d["box"]) for d in dets]
            if not ious or max(ious) < iou_match:
                missed += 1; continue
            d = dets[int(np.argmax(ious))]; names3 = [x["classe"] for x in d["candidats"]]
            rows.append(dict(score=d["candidats"][0]["score"], ecart=d["ecart"],
                             ok1=names3[0] == classes[c], ok3=classes[c] in names3))
    df = pd.DataFrame(rows)
    print(f"{len(df)} boîtes retrouvées, {missed} non détectées | top-1 : {df.ok1.mean():.0%} | top-3 : {df.ok3.mean():.0%}")
    tab = []
    for a in (0.15, 0.20, 0.25, 0.30, 0.40, 0.50):
        for m in (0.0, 0.05, 0.10, 0.20):
            s = df[(df.score >= a) & (df.ecart >= m)]
            tab.append(dict(accept=a, ecart_min=m, couverture=round(len(s) / len(df), 2),
                            precision_top1=round(s.ok1.mean(), 2) if len(s) else None))
    return pd.DataFrame(tab)
