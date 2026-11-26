import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import { diseasePhoto } from "../data/photos";
import { CROPS, DISEASES, TYPES } from "../data/diseases";
import { useLang } from "../LangContext";

const TXT = {
  fr: {
    intro: "Les 29 états que le modèle sait reconnaître : symptômes, traitement et prévention.",
    search: "Rechercher une maladie ou une culture…",
    all: "Toutes",
    none: "Aucune fiche ne correspond à cette recherche.",
    count: (n) => `${n} fiche${n > 1 ? "s" : ""}`,
  },
  derja: {
    intro: "29 7ala elli el modèle ya3rafhom : el 3alamat, el 3ilaj w el wi9aya.",
    search: "Lawwej 3la maradh walla nabta…",
    all: "El koll",
    none: "Ma fama 7atta fiche tetfata9 m3a el recherche.",
    count: (n) => `${n} fiche${n > 1 ? "s" : ""}`,
  },
};

const TONES = {
  ok: "bg-brand-50 text-brand-700 ring-brand-200",
  warn: "bg-warn-50 text-warn-500 ring-warn-500/20",
  danger: "bg-danger-50 text-danger-500 ring-danger-500/20",
};

/** Bibliothèque : liste filtrable des maladies reconnues par le modèle. */
export default function Library() {
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const [query, setQuery] = useState("");
  const [crop, setCrop] = useState("all");

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return DISEASES.filter((d) => {
      if (crop !== "all" && d.crop !== crop) return false;
      if (!q) return true;
      return `${d.fr} ${CROPS[d.crop]} ${d.summary}`.toLocaleLowerCase("fr").includes(q);
    });
  }, [crop, query]);

  const crops = ["all", ...Object.keys(CROPS).filter((key) => DISEASES.some((d) => d.crop === key))];

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-ink-500">{t.intro}</p>

      <label className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 text-ink-400 transition focus-within:border-brand-300 focus-within:shadow-focus">
        <Icon name="search" className="h-[18px] w-[18px] shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400"
        />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Cultures">
        {crops.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={crop === key}
            onClick={() => setCrop(key)}
            className={`shrink-0 rounded-pill px-4 py-2 text-xs font-semibold transition ${
              crop === key ? "bg-forest-600 text-white shadow-card" : "bg-surface text-ink-600 ring-1 ring-line"
            }`}
          >
            {key === "all" ? t.all : CROPS[key]}
          </button>
        ))}
      </div>

      <p className="text-xs font-medium text-ink-400">{t.count(results.length)}</p>

      {results.length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-ink-500">
          {t.none}
        </p>
      ) : (
        <div className="space-y-2.5">
          {results.map((d, i) => {
            const type = TYPES[d.type];
            return (
              <Link
                key={d.id}
                to={`/library/${d.id}`}
                style={{ animationDelay: `${Math.min(i, 8) * 28}ms` }}
                className="flex animate-fade-up items-center gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card transition hover:border-brand-200 active:scale-[0.99]"
              >
                <Photo src={diseasePhoto(d.id)} fallbackKey={d.id} crop={d.crop} alt={d.fr} className="h-14 w-14 shrink-0 rounded-xl">
                  <span className={`absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-1 ${TONES[type.tone]}`}>
                    <Icon name={type.icon} className="h-3 w-3" />
                  </span>
                </Photo>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-800">{d.fr}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-ink-400">
                    {CROPS[d.crop]} · {type.fr}
                  </span>
                </span>
                <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ink-400" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
