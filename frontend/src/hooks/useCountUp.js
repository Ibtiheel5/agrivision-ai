import { useEffect, useRef, useState } from "react";

/**
 * Compte de 0 jusqu'à `target` en douceur, pour que les chiffres clés s'animent à l'affichage.
 * Respecte « réduire les animations » : dans ce cas la valeur finale s'affiche directement.
 */
export default function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduit || !Number.isFinite(target)) {
      setValue(target || 0);
      return undefined;
    }
    const depart = performance.now();
    const pas = (maintenant) => {
      const t = Math.min(1, (maintenant - depart) / duration);
      const adouci = 1 - (1 - t) ** 3; // ralentit à l'arrivée
      setValue(Math.round(target * adouci));
      if (t < 1) frame.current = requestAnimationFrame(pas);
    };
    frame.current = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
