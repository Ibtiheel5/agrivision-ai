import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "./Icon";
import Photo from "./Photo";
import { CROP_THEMES } from "./CropTile";
import { useLang } from "../LangContext";
import { getJSON } from "../lib/assistant";
import { DISEASES, labelFr, CROPS } from "../data/diseases";
import { conseilPour, trouverFiche } from "../data/conseils";
import { cropPhoto, diseasePhoto } from "../data/photos";
import { loadHistory } from "../services/history";
import { useSettings } from "../services/settings";

/* ═══════════════════════════ THEME ═══════════════════════════ */
const C = {
  forest: "#123C2F",
  primary: "#237A57",
  emerald: "#35A879",
  sage: "#E8F0E9",
  bg: "#F7F8F4",
  white: "#FFFFFF",
  dark: "#202A26",
  muted: "#87928A",
  amber: "#E6A23C",
  red: "#D9534F",
  line: "#E3E8E2",
  green: "#16a34a",
};

/* ═══════════════════════════ i18n ═══════════════════════════ */
const TXT = {
  fr: {
    hello: "Bonjour", helloNight: "Bonsoir",
    streakOne: "1 jour de suite", streakMany: (n) => `${n} jours de suite`,
    refresh: "Actualiser", offline: "Hors ligne — données locales",
    ctaTitle: "Analysez votre plante maintenant",
    ctaSub: "Prenez une photo de la feuille, le diagnostic arrive en quelques secondes.",
    ctaToday: "Aucune photo aujourd'hui",
    myCrops: "Mes cultures", myCropsSub: "Celles que vous avez déjà analysées",
    myCropsEmpty: "Vos cultures apparaîtront ici après votre première analyse.",
    distribution: "Répartition", distributionSub: (n) => `sur ${n} analyse${n > 1 ? "s" : ""}`,
    quickActions: "Accès rapide",
    qaScan: "Scanner", qaScanSub: "Une feuille",
    qaLibrary: "Fiches", qaLibrarySub: "29 maladies",
    qaWeather: "Météo", qaWeatherSub: "Par région",
    qaMap: "Carte", qaMapSub: "Autour de moi",
    healthTitle: "Santé des cultures",
    healthSub: (n) => `${n} analyse${n > 1 ? "s" : ""} au total`,
    healthHint: "Part de feuilles saines sur vos 10 dernières analyses",
    statAnalyses: "Analyses", statWeek: "Cette semaine", statAccuracy: "Confiance moy.",
    trendTitle: "Activité des 7 derniers jours", trendEmpty: "Pas encore assez de données",
    lastAnalysis: "Dernière analyse", lastAnalysisEmpty: "Aucune analyse pour l'instant",
    viewDetail: "Voir les conseils",
    articles: "Fiches maladies", seeAll: "Tout voir", emptyArticles: "Aucune fiche ne correspond.",
    recent: "Mes dernières analyses", none: "Aucune détection",
    emptyRecent: "Votre première analyse apparaîtra ici.",
    today: "Aujourd'hui", yesterday: "Hier",
    recommendations: "À faire en priorité",
    recEmpty: "Scannez une plante pour recevoir des conseils.",
    tasksTitle: "Tâches du jour",
    taskScan: "Scanner une plante", taskWater: "Vérifier l'irrigation", taskRead: "Lire une fiche maladie",
    taskDone: "Terminé",
    alert: "À surveiller", dismiss: "Masquer cette alerte",
    weatherFail: "Météo indisponible pour le moment.", retry: "Réessayer",
    expert: "Demander à l'assistant", expertTry: "Essayer",
    expertTitle: "Une question sur votre culture ?",
    expertSub: "Parlez ou écrivez en derja. L'assistant connaît vos analyses.",
    chips: ["Pourquoi mes feuilles jaunissent ?", "Traitement mildiou tomate", "Quand arroser l'olivier ?"],
    favAdd: "Ajouter aux favoris", favRemove: "Retirer des favoris",
    jours: ["-6j", "-5j", "-4j", "-3j", "-2j", "-1j", "auj."],
  },
  derja: {
    hello: "Ahla", helloNight: "Masa el khir",
    streakOne: "Nhar wara nhar", streakMany: (n) => `${n} iyem wara ba3dhhom`,
    refresh: "Jadded", offline: "Ma famech connexion — données mta3 el appareil",
    ctaTitle: "A3mel analyse l nabtek tawa",
    ctaSub: "Sawwer el wra9a, el natija tji fi thweni.",
    ctaToday: "Ma sawwertech lyoum",
    myCrops: "El zrou3 mte3i", myCropsSub: "Elli 3melt 3lihom ta7lil",
    myCropsEmpty: "El zrou3 mte3ek bech yitbaynou houni ba3d awel ta7lil.",
    distribution: "El tawzi3", distributionSub: (n) => `3la ${n} ta7lil`,
    quickActions: "Dkhoul sari3",
    qaScan: "Scanner", qaScanSub: "Wra9a",
    qaLibrary: "Fiches", qaLibrarySub: "29 maradh",
    qaWeather: "Mete9", qaWeatherSub: "Hasb el jiha",
    qaMap: "Carte", qaMapSub: "7walik",
    healthTitle: "S7a el zrou3",
    healthSub: (n) => `${n} ta7lil fel koll`,
    healthHint: "9addech men wra9 sli7a fi a5er 10 ta7lilet",
    statAnalyses: "Ta7lilet", statWeek: "Hadhi el jem3a", statAccuracy: "Mou3addal el thi9a",
    trendTitle: "El nachat mte3 7 iyem", trendEmpty: "Mazel ma famech barcha data",
    lastAnalysis: "A5er ta7lil", lastAnalysisEmpty: "Mazel ma famech ta7lil",
    viewDetail: "Chouf el nasaye7",
    articles: "Fiches el amradh", seeAll: "Chouf el koll", emptyArticles: "Ma famech fiche.",
    recent: "A5er ta7lil mte3i", none: "Ma famech natija",
    emptyRecent: "Awel ta7lil mte3ek bech yitbayen houni.",
    today: "Lyoum", yesterday: "Lbera7",
    recommendations: "A3mel hedhi el awwel",
    recEmpty: "A3mel scan l nabta bech takhou nasaye7.",
    tasksTitle: "5edmet lyoum",
    taskScan: "A3mel scan l nabta", taskWater: "Chouf el s9i", taskRead: "A9ra fiche maradh",
    taskDone: "Kmelt",
    alert: "Rod belek", dismiss: "Khabbi el tanbih",
    weatherFail: "El mete9 mouch mawjoud tawa.", retry: "3awed jarreb",
    expert: "As2el el mousa3ed", expertTry: "Jarreb",
    expertTitle: "3andek so2al 3la nabtek ?",
    expertSub: "E7ki walla akteb bel derja. El mousa3ed ya3raf ettachkhis mte3ek.",
    chips: ["3lech el wra9 yesfarr ?", "Dwe el mildiou mte3 el tmatem", "Wa9tech nes9i el zitouna ?"],
    favAdd: "Zid fel moufaddhalin", favRemove: "Na77i mel moufaddhalin",
    jours: ["-6", "-5", "-4", "-3", "-2", "-1", "lyoum"],
  },
};

/* ═══════════════════════════ HELPERS ═══════════════════════════ */
const shortDate = (v) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(v));
const dayKey = (v) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const isToday = (v) => dayKey(v) === dayKey(Date.now());
const isYesterday = (v) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return dayKey(v) === dayKey(y);
};
const daysAgo = (v) => Math.floor((Date.now() - new Date(v).getTime()) / 86400000);

/** localStorage peut lever (navigation privée, quota) : on ne laisse jamais ça casser l'accueil. */
const lire = (cle, defaut) => {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : defaut;
  } catch {
    return defaut;
  }
};
const ecrire = (cle, valeur) => {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : la préférence vaut pour cette session seulement */
  }
};

/* ═══════════════════════════ HOOKS ═══════════════════════════ */
function useFavorites(key = "agrivision.favoris.v1") {
  const [favs, setFavs] = useState(() => new Set(lire(key, [])));
  const toggle = (id) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      ecrire(key, [...next]);
      return next;
    });
  return [favs, toggle];
}

function useDailyTasks() {
  const cle = `agrivision.taches.${dayKey(Date.now())}`;
  const [done, setDone] = useState(() => lire(cle, {}));
  const toggle = (id) =>
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      ecrire(cle, next);
      return next;
    });
  return [done, toggle];
}

/* ═══════════════════════════ MAIN ═══════════════════════════ */
export default function HomeDashboard({ query = "" }) {
  const { lang } = useLang() ?? {};
  const t = TXT[lang] ?? TXT.fr;
  const [settings] = useSettings();

  const [weather, setWeather] = useState(null);
  const [weatherState, setWeatherState] = useState("loading");
  const [reloadTick, setReloadTick] = useState(0);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [alertDismissed, setAlertDismissed] = useState(() => lire("agrivision.alerte.masquee", false));
  const [favs, toggleFav] = useFavorites();
  const [tasksDone, toggleTask] = useDailyTasks();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let annule = false;
    setWeatherState("loading");
    getJSON(`/weather?place=${encodeURIComponent(settings.place)}`)
      .then((d) => {
        if (annule) return;
        setWeather(d);
        setWeatherState("ok");
      })
      .catch(() => !annule && setWeatherState("failed"));
    return () => { annule = true; };
  }, [settings.place, reloadTick]);

  // Le backend renvoie { place:{name}, current:{temperature,humidity,wind,description,icon}, days, alerts }.
  const actuel = weather?.current ?? null;
  const lieu = weather?.place?.name ?? "";
  const alerte = weather?.alerts?.find((a) => a.level === "danger") ?? null;

  // reloadTick force la relecture de l'historique au clic sur « Actualiser ».
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const analyses = useMemo(() => loadHistory(), [reloadTick]);

  const vedettes = useMemo(() => {
    const ordre = ["tomate-mildiou", "tomate-tylcv", "pdt-mildiou", "vigne-black-rot", "courge-oidium", "tomate-septoriose"];
    const parId = new Map(DISEASES.map((d) => [d.id, d]));
    const base = ordre.map((id) => parId.get(id)).filter(Boolean);
    const q = query.trim().toLocaleLowerCase("fr");
    return q ? base.filter((d) => d.fr.toLocaleLowerCase("fr").includes(q)) : base;
  }, [query]);

  const q = query.trim().toLocaleLowerCase("fr");
  const recents = useMemo(() => {
    const list = q
      ? analyses.filter((a) => (a.top ? labelFr(a.top) : "").toLocaleLowerCase("fr").includes(q))
      : analyses;
    return list.slice(0, 3);
  }, [analyses, q]);

  const streak = useMemo(() => {
    if (!analyses.length) return 0;
    const jours = new Set(analyses.map((a) => dayKey(a.date)));
    let n = 0;
    const d = new Date();
    while (jours.has(dayKey(d))) {
      n += 1;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [analyses]);

  const todayCount = useMemo(() => analyses.filter((a) => isToday(a.date)).length, [analyses]);
  const weekCount = useMemo(() => analyses.filter((a) => daysAgo(a.date) <= 7).length, [analyses]);

  const avgConfidence = useMemo(() => {
    const vals = analyses.filter((a) => typeof a.confidence === "number").map((a) => a.confidence * 100);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }, [analyses]);

  /**
   * Santé des cultures = part de feuilles saines sur les 10 dernières analyses.
   * (La confiance du modèle mesure sa certitude, pas l'état de la plante : la confondre
   * donnerait un score élevé alors que toutes les feuilles sont malades.)
   */
  const healthScore = useMemo(() => {
    const dix = analyses.slice(0, 10).filter((a) => a.top);
    if (!dix.length) return null;
    const saines = dix.filter((a) => conseilPour(a.top)?.etat === "sain").length;
    return Math.round((saines / dix.length) * 100);
  }, [analyses]);

  const trend = useMemo(() => {
    const seaux = Array(7).fill(0);
    analyses.forEach((a) => {
      const d = daysAgo(a.date);
      if (d >= 0 && d < 7) seaux[6 - d] += 1;
    });
    return seaux;
  }, [analyses]);

  /**
   * « Mes cultures » = celles que l'utilisateur a réellement analysées, classées par fréquence.
   * Une galerie de cultures génériques (olivier, dattier…) promettrait des fiches qui n'existent pas.
   */
  const mesCultures = useMemo(() => {
    const compte = new Map();
    analyses.forEach((a) => {
      const fiche = a.top ? trouverFiche(a.top) : null;
      if (fiche) compte.set(fiche.crop, (compte.get(fiche.crop) ?? 0) + 1);
    });
    const total = [...compte.values()].reduce((s2, v) => s2 + v, 0);
    return [...compte.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([crop, n]) => ({ crop, label: CROPS[crop] ?? crop, n, pct: total ? Math.round((n / total) * 100) : 0 }));
  }, [analyses]);

  const lastAnalysis = analyses[0] ?? null;
  const lastFiche = lastAnalysis ? trouverFiche(lastAnalysis.top) : null;
  const lienAnalyse = (a) => `/analyse/${a.id ?? a.date}`;

  const recommendations = useMemo(() => {
    const out = [];
    if (alerte) {
      out.push({ id: "weather", icon: "cloud", color: C.red, title: alerte.title, body: alerte.detail, to: "/weather" });
    }
    if (actuel && actuel.humidity < 35 && actuel.temperature > 28) {
      out.push({
        id: "irrig", icon: "droplet", color: C.primary,
        title: lang === "derja" ? "El nabtet 3atchanin" : "Pensez à arroser",
        body: lang === "derja"
          ? `El ratouba ${actuel.humidity} % w el s5ana ${Math.round(actuel.temperature)}°. Zid el s9i.`
          : `Humidité ${actuel.humidity} % et ${Math.round(actuel.temperature)}°. Augmentez l'arrosage.`,
        to: "/weather",
      });
    }
    if (lastAnalysis && lastFiche) {
      out.push({
        id: "last", icon: "leaf", color: C.amber,
        title: lang === "derja" ? `A5er ta7lil : ${lastFiche.fr}` : `Dernière analyse : ${lastFiche.fr}`,
        body: lang === "derja" ? "A9ra el nasaye7 mte3ha." : "Consultez les conseils correspondants.",
        to: lienAnalyse(lastAnalysis),
      });
    }
    if (!out.length) {
      out.push({ id: "empty", icon: "sprout", color: C.muted, title: t.recEmpty, body: "", to: "/scan" });
    }
    return out.slice(0, 3);
  }, [alerte, actuel, lastAnalysis, lastFiche, lang, t.recEmpty]);

  const hour = new Date().getHours();
  const greeting = hour >= 18 || hour < 5 ? t.helloNight : t.hello;

  const dismissAlert = () => {
    setAlertDismissed(true);
    ecrire("agrivision.alerte.masquee", true);
  };

  // Uniquement des destinations qui existent vraiment dans App.jsx.
  const quickActions = [
    { label: t.qaScan, sub: t.qaScanSub, icon: "scan", to: "/scan" },
    { label: t.qaLibrary, sub: t.qaLibrarySub, icon: "book", to: "/library" },
    { label: t.qaWeather, sub: t.qaWeatherSub, icon: "cloud", to: "/weather" },
    { label: t.qaMap, sub: t.qaMapSub, icon: "map", to: "/risk-map" },
  ];

  const tasks = [
    { id: "scan", label: t.taskScan, to: "/scan", icon: "scan" },
    { id: "water", label: t.taskWater, to: "/weather", icon: "droplet" },
    { id: "read", label: t.taskRead, to: "/library", icon: "book" },
  ];

  return (
    <main style={styles.main}>
      <style>{`
        @keyframes agv-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes agv-fade-up { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes agv-breathe { 0%,100%{transform:scale(1);opacity:.45} 50%{transform:scale(1.18);opacity:0} }
        @keyframes agv-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        @keyframes agv-grow { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        @media (prefers-reduced-motion: reduce) {
          [data-anim] { animation: none !important; }
        }
      `}</style>

      {!online && (
        <div style={styles.offlineBanner} data-anim>
          <Icon name="alert" className="h-3.5 w-3.5" />
          <span>{t.offline}</span>
        </div>
      )}

      {/*
        Pas de salutation ni de bouton réglages ici : Home.jsx porte déjà l'en-tête vert
        avec la recherche. On ne garde que ce qui lui manque, sur une seule ligne discrète.
      */}
      <div style={styles.topRow}>
        {streak > 0 ? (
          <span style={styles.streakBadge}>{streak === 1 ? t.streakOne : t.streakMany(streak)}</span>
        ) : (
          <span style={styles.greeting}>{greeting}</span>
        )}
        <button type="button" aria-label={t.refresh} onClick={() => setReloadTick((n) => n + 1)} style={styles.iconBtnSmall}>
          <Icon name="history" className="h-4 w-4" />
        </button>
      </div>

      <Link to="/scan" style={styles.heroCta} data-anim>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.heroTitle}>{t.ctaTitle}</p>
          <p style={styles.heroSub}>{t.ctaSub}</p>
          {todayCount === 0 && <span style={styles.heroBadge}>{t.ctaToday}</span>}
        </div>
        <div style={styles.heroIcon}>
          <div style={styles.heroIconPulse} data-anim />
          <Icon name="scan" className="relative h-6 w-6" />
        </div>
      </Link>

      <section>
        <SectionHeader title={t.quickActions} />
        <div style={styles.quickGrid}>
          {quickActions.map((a) => (
            <Link key={a.label} to={a.to} style={styles.quickCard}>
              <div style={styles.quickIcon}>
                <Icon name={a.icon} className="h-5 w-5" />
              </div>
              <p style={styles.quickLabel}>{a.label}</p>
              <p style={styles.quickSub}>{a.sub}</p>
            </Link>
          ))}
        </div>
      </section>

      {mesCultures.length > 0 && (
        <section>
          <SectionHeader title={t.myCrops} />
          <p style={styles.sectionSub}>{t.myCropsSub}</p>
          <div style={styles.cropGallery}>
            {mesCultures.map((c) => (
              <Link key={c.crop} to={`/library?crop=${c.crop}`} style={styles.cropItem}>
                <div style={{ ...styles.cropCircle, borderColor: (CROP_THEMES[c.crop] ?? CROP_THEMES.autres).from }}>
                  {/* Photo du projet, repli dessiné si le fichier n'est pas là : fonctionne hors ligne. */}
                  <Photo src={cropPhoto(c.crop)} fallbackKey={c.crop} crop={c.crop} alt={c.label} className="h-full w-full" />
                </div>
                <p style={styles.cropLabel}>{c.label}</p>
                <p style={styles.cropCount}>{c.n}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {weatherState === "loading" && <div style={styles.shimmer} data-anim />}
      {weatherState === "failed" && (
        <div style={styles.weatherFail}>
          <span>{t.weatherFail}</span>
          <button type="button" onClick={() => setReloadTick((n) => n + 1)} style={styles.retryBtn}>{t.retry}</button>
        </div>
      )}
      {weatherState === "ok" && actuel && <WeatherHero lieu={lieu} actuel={actuel} />}

      {alerte && !alertDismissed && (
        <div style={styles.alertCard} data-anim>
          <div style={{ marginTop: 2, color: C.red }}>
            <Icon name="alert" className="h-5 w-5" />
          </div>
          <Link to="/weather" style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
            <p style={styles.alertEyebrow}>{t.alert}</p>
            <p style={styles.alertTitle}>{alerte.title}</p>
            <p style={styles.alertBody}>{alerte.detail}</p>
          </Link>
          <button type="button" aria-label={t.dismiss} onClick={dismissAlert} style={styles.alertClose}>✕</button>
        </div>
      )}

      <section style={styles.card}>
        <div style={styles.healthRow}>
          <HealthRing value={healthScore} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={styles.sectionTitle}>{t.healthTitle}</h2>
            <p style={styles.muted}>
              {healthScore == null ? t.emptyRecent : t.healthSub(analyses.length)}
            </p>
            {healthScore != null && <p style={styles.hint}>{t.healthHint}</p>}
          </div>
        </div>
        <div style={styles.statRow}>
          <StatTile label={t.statAnalyses} value={analyses.length} />
          <StatTile label={t.statWeek} value={weekCount} />
          <StatTile label={t.statAccuracy} value={avgConfidence != null ? `${avgConfidence} %` : "—"} />
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>{t.trendTitle}</h2>
        {analyses.length === 0 ? (
          <p style={styles.muted}>{t.trendEmpty}</p>
        ) : (
          <>
            <Histogramme data={trend} labels={t.jours} />
            {mesCultures.length > 1 && (
              <div style={styles.repartition}>
                <p style={styles.repartitionTitre}>
                  {t.distribution} <span style={styles.repartitionSub}>{t.distributionSub(analyses.length)}</span>
                </p>
                {mesCultures.slice(0, 4).map((c) => (
                  <div key={c.crop} style={styles.repartitionLigne}>
                    <span style={styles.repartitionLabel}>{c.label}</span>
                    <span style={styles.repartitionPiste}>
                      <span style={{ ...styles.repartitionBarre, width: `${c.pct}%` }} />
                    </span>
                    <span style={styles.repartitionValeur}>{c.pct} %</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <SectionHeader title={t.lastAnalysis} />
        {!lastAnalysis ? (
          <div style={styles.emptyCard}>{t.lastAnalysisEmpty}</div>
        ) : (
          <Link to={lienAnalyse(lastAnalysis)} style={styles.lastCard}>
            {lastAnalysis.thumb ? (
              <img src={lastAnalysis.thumb} alt="" style={styles.lastThumb} loading="lazy" />
            ) : (
              <div style={styles.lastThumbFallback}><Icon name="leaf" className="h-6 w-6" /></div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.lastName}>{lastAnalysis.top ? labelFr(lastAnalysis.top) : t.none}</p>
              <p style={styles.muted}>
                {shortDate(lastAnalysis.date)}
                {lastAnalysis.confidence != null && ` · ${Math.round(lastAnalysis.confidence * 100)} %`}
              </p>
            </div>
            <span style={styles.lastCta}>{t.viewDetail} →</span>
          </Link>
        )}
      </section>

      <section>
        <SectionHeader title={t.articles} action={t.seeAll} to="/library" />
        {vedettes.length === 0 ? (
          <div style={styles.emptyCard}>{t.emptyArticles}</div>
        ) : (
          <div style={styles.carousel}>
            {vedettes.map((d, i) => {
              const isFav = favs.has(d.id);
              return (
                <div key={d.id} style={styles.diseaseCardWrap}>
                  <Link to={`/library/${d.id}`} style={{ ...styles.diseaseCard, animationDelay: `${Math.min(i, 6) * 40}ms` }} data-anim>
                    <img
                      src={diseasePhoto(d.id)}
                      alt={d.fr}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      style={styles.diseaseImg}
                    />
                    <div style={styles.diseaseGradient} />
                    <span style={styles.diseaseCrop}>{CROPS[d.crop]}</span>
                    <span style={styles.diseaseName}>{d.fr}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label={isFav ? t.favRemove : t.favAdd}
                    aria-pressed={isFav}
                    onClick={() => toggleFav(d.id)}
                    style={{ ...styles.favBtn, background: isFav ? "#f43f5e" : "rgba(255,255,255,0.92)", color: isFav ? "#fff" : C.dark }}
                  >
                    {isFav ? "♥" : "♡"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title={t.recommendations} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recommendations.map((r) => (
            <Link key={r.id} to={r.to} style={styles.recoCard}>
              <div style={{ ...styles.recoIcon, color: r.color }}>
                <Icon name={r.icon} className="h-5 w-5" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={styles.recoTitle}>{r.title}</p>
                {r.body && <p style={styles.recoBody}>{r.body}</p>}
              </div>
              <span style={{ color: C.muted }}><Icon name="chevronRight" className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title={t.tasksTitle} />
        <div style={styles.card}>
          {tasks.map((task, i) => {
            const done = !!tasksDone[task.id];
            return (
              <div key={task.id} style={{ ...styles.taskRow, borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                <button
                  type="button"
                  aria-label={task.label}
                  aria-pressed={done}
                  onClick={() => toggleTask(task.id)}
                  style={{ ...styles.taskCheck, background: done ? C.primary : "transparent", borderColor: done ? C.primary : C.line, color: "#fff" }}
                >
                  {done && <Icon name="check" className="h-3.5 w-3.5" />}
                </button>
                <Link to={task.to} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
                  <p style={{ ...styles.taskLabel, color: done ? C.muted : C.dark, textDecoration: done ? "line-through" : "none" }}>
                    {task.label}
                  </p>
                </Link>
                <span style={{ color: C.muted }}><Icon name={task.icon} className="h-4 w-4" /></span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader title={t.recent} action={analyses.length > 0 ? t.seeAll : null} to="/history" />
        {recents.length === 0 ? (
          <div style={styles.emptyCard}>{t.emptyRecent}</div>
        ) : (
          <div style={styles.card}>
            {recents.map((item, i) => {
              const groupe = isToday(item.date) ? t.today : isYesterday(item.date) ? t.yesterday : shortDate(item.date);
              const prec = recents[i - 1];
              const groupePrec = prec
                ? (isToday(prec.date) ? t.today : isYesterday(prec.date) ? t.yesterday : shortDate(prec.date))
                : null;
              const conf = item.confidence != null ? Math.round(item.confidence * 100) : null;
              return (
                <div key={item.id ?? item.date} style={{ borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                  {(i === 0 || groupe !== groupePrec) && <p style={styles.groupLabel}>{groupe}</p>}
                  <Link to={lienAnalyse(item)} style={styles.recentRow}>
                    {item.thumb ? (
                      <img src={item.thumb} alt="" loading="lazy" style={styles.recentThumb} />
                    ) : (
                      <div style={styles.recentThumbFallback}><Icon name="leaf" className="h-5 w-5" /></div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.recentName}>{item.top ? labelFr(item.top) : t.none}</p>
                      <div style={styles.recentMeta}>
                        <span>{shortDate(item.date)}</span>
                        {conf != null && (
                          <span style={styles.confidenceWrap}>
                            <span style={styles.confidenceBar}>
                              <span style={{ ...styles.confidenceFill, width: `${conf}%`, background: conf >= 75 ? C.green : conf >= 50 ? C.amber : C.red }} />
                            </span>
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>{conf} %</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: C.muted }}><Icon name="chevronRight" className="h-4 w-4" /></span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title={t.expert} action={t.expertTry} to="/assistant" />
        <div style={styles.card}>
          <Link to="/assistant" style={styles.assistantRow}>
            <div style={styles.assistantIcon}><Icon name="message" className="h-[22px] w-[22px]" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={styles.assistantTitle}>{t.expertTitle}</p>
              <p style={styles.assistantSub}>{t.expertSub}</p>
            </div>
            <div style={styles.micBtn}><Icon name="mic" className="h-4 w-4" /></div>
          </Link>
          <div style={styles.chipRow}>
            {t.chips.map((c) => (
              <Link key={c} to={`/assistant?q=${encodeURIComponent(c)}`} style={styles.chip}>{c}</Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ═══════════════════════════ SOUS-COMPOSANTS ═══════════════════════════ */

function SectionHeader({ title, action, to }) {
  return (
    <div style={styles.sectionHeader}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {action && to && <Link to={to} style={styles.sectionLink}>{action}</Link>}
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div style={styles.statTile}>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
    </div>
  );
}

function WeatherHero({ lieu, actuel }) {
  return (
    <div style={styles.weatherHero}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={styles.weatherIcon}><Icon name={actuel.icon ?? "cloud"} className="h-6 w-6" /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={styles.weatherPlace}>{lieu}</p>
          <p style={styles.weatherTemp}>
            {Math.round(actuel.temperature)}°
            {actuel.description && <span style={styles.weatherDesc}>{actuel.description}</span>}
          </p>
        </div>
      </div>
      <div style={styles.weatherMeta}>
        <span style={styles.weatherMetaItem}>{actuel.humidity} % · humidité</span>
        <span style={styles.weatherMetaItem}>{Math.round(actuel.wind)} km/h · vent</span>
      </div>
    </div>
  );
}

function HealthRing({ value }) {
  const v = value ?? 0;
  const size = 72;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = value == null ? C.line : v >= 75 ? C.green : v >= 50 ? C.amber : C.red;
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
      role="img"
      aria-label={value == null ? "Score indisponible" : `${v} % de feuilles saines`}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (circ * Math.min(100, Math.max(0, v))) / 100}
          style={{ transition: "stroke-dashoffset .8s ease" }}
        />
      </svg>
      <span style={styles.ringValue}>{value == null ? "—" : `${v}%`}</span>
    </div>
  );
}

/**
 * Histogramme des 7 derniers jours. Des barres plutôt qu'une ligne : on compare des comptages
 * discrets, jour par jour ; une ligne suggérerait une variation continue entre deux jours.
 * Une seule teinte, foncée selon la valeur (rampe validée en contraste), pas d'arc-en-ciel.
 */
function Histogramme({ data, labels }) {
  const max = Math.max(1, ...data);
  const teinte = (v) => (v === 0 ? "#e7eee4" : v >= max * 0.66 ? "#2f6226" : v >= max * 0.33 ? "#4b963b" : "#86ba72");
  return (
    <div
      style={styles.histo}
      role="img"
      aria-label={labels.map((l, i) => `${l} : ${data[i]}`).join(", ")}
    >
      {data.map((v, i) => (
        <div key={labels[i]} style={styles.histoCol}>
          <span style={styles.histoValeur}>{v > 0 ? v : ""}</span>
          <div style={styles.histoPiste}>
            <div
              data-anim
              style={{
                ...styles.histoBarre,
                height: `${Math.max(3, (v / max) * 100)}%`,
                background: teinte(v),
                animationDelay: `${i * 45}ms`,
              }}
            />
          </div>
          <span style={styles.histoLabel}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════ STYLES ═══════════════════════════ */
const styles = {
  main: {
    background: C.bg, color: C.dark,
    paddingTop: 14,
    paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
    paddingLeft: 16, paddingRight: 16,
    display: "flex", flexDirection: "column", gap: 22, minHeight: "100dvh",
    fontFamily: "Poppins, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  shimmer: {
    height: 96, borderRadius: 20,
    background: `linear-gradient(90deg, ${C.sage} 25%, #f0f4ef 50%, ${C.sage} 75%)`,
    backgroundSize: "200% 100%", animation: "agv-shimmer 1.4s ease-in-out infinite",
  },
  offlineBanner: {
    display: "flex", alignItems: "center", gap: 8, background: C.amber, color: "#fff",
    padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700,
    animation: "agv-pulse 2s ease-in-out infinite",
  },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 2 },
  greeting: { fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.muted },
  iconBtnSmall: {
    width: 36, height: 36, borderRadius: 9999, border: `1px solid ${C.line}`, background: C.white,
    display: "grid", placeItems: "center", cursor: "pointer", color: C.forest, flexShrink: 0,
  },
  streakBadge: {
    display: "inline-block", background: "#FBF3E4", color: "#8A5A12",
    padding: "2px 8px", borderRadius: 9999, fontSize: 10, fontWeight: 800, border: "1px solid #F0D9A8",
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 9999, border: `1px solid ${C.line}`, background: C.white,
    display: "grid", placeItems: "center", cursor: "pointer", color: C.forest,
    boxShadow: "0 1px 2px rgba(18,60,47,0.04)", textDecoration: "none",
  },
  heroCta: {
    position: "relative", display: "flex", alignItems: "center", gap: 12,
    background: `linear-gradient(135deg, ${C.sage}, #dbe8dd)`, borderRadius: 20, padding: 16,
    textDecoration: "none", border: `1px solid ${C.line}`, animation: "agv-fade-up .45s ease both",
  },
  heroTitle: { margin: 0, fontSize: 15, fontWeight: 800, color: C.forest, lineHeight: 1.3 },
  heroSub: { margin: "4px 0 0", fontSize: 12, color: "#5D6A62", lineHeight: 1.45 },
  heroBadge: {
    display: "inline-block", marginTop: 8, background: "rgba(255,255,255,0.85)", color: C.primary,
    padding: "2px 8px", borderRadius: 9999, fontSize: 10, fontWeight: 700, border: `1px solid ${C.sage}`,
  },
  heroIcon: {
    position: "relative", flexShrink: 0, width: 56, height: 56, borderRadius: 18,
    background: C.primary, color: "#fff", display: "grid", placeItems: "center",
    boxShadow: "0 6px 16px rgba(35,122,87,0.35)",
  },
  heroIconPulse: { position: "absolute", inset: 0, borderRadius: 18, background: C.emerald, animation: "agv-breathe 2.4s ease-in-out infinite" },
  quickGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  quickCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 6px",
    borderRadius: 14, background: C.white, border: `1px solid ${C.line}`, textDecoration: "none",
    boxShadow: "0 1px 2px rgba(18,60,47,0.04)", minHeight: 92,
  },
  quickIcon: { width: 38, height: 38, borderRadius: 12, background: C.sage, color: C.primary, display: "grid", placeItems: "center", marginBottom: 2 },
  quickLabel: { margin: 0, fontSize: 10.5, fontWeight: 800, color: C.dark, textAlign: "center", lineHeight: 1.2 },
  quickSub: { margin: 0, fontSize: 9, fontWeight: 600, color: C.muted, textAlign: "center", lineHeight: 1.2 },
  weatherFail: {
    display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14,
    background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, fontSize: 12, color: "#5D6A62",
  },
  retryBtn: { background: C.sage, color: C.primary, border: "none", padding: "6px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700, cursor: "pointer" },
  weatherHero: {
    background: `linear-gradient(135deg, ${C.primary}, ${C.forest})`, color: "#fff",
    borderRadius: 20, padding: 16, boxShadow: "0 8px 24px rgba(18,60,47,0.2)",
  },
  weatherIcon: { width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center" },
  weatherPlace: { margin: 0, fontSize: 11, opacity: 0.9, fontWeight: 600 },
  weatherTemp: { margin: "2px 0 0", fontSize: 22, fontWeight: 800, lineHeight: 1.1 },
  weatherDesc: { fontSize: 12, fontWeight: 600, opacity: 0.9, marginLeft: 8 },
  weatherMeta: { display: "flex", gap: 16, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.2)" },
  weatherMetaItem: { fontSize: 12, fontWeight: 600, opacity: 0.95 },
  alertCard: { display: "flex", gap: 12, padding: 14, borderRadius: 18, background: "#FBEBEA", border: "1px solid rgba(217,83,79,0.25)", animation: "agv-fade-up .4s ease both" },
  alertEyebrow: { margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6C7670" },
  alertTitle: { margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: "#A3322E" },
  alertBody: { margin: "4px 0 0", fontSize: 12, color: C.dark, lineHeight: 1.5 },
  alertClose: { alignSelf: "flex-start", width: 28, height: 28, borderRadius: 9999, border: "none", background: "rgba(255,255,255,0.7)", color: "#6C7670", cursor: "pointer", fontSize: 14, lineHeight: 1 },
  card: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, boxShadow: "0 1px 2px rgba(18,60,47,0.04)" },
  healthRow: { display: "flex", alignItems: "center", gap: 16 },
  sectionTitle: { margin: 0, fontSize: 14, fontWeight: 800, color: C.forest },
  muted: { margin: "4px 0 0", fontSize: 11.5, color: "#5D6A62", lineHeight: 1.5 },
  hint: { margin: "4px 0 0", fontSize: 10.5, color: C.muted, lineHeight: 1.4 },
  ringValue: { position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 800, color: C.forest },
  statRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` },
  statTile: { textAlign: "center" },
  statValue: { margin: 0, fontSize: 18, fontWeight: 800, color: C.forest, fontVariantNumeric: "tabular-nums" },
  statLabel: { margin: "2px 0 0", fontSize: 10, fontWeight: 600, color: "#6C7670" },
  sectionHeader: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 10 },
  sectionLink: { fontSize: 11, fontWeight: 700, color: C.primary, textDecoration: "none" },
  sectionSub: { margin: "-6px 0 10px", fontSize: 11, color: "#6C7670" },
  cropGallery: { display: "flex", gap: 14, overflowX: "auto", marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16, paddingBottom: 4 },
  cropItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, textDecoration: "none", flexShrink: 0, width: 72 },
  cropCircle: { position: "relative", width: 64, height: 64, borderRadius: 9999, overflow: "hidden", border: "3px solid", boxShadow: "0 4px 12px rgba(18,60,47,0.14)" },
  cropLabel: {
    margin: 0, fontSize: 10.5, fontWeight: 700, color: C.dark, textAlign: "center", lineHeight: 1.2,
    height: 25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  cropCount: { margin: 0, fontSize: 9.5, fontWeight: 700, color: "#6C7670", fontVariantNumeric: "tabular-nums" },

  histo: { position: "relative", display: "flex", alignItems: "flex-end", gap: 6, height: 104, marginTop: 14 },
  histoCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%" },
  histoValeur: { fontSize: 10, fontWeight: 800, color: C.forest, fontVariantNumeric: "tabular-nums", minHeight: 13 },
  histoPiste: { flex: 1, width: "100%", display: "flex", alignItems: "flex-end" },
  histoBarre: { width: "100%", borderRadius: "4px 4px 0 0", animation: "agv-grow .55s ease both", transformOrigin: "bottom" },
  histoLabel: { fontSize: 9, color: "#6C7670", fontWeight: 600 },

  repartition: { marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 8 },
  repartitionTitre: { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6C7670" },
  repartitionSub: { fontWeight: 600, letterSpacing: 0, textTransform: "none" },
  repartitionLigne: { display: "flex", alignItems: "center", gap: 10, fontSize: 11.5 },
  repartitionLabel: { width: 92, flexShrink: 0, color: C.dark, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  repartitionPiste: { position: "relative", flex: 1, height: 8, borderRadius: 9999, background: "#eef3ec", overflow: "hidden" },
  repartitionBarre: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 9999, background: "#4b963b" },
  repartitionValeur: { width: 34, textAlign: "right", color: "#6C7670", fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  emptyCard: { padding: "22px 16px", textAlign: "center", fontSize: 12, color: "#5D6A62", background: C.white, border: `1px dashed ${C.line}`, borderRadius: 16 },
  lastCard: { display: "flex", alignItems: "center", gap: 12, background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, padding: 12, textDecoration: "none", color: "inherit", boxShadow: "0 1px 2px rgba(18,60,47,0.04)" },
  lastThumb: { width: 56, height: 56, borderRadius: 14, objectFit: "cover", flexShrink: 0 },
  lastThumbFallback: { width: 56, height: 56, borderRadius: 14, background: C.sage, color: C.primary, display: "grid", placeItems: "center", flexShrink: 0 },
  lastName: { margin: 0, fontSize: 13, fontWeight: 800, color: C.dark },
  lastCta: { fontSize: 11, fontWeight: 800, color: C.primary, flexShrink: 0 },
  carousel: { display: "flex", gap: 12, overflowX: "auto", marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16, paddingBottom: 4, scrollSnapType: "x mandatory" },
  diseaseCardWrap: { position: "relative", width: 200, flexShrink: 0, scrollSnapAlign: "start" },
  diseaseCard: { display: "block", borderRadius: 16, overflow: "hidden", textDecoration: "none", position: "relative", height: 128, background: `linear-gradient(135deg, ${C.primary}, ${C.forest})`, animation: "agv-fade-up .4s ease both" },
  diseaseImg: { width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 },
  diseaseGradient: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(18,60,47,0.95), rgba(18,60,47,0.2) 55%, transparent)" },
  diseaseCrop: { position: "absolute", left: 10, top: 10, background: C.primary, color: "#fff", padding: "3px 8px", borderRadius: 9999, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" },
  diseaseName: { position: "absolute", left: 12, right: 52, bottom: 12, fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  favBtn: { position: "absolute", bottom: 8, right: 8, width: 32, height: 32, borderRadius: 9999, border: "none", cursor: "pointer", fontSize: 14, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },
  recoCard: { display: "flex", alignItems: "center", gap: 12, background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, textDecoration: "none", color: "inherit", boxShadow: "0 1px 2px rgba(18,60,47,0.04)" },
  recoIcon: { width: 40, height: 40, borderRadius: 12, background: C.sage, display: "grid", placeItems: "center", flexShrink: 0 },
  recoTitle: { margin: 0, fontSize: 13, fontWeight: 800, color: C.dark },
  recoBody: { margin: "2px 0 0", fontSize: 11.5, color: "#5D6A62", lineHeight: 1.4 },
  taskRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0" },
  taskCheck: { width: 24, height: 24, borderRadius: 9999, border: `2px solid ${C.line}`, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, padding: 0 },
  taskLabel: { margin: 0, fontSize: 13, fontWeight: 700 },
  groupLabel: { margin: 0, padding: "8px 0 2px", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6C7670" },
  recentRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", textDecoration: "none", color: "inherit" },
  recentThumb: { width: 44, height: 44, borderRadius: 9999, objectFit: "cover", flexShrink: 0 },
  recentThumbFallback: { width: 44, height: 44, borderRadius: 9999, background: C.sage, color: C.primary, display: "grid", placeItems: "center", flexShrink: 0 },
  recentName: { margin: 0, fontSize: 13, fontWeight: 700, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  recentMeta: { display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: 11, color: "#5D6A62" },
  confidenceWrap: { display: "inline-flex", alignItems: "center", gap: 4 },
  confidenceBar: { position: "relative", width: 48, height: 6, borderRadius: 9999, background: C.line, overflow: "hidden" },
  confidenceFill: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 9999 },
  assistantRow: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" },
  assistantIcon: { width: 48, height: 48, borderRadius: 9999, background: `linear-gradient(135deg, ${C.emerald}, ${C.forest})`, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 },
  assistantTitle: { margin: 0, fontSize: 13, fontWeight: 800, color: C.dark },
  assistantSub: { margin: "2px 0 0", fontSize: 11.5, color: "#5D6A62", lineHeight: 1.4 },
  micBtn: { width: 36, height: 36, borderRadius: 9999, background: C.sage, color: C.primary, display: "grid", placeItems: "center", flexShrink: 0 },
  chipRow: { display: "flex", gap: 8, overflowX: "auto", marginTop: 12, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4, paddingBottom: 2 },
  chip: { flexShrink: 0, padding: "6px 12px", borderRadius: 9999, border: `1px solid ${C.line}`, background: C.white, fontSize: 11, fontWeight: 600, color: C.dark, textDecoration: "none", whiteSpace: "nowrap" },
};