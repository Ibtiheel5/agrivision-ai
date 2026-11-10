import { useEffect, useRef } from "react";
import { colorFor } from "../colors";

/** Dessine l'image et, par-dessus, les boîtes (coordonnées de l'image d'origine) avec label + score. */
export default function BoundingBoxCanvas({ src, detections = [], imageWidth, imageHeight }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!src) return undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !ref.current) return;
      const cv = ref.current;
      const w = imageWidth || img.naturalWidth;
      const h = imageHeight || img.naturalHeight;
      cv.width = w;
      cv.height = h;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const lw = Math.max(2, w / 220);
      const fs = Math.max(12, Math.round(w / 40));
      ctx.font = `bold ${fs}px system-ui, sans-serif`;
      detections.forEach((d) => {
        const { x1, y1, x2, y2 } = d.box;
        const col = colorFor(d.class_id);
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        const txt = `${d.label} ${Math.round(d.confidence * 100)}%`;
        const tw = ctx.measureText(txt).width + 10;
        const ty = Math.max(fs + 6, y1);
        ctx.fillStyle = col;
        ctx.fillRect(x1, ty - fs - 6, tw, fs + 6);
        ctx.fillStyle = "#fff";
        ctx.fillText(txt, x1 + 5, ty - 5);
      });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, detections, imageWidth, imageHeight]);
  return <canvas ref={ref} className="w-full h-auto rounded-xl bg-black/5" aria-label="Image avec détections" />;
}
