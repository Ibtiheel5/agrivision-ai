import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.inference import Prediction
from app.main import app


class FakeDetector:
    classes = ["a", "b"]
    size = (640, 640)
    providers = ["CPUExecutionProvider"]
    gpu = False

    def predict(self, img, conf=0.25, iou=0.45, max_det=100):
        return [Prediction(1, "b", 0.9, 10, 10, 50, 60)], {
            "preprocess_ms": 1.0,
            "inference_ms": 2.0,
            "postprocess_ms": 0.5,
            "total_ms": 3.5,
        }


def png_bytes(size=(120, 80)):
    buf = io.BytesIO()
    Image.new("RGB", size, (0, 128, 0)).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture()
def client_no_model(monkeypatch, tmp_path):
    monkeypatch.setattr("app.main.MODEL_PATH", tmp_path / "absent.onnx")
    monkeypatch.setattr("app.main.CLASSES_PATH", tmp_path / "absent.txt")
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def client(client_no_model):
    app.state.detector = FakeDetector()
    yield client_no_model
    app.state.detector = None


def test_health_degraded_without_model(client_no_model):
    r = client_no_model.get("/health")
    assert (
        r.status_code == 200 and r.json()["status"] == "degraded" and not r.json()["model_loaded"]
    )


def test_predict_503_when_model_missing(client_no_model):
    r = client_no_model.post("/predict", files={"file": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 503


def test_predict_400_when_not_an_image(client_no_model):
    r = client_no_model.post("/predict", files={"file": ("a.txt", b"hello", "text/plain")})
    assert r.status_code == 400


def test_predict_ok(client):
    r = client.post("/predict?conf=0.3", files={"file": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 200
    j = r.json()
    assert (j["image_width"], j["image_height"], j["conf_threshold"]) == (120, 80, 0.3)
    assert j["detections"][0]["label"] == "b" and j["detections"][0]["box"]["x2"] == 50
    assert j["latency_ms"] >= 0 and "inference_ms" in j["timings"]


def test_predict_rejects_out_of_range_threshold(client):
    r = client.post("/predict?conf=1.5", files={"file": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 422


def test_visualize_returns_jpeg(client):
    r = client.post("/predict/visualize", files={"file": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
    assert r.headers["x-detections"] == "1"
    assert Image.open(io.BytesIO(r.content)).size == (120, 80)


def test_model_metadata(client):
    r = client.get("/model/metadata")
    assert (
        r.status_code == 200 and r.json()["classes"] == ["a", "b"] and r.json()["num_classes"] == 2
    )
