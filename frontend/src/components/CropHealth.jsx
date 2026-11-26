import { useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import Meter from "./charts/Meter";
import MiniBars from "./charts/MiniBars";
import { useLang } from "../LangContext";
import { findDisease, labelFr } from "../data/diseases";
import { loadHistory } from "../services/history";

const TXT = {
  fr: {
    title: "État de mes cultures", period: "30 derniers jours",
    healthy: "Feuilles saines", sure: "Analyses sûres",
    top: "Maladie la plus vue", none: "Aucune maladie détectée",
    activity: "Activité", week: "analyses", empty: "Analyse une feuille pour voir ton suivi.",
    start: "Lancer un diagnostic", cases: "cas",
  },
  derja: {
    title: "7alet el ghallet mte3i", period: "A5er 30 yom",
    healthy: "Wra9 sa7i7", sure: "Ta7lil akid",
    top: "El maradh el akthar", none: "Ma l9inech maradh",
    activity: "El nachat", week: "ta7lil", empty: "A3mel analyse bech tchouf el motaba3a.",
    start: "Abda tachkhis", cases: "7ala",
  },
};

const JOUR = 86400000;

/** Suivi chiffré des analyses : part de feuilles saines, fiabilité, maladie dominante, activité. */
export default function CropHealth() {
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const analyses = loadHistory();

  const stats = useMemo(() => {
    const depuis = Date.now() - 30 * JOUR;
    const recentes = analyses.filter((a) => (a.date ?? 0) >= depuis);
    const avecDetection = recentes.filter((a) => a.top);
    const saines = avecDetection.filter((a) => findDisease(a.top)?.type === "saine").length;
    const sures = recentes.filter((a) => (a.confidence ?? 0) >= 0.7).length;

    const compte = new Map();
    for (const a of avecDetection) {
      const fiche = findDisease(a.top);
      if (!fiche || fiche.type === "saine") continue;
      compte.set(a.top, (compte.get(a.top) ?? 0) + 1);
    }
    const [dominante] = [...compte.entries()].sort((x, y) => y[1] - x[1]);

    // Activité des 8 dernières semaines, de la plus ancienne à la plus récente.
    const semaines = Array.from({ length: 8 }, (_, i) => {
      const fin = Date.now() - i * 7 * JOUR;
      const debut = fin - 7 * JOUR;
      const value = analyses.filter((a) => (a.date ?? 0) > debut && (a.date ?? 0) <= fin).length;
      return { label: i === 0 ? "S0" : `-${i}`, value };
    }).reverse();

    return {
      total: recentes.length,
      detectees: avecDetection.length,
      saines,
      sures,
      dominante: dominante ? { label: dominante[0], n: dominante[1] } : null,
      semaines,
    };
  }, [analyses]);

  if (stats.total === 0) {
    return (
      <section>
        <h2 className="mb-3 text-[15px] font-bold text-forest-800">{t.title}</h2>
        <div className="rounded-[1.1rem] border border-dashed border-line bg-surface px-5 py-7 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Icon name="chart" className="h-5 w-5" />
          </span>
          <p className="mt-3 text-xs leading-5 text-ink-400">{t.empty}</p>
          <Link to="/scan" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-500 px-3.5 text-xs font-semibold text-white">
            <Icon name="scan" className="h-4 w-4" />
            {t.start}
          </Link>
        </div>
      </section>
    );
  }

  const fiche = stats.dominante ? findDisease(stats.dominante.label) : null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-[15px] font-bold text-forest-800">{t.title}</h2>
        <span className="text-[11px] text-ink-400">{t.period}</span>
      </div>

      <div className="space-y-4 rounded-[1.1rem] border border-line bg-surface p-4 shadow-card">
        <Meter label={t.healthy} value={stats.saines} total={Math.max(1, stats.detectees)} />
        <Meter label={t.sure} value={stats.sures} total={stats.total} />

        {stats.dominante && fiche && (
          <Link to={`/library/${fiche.id}`} className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600">
              <Icon name="alert" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">{t.top}</span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold text-forest-800">
                {labelFr(stats.dominante.label)}
              </span>
            </span>
            <span className="shrink-0 rounded-pill bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700">
              {stats.dominante.n} {t.cases}
            </span>
          </Link>
        )}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{t.activity}</p>
          <MiniBars data={stats.semaines} unit={t.week} />
        </div>
      </div>
    </section>
  );
}
