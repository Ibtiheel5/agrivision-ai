import { Link, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import Photo from "../components/Photo";
import { diseasePhoto } from "../data/photos";
import { CROPS, TYPES, getDisease } from "../data/diseases";
import { useLang } from "../LangContext";

const TXT = {
  fr: {
    symptoms: "Symptômes",
    treatment: "Que faire maintenant",
    prevention: "Prévenir la prochaine fois",
    missing: "Fiche introuvable.",
    back: "Retour à la bibliothèque",
    scan: "Analyser une feuille",
    note: "Information agronomique générale. Aucune dose de produit n'est indiquée : réfère-toi à l'étiquette et à ton technicien agricole.",
  },
  derja: {
    symptoms: "El 3alamat",
    treatment: "Chnowa ta3mel tawa",
    prevention: "Bech ma y3awedch",
    missing: "El fiche mouch mawjouda.",
    back: "Erja3 lel bibliothèque",
    scan: "A3mel analyse l wra9a",
    note: "Ma3louma 3amma. Ma famech doses : a9ra el etiquette w esta3lem 3and el technicien el fla7i.",
  },
};

const TONES = {
  ok: "from-brand-500 to-brand-600",
  warn: "from-olive-500 to-brand-600",
  danger: "from-forest-700 to-danger-500",
};

function Section({ icon, title, items }) {
  if (!items?.length) return null;
  return (
    <section className="animate-fade-up rounded-card border border-line bg-surface p-4 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((line) => (
          <li key={line} className="flex gap-2.5 text-sm leading-6 text-ink-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Fiche détaillée d'une maladie. */
export default function LibraryDetail() {
  const { diseaseId } = useParams();
  const { lang } = useLang();
  const t = TXT[lang] ?? TXT.fr;
  const disease = getDisease(diseaseId);

  if (!disease) {
    return (
      <div className="rounded-card border border-dashed border-line bg-surface p-6 text-center">
        <p className="text-sm text-ink-500">{t.missing}</p>
        <Link to="/library" className="mt-3 inline-block text-sm font-semibold text-brand-600">{t.back}</Link>
      </div>
    );
  }

  const type = TYPES[disease.type];

  return (
    <div className="space-y-4">
      <section className="animate-pop-in overflow-hidden rounded-card shadow-raised">
        <Photo src={diseasePhoto(disease.id)} fallbackKey={disease.id} crop={disease.crop} alt={disease.fr} className="h-44">
          <div className="absolute inset-0 bg-gradient-to-t from-forest-900/90 via-forest-900/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <span className="inline-flex items-center gap-2 rounded-pill bg-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-white/25 backdrop-blur">
              <Icon name={type.icon} className="h-3.5 w-3.5" />
              {type.fr}
            </span>
            <h1 className="mt-2 text-xl font-semibold leading-tight">{disease.fr}</h1>
            <p className="mt-0.5 text-xs font-medium text-white/75">{CROPS[disease.crop]}</p>
          </div>
        </Photo>
        <p className={`bg-gradient-to-br ${TONES[type.tone]} p-4 text-sm leading-6 text-white/90`}>{disease.summary}</p>
      </section>

      <Section icon="search" title={t.symptoms} items={disease.symptoms} />
      <Section icon="shield" title={t.treatment} items={disease.treatment} />
      <Section icon="sprout" title={t.prevention} items={disease.prevention} />

      <p className="flex gap-2 rounded-card bg-warn-50 p-3 text-xs leading-5 text-warn-500">
        <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
        {t.note}
      </p>

      <div className="flex gap-2 pt-1">
        <Link to="/library" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold text-ink-700 ring-1 ring-line">
          <Icon name="back" className="h-4 w-4" />
          {t.back}
        </Link>
        <Link to="/scan" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-card transition active:scale-[0.98]">
          <Icon name="scan" className="h-4 w-4" />
          {t.scan}
        </Link>
      </div>
    </div>
  );
}
