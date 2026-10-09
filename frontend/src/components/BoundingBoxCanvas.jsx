import { useEffect, useRef } from "react";
import { classColor } from "../lib/colors";
import { describe } from "../lib/labels";

/**
 * Calque transparent dessiné par-dessus une <img> ou une <video>.
 * `width`/`height` = dimensions de l'image analysée (les boîtes sont dans ce repère) ;
 * le canvas est étiré en CSS sur le média, donc les boîtes restent alignées à toute taille d'écran.
 */
export default function BoundingBoxCanvas({ width, height, detections, showLabels = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !width || !height) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    const base = Math.min(width, height);
    const lineWidth = Math.max(2, Math.round(base / 200));
    const fontSize = Math.max(12, Math.round(base / 28));
    ctx.lineWidth = lineWidth;
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.textBaseline = "top";

    for (const d of detections) {
      const { x1, y1, x2, y2 } = d.box;
      const color = classColor(d.class_id);
      ctx.strokeStyle = color;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      if (!showLabels) continue;

      const text = `${describe(d.label).short} ${(d.confidence * 100).toFixed(0)}%`;
      const boxW = ctx.measureText(text).width + 10;
      const boxH = fontSize + 8;
      const ty = y1 - boxH >= 0 ? y1 - boxH : y1; // étiquette au-dessus, ou à l'intérieur si la boîte touche le bord
      ctx.fillStyle = color;
      ctx.fillRect(x1, ty, boxW, boxH);
      ctx.fillStyle = "#fff";
      ctx.fillText(text, x1 + 5, ty + 4);
    }
  }, [width, height, detections, showLabels]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
