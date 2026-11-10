import { Link, NavLink } from "react-router-dom";
import Icon from "./Icon";
import { useLang } from "../LangContext";

const item = ({ isActive }) => `relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-medium transition ${isActive ? "text-[#43833c] after:absolute after:top-0 after:h-0.5 after:w-5 after:rounded-full after:bg-[#62a34b]" : "text-[#a0a79d] hover:text-[#587b50]"}`;

/** Barre mobile : accueil, carnet, scanner, historique et outils. */
export default function BottomNav() {
  const { t } = useLang();
  return (
    <nav aria-label={t("app")} className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-[76px] max-w-xl items-center rounded-t-[1.4rem] border-t border-[#edf0e9] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(26,54,32,0.07)] backdrop-blur">
      <NavLink to="/" end className={item}>
        <Icon name="home" className="h-[19px] w-[19px]" />
        {t("navHome")}
      </NavLink>
      <NavLink to="/plants" className={item}>
        <Icon name="leaf" className="h-[19px] w-[19px]" />
        {t("myPlants")}
      </NavLink>
      <Link to="/scan" aria-label={t("navScan")} className="-mt-7 mx-1 flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border-[5px] border-[#f7f8f3] bg-[#4b963b] text-white shadow-md transition active:scale-95">
        <Icon name="scan" className="h-6 w-6" />
      </Link>
      <NavLink to="/history" className={item}>
        <Icon name="history" className="h-[19px] w-[19px]" />
        {t("history")}
      </NavLink>
      <NavLink to="/tools" className={item}>
        <Icon name="chart" className="h-[19px] w-[19px]" />
        {t("tools")}
      </NavLink>
    </nav>
  );
}
