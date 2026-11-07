import { useEffect, useState } from "react";
import { getJSON } from "../api";
import { listHistory, prettyLabel } from "../lib/history";
import { Go, useNav } from "../lib/nav";
import { useSettings } from "../lib/settings";

const FEATURES = [
  { to: "map", icon: "plot", title: "Mes parcelles", detail: "Risques dans votre région", tone: "mint" },
  { to: "weather", icon: "weather", title: "Météo", detail: "Prévisions locales", tone: "sun" },
  { to: "map", icon: "map", title: "Carte des risques", detail: "Anticipez la sécheresse", tone: "amber" },
  { to: "history", icon: "history", title: "Historique", detail: "Vos dernières analyses", tone: "blue" },
];

function FeatureIcon({ name }) {
  const paths = {
    plot: <><path d="M4 20V8l8-5 8 5v12M8 20v-7h8v7M2 20h20" /><path d="M12 3v5" /></>,
    weather: <><circle cx="8" cy="8" r="3" /><path d="M8 1v2m0 10v2m7-7h-2m-10 0H1m12-5-2 2m-6 6-2 2m13-1a4 4 0 0 0-7.5 2H17a3 3 0 0 0 0-6" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15m6-12v15" /></>,
    history: <><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" /><path d="M3 3v5h5m4-1v5l3 2" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function HomePage() {
  const [settings] = useSettings();
  const { go } = useNav();
  const [w, setW] = useState(null);
  const [err, setErr] = useState("");
  const history = listHistory();
  const last = history[0];

  useEffect(() => {
    getJSON(`/weather?place=${encodeURIComponent(settings.place)}`).then(setW).catch((e) => setErr(e.message));
  }, [settings.place]);

  return (
    <div className="av"><div className="page home-page">
      <section className="home-hero">
        <div className="home-landscape" aria-hidden="true">
          <div className="landscape-sun" />
          <div className="landscape-hill hill-back" />
          <div className="landscape-hill hill-front" />
          <div className="olive-row row-one" />
          <div className="olive-row row-two" />
        </div>
        <div className="home-hero-content">
          <span className="hero-kicker">AGRIVISION AI · SAHEL TUNISIEN</span>
          <h1>Protégeons nos cultures au Sahel</h1>
          <p>Surveillez vos plantes et anticipez les risques grâce à l’intelligence artificielle.</p>
          <Go to="detect" className="btn btn-primary home-cta"><span aria-hidden="true">⌕</span> Analyser une plante</Go>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div><p className="eyebrow">VOTRE EXPLOITATION</p><h2>Tout votre Sahel, en un coup d’œil</h2></div>
          <span className="location-chip"><span aria-hidden="true">⌖</span> {settings.place}</span>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <Go key={feature.title} to={feature.to} className="feature-card">
              <span className={`feature-icon ${feature.tone}`}><FeatureIcon name={feature.icon} /></span>
              <span className="feature-title">{feature.title}</span>
              <span className="feature-detail">{feature.detail}</span>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </Go>
          ))}
        </div>
      </section>

      <section className="weather-preview">
        <div className="weather-preview-copy">
          <span className="eyebrow">LE TEMPS CHEZ VOUS</span>
          <b>{w ? `${Math.round(w.current.temp)}°` : "Météo"}</b>
          <span>{w ? w.current.label : "Prévisions agricoles locales"}</span>
          {err && <small className="muted">Données météo temporairement indisponibles.</small>}
        </div>
        <div className="weather-preview-icon" aria-hidden="true">☀</div>
        <Go to="weather" className="weather-preview-link">Voir la météo <span aria-hidden="true">→</span></Go>
      </section>

      {w?.alert?.level && w.alert.level !== "aucune" && (
        <div className={`notice ${w.alert.level}`}><b>{w.alert.title}.</b> {w.alert.message}</div>
      )}

      <section className="recent-section">
        <div className="section-heading">
          <div><p className="eyebrow">SUIVI RÉCENT</p><h2>Dernière analyse</h2></div>
          <Go to="history" className="text-link">Tout voir →</Go>
        </div>
        {last ? (
          <button type="button" className="recent-card" onClick={() => go("advice", { id: last.id })}>
            {last.thumb ? <img src={last.thumb} alt="" /> : <span className="recent-placeholder"><FeatureIcon name="plot" /></span>}
            <span className="recent-copy"><b>{prettyLabel(last.label)}</b><small>{new Date(last.createdAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })} · {last.place ?? settings.place}</small></span>
            <span className={`badge ${last.status === "incertain" ? "vigilance" : "ok"}`}>{Math.round(last.confidence * 100)} %</span>
          </button>
        ) : (
          <div className="empty-home"><span className="empty-home-icon"><FeatureIcon name="plot" /></span><span><b>Votre première analyse vous attend</b><small>Prenez une photo pour surveiller la santé de vos cultures.</small></span></div>
        )}
      </section>
    </div></div>
  );
}
