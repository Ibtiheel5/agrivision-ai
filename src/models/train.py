import shutil

import mlflow
import yaml
from ultralytics import YOLO


def main(params_path="params.yaml"):
    p = yaml.safe_load(open(params_path))
    t = p["train"]
    mlflow.set_experiment(t["experiment"])
    with mlflow.start_run():
        mlflow.log_params({**t, "seed": p["seed"]})
        model = YOLO(t["model"])
        res = model.train(
            data=f"{p['data']['processed_dir']}/data.yaml",
            imgsz=t["imgsz"],
            epochs=t["epochs"],
            batch=t["batch"],
            seed=p["seed"],
            project="runs",
            name="train",
            exist_ok=True,
        )
        mlflow.log_metrics(
            {k.replace("(", "_").replace(")", ""): float(v) for k, v in res.results_dict.items()}
        )
        best = f"{res.save_dir}/weights/best.pt"
        shutil.copy(best, "models/best.pt")
        mlflow.log_artifact("models/best.pt")


if __name__ == "__main__":
    main()
