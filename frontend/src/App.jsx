import { useEffect, useState } from "react";
import ImageDetector from "./components/ImageDetector";
import ModelPage from "./components/ModelPage";
import ThresholdSlider from "./components/ThresholdSlider";
import WebcamDetector from "./components/WebcamDetector";
import { getHealth } from "./services/api";
import "./app.css";
import { NavContext } from "./lib/nav";
import HomePage from "./pages/HomePage";
import DetectPage from "./pages/DetectPage";
import AdvicePage from "./pages/AdvicePage";
import RiskMapPage from "./pages/RiskMapPage";
import HistoryPage from "./pages/HistoryPage";
import WeatherPage from "./pages/WeatherPage";
import SettingsPage from "./pages/SettingsPage";

const TABS = [
  ["home", "Accueil"],
  ["detect", "Analyser"],
  ["map", "Carte"],
  ["history", "Historique"],
  ["weather", "Météo"],
  ["settings", "Réglages"],
  ["image", "Image"],
  ["webcam", "Webcam"],
  ["model", "Modèle"],
];

const MOBILE_TABS = [
  ["home", "Accueil", "home"],
  ["map", "Carte", "map"],
  ["history", "Historique", "history"],
  ["settings", "Profil", "settings"],
];

const MORE_TABS = [
  ["weather", "Météo", "weather"],
  ["image", "Analyse d’image", "image"],
  ["webcam", "Caméra en direct", "camera"],
  ["model", "Informations du modèle", "model"],
];

const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
  leaf: "M20 4c-8 0-14 4-14 11a5 5 0 0 0 5 5c7 0 11-6 9-16ZM5 20c2-4 5-7 10-10",
  map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15",
  history: "M3 12a9 9 0 1 0 2.64-6.36L3 8m0-5v5h5m4-1v5l3 2",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  weather: "M20 15.5a4.5 4.5 0 0 0-4-4.47A6 6 0 1 0 5 17h11a4 4 0 0 0 4-1.5ZM8 20l-1 2m6-2-1 2",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.42 1.42M7.06 16.94l-1.42 1.42m12.72 0-1.42-1.42M7.06 7.06 5.64 5.64",
  image: "M4 4h16v16H4zM8 14l3-3 5 5m-2-6h.01",
  camera: "M4 7h3l2-3h6l2 3h3v13H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  model: "M12 3v4m0 10v4M3 12h4m10 0h4M5.64 5.64l2.83 2.83m7.06 7.06 2.83 2.83m0-12.72-2.83 2.83m-7.06 7.06-2.83 2.83M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
};

function Icon({ name, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function HealthBadge({ health }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-800",
    degraded: "bg-amber-100 text-amber-900",
    offline: "bg-red-100 text-red-800",
  };
  const label = !health
    ? "Connexion…"
    : health.status === "ok"
      ? `API en ligne · ${health.model_version ?? ""}${health.gpu ? " · GPU" : " · CPU"}`
      : health.status === "degraded"
        ? "API en ligne, modèle non chargé"
        : "API hors ligne";
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[health?.status] ?? "bg-slate-100 text-slate-600"}`}>{label}</span>;
}

export default function App() {
  const [view, setView] = useState({ page: "home", params: {} });
  const [threshold, setThreshold] = useState(0.25);
  const [health, setHealth] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const go = (page, params = {}) => {
    setView({ page, params });
    setMoreOpen(false);
    window.scrollTo(0, 0);
  };
  const page = view.page;
  const activeTab = page === "advice" ? "history" : page;

  useEffect(() => {
    let alive = true;
    const poll = () =>
      getHealth()
        .then((h) => alive && setHealth(h))
        .catch(() => alive && setHealth({ status: "offline" }));
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <NavContext.Provider value={{ go, params: view.params }}>
      <div className="app-shell min-h-screen">
        <header className="app-header sticky top-0 z-30 border-b border-line bg-white">
          <div className="app-header-inner mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
            <div>
              <h1 className="app-brand font-sans text-2xl font-bold text-brand">
                <Icon name="leaf" className="app-brand-icon" />
                AgriSahel
              </h1>
              <p className="app-subtitle text-sm text-slate-500">AgriVision AI · Une agriculture plus résiliente</p>
            </div>
            <div className="app-health">
              <span className={`health-dot ${health?.status ?? "loading"}`} aria-hidden="true" />
              <HealthBadge health={health} />
              <button
                type="button"
                className="app-more-toggle"
                aria-label="Ouvrir les autres fonctionnalités"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((open) => !open)}
              >
                <Icon name="more" className="mobile-nav-icon" />
              </button>
            </div>
          </div>
        </header>

        <main className="app-main mx-auto max-w-6xl space-y-6 px-5 py-6">
          <nav className="desktop-nav flex gap-2 overflow-x-auto pb-1" aria-label="Navigation principale">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={activeTab === id ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  activeTab === id ? "bg-brand text-white" : "bg-white text-slate-700 hover:bg-emerald-50"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {(page === "image" || page === "webcam") && <ThresholdSlider value={threshold} onChange={setThreshold} />}

          {page === "home" && <HomePage />}
          {page === "detect" && <DetectPage />}
          {page === "advice" && <AdvicePage />}
          {page === "map" && <RiskMapPage />}
          {page === "history" && <HistoryPage />}
          {page === "weather" && <WeatherPage />}
          {page === "settings" && <SettingsPage />}
          {page === "image" && <ImageDetector threshold={threshold} />}
          {page === "webcam" && <WebcamDetector threshold={threshold} />}
          {page === "model" && <ModelPage />}
        </main>

        <nav className="mobile-nav" aria-label="Navigation principale">
          {MOBILE_TABS.slice(0, 2).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className={`mobile-nav-item ${activeTab === id ? "active" : ""}`}
            >
              <Icon name={icon} className="mobile-nav-icon" />
              <span>{label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => go("detect")}
            aria-current={activeTab === "detect" ? "page" : undefined}
            className={`mobile-nav-item mobile-nav-analyze ${activeTab === "detect" ? "active" : ""}`}
          >
            <span className="mobile-nav-analyze-icon"><Icon name="leaf" className="mobile-nav-icon" /></span>
            <span>Analyser</span>
          </button>
          {MOBILE_TABS.slice(2).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className={`mobile-nav-item ${activeTab === id ? "active" : ""}`}
            >
              <Icon name={icon} className="mobile-nav-icon" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {moreOpen && (
          <>
            <button
              type="button"
              className="mobile-menu-backdrop"
              aria-label="Fermer le menu"
              onClick={() => setMoreOpen(false)}
            />
            <div className="mobile-more-menu" role="menu" aria-label="Autres fonctionnalités">
              {MORE_TABS.map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => go(id)}
                  className={`mobile-more-item ${activeTab === id ? "active" : ""}`}
                >
                  <Icon name={icon} className="mobile-more-icon" />
                  <span>{label}</span>
                  {activeTab === id && <span className="mobile-more-current">Ouvert</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </NavContext.Provider>
  );
}