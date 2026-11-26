import { conseilPour, resumeCourt } from "../data/conseils";
import { UI_DERJA } from "../data/conseils.derja";
import { useLang } from "../LangContext";
import Icon from "./Icon";

/**
 * Bloc de conseils affiché sous le résultat d'une analyse, feuille ou fruit indifféremment.
 * Se pose tel quel sous les scores : <ConseilsBloc label={…} confidence={…} />
 */

const TONS = {
  ok:     { fond: "bg-brand-50",  bord: "border-brand-200",  texte: "text-forest-800", pastille: "bg-brand-500" },
  warn:   { fond: "bg-amber-50",  bord: "border-amber-200",  texte: "text-amber-900",  pastille: "bg-amber-500" },
  danger: { fond: "bg-red-50",    bord: "border-red-200",    texte: "text-red-900",    pastille: "bg-red-500" },
};

const TXT = {
  fr: {
    urgence: { aucune: "Rien à faire", surveiller: "À surveiller", agir: "À traiter" },
    aFaire: "À faire maintenant",
    pourQueCaDure: "Pour que ça dure",
    prevention: "Pour éviter que ça revienne",
    aucuneFiche: "Aucune fiche de conseils ne correspond encore à ce résultat.",
  },
  derja: {
    urgence: UI_DERJA.urgence,
    aFaire: UI_DERJA.aFaire,
    pourQueCaDure: UI_DERJA.pourQueCaDure,
    prevention: UI_DERJA.prevention,
    aucuneFiche: UI_DERJA.aucuneFiche,
  },
};

function Liste({ titre, items, icone }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">
        <Icon name={icone} className="h-3.5 w-3.5" />
        {titre}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((texte) => (
          <li key={texte} className="flex gap-2.5 text-[13px] leading-[1.5] text-ink-700">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
            <span>{texte}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ConseilsBloc({ label, confidence, className = "" }) {
  // Tolère un rendu hors du fournisseur de langue : on retombe sur le français.
  const { lang } = useLang() ?? {};
  const t = TXT[lang] ?? TXT.fr;
  const c = conseilPour(label, { confidence, lang });

  // Étiquette inconnue : on le dit, plutôt que d'afficher un bloc vide.
  if (!c) {
    return (
      <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>
        <p className="text-[13px] text-ink-500">{t.aucuneFiche}</p>
      </section>
    );
  }

  const ton = TONS[c.tone] ?? TONS.warn;

  return (
    <section className={`overflow-hidden rounded-2xl border ${ton.bord} ${ton.fond} ${className}`}>
      <header className="flex items-start gap-3 p-4">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ton.pastille} text-white`}>
          <Icon name={c.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-[15px] font-bold leading-tight ${ton.texte}`}>{c.titre}</h3>
            <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ton.pastille} text-white`}>
              {t.urgence[c.urgence]}
            </span>
          </div>
          {c.derja && <p className="mt-0.5 text-[11px] text-ink-400">{c.derja}</p>}
          <p className="mt-1.5 text-[13px] leading-[1.5] text-ink-600">{resumeCourt(c, lang)}</p>
        </div>
      </header>

      <div className="border-t border-white/60 bg-white/70 px-4 pb-4 pt-1">
        <Liste
          titre={c.etat === "sain" ? t.pourQueCaDure : t.aFaire}
          items={c.conseils}
          icone={c.etat === "sain" ? "shield" : "bolt"}
        />
        <Liste titre={t.prevention} items={c.prevention} icone="shield" />
        <p className="mt-4 flex gap-2 text-[11px] leading-[1.45] text-ink-400">
          <Icon name="info" className="mt-[1px] h-3.5 w-3.5 shrink-0" />
          <span>{c.note}</span>
        </p>
      </div>
    </section>
  );
}
