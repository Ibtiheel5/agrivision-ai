import { useLang } from "../LangContext";

export default function LangToggle({ className = "" }) {
  const { lang, toggle } = useLang();
  return (
    <button type="button" onClick={toggle} className={`rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur ${className}`} aria-label="Changer de langue">
      {lang === "derja" ? "FR" : "TN"}
    </button>
  );
}
