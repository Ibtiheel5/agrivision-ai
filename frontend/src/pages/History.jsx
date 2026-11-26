import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";
import { labelFr } from "../data/diseases";
import { trouverFiche } from "../data/conseils";
import { clearHistory, loadHistory, removeHistory } from "../services/history";

const TXT = {
  fr: {
    intro: "Toutes tes analyses, conservées sur cet appareil.", total: "Analyses", avg: "Confiance moyenne",
    search: "Rechercher une maladie…", all: "Toutes", findings: "Avec détection", clean: "Sans détection",
    none: "Aucune détection", noResult: "Aucune analyse ne correspond à cette recherche.",
    emptyTitle: "Aucune analyse pour l'instant", emptyBody: "Photographie une feuille pour lancer ton premier diagnostic.",
    start: "Lancer un diagnostic", clear: "Tout effacer", confirm: "Effacer toutes les analyses de cet appareil ?",
    delete: "Supprimer", sheet: "Voir la fiche",
  },
  derja: {
    intro: "Ettachkhis el koll, mahfoudh fel appareil hedha.", total: "Ta7lil", avg: "Moyenne eth9a",
    search: "Lawwej 3la maradh…", all: "El koll", findings: "Fihom natija", clean: "Bla natija",
    none: "Ma famech natija", noResult: "Ma fama 7atta ta7lil yetfata9 m3a el recherche.",
    emptyTitle: "Mazel ma famech ta7lil", emptyBody: "Sawwer wra9a bech tabda awel tachkhis.",
    start: "Abda tachkhis", clear: "Fassa5 el koll", confirm: "Tfassa5 ettachkhis el koll ?",
    delete: "Fassa5", sheet: "Chouf el fiche",
  },
};

const longDate = (value, lang) =>
  new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "fr-TN", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));

/** Historique des analyses : recherche, filtres, lien vers la fiche maladie. */
export default function History() {
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const [items, setItems] = useState(loadHistory);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const scored = items.filter((i) => i.confidence != null);
  const avg = scored.length ? Math.round((scored.reduce((s, i) => s + i.confidence, 0) / scored.length) * 100) : null;

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const found = Boolean(item.top);
      if (filter === "findings" && !found) return false;
      if (filter === "clean" && found) return false;
      return !q || (item.top ? labelFr(item.top) : "").toLocaleLowerCase("fr").includes(q);
    });
  }, [filter, items, query]);

  const drop = async (id) => {
    await removeHistory(id);
    setItems(loadHistory());
  };

  const wipe = async () => {
    if (!window.confirm(t.confirm)) return;
    await clearHistory();
    setItems(loadHistory());
  };

  if (items.length === 0) {
    return (
      <div className="animate-pop-in rounded-card border border-line bg-surface px-6 py-10 text-center shadow-card">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon name="history" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-ink-900">{t.emptyTitle}</h2>
        <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-ink-500">{t.emptyBody}</p>
        <Link to="/scan" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-card">
          <Icon name="scan" className="h-4 w-4" />
          {t.start}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-ink-500">{t.intro}</p>

      <section className="grid grid-cols-2 gap-3">
        <div className="animate-fade-up rounded-card bg-gradient-to-br from-forest-600 to-brand-500 p-4 text-white shadow-card">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Icon name="scan" className="h-[18px] w-[18px]" />
          </span>
          <p className="mt-3 text-2xl font-semibold">{items.length}</p>
          <p className="text-[11px] text-white/75">{t.total}</p>
        </div>
        <div className="animate-fade-up rounded-card border border-line bg-surface p-4 shadow-card" style={{ animationDelay: "40ms" }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name="chart" className="h-[18px] w-[18px]" />
          </span>
          <p className="mt-3 text-2xl font-semibold text-ink-900">{avg == null ? "—" : `${avg} %`}</p>
          <p className="text-[11px] text-ink-400">{t.avg}</p>
        </div>
      </section>

      <label className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 text-ink-400 transition focus-within:border-brand-300 focus-within:shadow-focus">
        <Icon name="search" className="h-[18px] w-[18px] shrink-0" />
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          aria-label={t.search} placeholder={t.search}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group">
        {[["all", t.all], ["findings", t.findings], ["clean", t.clean]].map(([value, label]) => (
          <button
            key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
            className={`shrink-0 rounded-pill px-4 py-2 text-xs font-semibold transition ${
              filter === value ? "bg-forest-600 text-white shadow-card" : "bg-surface text-ink-600 ring-1 ring-line"
            }`}
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={wipe} className="ml-auto shrink-0 rounded-pill px-3 py-2 text-xs font-semibold text-danger-500">
          {t.clear}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-ink-500">{t.noResult}</p>
      ) : (
        <div className="space-y-2.5">
          {shown.map((item, i) => {
            const fiche = trouverFiche(item.top);
            return (
              <article
                key={item.id ?? item.date}
                style={{ animationDelay: `${Math.min(i, 8) * 28}ms` }}
                className="flex animate-fade-up items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card"
              >
                {item.thumb ? (
                  <img src={item.thumb} alt="" className="h-[62px] w-[62px] shrink-0 rounded-xl bg-canvas object-cover" />
                ) : (
                  <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name="leaf" className="h-6 w-6" />
                  </span>
                )}
                {/* Toute la zone texte mène au détail de l'analyse et à ses conseils. */}
                <Link to={`/analyse/${item.id ?? item.date}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-800">{item.top ? labelFr(item.top) : t.none}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-400">
                    <Icon name="clock" className="h-3 w-3" />
                    {longDate(item.date, lang)}
                  </p>
                  {item.confidence != null && (
                    <div className="mt-1.5 h-1.5 w-full max-w-[140px] overflow-hidden rounded-pill bg-canvas">
                      <div className="h-full rounded-pill bg-brand-500" style={{ width: `${item.confidence * 100}%` }} />
                    </div>
                  )}
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600">
                    {fiche ? t.sheet : "Voir les conseils"}
                    <Icon name="chevronRight" className="h-3 w-3" />
                  </span>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {item.confidence != null && (
                    <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      {Math.round(item.confidence * 100)} %
                    </span>
                  )}
                  <button type="button" onClick={() => drop(item.id ?? String(item.date))} aria-label={`${t.delete} : ${item.top ?? ""}`} className="p-1 text-ink-400 transition hover:text-danger-500">
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
