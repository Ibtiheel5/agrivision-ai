/**
 * Vignette de culture : dégradé et motif dessinés, pour des cartes illustrées sans
 * dépendre de photos sous licence. Chaque culture a sa teinte et son symbole.
 */
export const CROP_THEMES = {
  tomate: { from: "#d4553c", to: "#8e2d1d", glyph: "tomate" },
  pommeDeTerre: { from: "#b9854a", to: "#6d4722", glyph: "tubercule" },
  poivron: { from: "#3aa05b", to: "#1b5c32", glyph: "poivron" },
  mais: { from: "#e2b335", to: "#9a6f13", glyph: "epi" },
  vigne: { from: "#7d4ba3", to: "#3f2459", glyph: "raisin" },
  pommier: { from: "#d04a59", to: "#80222e", glyph: "pomme" },
  courge: { from: "#e59238", to: "#9a5313", glyph: "courge" },
  fraisier: { from: "#d9476f", to: "#86203f", glyph: "fraise" },
  autres: { from: "#4aa37a", to: "#215742", glyph: "feuille" },
};

// Symboles dessinés dans une grille 100×100, centrés dans la vignette.
const GLYPHS = {
  tomate: (
    <>
      <circle cx="50" cy="58" r="30" />
      <path d="M50 28v-8M50 28c-8-6-16-6-22-2 4 8 14 12 22 10zm0 0c8-6 16-6 22-2-4 8-14 12-22 10z" />
    </>
  ),
  tubercule: (
    <>
      <ellipse cx="50" cy="52" rx="34" ry="24" />
      <circle cx="38" cy="46" r="3" />
      <circle cx="58" cy="56" r="3" />
      <circle cx="62" cy="42" r="2.5" />
    </>
  ),
  poivron: (
    <>
      <path d="M28 44c14-12 30-12 44 0 8 30-14 44-22 44S20 74 28 44z" />
      <path d="M50 24v12M42 26h16" />
    </>
  ),
  epi: (
    <>
      <path d="M50 16c16 16 16 44 0 68-16-24-16-52 0-68z" />
      <path d="M50 24v60M38 40l12 6m24-6-12 6M38 58l12 6m24-6-12 6" />
    </>
  ),
  raisin: (
    <>
      <circle cx="38" cy="48" r="11" />
      <circle cx="62" cy="48" r="11" />
      <circle cx="50" cy="64" r="11" />
      <circle cx="50" cy="38" r="10" />
      <path d="M50 28v-10M50 18c8-4 14-2 18 2" />
    </>
  ),
  pomme: (
    <>
      <path d="M50 36c12-10 28-4 30 12 2 20-14 38-30 38S18 68 20 48c2-16 18-22 30-12z" />
      <path d="M50 34V20M50 22c6-6 14-6 18-2-4 6-12 8-18 2z" />
    </>
  ),
  courge: (
    <>
      <ellipse cx="38" cy="56" rx="16" ry="26" />
      <ellipse cx="62" cy="56" rx="16" ry="26" />
      <ellipse cx="50" cy="56" rx="18" ry="28" />
      <path d="M50 28V16" />
    </>
  ),
  fraise: (
    <>
      <path d="M24 42c16-14 36-14 52 0-4 34-20 46-26 46S28 76 24 42z" />
      <path d="M34 34h32M50 34V20" />
    </>
  ),
  feuille: (
    <>
      <path d="M22 80C22 44 42 24 82 22c0 40-20 58-60 58z" />
      <path d="M22 80 56 46" />
    </>
  ),
};

export default function CropTile({ crop = "autres", className = "", children }) {
  const theme = CROP_THEMES[crop] ?? CROP_THEMES.autres;
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }}
    >
      {/* halo décoratif */}
      <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 opacity-90"
        fill="rgba(255,255,255,.18)"
        stroke="rgba(255,255,255,.72)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {GLYPHS[theme.glyph]}
      </svg>
      <div className="relative h-full">{children}</div>
    </div>
  );
}
