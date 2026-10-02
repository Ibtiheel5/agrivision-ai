import json

import mlflow
import yaml
from onnxruntime.quantization import QuantType, quantize_dynamic
from ultralytics import YOLO


def main(params_path="params.yaml"):
    p = yaml.safe_load(open(params_path))
    model = YOLO("models/best.pt")
    m = model.val(data=f"{p['data']['processed_dir']}/data.yaml", split="test")
    metrics = {"map50": float(m.box.map50), "map50_95": float(m.box.map)}
    json.dump(metrics, open("models/metrics.json", "w"))
    path = model.export(format="onnx", imgsz=p["train"]["imgsz"], simplify=True)
    quantize_dynamic(path, p["export"]["int8_path"], weight_type=QuantType.QUInt8)
    if path != p["export"]["onnx_path"]:
        import shutil

        shutil.move(path, p["export"]["onnx_path"])
    with mlflow.start_run(run_name="evaluate"):
        mlflow.log_metrics(metrics)
        mlflow.log_artifact(p["export"]["onnx_path"])
    # TODO : porte d'évaluation (gate) puis promotion dans le MLflow Registry


if __name__ == "__main__":
    main()
