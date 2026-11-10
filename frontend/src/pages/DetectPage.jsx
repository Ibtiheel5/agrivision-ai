import { useEffect, useState } from "react";
import { predict } from "../api";
import { addHistory, listHistory, makeThumbnail, uid, prettyLabel } from "../lib/history";
import { getPosition } from "../lib/geo";
import { useNav } from "../lib/nav";
import { useSettings } from "../lib/settings";

export default function DetectPage() {
  const { go } = useNav();
  const [settings] = useSettings();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState(null); // { empty } ou { entry, boxes, size }
  const recentPhotos = listHistory().filter((entry) => entry.thumb).slice(0, 5);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function onPick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f)); setRes(null); setError("");
    e.target.value = "";
  }

  async function analyze() {
    if (!file) return;
    setBusy(true); setError("");
    try {
      let pos = {};
      if (settings.shareLocation) { try { pos = await getPosition(); } catch { /* position facultative */ } }
      const out = await predict(file, { ...pos, share: settings.shareLocation });
      if (!out.primary) { setRes({ empty: true }); return; }
      const entry = addHistory({
        id: uid(), createdAt: new Date().toISOString(),
        label: out.primary.label, confidence: out.primary.confidence, status: out.status,
        top3: out.top3, count: out.detections.length, thumb: await makeThumbnail(file),
        place: settings.place,
        latencyMs: out.latencyMs, modelVersion: out.modelVersion,
      });
      setRes({
        entry,
        boxes: out.detections.map((d) => d.box).filter(Boolean),
        size: [out.imageWidth, out.imageHeight],
      });
    } catch (e) {
      setError(`Analyse impossible : ${e.message}`);
    } finally { setBusy(false); }
  }

  const entry = res?.entry;
  const uncertain = entry?.status === "incertain";

  return (
    <div className="av"><div className="page">
      <header className="screen-heading">
        <p className="eyebrow">DIAGNOSTIC PAR INTELLIGENCE ARTIFICIELLE</p>
        <h1>Détection de plante</h1>
        <p className="muted">Photographiez une feuille nette et bien éclairée.</p>
      </header>
      {preview && (
        <div className="photo-wrap">
          <img src={preview} alt="Photo à analyser" />
          {res?.boxes?.length > 0 && (
            <svg viewBox={`0 0 ${res.size[0]} ${res.size[1]}`} preserveAspectRatio="none" aria-hidden="true">
              {res.boxes.map((b, i) => (
                <rect key={i} x={b.x1} y={b.y1} width={b.x2 - b.x1} height={b.y2 - b.y1}
                  fill="none" stroke="#E0701F" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          )}
        </div>
      )}

      <label className={`photo-picker ${file ? "has-file" : ""}`}>
        <span className="photo-picker-icon" aria-hidden="true">{file ? "↻" : "＋"}</span>
        <span><b>{file ? "Choisir une autre photo" : "Prendre ou choisir une photo"}</b>
          <small>{file ? file.name : "JPG, PNG · caméra ou galerie"}</small></span>
        <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={onPick} />
      </label>
      {recentPhotos.length > 0 && !entry && (
        <section className="recent-photos">
          <div className="section-heading"><h2>Photos récentes</h2><span className="muted small">sur cet appareil</span></div>
          <div className="recent-photo-list">
            {recentPhotos.map((recent) => (
              <button
                type="button"
                key={recent.id}
                className="recent-photo"
                onClick={async () => {
                  try {
                    const response = await fetch(recent.thumb);
                    if (!response.ok) throw new Error("La photo locale est indisponible.");
                    const blob = await response.blob();
                    const photo = new File([blob], "photo-recente.jpg", { type: blob.type || "image/jpeg" });
                    setFile(photo);
                    setPreview(URL.createObjectURL(photo));
                    setRes(null);
                    setError("");
                  } catch (e) {
                    setError(`Impossible de charger cette photo : ${e.message}`);
                  }
                }}
              >
                <img src={recent.thumb} alt="" />
                <span>{prettyLabel(recent.label)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {error && <div className="notice alerte" role="alert">{error}</div>}
      {res?.empty && <div className="notice vigilance">Aucune feuille détectée. Rapprochez-vous, feuille nette et bien éclairée.</div>}

      {entry && (
        <section className="card result-card">
          <div className="result-heading">
            <div>
              <p className="eyebrow">RÉSULTAT DE L’ANALYSE</p>
              <h2>{prettyLabel(entry.label)}</h2>
            </div>
            <span className={`badge ${uncertain ? "vigilance" : "ok"}`}>
              {uncertain ? "À confirmer" : "Détecté"}
            </span>
          </div>
          <div className="confidence-line">
            <span>Confiance du modèle</span><b>{Math.round(entry.confidence * 100)} %</b>
          </div>
          <div className="bar confidence-bar"><div style={{ width: `${Math.round(entry.confidence * 100)}%` }} /></div>
          <div className="detection-details">
            <div><span>Zone repérée</span><b>Feuilles et rameaux</b></div>
            <div><span>Parcelle</span><b>{entry.place ?? settings.place}</b></div>
          </div>
          {uncertain && <p className="muted small">Le modèle hésite entre plusieurs classes. Reprenez la photo ou demandez l’avis d’un technicien.</p>}
          {entry.count > 1 && <p className="muted small">{entry.count} zones détectées sur l’image.</p>}
          {entry.top3.length > 1 && (
            <div className="alternative-list">
              <b className="small">Autres hypothèses</b>
              {entry.top3.slice(1).map((p) => (
                <div className="alternative-row" key={p.label}>
                  <span>{prettyLabel(p.label)}</span><span>{Math.round(p.confidence * 100)} %</span>
                </div>
              ))}
            </div>
          )}
          {entry.latencyMs != null && <p className="muted small">Analyse réalisée en {Math.round(entry.latencyMs)} ms · une détection IA ne remplace pas un diagnostic agronomique.</p>}
          <div className="result-actions">
            <label className="btn btn-secondary">
              Reprendre
              <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={onPick} />
            </label>
            <button className="btn btn-primary" onClick={() => go("advice", { id: entry.id })}>Voir conseils</button>
          </div>
        </section>
      )}
      {!entry && (
        <button className="btn btn-primary btn-xl" disabled={!file || busy} onClick={analyze}>
          {busy ? "Analyse en cours…" : "Analyser la plante"}
        </button>
      )}
      <p className="privacy-note">Votre photo est analysée par le modèle et n’est pas enregistrée dans l’historique ; seule une miniature reste sur cet appareil.</p>
    </div></div>
  );
}
