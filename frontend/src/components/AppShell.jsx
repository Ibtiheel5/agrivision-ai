import { NavLink, Outlet } from "react-router-dom";
import "../app.css";

const TABS = [["/", "Accueil"], ["/map", "Carte"], ["/history", "Historique"], ["/settings", "Réglages"]];

export default function AppShell() {
  return (
    <div className="shell">
      <main className="main"><Outlet /></main>
      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "tab active" : "tab")}>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
