import io

import pytest
from PIL import Image

from app import main
from app.inference import letterbox, nms, postprocess
import numpy as np


def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["model_loaded"] is True
    assert body["inference_engine"] == "onnxruntime"
    assert body["model_version"] == "test-1"


def test_metadata(client):
    r = client.get("/model/metadata")
    assert r.status_code == 200
    body = r.json()
    assert body["num_classes"] == 3
    assert body["class_names"][2] == "Corn rust"
    assert body["validation_metrics"]["mAP50"] == 0.5


def test_metadata_includes_local_benchmark(client, monkeypatch, tmp_path):
    benchmark_path = tmp_path / "benchmark.json"
    benchmark_path.write_text('{"p50_ms": 20.0, "p95_ms": 35.0}', encoding="utf-8")
    monkeypatch.setattr(main, "BENCHMARK_PATH", benchmark_path)

    response = client.get("/model/metadata")

    assert response.status_code == 200
    benchmark = response.json()["benchmark_cpu"]["onnx_fp32_cpu"]
    assert benchmark["p50_ms"] == 20.0
    assert benchmark["p95_ms"] == 35.0
    assert benchmark["fps"] == 50.0


def test_predict_returns_single_nms_detection(client, jpeg_bytes):
    r = client.post("/predict", files={"file": ("leaf.jpg", jpeg_bytes, "image/jpeg")})
    assert r.status_code == 200
    body = r.json()
    assert len(body["detections"]) == 1  # le doublon est supprimé par NMS
    det = body["detections"][0]
    assert det["label"] == "Corn rust"
    assert det["confidence"] == pytest.approx(0.9, abs=1e-3)
    # image 640x480 -> padding vertical 80 : box attendue (220,140,420,340)
    b = det["box"]
    assert (b["x1"], b["y1"], b["x2"], b["y2"]) == pytest.approx((220, 140, 420, 340), abs=1.5)
    assert body["server_latency_ms"] >= 0
    assert body["class_scores"] == {"Corn rust": pytest.approx(0.9, abs=1e-3)}


def test_predict_conf_threshold_filters(client, jpeg_bytes):
    r = client.post("/predict?conf=0.95", files={"file": ("a.jpg", jpeg_bytes, "image/jpeg")})
    assert r.status_code == 200 and r.json()["detections"] == []


def test_predict_invalid_file_400(client):
    r = client.post("/predict", files={"file": ("x.txt", b"not an image", "text/plain")})
    assert r.status_code == 400


def test_predict_missing_file_422(client):
    assert client.post("/predict").status_code == 422


def test_predict_too_large_413(client, monkeypatch):
    monkeypatch.setattr(main, "MAX_UPLOAD_MB", 0)
    r = client.post("/predict", files={"file": ("a.jpg", b"x" * 10, "image/jpeg")})
    assert r.status_code == 413


def test_visualize_returns_image(client, jpeg_bytes):
    r = client.post("/predict/visualize", files={"file": ("a.jpg", jpeg_bytes, "image/jpeg")})
    assert r.status_code == 200
    import base64

    img = Image.open(io.BytesIO(base64.b64decode(r.json()["annotated_image_base64"])))
    assert img.size == (640, 480)


def test_503_when_model_unavailable(client, jpeg_bytes, monkeypatch):
    monkeypatch.setitem(main.state, "model", None)
    monkeypatch.setitem(main.state, "error", "absent")
    assert client.post("/predict", files={"file": ("a.jpg", jpeg_bytes, "image/jpeg")}).status_code == 503
    assert client.get("/model/metadata").status_code == 503
    assert client.get("/health").json()["status"] == "degraded"


def test_letterbox_shape_and_range():
    t, r, pad = letterbox(Image.new("RGB", (1280, 640)), (640, 640))
    assert t.shape == (1, 3, 640, 640) and 0 <= t.min() and t.max() <= 1
    assert r == 0.5 and pad == (0, 160)


def test_nms_class_aware():
    boxes = np.array([[0, 0, 10, 10], [1, 1, 11, 11], [0, 0, 10, 10]], dtype=float)
    scores = np.array([0.9, 0.8, 0.7])
    classes = np.array([0, 0, 1])
    assert sorted(nms(boxes, scores, classes, 0.5)) == [0, 2]


def test_postprocess_decodes_ultralytics_layout():
    out = np.zeros((1, 7, 3), dtype=np.float32)  # (1, 4+nc, N)
    out[0, :, 0] = [50, 50, 20, 20, 0.0, 0.9, 0.0]
    dets = postprocess(out, 1.0, (0, 0), (100, 100), 0.3, 0.5)
    assert len(dets) == 1 and dets[0]["class_id"] == 1
