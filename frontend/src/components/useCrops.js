import { useEffect, useState } from "react";

/** Découpe chaque détection dans l'image pour en faire une miniature (data URL). */
export default function useCrops(src, detections) {
  const [crops, setCrops] = useState([]);
  useEffect(() => {
    if (!src) return undefined;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setCrops(
        detections.map(({ box }) => {
          const w = Math.max(1, box.x2 - box.x1);
          const h = Math.max(1, box.y2 - box.y1);
          const k = Math.min(1, 160 / Math.max(w, h));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(w * k));
          c.height = Math.max(1, Math.round(h * k));
          c.getContext("2d").drawImage(img, box.x1, box.y1, w, h, 0, 0, c.width, c.height);
          return c.toDataURL("image/jpeg", 0.7);
        }),
      );
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, detections]);
  return crops;
}
