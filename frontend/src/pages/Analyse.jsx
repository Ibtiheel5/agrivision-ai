import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ConseilsBloc from "../components/ConseilsBloc";
import Icon from "./../components/Icon";
import { getAnalysis } from "../services/history";
import { labelFr } from "../data/diseases";
import { trouverFiche } from "../data/conseils";
import { useLang } from "../LangContext";

/** Détail d'une analyse enregistrée : la photo, le score, puis les conseils correspondants. */
export default function Analyse() {
  const { analyseId } = useParams();
  const { lang } = useLang();
  const [item, setItem] = useState(undefined); // undefined = en cours, null = introuvable

  useEffect(() => {
    setItem(getAnalysis(analyseId));
  }, [analyseId]);

  if (item === undefined) {
    return <div className="h-32 animate-pulse rounded-2xl bg-surface" />;
  }

  if (!item) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-5 text-center">
        <p className="text-sm text-ink-600">Cette analyse n'est plus enregistrée sur cet appareil.</p>
        <Link to="/history" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white">
          <Icon name="history" className="h-4 w-4" />
          Retour à l'historique
        </Link>
      </section>
    );
  }

  const fiche = trouverFiche(item.top);
  const pourcent = item.confidence != null ? Math.round(item.confidence * 100) : null;
  const date = item.date
    ? new Date(item.date).toLocaleString(lang === "fr" ? "fr-FR" : "ar-TN", {
        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex gap-3 p-4">
          {item.thumb && (
            <img src={item.thumb} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-canvas object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-ink-900">
              {item.top ? labelFr(item.top) : "Aucune détection"}
            </h2>
            {date && <p className="mt-0.5 text-[11px] text-ink-400">{date}</p>}
            {pourcent != null && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-ink-500">
                  <span>Confiance</span>
                  <span>{pourcent} %</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-canvas">
                  <div className="h-full rounded-pill bg-brand-500" style={{ width: `${pourcent}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Autres hypothèses du modèle, si l'analyse les a conservées. */}
        {item.top3?.length > 1 && (
          <div className="border-t border-line px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">Autres hypothèses</p>
            <ul className="mt-2 space-y-1.5">
              {item.top3.slice(1).map((alt) => (
                <li key={alt.label} className="flex items-center justify-between text-[13px] text-ink-600">
                  <span className="truncate">{labelFr(alt.label)}</span>
                  <span className="ml-3 shrink-0 tabular-nums text-ink-400">
                    {Math.round(alt.confidence * 100)} %
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <ConseilsBloc label={item.top} confidence={item.confidence} />

      {fiche && (
        <Link
          to={`/library/${fiche.id}`}
          className="flex min-h-12 items-center justify-between rounded-2xl border border-line bg-surface px-4 text-sm font-semibold text-brand-700"
        >
          <span className="flex items-center gap-2">
            <Icon name="book" className="h-4 w-4" />
            Voir la fiche complète
          </span>
          <Icon name="chevronRight" className="h-4 w-4 text-ink-300" />
        </Link>
      )}
    </div>
  );
}
