// frontend/src/pages/RiskMapPage.jsx  (à adapter au chemin de ton repo)
// npm i leaflet react-leaflet   (react-leaflet v4 pour React 18, v5 pour React 19)
import { useEffect, useState } from "react";
import {
  MapContainer, TileLayer, LayersControl, LayerGroup, CircleMarker, Popup, useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Niveaux différenciés par la luminosité ET par le texte (pas seulement la couleur)
const LEVELS = {
  faible:     { label: "Faible",     color: "#F2E3A0" },
  modere:     { label: "Modéré",     color: "#F2C14E" },
  eleve:      { label: "Élevé",      color: "#E0701F" },
  tres_eleve: { label: "Très élevé", color: "#9E2A1B" },
};

// NASA GIBS : NDVI MODIS (réel, gratuit, sans clé). "default" = dernière date disponible.
// Résolution grossière (~250 m à 1 km) : utile à l'échelle région, pas à la parcelle.
const NDVI_URL =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png";

function LocateControl({ onError }) {
  const map = useMap();
  return (
    <button
      type="button"
      className="map-locate-button"
      aria-label="Centrer la carte sur ma position"
      title="Ma position"
      onClick={() => {
        if (!navigator.geolocation) {
          onError("La localisation n’est pas disponible sur cet appareil.");
          return;
        }
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            onError("");
            map.setView([coords.latitude, coords.longitude], 9);
          },
          () => onError("Autorisez la localisation pour centrer la carte."),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
      </svg>
    </button>
  );
}

export default function RiskMapPage() {
  const [risk, setRisk] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [error, setError] = useState("");
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    const get = (path) =>
      fetch(`${API}${path}`).then((r) => {
        if (!r.ok) throw new Error(`${path} : ${r.status}`);
        return r.json();
      });
    get("/map/weather-risk").then(setRisk).catch((e) => setError(e.message));
    get("/map/analyses?days=30").then(setAnalyses).catch(() => {});
  }, []);

  return (
    <div className="av"><div className="page map-page">
      <header className="screen-heading">
        <p className="eyebrow">SAHEL TUNISIEN</p>
        <h1>Carte des risques</h1>
        <p className="muted">Météo, végétation et analyses partagées.</p>
      </header>
      {locationError && <p className="notice vigilance" role="status">{locationError}</p>}
      <div className="risk-map-wrap">
      <MapContainer center={[34.0, 9.6]} zoom={6} minZoom={5}
        maxBounds={[[29.5, 6.5], [38.5, 12.5]]} style={{ height: "100%", width: "100%" }}>
        <LocateControl onError={setLocationError} />
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Plan (OpenStreetMap)">
            <TileLayer attribution="&copy; OpenStreetMap"
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite (Esri)">
            <TileLayer attribution="Imagery &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay name="NDVI satellite (NASA MODIS)">
            <TileLayer url={NDVI_URL} opacity={0.7} maxNativeZoom={9}
              attribution="NASA GIBS / MODIS" />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Déficit hydrique (météo)">
            <LayerGroup>
              {risk.map((g) => (
                <CircleMarker key={g.name} center={[g.lat, g.lon]} radius={16}
                  pathOptions={{ color: "#1D2A22", weight: 1.5,
                    fillColor: LEVELS[g.level]?.color ?? "#94a3b8", fillOpacity: 0.85 }}>
                  <Popup>
                    <b>{g.name}</b> : risque {(LEVELS[g.level]?.label ?? "inconnu").toLowerCase()}<br />
                    Pluie 14 j passés : {g.rain_past_mm} mm<br />
                    Pluie 7 j prévus : {g.rain_next_mm} mm<br />
                    ET0 (21 j) : {g.et0_total_mm} mm<br />
                    Indice : {g.deficit_index}
                  </Popup>
                </CircleMarker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Analyses AgriVision (30 j)">
            <LayerGroup>
              {analyses.map((a, i) => (
                <CircleMarker key={i} center={[a.lat, a.lon]} radius={5}
                  pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#1F5E3B", fillOpacity: 1 }}>
                  <Popup>
                    <b>{a.label}</b> ({Math.round(a.confidence * 100)} %)<br />
                    {a.created_at.slice(0, 10)}
                  </Popup>
                </CircleMarker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>

      <div className="map-legend">
        <b>Risque de sécheresse</b>
        {Object.values(LEVELS).map((l) => (
          <div key={l.label}>
            <i style={{ display: "inline-block", width: 12, height: 12,
              background: l.color, border: "1px solid #1D2A22", marginRight: 6, borderRadius: 4 }} />
            {l.label}
          </div>
        ))}
        <div className="map-legend-note">
          Indice = 1 − pluie / ET0 (Open-Meteo). Seuils heuristiques.
        </div>
      </div>

      {error && (
        <div className="map-error">
          Données de risque indisponibles ({error}). Vérifiez que le backend fonctionne.
        </div>
      )}
      </div>
    </div></div>
  );
}
