import io

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.schemas import Detection


class FakeDetector:
    version = "test"
    gpu = False
    classes = ["tomate_mildiou"]

    def predict(self, rgb):
        return [Detection(label="tomate_mildiou", confidence=0.9, box=[1, 1, 10, 10])], 1.0


client = TestClient(app)


def png_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), "green").save(buf, format="PNG")
    return buf.getvalue()


def test_health_without_model():
    app.state.detector = None
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["model_loaded"] is False


def test_predict_returns_503_without_model():
    app.state.detector = None
    r = client.post("/predict", files={"file": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 503


def test_predict_rejects_non_image():
    app.state.detector = FakeDetector()
    r = client.post("/predict", files={"file": ("a.txt", b"pas une image", "text/plain")})
    assert r.status_code == 400


def test_predict_ok():
    app.state.detector = FakeDetector()
    r = client.post("/predict", files={"file": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 200
    body = r.json()
    assert body["detections"][0]["label"] == "tomate_mildiou"
    assert body["inference_ms"] >= 0


def test_visualize_returns_png():
    app.state.detector = FakeDetector()
    r = client.post("/predict/visualize", files={"file": ("a.png", png_bytes(), "image/png")})
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
