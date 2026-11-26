import { useState } from "react";

/**
 * Colonnes d'activité : comparer des magnitudes dans le temps.
 * Une seule série, donc une seule teinte et pas de légende : le titre nomme la donnée.
 * Extrémités arrondies de 4 px posées sur la ligne de base, 2 px d'écart entre colonnes,
 * axes discrets, et une infobulle au survol comme le demande le guide.
 */
export default function MiniBars({ data, unit = "", color = "#4b963b" }) {
  const [actif, setActif] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="relative">
      <div className="flex h-[88px] items-end gap-[2px]">
        {data.map((d, i) => {
          const hauteur = Math.max(4, (d.value / max) * 76);
          const vide = d.value === 0;
          return (
            <button
              key={d.label}
              type="button"
              onMouseEnter={() => setActif(i)}
              onMouseLeave={() => setActif(null)}
              onFocus={() => setActif(i)}
              onBlur={() => setActif(null)}
              className="group relative flex flex-1 flex-col items-center justify-end"
              aria-label={`${d.label} : ${d.value} ${unit}`}
            >
              <span
                className="w-full rounded-t-[4px] transition-opacity"
                style={{
                  height: `${hauteur}px`,
                  background: vide ? "#e8eee1" : color,
                  opacity: actif === null || actif === i ? 1 : 0.45,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Ligne de base discrète */}
      <div className="mt-1 h-px bg-line" />

      <div className="mt-1.5 flex gap-[2px]">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[9px] text-ink-400">{d.label}</span>
        ))}
      </div>

      {actif !== null && (
        <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-lg bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-raised">
          {data[actif].label} · {data[actif].value} {unit}
        </div>
      )}
    </div>
  );
}
