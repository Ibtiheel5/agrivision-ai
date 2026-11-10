"""Fixture : mini-modèle ONNX factice qui renvoie des sorties au format YOLO.

Aucun vrai poids n'est nécessaire en CI : on valide le pré/post-traitement,
les schémas et les codes HTTP.
"""

import io
import json
import os

import numpy as np
import onnx
import pytest
from onnx import TensorProto, helper
from PIL import Image

CLASSES = ["Tomato leaf blight", "Apple leaf healthy", "Corn rust"]


def build_fake_yolo(path, nc=3):
    # 3 ancres : 1 forte (classe 2), 1 doublon (NMS doit le supprimer), 1 faible
    out = np.zeros((1, 4 + nc, 3), dtype=np.float32)
    out[0, :4, 0] = [320, 320, 200, 200]
    out[0, 4 + 2, 0] = 0.90
    out[0, :4, 1] = [322, 322, 200, 200]
    out[0, 4 + 2, 1] = 0.80
    out[0, :4, 2] = [100, 100, 50, 50]
    out[0, 4 + 0, 2] = 0.05
    const = helper.make_tensor("c", TensorProto.FLOAT, out.shape, out.flatten().tolist())
    node = helper.make_node("Constant", [], ["output0"], value=const)
    graph = helper.make_graph(
        [node],
        "fake",
        [helper.make_tensor_value_info("images", TensorProto.FLOAT, [1, 3, 640, 640])],
        [helper.make_tensor_value_info("output0", TensorProto.FLOAT, [1, 4 + nc, 3])],
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 9
    onnx.save(model, str(path))


@pytest.fixture(scope="session")
def client(tmp_path_factory):
    d = tmp_path_factory.mktemp("models")
    build_fake_yolo(d / "best.onnx")
    (d / "classes.txt").write_text("\n".join(CLASSES), encoding="utf-8")
    (d / "metadata.json").write_text(
        json.dumps({"version": "test-1", "architecture": "fake", "validation_metrics": {"mAP50": 0.5}}),
        encoding="utf-8",
    )
    os.environ["MODEL_DIR"] = str(d)
    from fastapi.testclient import TestClient

    from app import main

    main.MODEL_DIR = d
    with TestClient(main.app) as c:
        yield c


@pytest.fixture()
def jpeg_bytes():
    buf = io.BytesIO()
    Image.new("RGB", (640, 480), (30, 120, 40)).save(buf, format="JPEG")
    return buf.getvalue()
