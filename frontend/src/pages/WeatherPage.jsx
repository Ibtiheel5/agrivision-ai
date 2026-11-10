import { useEffect, useState } from "react";
import { getJSON } from "../api";
import { useSettings } from "../lib/settings";

export default function WeatherPage() {
  const [settings, update] = useSettings();
  const [places, setPlaces] = useState([]);
  const [w, setW] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { getJSON("/weather/places").then(setPlaces).catch(() => {}); }, []);
  useEffect(() => {
    setW(null); setErr("");
    getJSON(`/weather?place=${encodeURIComponent(settings.place)}`).then(setW).catch((e) => setErr(e.message));
  }, [settings.place]);

  return (
    <div className="av"><div className="page weather-page">
      <header className="screen-heading">
        <p className="eyebrow">MÉTÉO AGRICOLE</p>
        <h1>Météo et alertes</h1>
      </header>
      <label className="weather-location">
        <span aria-hidden="true">⌖</span>
        <select aria-label="Choisir le gouvernorat" value={settings.place} onChange={(e) => update({ place: e.target.value })}>
          {(places.length ? places.map((p) => p.name) : [settings.place]).map((n) => <option key={n}>{n}</option>)}
        </select>
        <span>Tunisie</span>
      </label>
      {err && <div className="notice alerte" role="alert">Météo indisponible ({err}).</div>}
      {w && (
        <>
          <section className="weather-current-card">
            <div className="weather-current-main">
              <span className="weather-sun" aria-hidden="true">{w.current.label?.toLowerCase().includes("pluie") ? "☁" : "☀"}</span>
              <div><b>{Math.round(w.current.temp)}°</b><span>{w.current.label}</span></div>
              <small>Ressenti selon les conditions locales</small>
            </div>
            <div className="weather-stats">
              <div><span>Humidité</span><b>{w.current.humidity}%</b></div>
              <div><span>Vent</span><b>{Math.round(w.current.wind_kmh)} km/h</b></div>
              <div><span>Pluie</span><b>{Number(w.current.rain_mm).toFixed(0)} mm</b></div>
            </div>
          </section>
          <section className="forecast-section">
            <div className="section-heading">
              <div><p className="eyebrow">TENDANCE LOCALE</p><h2>Prévisions à 4 jours</h2></div>
              <span className="forecast-source">Open-Meteo</span>
            </div>
            <div className="forecast-grid">
              {w.days.slice(0, 4).map((day, index) => (
                <article key={day.date} className={`forecast-day ${index === 0 ? "today" : ""}`}>
                  <span>{index === 0 ? "Auj." : new Date(`${day.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                  <span className="forecast-icon" aria-hidden="true">
                    {day.label?.toLowerCase().includes("pluie") || day.label?.toLowerCase().includes("averse") ? "☁" : "☀"}
                  </span>
                  <b>{Math.round(day.tmax)}°</b>
                  <small>{Math.round(day.tmin)}° min</small>
                  <small>{Number(day.rain_mm).toFixed(0)} mm pluie</small>
                </article>
              ))}
            </div>
          </section>
          {w.alert.level !== "aucune" && (
            <section className={`weather-alert ${w.alert.level}`}>
              <span className="weather-alert-icon" aria-hidden="true">!</span>
              <div><p className="eyebrow">VIGILANCE AGRICOLE</p><h2>{w.alert.title}</h2><p>{w.alert.message}</p></div>
            </section>
          )}
          <section className="weather-advice">
            <span className="weather-advice-icon" aria-hidden="true">✳</span>
            <div><p className="eyebrow">RECOMMANDATIONS MÉTÉO</p>
              <p>{w.current.temp >= 30 || w.alert.level === "alerte"
                ? "Arrosez tôt le matin ou en soirée pour limiter l’évaporation. Un paillage aide à garder l’humidité du sol."
                : "Surveillez les prévisions locales et adaptez l’irrigation aux besoins de vos cultures."}</p>
            </div>
          </section>
          <details className="weather-details">
            <summary>Détails sur les 7 prochains jours</summary>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Jour</th><th>Ciel</th><th>Min / Max</th><th>Pluie</th><th>ET0</th></tr></thead>
                <tbody>{w.days.map((day) => (
                  <tr key={day.date}>
                    <td>{new Date(`${day.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</td>
                    <td>{day.label}</td><td>{Math.round(day.tmin)}° / {Math.round(day.tmax)}°</td>
                    <td>{Number(day.rain_mm).toFixed(1)} mm</td><td>{Number(day.et0_mm).toFixed(1)} mm</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="muted small">ET0 : évapotranspiration de référence. Source : Open-Meteo.</p>
          </details>
        </>
      )}
    </div></div>
  );
}
