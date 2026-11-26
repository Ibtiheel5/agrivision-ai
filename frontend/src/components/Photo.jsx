import { useState } from "react";
import CropTile from "./CropTile";
import { fallbackPhoto } from "../data/photos";

/**
 * Photo réelle avec deux filets de sécurité : si le fichier du dataset manque, on passe à une
 * image déjà présente dans le projet ; s'il n'y en a pas non plus, on affiche la vignette dessinée.
 */
export default function Photo({ src, fallbackKey, crop = "autres", alt = "", className = "", children }) {
  const [etape, setEtape] = useState(0); // 0 = photo demandée, 1 = photo de repli, 2 = vignette dessinée
  const source = etape === 0 ? src : etape === 1 ? fallbackPhoto(fallbackKey ?? src ?? crop) : null;

  if (!source) {
    return (
      <CropTile crop={crop} className={className}>
        {children}
      </CropTile>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-brand-50 ${className}`}>
      <img
        src={source}
        alt={alt}
        loading="lazy"
        onError={() => setEtape((e) => e + 1)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
