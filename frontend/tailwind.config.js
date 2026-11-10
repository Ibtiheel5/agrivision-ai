export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Poppins", "system-ui", "-apple-system", "Segoe UI", "sans-serif"] },
      colors: {
        leaf: { 50: "#eef6f1", 100: "#dcebe1", 500: "#2b6a4d", 600: "#235a41", 700: "#1d4a35", 900: "#12301f" },
        olive: { 100: "#e6efd5", 400: "#9bbd62", 500: "#7fa04f", 600: "#678640" },
        soil: "#8a5a3b",
      },
      keyframes: {
        slideUp: { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        scanline: { "0%": { top: "8%" }, "100%": { top: "92%" } },
      },
      animation: { "slide-up": "slideUp .35s ease-out", scanline: "scanline 1.4s ease-in-out infinite alternate" },
    },
  },
  plugins: [],
};
