import json

import yaml

from scripts.check_gate import main


def prepare_gate_files(tmp_path, monkeypatch, map50, p95):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "params.yaml").write_text(
        yaml.safe_dump({"evaluate": {"gate": {"min_map50": 0.5, "max_latency_p95_ms": 150}}}),
        encoding="utf-8",
    )
    models = tmp_path / "models"
    models.mkdir()
    (models / "metrics.json").write_text(
        json.dumps({"comparaison_val": [{"run": "B2", "mAP50": map50}]}), encoding="utf-8"
    )
    (models / "inference_config.json").write_text(json.dumps({"model": "B2"}), encoding="utf-8")
    (models / "benchmark_local.json").write_text(json.dumps({"p95_ms": p95}), encoding="utf-8")


def test_gate_accepts_model_above_threshold(tmp_path, monkeypatch, capsys):
    prepare_gate_files(tmp_path, monkeypatch, 0.66, 120.0)
    assert main() == 0
    assert "OK" in capsys.readouterr().out


def test_gate_rejects_model_over_latency_budget(tmp_path, monkeypatch, capsys):
    prepare_gate_files(tmp_path, monkeypatch, 0.66, 412.3)
    assert main() == 1
    assert "ECHEC" in capsys.readouterr().out


def test_gate_rejects_missing_model_run(tmp_path, monkeypatch):
    prepare_gate_files(tmp_path, monkeypatch, 0.66, 120.0)
    models = tmp_path / "models"
    (models / "inference_config.json").write_text(json.dumps({"model": "inconnu"}), encoding="utf-8")
    assert main() == 1
