import { useEffect, useState } from "react";
import { postJSON } from "../api";
import { getHistory, prettyLabel } from "../lib/history";
import { Go, useNav } from "../lib/nav";

const STATUS = { sain: ["ok", "Saine"], maladie: ["alerte", "Problème détecté"], incertain: ["vigilance", "Incertain"] };

export default function AdvicePage() {
  const { params } = useNav();
  const id = params.id;
  const entry = getHistory(id);
  const [adv, setAdv] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!entry) return;
    postJSON("/advice", { label: entry.label, confidence: entry.confidence, status: entry.status ?? "ok" }).then(setAdv).catch((e) => setErr(e.message));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) {
    return <div className="av"><div className="page"><h1>Conseils</h1><p>Analyse introuvable.</p><Go className="link" to="history">Retour à l&apos;historique</Go></div></div>;
  }
  const [cls, statusLabel] = STATUS[adv?.status] ?? ["vigilance", "…"];

  return (
    <div className="av"><div className="page advice-page">
      <header className="screen-heading">
        <p className="eyebrow">ACCOMPAGNEMENT AGRICOLE</p>
        <h1>Conseils et recommandations</h1>
      </header>
      <section className="advice-result-card">
        <span className="advice-plant-icon" aria-hidden="true">✳</span>
        {entry.thumb && <img className="advice-thumb" src={entry.thumb} alt="Photo de la plante analysée" />}
        <div className="advice-result-copy">
          <b>{prettyLabel(entry.label)}</b>
          <span>Confiance : {Math.round(entry.confidence * 100)} %</span>
        </div>
        <span className={`badge ${cls}`}>{entry.status === "incertain" ? "À confirmer" : statusLabel}</span>
      </section>
      {err && <div className="notice alerte" role="alert">Conseils indisponibles ({err}).</div>}
      {adv ? (
        <>
          <section className="recommendation-section">
            <div className="section-heading">
              <div><p className="eyebrow">ACTIONS SUGGÉRÉES</p><h2>{adv.title}</h2></div>
            </div>
            <p className="recommendation-summary">{adv.summary}</p>
            <ol className="recommendation-list">
              {adv.actions.map((action, index) => (
                <li key={action}><span>{index + 1}</span><p>{action}</p></li>
              ))}
            </ol>
          </section>
          {adv.extra && (
            <section className="sahel-tip">
              <span className="sahel-tip-icon" aria-hidden="true">✳</span>
              <div><p className="eyebrow">À RETENIR</p><p>{adv.extra}</p></div>
            </section>
          )}
          <p className="recommendation-disclaimer">{adv.disclaimer}</p>
        </>
      ) : !err ? (
        <div className="recommendation-loading" role="status">Préparation de recommandations adaptées à cette analyse…</div>
      ) : null}
      <div className="advice-footer">
        <Go to="home" className="btn btn-primary">Retour à l’accueil</Go>
        <Go to="detect" className="text-link">Nouvelle analyse</Go>
      </div>
    </div></div>
  );
}
