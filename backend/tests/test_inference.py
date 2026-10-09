import numpy as np
import pytest
from PIL import Image

from app.inference import (
    Detector,
    Prediction,
    decode,
    decode_top3,
    draw_detections,
    letterbox,
    load_image,
    nms,
    overall_status,
    to_tensor,
)

CLASSES = ["a", "b", "c"]


def make_output(rows, n=50, nc=3):
    """rows : liste de (cx, cy, w, h, classe, score) -> sortie brute (1, 4+nc, n)."""
    out = np.zeros((1, 4 + nc, n), dtype=np.float32)
    for i, (cx, cy, w, h, c, s) in enumerate(rows):
        out[0, :4, i] = [cx, cy, w, h]
        out[0, 4 + c, i] = s
    return out


def test_letterbox_shape_and_padding():
    img = Image.new("RGB", (200, 100), (255, 0, 0))
    canvas, r, px, py = letterbox(img, (640, 640))
    assert canvas.size == (640, 640)
    assert r == pytest.approx(3.2) and px == 0 and py == 160
    assert canvas.getpixel((10, 10)) == (114, 114, 114)  # bande grise
    assert canvas.getpixel((320, 320)) == (255, 0, 0)


def test_to_tensor_format():
    x = to_tensor(Image.new("RGB", (640, 640), (255, 255, 255)))
    assert x.shape == (1, 3, 640, 640) and x.dtype == np.float32
    assert x.max() == pytest.approx(1.0)


def test_nms_suppresses_overlaps():
    boxes = np.array([[0, 0, 100, 100], [5, 5, 105, 105], [200, 200, 300, 300]], dtype=np.float32)
    keep = nms(boxes, np.array([0.9, 0.8, 0.7]), 0.45)
    assert list(keep) == [0, 2]


def test_decode_maps_back_to_original_coordinates():
    # image 200x100 -> letterbox 640 : ratio 3.2, pad_y 160. Boîte d'origine (50,20)-(150,80).
    out = make_output([(320, 320, 320, 192, 1, 0.9)])
    preds = decode(out, CLASSES, 0.25, 0.45, 3.2, 0, 160, 200, 100)
    assert len(preds) == 1
    p = preds[0]
    assert (p.class_id, p.label) == (1, "b")
    assert (p.x1, p.y1, p.x2, p.y2) == pytest.approx((50, 20, 150, 80), abs=0.01)


def test_decode_threshold_and_class_aware_nms():
    out = make_output(
        [
            (100, 100, 80, 80, 0, 0.9),
            (102, 100, 80, 80, 0, 0.8),  # même classe, chevauchement -> supprimée
            (101, 100, 80, 80, 2, 0.7),  # autre classe, même zone -> conservée
            (400, 400, 50, 50, 1, 0.1),  # sous le seuil
        ]
    )
    preds = decode(out, CLASSES, 0.25, 0.45, 1.0, 0, 0, 640, 640)
    assert sorted(p.class_id for p in preds) == [0, 2]


def test_decode_accepts_transposed_output_and_clips():
    out = make_output([(5, 5, 100, 100, 0, 0.9)])[0].T  # (N, 4+nc)
    p = decode(out, CLASSES, 0.25, 0.45, 1.0, 0, 0, 640, 640)[0]
    assert p.x1 == 0 and p.y1 == 0  # recadrée dans l'image


def test_decode_rejects_wrong_class_count():
    with pytest.raises(ValueError):
        decode(make_output([], nc=5), CLASSES, 0.25, 0.45, 1.0, 0, 0, 640, 640)


def test_decode_top3_keeps_three_classes_and_flags_ambiguous_box():
    out = make_output([(100, 100, 80, 80, 0, 0.55), (300, 300, 80, 80, 1, 0.9)])
    out[0, 4 + 1, 0] = 0.50  # 1re boîte : deux classes quasi à égalité
    preds = decode_top3(out, CLASSES, 0.10, 0.45, 1.0, 0, 0, 640, 640)
    by_pos = {round(p.x1): p for p in preds}
    ambiguous, clear = by_pos[60], by_pos[260]
    assert ambiguous.status == "incertain" and ambiguous.margin == pytest.approx(0.05)
    assert [c[1] for c in ambiguous.candidates[:2]] == ["a", "b"]
    assert clear.status == "ok" and len(clear.candidates) == 3
    assert overall_status(preds) == "incertain"


def test_decode_top3_margin_and_threshold_control_status():
    out = make_output([(300, 300, 80, 80, 1, 0.9)])
    assert decode_top3(out, CLASSES, 0.10, 0.45, 1.0, 0, 0, 640, 640)[0].status == "ok"
    low = decode_top3(out, CLASSES, 0.10, 0.45, 1.0, 0, 0, 640, 640, accept=0.95)
    assert low[0].status == "incertain"
    assert decode_top3(make_output([]), CLASSES, 0.10, 0.45, 1.0, 0, 0, 640, 640) == []
    assert overall_status([]) == "aucune_detection"


def test_load_image_rejects_garbage():
    with pytest.raises(Exception):
        load_image(b"ceci n'est pas une image")


def test_draw_detections_returns_same_size():
    img = Image.new("RGB", (320, 240), (30, 30, 30))
    out = draw_detections(img, [Prediction(0, "a", 0.9, 10, 10, 100, 100)])
    assert out.size == img.size and out.tobytes() != img.tobytes()


def test_detector_with_synthetic_onnx(tmp_path):
    """Modèle ONNX factice (sortie constante, format YOLO) : teste la session de bout en bout."""
    onnx = pytest.importorskip("onnx")
    from onnx import TensorProto, helper, numpy_helper

    out = make_output([(320, 320, 320, 192, 1, 0.9)], n=100)
    const = helper.make_node("Constant", [], ["out"], value=numpy_helper.from_array(out))
    graph = helper.make_graph(
        [const],
        "fake",
        [helper.make_tensor_value_info("images", TensorProto.FLOAT, [1, 3, 640, 640])],
        [helper.make_tensor_value_info("out", TensorProto.FLOAT, [1, 7, 100])],
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 12)])
    model.ir_version = 8
    path = tmp_path / "fake.onnx"
    onnx.save(model, str(path))

    det = Detector(path, CLASSES)
    preds, t = det.predict(Image.new("RGB", (200, 100)))
    assert len(preds) == 1 and preds[0].label == "b"
    assert set(t) == {"preprocess_ms", "inference_ms", "postprocess_ms", "total_ms"}
    top3, t3 = det.predict_top3(Image.new("RGB", (200, 100)))
    assert len(top3) == 1 and top3[0].candidates[0][1] == "b" and top3[0].status == "ok"
    assert set(t3) == set(t)
    with pytest.raises(ValueError):  # classes.txt désynchronisé du modèle
        Detector(path, CLASSES + ["d"])
