/**
 * Design system AgriVision — vert agricole systématisé.
 * Les couleurs écrites en dur dans les anciens écrans continuent de fonctionner ;
 * tout nouveau code utilise ces tokens (bg-brand-500, text-ink-700, border-line…).
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Poppins", "system-ui", "-apple-system", "Segoe UI", "sans-serif"] },
      colors: {
        // Vert principal : boutons, liens, états actifs
        brand: {
          50: "#f0f7ee",
          100: "#dcecd6",
          200: "#bbdaaf",
          300: "#93c381",
          400: "#6ba95a",
          500: "#4b963b",
          600: "#3a7c2e",
          700: "#2f6226",
          800: "#285020",
          900: "#1b3a18",
        },
        // Vert profond : en-têtes, fonds immersifs
        forest: { 500: "#1f7a4d", 600: "#1a6843", 700: "#155d3c", 800: "#114a30", 900: "#0d3724" },
        // Accent clair : badges, appels à l'action sur fond sombre
        lime: { 200: "#e2f5af", 300: "#c8f28b", 400: "#b7ed69", 500: "#9bd94a" },
        // Neutres chauds
        ink: { 400: "#99a095", 500: "#818a7e", 600: "#657163", 700: "#4c5a4b", 800: "#2d3e31", 900: "#20372a" },
        canvas: "#f7f8f3",
        surface: "#ffffff",
        line: "#e8eee1",
        // États
        danger: { 50: "#fbefec", 500: "#a94f3c" },
        warn: { 50: "#fdf4e3", 500: "#b4802c" },
        info: { 50: "#eaf2f5", 500: "#3b7a8c" },
        // Conservés pour les écrans existants
        leaf: { 50: "#eef6f1", 100: "#dcebe1", 500: "#2b6a4d", 600: "#235a41", 700: "#1d4a35", 900: "#12301f" },
        olive: { 100: "#e6efd5", 400: "#9bbd62", 500: "#7fa04f", 600: "#678640" },
        soil: "#8a5a3b",
      },
      borderRadius: { card: "1.25rem", pill: "999px" },
      boxShadow: {
        card: "0 4px 16px rgba(38, 63, 38, 0.05)",
        raised: "0 10px 28px rgba(30, 67, 39, 0.16)",
        focus: "0 0 0 3px rgba(75, 150, 59, 0.25)",
      },
      keyframes: {
        slideUp: { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        scanline: { "0%": { top: "8%" }, "100%": { top: "92%" } },
        fadeUp: { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "none" } },
        popIn: { from: { opacity: 0, transform: "scale(.96)" }, to: { opacity: 1, transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        breathe: { "0%, 100%": { opacity: 1 }, "50%": { opacity: .45 } },
      },
      animation: {
        "slide-up": "slideUp .35s ease-out",
        scanline: "scanline 1.4s ease-in-out infinite alternate",
        "fade-up": "fadeUp .32s cubic-bezier(.2,.7,.3,1) both",
        "pop-in": "popIn .22s cubic-bezier(.2,.8,.3,1) both",
        shimmer: "shimmer 1.4s infinite",
        breathe: "breathe 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
