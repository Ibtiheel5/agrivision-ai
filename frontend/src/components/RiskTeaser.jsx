import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { useLang } from "../LangContext";
import { getJSON } from "../lib/assistant";
import { labelFr } from "../data/diseases";

const TXT = {
  fr: { title: "Autour de moi", sub: "Signalements des 30 derniers jours", see: "Voir la carte", cases: "cas", none: "Aucun signalement pour l'instant." },
  derja: { title: "9rib menni", sub: "Signalements a5er 30 yom", see: "Chouf el carte", cases: "7ala", none: "Mazel ma famech signalement." },
};

/** Aperçu de la carte des risques : les trois gouvernorats les plus touchés. */
export default function RiskTeaser() {
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const [data, setData] = useState(null);

  useEffect(() => {
    let annule = false;
    getJSON("/risk-map/summary?days=30").then((d) => !annule && setData(d)).catch(() => {});
    return () => { annule = true; };
  }, []);

  if (!data || data.total === 0) return null; // rien à montrer tant que personne n'a partagé

  const max = Math.max(1, ...data.governorates.map((g) => g.count));

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-forest-800">{t.title}</h2>
          <p className="mt-0.5 text-[11px] text-ink-400">{t.sub}</p>
        </div>
        <Link to="/risk-map" className="text-[11px] font-semibold text-brand-600">{t.see}</Link>
      </div>

      <div className="space-y-2.5 rounded-[1.1rem] border border-line bg-surface p-4 shadow-card">
        {data.governorates.slice(0, 3).map((g) => (
          <div key={g.gov_id} className="flex items-center gap-3">
            <span className="w-[84px] shrink-0 truncate text-[12px] font-medium text-ink-700">{g.gov_name}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-pill bg-canvas">
              <span className="block h-full rounded-pill bg-brand-500" style={{ width: `${(g.count / max) * 100}%` }} />
            </span>
            <span className="w-[54px] shrink-0 text-right text-[11px] font-bold tabular-nums text-ink-800">
              {g.count} {t.cases}
            </span>
          </div>
        ))}
        {data.governorates[0]?.top?.[0] && (
          <p className="pt-1 text-[11px] text-ink-400">
            {labelFr(data.governorates[0].top[0].label)} · {data.governorates[0].top[0].count} {t.cases}
          </p>
        )}
      </div>
    </section>
  );
}
