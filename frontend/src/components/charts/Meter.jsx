/**
 * Jauge : une part contre un total, lue d'un coup d'œil.
 * Forme choisie d'après le guide de visualisation : un ratio unique se lit sur une jauge,
 * jamais sur un camembert à deux parts. Une seule teinte, piste et remplissage de la même rampe.
 * Rampe validée (monotonie, contraste) : #86ba72 (piste) → #4b963b (valeur).
 */
import useCountUp from "../../hooks/useCountUp";

export default function Meter({ label, value, total, suffix = "", tone = "#4b963b", track = "#86ba72" }) {
  const part = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const cible = Math.round(part * 100);
  const pourcent = useCountUp(cible); // le chiffre monte en même temps que la barre
  return (
    <div className="flex items-center gap-3">
      <span className="w-[86px] shrink-0 text-[11px] font-medium leading-4 text-ink-600">{label}</span>
      <span
        className="h-2.5 flex-1 overflow-hidden rounded-pill"
        style={{ background: track }}
        role="img"
        aria-label={`${label} : ${cible} %`}
      >
        <span className="block h-full rounded-pill transition-[width] duration-500" style={{ width: `${cible}%`, background: tone }} />
      </span>
      <span className="w-[52px] shrink-0 text-right text-[12px] font-bold tabular-nums text-ink-800">
        {pourcent} %{suffix}
      </span>
    </div>
  );
}
