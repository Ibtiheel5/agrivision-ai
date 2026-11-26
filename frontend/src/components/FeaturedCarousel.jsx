import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import Photo from "./Photo";
import { CROPS, TYPES } from "../data/diseases";
import { diseasePhoto } from "../data/photos";

const DELAI = 5000;

/**
 * Bandeau « à la une » : grandes photos qui défilent toutes les 5 secondes.
 * Le défilement s'arrête au toucher et quand l'utilisateur a demandé moins d'animations.
 */
export default function FeaturedCarousel({ items, eyebrow, cta }) {
  const [index, setIndex] = useState(0);
  const pause = useRef(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => {
      if (!pause.current) setIndex((i) => (i + 1) % items.length);
    }, DELAI);
    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) return null;
  const actif = items[index];
  const type = TYPES[actif.type];

  return (
    <section
      onPointerDown={() => { pause.current = true; }}
      onPointerUp={() => { pause.current = false; }}
    >
      <Link
        to={`/library/${actif.id}`}
        className="block rounded-[1.4rem] shadow-raised transition active:scale-[0.99]"
      >
        <Photo
          key={actif.id}
          src={diseasePhoto(actif.id)}
          fallbackKey={actif.id}
          crop={actif.crop}
          alt={actif.fr}
          className="h-[188px] rounded-[1.4rem] animate-fade-up motion-reduce:animate-none"
        >
          <span className="absolute inset-0 bg-gradient-to-t from-forest-900/95 via-forest-900/45 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 p-4">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white ring-1 ring-white/25 backdrop-blur">
              <Icon name={type?.icon ?? "leaf"} className="h-3 w-3" />
              {eyebrow}
            </span>
            <span className="mt-2 block text-[17px] font-bold leading-tight text-white">{actif.fr}</span>
            <span className="mt-0.5 block text-[11px] text-white/75">{CROPS[actif.crop]}</span>
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-pill bg-lime-400 px-3 py-1.5 text-[11px] font-bold text-forest-900">
              {cta}
              <Icon name="arrow" className="h-3.5 w-3.5" />
            </span>
          </span>
        </Photo>
      </Link>

      {/* Indicateurs de position, cliquables */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={it.fr}
            aria-current={i === index ? "true" : undefined}
            className={`h-1.5 rounded-pill transition-all ${i === index ? "w-6 bg-brand-500" : "w-1.5 bg-line"}`}
          />
        ))}
      </div>
    </section>
  );
}
