import os
import time

import cv2
import numpy as np
import onnxruntime as ort

from app.schemas import Detection


class Detector:
    # Wrapper ONNX Runtime pour un modèle YOLOv8 exporté (sortie 1 x (4+nc) x N).
    def __init__(self, path, classes, version="1", imgsz=640, conf=0.25, iou=0.45):
        self.classes, self.version = classes, version
        self.imgsz, self.conf, self.iou = imgsz, conf, iou
        self.session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    @property
    def gpu(self):
        return "CUDAExecutionProvider" in ort.get_available_providers()

    def predict(self, rgb: np.ndarray):
        # NB : redimensionnement simple (sans letterbox) : à améliorer par l'équipe.
        h, w = rgb.shape[:2]
        x = cv2.resize(rgb, (self.imgsz, self.imgsz)).astype(np.float32) / 255.0
        x = np.transpose(x, (2, 0, 1))[None]
        t0 = time.perf_counter()
        out = self.session.run(None, {self.input_name: x})[0][0].T
        ms = (time.perf_counter() - t0) * 1000
        boxes, scores = out[:, :4], out[:, 4:]
        ids = scores.argmax(1)
        conf = scores.max(1)
        keep = conf > self.conf
        boxes, conf, ids = boxes[keep], conf[keep], ids[keep]
        xyxy = np.stack(
            [
                boxes[:, 0] - boxes[:, 2] / 2,
                boxes[:, 1] - boxes[:, 3] / 2,
                boxes[:, 2],
                boxes[:, 3],
            ],
            1,
        )
        sx, sy = w / self.imgsz, h / self.imgsz
        rects = [
            [float(a * sx), float(b * sy), float(c * sx), float(d * sy)] for a, b, c, d in xyxy
        ]
        idx = cv2.dnn.NMSBoxes(rects, conf.tolist(), self.conf, self.iou)
        dets = []
        for i in np.array(idx).flatten():
            x1, y1, bw, bh = rects[i]
            dets.append(
                Detection(
                    label=self.classes[int(ids[i])],
                    confidence=float(conf[i]),
                    box=[x1, y1, x1 + bw, y1 + bh],
                )
            )
        return dets, ms


def load_detector():
    path = os.getenv("MODEL_PATH", "/models/best.onnx")
    if not os.path.exists(path):
        return None
    classes = os.getenv("CLASSES", "").split(",") if os.getenv("CLASSES") else []
    return Detector(path, classes, os.getenv("MODEL_VERSION", "1"))
