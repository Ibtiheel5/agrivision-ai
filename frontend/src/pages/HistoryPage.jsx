import { useState } from "react";
import { Go, useNav } from "../lib/nav";
import { clearHistory, listHistory, prettyLabel, removeHistory } from "../lib/history";

export default function HistoryPage() {
  const [items, setItems] = useState(listHistory);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const { go } = useNav();
  const shown = items.filter((entry) => {
    const query = q.trim().toLocaleLowerCase("fr");
    const matchesQuery = `${prettyLabel(entry.label)} ${entry.place ?? ""}`.toLocaleLowerCase("fr").includes(query);
    return matchesQuery && (filter === "all" || entry.status === filter);
  });

  return (
    <div className="av"><div className="page history-page">
      <header className="screen-heading">
        <p className="eyebrow">VOTRE CARNET DE CULTURE</p>
        <h1>Historique des analyses</h1>
        <p className="muted">{items.length} analyse{items.length === 1 ? "" : "s"} enregistrée{items.length === 1 ? "" : "s"} sur cet appareil.</p>
      </header>
      <div className="history-search-row">
        <label className="history-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Rechercher une analyse" aria-label="Rechercher une analyse"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button type="button" className={`filter-button ${showFilters ? "selected" : ""}`}
          aria-expanded={showFilters} aria-label="Afficher les filtres" onClick={() => setShowFilters((value) => !value)}>
          <span aria-hidden="true">☷</span>
        </button>
      </div>
      {showFilters && (
        <div className="filter-chips" aria-label="Filtrer par fiabilité">
          {[["all", "Toutes"], ["ok", "Fiables"], ["incertain", "À confirmer"]].map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? "selected" : ""}
              aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
      )}
      {shown.length === 0 && (
        <div className="history-empty">
          <span className="empty-home-icon" aria-hidden="true">⌕</span>
          <b>{items.length ? "Aucun résultat" : "Votre historique est encore vide"}</b>
          <p>{items.length ? "Essayez un autre mot-clé ou filtre." : "Les analyses effectuées apparaîtront ici sur cet appareil."}</p>
          {!items.length && <button className="btn btn-primary" onClick={() => go("detect")}>Analyser une plante</button>}
        </div>
      )}
      {shown.length > 0 && (
        <section className="history-list" aria-label="Analyses précédentes">
          {shown.map((entry) => (
            <article key={entry.id} className="history-card">
              <button type="button" className="history-card-main" onClick={() => go("advice", { id: entry.id })}>
                {entry.thumb ? <img className="history-thumb" src={entry.thumb} alt="" /> : <span className="history-thumb history-thumb-empty">🌿</span>}
                <span className="history-copy">
                  <b>{prettyLabel(entry.label)}</b>
                  <span>{new Date(entry.createdAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span>
                  <small><span className="location-dot" />{entry.place ?? "Localisation non définie"}</small>
                </span>
                <span className="history-confidence">
                  <b>{Math.round(entry.confidence * 100)}%</b>
                  <span className={`badge ${entry.status === "incertain" ? "vigilance" : "ok"}`}>
                    {entry.status === "incertain" ? "À confirmer" : "Fiable"}
                  </span>
                </span>
              </button>
              <button className="history-delete" aria-label={`Supprimer ${prettyLabel(entry.label)}`}
                onClick={() => { removeHistory(entry.id); setItems(listHistory()); }}>Supprimer</button>
            </article>
          ))}
        </section>
      )}
      {items.length > 0 && (
        <button className="clear-history" onClick={() => {
          if (window.confirm("Effacer l’historique de cet appareil ?")) {
            clearHistory();
            setItems([]);
          }
        }}>Effacer l’historique</button>
      )}
      <p className="privacy-note">Les miniatures et les résultats de l’historique restent enregistrés localement sur cet appareil.</p>
    </div></div>
  );
}
