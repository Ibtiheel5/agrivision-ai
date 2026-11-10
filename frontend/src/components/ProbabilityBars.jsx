import { useLang } from "../LangContext";

/** Barres de progression animées : meilleur score par classe détectée. */
export default function ProbabilityBars({ scores = {}, detections = [] }) {
  const { t } = useLang();
  const rows = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const idOf = (label) => detections.find((d) => d.label === label)?.class_id ?? 0;
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="mb-2 font-semibold">{t("probs")}</h3>
      <ul className="space-y-2">
        {rows.map(([label, s]) => (
          <li key={label}>
            <div className="flex justify-between text-sm">
              <span>{label}</span>
              <span className="font-mono">{(s * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-leaf-50">
              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${s * 100}%`, background: `hsl(${(idOf(label) * 47) % 360} 60% 45%)` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
