import { useEffect, useState } from "react";
import { getHealth, getMetadata, errorMessage } from "../services/api";
import { useLang } from "../LangContext";

export default function Model() {
  const { t } = useLang();
  const [meta, setMeta] = useState(null);
  const [health, setHealth] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    getHealth().then(setHealth).catch((e) => setErr(errorMessage(e)));
    getMetadata().then(setMeta).catch((e) => setErr(errorMessage(e)));
  }, []);
  return (
    <div className="space-y-4">
      {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{err}</p>}
      {health && (
        <p className="card">
          API : <strong>{health.status}</strong> · {health.inference_engine} · GPU {health.gpu_available ? "oui" : "non"}
        </p>
      )}
      {meta && (
        <>
          <div className="card">
            <h2 className="text-xl font-bold">{meta.name}</h2>
            <p>{meta.architecture} · {t("version")} {meta.version}</p>
            <p>{meta.num_classes} {t("classes")} · {t("input")} {meta.input_size.join("×")}</p>
          </div>
          <div className="card">
            <h3 className="mb-2 font-semibold">{t("metrics")}</h3>
            <ul className="font-mono text-sm">
              {Object.entries(meta.validation_metrics).map(([k, v]) => (
                <li key={k}>{k} : {v}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <ul className="columns-2 text-sm">
              {meta.class_names.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <a className="btn btn-ghost w-full" href={import.meta.env.VITE_MLFLOW_URL || "http://localhost:5000"} target="_blank" rel="noreferrer">
            {t("mlflow")}
          </a>
        </>
      )}
    </div>
  );
}
