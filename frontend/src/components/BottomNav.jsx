import { Link, NavLink } from "react-router-dom";
import Icon from "./Icon";
import { useLang } from "../LangContext";

/** Onglet : l'élément actif prend la forme d'une pastille verte. */
const tab = ({ isActive }) =>
  `flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-pill px-2 py-2 text-[11px] font-semibold transition ${
    isActive ? "bg-brand-50 text-brand-700" : "text-ink-400"
  }`;

/** Barre flottante : quatre onglets et un bouton central surélevé pour le scanner. */
export default function BottomNav() {
  const { t, lang } = useLang();
  const fr = lang !== "derja";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label={t("app")}
        className="pointer-events-auto relative flex items-center gap-1 rounded-[1.5rem] border border-line bg-surface/95 p-1.5 shadow-raised backdrop-blur"
      >
        <NavLink to="/" end className={tab}>
          {({ isActive }) => (
            <>
              <Icon name="home" className="h-[18px] w-[18px]" />
              {isActive && <span>{t("navHome")}</span>}
            </>
          )}
        </NavLink>
        <NavLink to="/library" className={tab}>
          {({ isActive }) => (
            <>
              <Icon name="book" className="h-[18px] w-[18px]" />
              {isActive && <span>{fr ? "Maladies" : "Amradh"}</span>}
            </>
          )}
        </NavLink>

        <Link
          to="/scan"
          aria-label={t("navScan")}
          className="relative -mt-8 flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full border-[5px] border-canvas bg-brand-500 text-white shadow-raised transition active:scale-95"
        >
          <Icon name="scan" className="h-6 w-6" />
        </Link>

        <NavLink to="/assistant" className={tab}>
          {({ isActive }) => (
            <>
              <Icon name="message" className="h-[18px] w-[18px]" />
              {isActive && <span>{fr ? "Assistant" : "Mousa3ed"}</span>}
            </>
          )}
        </NavLink>
        <NavLink to="/tools" className={tab}>
          {({ isActive }) => (
            <>
              <Icon name="sliders" className="h-[18px] w-[18px]" />
              {isActive && <span>{t("tools")}</span>}
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
}
