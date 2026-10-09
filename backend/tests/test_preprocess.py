import numpy as np
import pytest

from app.preprocess import decode, letterbox, preprocess


def test_letterbox_keeps_ratio_and_pads():
    img = np.zeros((100, 200, 3), dtype=np.uint8)
    canvas, r, left, top = letterbox(img, 640)
    assert canvas.shape == (640, 640, 3)
    assert r == pytest.approx(3.2)
    assert left == 0 and top == 160
    assert canvas[0, 0, 0] == 114  # bande de remplissage grise


def test_preprocess_shape_and_range():
    x, meta = preprocess(np.full((50, 80, 3), 255, dtype=np.uint8), 640)
    assert x.shape == (1, 3, 640, 640) and x.dtype == np.float32
    assert x.max() <= 1.0 and x.min() >= 0.0


def make_output(rows, nc=3, n=8):
    out = np.zeros((1, 4 + nc, n), dtype=np.float32)
    for k, (cx, cy, w, h, scores) in enumerate(rows):
        out[0, :4, k] = [cx, cy, w, h]
        out[0, 4:, k] = scores
    return out


def test_decode_maps_back_to_original_image():
    # image 100 x 200 (h x w) -> r = 3.2, top = 160. Boîte originale (50, 20) - (150, 80).
    r, left, top = 3.2, 0, 160
    cx, cy = (100 * r + left), (50 * r + top)
    out = make_output([(cx, cy, 100 * r, 60 * r, [0.1, 0.9, 0.2])])
    dets = decode(out, (r, left, top), (100, 200))
    assert len(dets) == 1 and dets[0]["cls"] == 1
    assert dets[0]["box"] == pytest.approx([50, 20, 150, 80], abs=0.5)
    assert [c for c, _ in dets[0]["alternatives"]] == [1, 2, 0]


def test_decode_nms_per_class_keeps_different_classes_only():
    same = (320, 320, 200, 200)
    out = make_output(
        [
            (*same, [0.9, 0.0, 0.0]),
            (*same, [0.8, 0.0, 0.0]),  # doublon de la même classe : supprimé
            (*same, [0.0, 0.7, 0.0]),  # autre classe sur la même zone : conservé
        ]
    )
    dets = decode(out, (1.0, 0, 0), (640, 640))
    assert sorted(d["cls"] for d in dets) == [0, 1]
    dets_agn = decode(out, (1.0, 0, 0), (640, 640), agnostic=True)
    assert len(dets_agn) == 1


def test_decode_threshold_and_empty():
    out = make_output([(100, 100, 50, 50, [0.1, 0.2, 0.1])])
    assert decode(out, (1.0, 0, 0), (640, 640), conf=0.25) == []
    assert len(decode(out, (1.0, 0, 0), (640, 640), conf=0.15)) == 1
