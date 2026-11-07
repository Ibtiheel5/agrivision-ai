import { useEffect, useState } from "react";
import { API, getJSON } from "../api";
import { clearHistory } from "../lib/history";
import { useSettings } from "../lib/settings";

export default function SettingsPage() {
  const [settings, update] = useSettings();
  const [places, setPlaces] = useState([]);
  useEffect(() => { getJSON("/weather/places").then(setPlaces).catch(() => {}); }, []);

  return (
    <div className="av"><div className="page">
      <header className="screen-heading">
        <p className="eyebrow">VOTRE ESPACE AGRICOLE</p>
        <h1>Mon profil</h1>
        <p className="muted">Personnalisez votre suivi dans le Sahel.</p>
      </header>
      <label className="field">Mon gouvernorat
        <select className="input" value={settings.place} onChange={(e) => update({ place: e.target.value })}>
          {(places.length ? places.map((p) => p.name) : [settings.place]).map((n) => <option key={n}>{n}</option>)}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={settings.shareLocation} onChange={(e) => update({ shareLocation: e.target.checked })} />
        <span>
          Partager ma position approximative (~1 km) pour alimenter la carte.
          <span className="muted small"> Jamais la photo, jamais la parcelle exacte.</span>
        </span>
      </label>
      <button className="btn btn-secondary" onClick={() => { if (window.confirm("Effacer l'historique de cet appareil ?")) clearHistory(); }}>
        Effacer l'historique de cet appareil
      </button>
      <p className="muted small">Serveur : {API}</p>
    </div></div>
  );
}
