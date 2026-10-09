import { useEffect, useState } from "react";
import { describe } from "../lib/labels";
import { explain, getMetadata } from "../services/api";

const pct = (x) => (x == null ? "—" : (x * 100).toFixed(1) + " %");

function Card({ title, children }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-soil">{title}</h3>
      {children}
    </section>
  );
}

function Metrics({ data, keys }) {
  if (!data) return <p className="text-sm text-slate-500">Non disponible.</p>;
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {keys.map(([k, label]) => (
        <div key={k}>
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="text-lg font-bold text-brand">{pct(data[k])}</dd>
        </div>
      ))}
    </dl>
  );
}

const BENCH_LABELS = { pytorch_cpu: "PyTorch (CPU)", onnx_fp32_cpu: "ONNX FP32 (CPU)", onnx_int8_cpu: "ONNX INT8 (CPU)" };

export default function ModelPage() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMetadata().then(setMeta).catch((e) => setError(explain(e)));
  }, []);

  if (error) return <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  if (!meta) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <Card title="Modèle en production">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Version", meta.version],
            ["Architecture", meta.architecture],
            ["Entrée", `${meta.input_size} × ${meta.input_size}`],
            ["Classes", meta.num_classes],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="text-lg font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm">
          Suivi des expériences :{" "}
          {meta.mlflow_url ? (
            <a className="font-semibold text-brand underline" href={meta.mlflow_url} target="_blank" rel="noreferrer">
              ouvrir MLflow
            </a>
          ) : (
            <span className="text-slate-500">lien non configuré (variable MLFLOW_URL du backend)</span>
          )}
        </p>
      </Card>

      <Card title="Métriques de validation">
        <Metrics data={meta.validation_metrics} keys={[["precision", "Précision"], ["recall", "Rappel"], ["mAP50", "mAP@0.5"], ["mAP50_95", "mAP@[.5:.95]"]]} />
      </Card>

      <Card title="Métriques de test (jeu jamais utilisé pour choisir le modèle)">
        <Metrics data={meta.test_metrics} keys={[["test_precision", "Précision"], ["test_recall", "Rappel"], ["test_mAP50", "mAP@0.5"], ["test_mAP50_95", "mAP@[.5:.95]"]]} />
      </Card>

      {meta.benchmark_cpu && (
        <Card title="Latence d'inférence (CPU, mesurée à l'entraînement)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1 pr-4">Format</th><th className="pr-4">p50 (ms)</th><th className="pr-4">p95 (ms)</th>
                  <th className="pr-4">FPS</th><th>Taille (Mo)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(meta.benchmark_cpu).map(([k, v]) => (
                  <tr key={k} className="border-t border-line">
                    <td className="py-1 pr-4 font-semibold">{BENCH_LABELS[k] ?? k}</td>
                    <td className="pr-4">{v.p50_ms?.toFixed(1)}</td><td className="pr-4">{v.p95_ms?.toFixed(1)}</td>
                    <td className="pr-4">{v.fps?.toFixed(1)}</td><td>{v.size_mb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title={`Classes reconnues (${meta.classes.length})`}>
        <ul className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {meta.classes.map((c, i) => {
            const d = describe(c);
            return (
              <li key={c} className="flex justify-between gap-2 border-b border-line/60 py-0.5">
                <span>{d.short}</span>
                <span className="text-xs text-slate-400">{i}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
