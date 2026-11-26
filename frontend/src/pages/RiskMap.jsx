import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { useLang } from "../LangContext";
import { getJSON } from "../lib/assistant";
import { labelFr } from "../data/diseases";

const TXT = {
  fr: {
    intro: "Deux lectures du terrain : le risque calculé depuis la météo de chaque gouvernorat, et les signalements anonymes des utilisateurs.",
    period: "Période", d7: "7 jours", d30: "30 jours", d90: "90 jours",
    coucheRisque: "Risque météo", coucheSignalements: "Signalements",
    loading: "Chargement de la carte…", error: "Carte indisponible", retry: "Réessayer",
    cases: "cas", list: "Détail par gouvernorat",
    niveaux: { danger: "Risque élevé", warn: "Vigilance", calme: "Calme" },
    legende: "Niveau de risque",
    pourquoi: "Pourquoi", aucunFacteur: "Aucun facteur de risque actif.",
    observe: (n) => `${n} signalement${n > 1 ? "s" : ""} sur la période`,
    aucunObserve: "Aucun signalement ici.",
    meteoAbsente: "Le risque météo n'a pas pu être calculé. Les signalements restent affichés.",
    videRisque: "Aucun gouvernorat en vigilance : conditions calmes partout.",
    videSignalements: "Aucun signalement sur cette période. Active le partage de position pour alimenter la carte.",
    touchez: "Touchez un gouvernorat pour voir le détail.",
    maj: "Risque recalculé toutes les heures.",
    heuristique: "Score indicatif, issu de règles agronomiques simples sur la météo. Ce n'est pas une prévision épidémiologique.",
    vieprivee: "Signalements anonymes : position arrondie à 1 km, aucune photo, aucun compte.",
    moins: "Moins", plus: "Plus",
  },
  derja: {
    intro: "Zouz 9rayet : el khatar el ma7soub mel mete9 fi koll wilaya, w el signalements mte3 el msta5dmin.",
    period: "El modda", d7: "7 iyem", d30: "30 yom", d90: "90 yom",
    coucheRisque: "Khatar el mete9", coucheSignalements: "Signalements",
    loading: "9a3ed yjib el carte…", error: "El carte mouch mawjouda", retry: "3awed jarreb",
    cases: "7alat", list: "Tafsil 7asb el wilaya",
    niveaux: { danger: "Khatar kbir", warn: "Rod belek", calme: "Hadi" },
    legende: "Darajet el khatar",
    pourquoi: "3lech", aucunFacteur: "Ma famech sabab khatar tawa.",
    observe: (n) => `${n} signalement fel modda`,
    aucunObserve: "Ma famech signalement houni.",
    meteoAbsente: "Ma najjamnech na7asbou khatar el mete9. El signalements mazel mawjoudin.",
    videRisque: "Ma famech wilaya fi khatar : el jaw hadi fel bled el kol.",
    videSignalements: "Ma famech signalement fel modda hedhi. 7ell mcharket el blasa bech t3abbi el carte.",
    touchez: "Ol mes 3la wilaya bech tchouf el tafsil.",
    maj: "El khatar yet7aseb koll se3a.",
    heuristique: "Score istidlali, men 9awa3ed filahiya basita 3al mete9. Mouch tanabbo2 waba2i.",
    vieprivee: "Signalements bla esm : el blasa m9arba b 1 km, bla taswira, bla compte.",
    moins: "A9all", plus: "Aktar",
  },
};

// Couleurs d'état : réservées, jamais réutilisées pour autre chose, et toujours doublées d'un libellé.
const NIVEAUX = {
  danger: { fill: "#d9534f", ring: "rgba(217,83,79,0.22)", texte: "#9b2f2b", icon: "alert" },
  warn: { fill: "#e6a23c", ring: "rgba(230,162,60,0.22)", texte: "#8a5a12", icon: "bell" },
  calme: { fill: "#86ba72", ring: "rgba(134,186,114,0.18)", texte: "#2f6226", icon: "check" },
};
const ORDRE = { danger: 0, warn: 1, calme: 2 };

// Les signalements sont une GRANDEUR, pas un état : teinte unique qui fonce avec le nombre.
// Réutiliser le rouge/orange du risque météo ferait croire à la même donnée.
const RAMPE = ["#86ba72", "#4b963b", "#2f6226"];
const teinteCas = (n, max) => RAMPE[n >= max * 0.66 ? 2 : n >= max * 0.33 ? 1 : 0];

// Cadre géographique de la Tunisie. Les points sont aux vraies coordonnées des chefs-lieux :
// pas de frontières dessinées, car une silhouette approximative serait une fausse carte.
const BBOX = { minLat: 30.2, maxLat: 37.6, minLon: 7.4, maxLon: 11.7 };
const W = 300;
const H = 420;
const project = (lat, lon) => ({
  x: ((lon - BBOX.minLon) / (BBOX.maxLon - BBOX.minLon)) * W,
  y: ((BBOX.maxLat - lat) / (BBOX.maxLat - BBOX.minLat)) * H,
});

/** Carte des risques : ce qui est probable (météo) et ce qui est observé (signalements). */
export default function RiskMap() {
  const { lang } = useLang() ?? {};
  const t = TXT[lang] ?? TXT.fr;
  const [days, setDays] = useState(30);
  const [couche, setCouche] = useState("risque");
  const [data, setData] = useState(null);
  const [selection, setSelection] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError("");
    getJSON(`/risk-map/risk?days=${days}`)
      .then(setData)
      .catch((e) => setError(e.message || "erreur"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [days]);

  const parGov = useMemo(() => {
    const observe = new Map((data?.observed ?? []).map((o) => [o.gov_id, o]));
    const meteo = data?.weather ?? [];
    // On part de la liste météo (les 24 gouvernorats) et on y greffe l'observé.
    const base = meteo.map((m) => ({ ...m, observe: observe.get(m.gov_id) ?? null }));
    // Si la météo manque, on retombe sur les seuls gouvernorats ayant des signalements.
    if (!base.length) {
      return [...observe.values()].map((o) => ({
        gov_id: o.gov_id, gov_name: o.gov_name, lat: o.lat, lon: o.lon,
        score: 0, level: "calme", drivers: [], observe: o,
      }));
    }
    return base;
  }, [data]);

  const visibles = useMemo(() => {
    const liste = couche === "risque"
      ? parGov.filter((g) => g.level !== "calme")
      : parGov.filter((g) => g.observe);
    return [...liste].sort((a, b) =>
      couche === "risque"
        ? ORDRE[a.level] - ORDRE[b.level] || b.score - a.score
        : (b.observe?.count ?? 0) - (a.observe?.count ?? 0));
  }, [parGov, couche]);

  const choisi = selection ? parGov.find((g) => g.gov_id === selection) ?? null : null;
  const maxCas = Math.max(1, ...parGov.map((g) => g.observe?.count ?? 0));

  if (loading) {
    return <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-ink-500">{t.loading}</p>;
  }
  if (error) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-sm font-semibold text-danger-500">{t.error}</p>
        <button type="button" onClick={load} className="mt-3 min-h-11 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white">
          {t.retry}
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-5 text-ink-500">{t.intro}</p>

      {/* Choix de la couche : deux natures de données, jamais mélangées dans un même symbole. */}
      <div role="tablist" aria-label={t.legende} className="flex gap-2">
        {[["risque", t.coucheRisque], ["signalements", t.coucheSignalements]].map(([id, libelle]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={couche === id}
            onClick={() => { setCouche(id); setSelection(null); }}
            className={`min-h-10 flex-1 rounded-xl px-3 text-[13px] font-semibold transition ${
              couche === id ? "bg-forest-800 text-white" : "bg-surface text-ink-600 ring-1 ring-line"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {couche === "signalements" && (
        <div className="flex gap-2">
          {[[7, t.d7], [30, t.d30], [90, t.d90]].map(([n, libelle]) => (
            <button
              key={n}
              type="button"
              aria-pressed={days === n}
              onClick={() => setDays(n)}
              className={`min-h-9 flex-1 rounded-pill px-3 text-[12px] font-semibold ${
                days === n ? "bg-brand-500 text-white" : "bg-surface text-ink-500 ring-1 ring-line"
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>
      )}

      {!data?.weather?.length && couche === "risque" && (
        <p className="rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900">{t.meteoAbsente}</p>
      )}

      {/* Carte : points aux coordonnées réelles des chefs-lieux. */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t.legende}>
          {/* Repères discrets : parallèles et méridiens, pour situer sans inventer de frontières. */}
          {[32, 34, 36].map((lat) => (
            <line key={lat} x1="0" x2={W} y1={project(lat, 0).y} y2={project(lat, 0).y} stroke="#eef3ec" strokeWidth="1" />
          ))}
          {[8, 9, 10, 11].map((lon) => (
            <line key={lon} y1="0" y2={H} x1={project(0, lon).x} x2={project(0, lon).x} stroke="#eef3ec" strokeWidth="1" />
          ))}

          {parGov.map((g) => {
            const { x, y } = project(g.lat, g.lon);
            const actif = couche === "risque" ? g.level !== "calme" : Boolean(g.observe);
            const n = NIVEAUX[g.level] ?? NIVEAUX.calme;
            const couleur = couche === "risque" ? n.fill : teinteCas(g.observe?.count ?? 0, maxCas);
            const rayon = couche === "risque"
              ? 5 + (g.score / 100) * 9
              : 5 + ((g.observe?.count ?? 0) / maxCas) * 9;
            const estChoisi = selection === g.gov_id;
            return (
              <g
                key={g.gov_id}
                onClick={() => setSelection(estChoisi ? null : g.gov_id)}
                style={{ cursor: "pointer" }}
                opacity={actif ? 1 : 0.28}
              >
                {actif && <circle cx={x} cy={y} r={rayon * 2.1} fill={couleur} opacity="0.18" />}
                <circle cx={x} cy={y} r={rayon} fill={actif ? couleur : "#c9d4c5"} stroke="#fff" strokeWidth="2" />
                {estChoisi && <circle cx={x} cy={y} r={rayon + 5} fill="none" stroke={couleur} strokeWidth="2" />}
                {actif && couche === "signalements" && (
                  <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
                    {g.observe.count}
                  </text>
                )}
                <title>{g.gov_name}</title>
              </g>
            );
          })}
        </svg>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {couche === "risque"
            ? Object.entries(NIVEAUX).map(([cle, n]) => (
              <span key={cle} className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.fill }} />
                {t.niveaux[cle]}
              </span>
            ))
            : (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-500">
                {t.moins}
                {RAMPE.map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
                {t.plus}
              </span>
            )}
        </div>
        <p className="mt-1 text-center text-[10px] text-ink-400">{t.touchez}</p>
      </section>

      {/* Détail du gouvernorat choisi : le « pourquoi » du score. */}
      {choisi && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <span style={{ color: (NIVEAUX[choisi.level] ?? NIVEAUX.calme).texte }}>
              <Icon name={(NIVEAUX[choisi.level] ?? NIVEAUX.calme).icon} className="h-5 w-5" />
            </span>
            <h3 className="text-[15px] font-bold text-forest-800">{choisi.gov_name}</h3>
            <span
              className="ml-auto rounded-pill px-2.5 py-1 text-[10px] font-bold text-white"
              style={{ background: (NIVEAUX[choisi.level] ?? NIVEAUX.calme).fill }}
            >
              {t.niveaux[choisi.level]}
            </span>
          </div>

          {choisi.temperature != null && (
            <p className="mt-2 text-[12px] text-ink-500">
              {Math.round(choisi.temperature)} °C · {choisi.humidity} % · {Math.round(choisi.wind)} km/h
            </p>
          )}

          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-400">{t.pourquoi}</p>
          {choisi.drivers?.length ? (
            <ul className="mt-1.5 space-y-1.5">
              {choisi.drivers.map((d) => (
                <li key={d} className="flex gap-2 text-[13px] leading-5 text-ink-700">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[13px] text-ink-500">{t.aucunFacteur}</p>
          )}

          <div className="mt-3 border-t border-line pt-3">
            {choisi.observe ? (
              <>
                <p className="text-[12px] font-semibold text-ink-700">{t.observe(choisi.observe.count)}</p>
                <ul className="mt-1.5 space-y-1">
                  {choisi.observe.top.map((l) => (
                    <li key={l.label} className="flex items-center justify-between text-[12px] text-ink-600">
                      <span className="truncate">{labelFr(l.label)}</span>
                      <span className="ml-3 shrink-0 tabular-nums text-ink-400">{l.count} {t.cases}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[12px] text-ink-400">{t.aucunObserve}</p>
            )}
          </div>
        </section>
      )}

      {/* Liste ordonnée : la carte montre où, la liste montre combien. */}
      <section>
        <h2 className="mb-2 text-[15px] font-bold text-forest-800">{t.list}</h2>
        {visibles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface p-5 text-center text-[12px] leading-5 text-ink-400">
            {couche === "risque" ? t.videRisque : t.videSignalements}
          </p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {visibles.map((g) => {
              const n = NIVEAUX[g.level] ?? NIVEAUX.calme;
            const couleur = couche === "risque" ? n.fill : teinteCas(g.observe?.count ?? 0, maxCas);
              const valeur = couche === "risque" ? g.score : g.observe.count;
              const largeur = couche === "risque" ? g.score : Math.round((g.observe.count / maxCas) * 100);
              return (
                <button
                  key={g.gov_id}
                  type="button"
                  onClick={() => setSelection(selection === g.gov_id ? null : g.gov_id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleur }} />
                  <span className="w-24 shrink-0 truncate text-[13px] font-semibold text-ink-800">{g.gov_name}</span>
                  <span className="relative h-2 flex-1 overflow-hidden rounded-pill bg-canvas">
                    <span className="absolute inset-y-0 left-0 rounded-pill" style={{ width: `${largeur}%`, background: couleur }} />
                  </span>
                  <span className="w-14 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-500">
                    {couche === "risque" ? `${valeur}/100` : `${valeur} ${t.cases}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-[11px] leading-5 text-ink-400">
        {couche === "risque" ? `${t.heuristique} ${t.maj}` : t.vieprivee}
      </p>
    </div>
  );
}
