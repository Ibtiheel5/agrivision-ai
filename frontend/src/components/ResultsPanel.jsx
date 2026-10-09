import { useEffect, useState } from "react";
import { classColor } from "../lib/colors";
import { describe } from "../lib/labels";

function Bar({ value, color }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(value * 100)); // 0 -> valeur : déclenche l'animation CSS
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-brand">
        {value == null ? "—" : value}
        {value != null && unit && <span className="ml-1 text-sm font-medium text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

const fmt = (x) => (x == null ? null : x.toFixed(x >= 100 ? 0 : 1));

export default function ResultsPanel({ detections, result, fps }) {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Stat label="Latence client" value={fmt(result?.client_ms)} unit="ms" />
        <Stat label="Serveur (total)" value={fmt(result?.latency_ms)} unit="ms" />
        <Stat label="Modèle (inférence)" value={fmt(result?.timings?.inference_ms)} unit="ms" />
        {fps !== undefined ? (
          <Stat label="FPS" value={fps ? fps.toFixed(1) : null} unit="img/s" />
        ) : (
          <Stat label="Détections" value={result ? detections.length : null} unit="" />
        )}
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-soil">Résultats</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-500">
            {result ? "Aucune détection au-dessus du seuil. Essayez de baisser le seuil de confiance." : "En attente d'une image…"}
          </p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((d, i) => {
              const info = describe(d.label);
              const color = classColor(d.class_id);
              return (
                <li key={`${d.class_id}-${i}`}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color }} />
                      {info.crop}
                      {info.condition && (
                        <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${info.healthy ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                          {info.condition}
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-bold tabular-nums">{(d.confidence * 100).toFixed(1)} %</span>
                  </div>
                  <Bar value={d.confidence} color={color} />
                  <div className="mt-0.5 text-xs text-slate-400">{d.label}</div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
