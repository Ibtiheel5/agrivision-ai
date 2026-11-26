import { useCallback, useEffect, useRef, useState } from "react";
import { predict, errorMessage } from "../services/api";
import { colorFor } from "../colors";
import { useLang } from "../LangContext";
import Icon from "./Icon";

/**
 * Côté le plus long envoyé au serveur en mode live.
 * Compromis direct : 416 px donne plus d'images par seconde, 640 px détecte les petites lésions.
 * Le modèle est servi à 800 px ; trop réduire fait disparaître les taches fines.
 */
const COTE_LIVE = Number(import.meta.env?.VITE_LIVE_SIDE) || 560;
/**
 * Durée de vie d'une boîte sans réponse plus récente. Elle s'adapte à la latence réelle :
 * trop courte, les boîtes clignotent entre deux réponses ; trop longue, elles décrivent
 * une scène périmée. Bornes : jamais moins de 900 ms, jamais plus de 2,5 s.
 */
const PERSISTANCE_MIN = 900;
const PERSISTANCE_MAX = 2500;
/**
 * Au-delà, le direct n'a plus de sens : moins d'une image toutes les deux secondes.
 * On le dit à l'utilisateur au lieu d'afficher des boîtes périmées comme si de rien n'était.
 */
const LATENCE_TROP_LENTE = 2000;
/** En direct, on n'affiche que les meilleures détections : au-delà, l'image devient illisible. */
const MAX_BOITES_LIVE = 3;
/**
 * Au-delà de cette part de l'image, la « détection » ne localise plus rien : le modèle a
 * classé la photo entière. On l'affiche comme un verdict global, pas comme un cadre —
 * un rectangle qui épouse les bords ferait croire à une localisation qui n'existe pas.
 * Seuil bas (0,70) parce que le détecteur fruits renvoie des boîtes quasi plein cadre :
 * mesuré à 0,88 sur un gros plan et ~0,84 sur un fruit occupant un quart de l'image.
 */
const PART_IMAGE_ENTIERE = 0.70;

/**
 * Même clé que la page Scan : le choix de l'utilisateur le suit d'un écran à l'autre.
 * C'est aussi par là que le parent récupère le mode choisi — surtout pas par un argument
 * supplémentaire de onCapture, dont la signature appartient aux appelants existants.
 */
export const MODE_KEY = "agrivision.scanMode";
export const lireModeScan = () => {
  try {
    return localStorage.getItem(MODE_KEY) === "fruit" ? "fruit" : "leaf";
  } catch {
    return "leaf";
  }
};
/** « Orange__fresh » → « Orange — frais ». Les étiquettes brutes ne sont pas pour l'agriculteur. */
const ETATS_FRUIT = { fresh: "frais", rotten: "abîmé" };
const joliLabel = (label = "") => {
  const m = String(label).match(/^(.+?)__(fresh|rotten)$/i);
  if (m) {
    const nom = m[1].replace(/_/g, " ");
    return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} — ${ETATS_FRUIT[m[2].toLowerCase()]}`;
  }
  return label;
};

const MODES = [
  { id: "leaf", icon: "leaf", fr: "Feuille", derja: "Wra9a" },
  { id: "fruit", icon: "sprout", fr: "Fruit / légume", derja: "8alla / khodhra" },
];
const persistancePour = (latenceMs) =>
  Math.min(PERSISTANCE_MAX, Math.max(PERSISTANCE_MIN, latenceMs * 2.2));
/** Nombre d'échecs réseau tolérés d'affilée avant d'arrêter la boucle. */
const ECHECS_TOLERES = 3;

/** Webcam : capture unique ou détection continue (boucle séquentielle, FPS affiché). */
export default function WebcamCapture({ onCapture, conf }) {
  const { t, lang } = useLang();
  const video = useRef(null);
  const overlay = useRef(null);
  const cadre = useRef(null);
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);
  const stream = useRef(null);
  const running = useRef(false);
  const rafId = useRef(0);
  // Dernières détections reçues, en coordonnées normalisées (0 → 1) : indépendantes de la résolution.
  const dernieres = useRef({ boites: [], at: 0 });
  const persistance = useRef(PERSISTANCE_MIN);
  const scratch = useRef(null);

  const [on, setOn] = useState(false);
  const [live, setLive] = useState(false);
  const [fps, setFps] = useState(0);
  const [lent, setLent] = useState(false);
  const [mode, setModeState] = useState(lireModeScan);
  const modeRef = useRef(mode); // la boucle live lit la ref, pas la valeur figée à son démarrage
  const [msg, setMsg] = useState("");
  const [liveUnavailable, setLiveUnavailable] = useState(false);
  const supported = typeof window !== "undefined"
    && window.isSecureContext
    && typeof navigator !== "undefined"
    && Boolean(navigator.mediaDevices?.getUserMedia);

  const stop = useCallback(() => {
    running.current = false;
    cancelAnimationFrame(rafId.current);
    dernieres.current = { boites: [], at: 0 };
    setLive(false);
    setFps(0);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setOn(false);
  }, []);
  useEffect(() => stop, [stop]);

  const start = async () => {
    setMsg("");
    setLiveUnavailable(false);
    if (!supported) {
      setLiveUnavailable(true);
      setMsg(t("cameraLiveUnavailable"));
      return;
    }

    setOn(true);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } } });
      video.current.srcObject = stream.current;
      await video.current.play();
      ajusterCadre();
    } catch (error) {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      if (video.current) video.current.srcObject = null;
      setOn(false);
      setLiveUnavailable(true);
      const messageKey = {
        NotAllowedError: "cameraPermissionDenied",
        NotFoundError: "cameraNotFound",
        NotReadableError: "cameraBusy",
      }[error.name] || "cameraLiveUnavailable";
      setMsg(`${t(messageKey)} (${error.name || "UnknownError"})`);
    }
  };

  /**
   * Donne au conteneur le rapport d'aspect exact du flux vidéo. Sans cela, la vidéo est rognée par
   * `object-cover` alors que le canvas, lui, est étiré : les boîtes tombent à côté de la feuille.
   */
  const ajusterCadre = () => {
    const v = video.current;
    if (!v?.videoWidth || !cadre.current) return;
    cadre.current.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
  };

  const handleFallbackImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file?.type.startsWith("image/")) onCapture(file);
  };

  /** Photo pleine résolution, pour le bouton « Capturer ». */
  const grab = () =>
    new Promise((res, rej) => {
      const v = video.current;
      if (!v?.videoWidth) { rej(new Error("flux vidéo non prêt")); return; }
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      c.toBlob((b) => (b ? res(new File([b], "webcam.jpg", { type: "image/jpeg" })) : rej(new Error("capture vide"))), "image/jpeg", 0.85);
    });

  /** Image réduite pour le live : un seul encodage, directement à la bonne taille. */
  const grabLive = () =>
    new Promise((res, rej) => {
      const v = video.current;
      if (!v?.videoWidth) { rej(new Error("flux vidéo non prêt")); return; }
      if (!scratch.current) scratch.current = document.createElement("canvas");
      const c = scratch.current;
      const r = Math.min(1, COTE_LIVE / Math.max(v.videoWidth, v.videoHeight));
      c.width = Math.round(v.videoWidth * r);
      c.height = Math.round(v.videoHeight * r);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? res(new File([b], "live.jpg", { type: "image/jpeg" })) : rej(new Error("capture vide"))), "image/jpeg", 0.7);
    });

  /** Redessine l'overlay à chaque rafraîchissement de l'écran, indépendamment des réponses réseau. */
  const dessiner = useCallback(() => {
    const cv = overlay.current;
    const v = video.current;
    if (!cv || !v?.videoWidth) return;
    if (cv.width !== v.videoWidth || cv.height !== v.videoHeight) {
      cv.width = v.videoWidth;
      cv.height = v.videoHeight;
    }
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);

    // Une boîte reste affichée jusqu'à la réponse suivante, puis s'efface en fondu.
    // La durée suit la latence mesurée : si le serveur met 1,2 s, garder 700 ms ferait clignoter.
    const vie = persistance.current;
    const age = performance.now() - dernieres.current.at;
    if (age > vie) return;
    ctx.globalAlpha = age > vie / 2 ? Math.max(0, 1 - (age - vie / 2) / (vie / 2)) : 1;
    const trait = Math.max(2, cv.width / 260);
    const taillePolice = Math.max(13, cv.width / 46);
    ctx.font = `bold ${taillePolice}px sans-serif`;
    ctx.lineWidth = trait;
    ctx.lineCap = "round";

    // Détection qui couvre toute l'image : verdict global, affiché en bandeau.
    const globale = dernieres.current.boites.find((d) => d.globale);
    if (globale) {
      const texte = `${joliLabel(globale.label)} · ${Math.round(globale.confidence * 100)} %`;
      const hauteur = taillePolice * 2;
      ctx.fillStyle = "rgba(31,53,40,0.82)";
      ctx.fillRect(0, cv.height - hauteur, cv.width, hauteur);
      ctx.fillStyle = "#fff";
      ctx.fillText(texte, taillePolice * 0.6, cv.height - hauteur * 0.35);
      ctx.globalAlpha = 1;
      return;
    }

    dernieres.current.boites.forEach((d) => {
      // Coordonnées normalisées → pixels du canvas : vrai quelle que soit la taille envoyée au serveur.
      const x1 = d.x1 * cv.width;
      const y1 = d.y1 * cv.height;
      const x2 = d.x2 * cv.width;
      const y2 = d.y2 * cv.height;
      const couleur = colorFor(d.class_id);

      // Coins d'angle au lieu d'un rectangle plein : on montre exactement la même zone,
      // mais sans la barrière visuelle qui donne l'impression d'un cadre énorme.
      const coin = Math.min(28, (x2 - x1) * 0.22, (y2 - y1) * 0.22);
      ctx.strokeStyle = couleur;
      ctx.beginPath();
      ctx.moveTo(x1, y1 + coin); ctx.lineTo(x1, y1); ctx.lineTo(x1 + coin, y1);
      ctx.moveTo(x2 - coin, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + coin);
      ctx.moveTo(x2, y2 - coin); ctx.lineTo(x2, y2); ctx.lineTo(x2 - coin, y2);
      ctx.moveTo(x1 + coin, y2); ctx.lineTo(x1, y2); ctx.lineTo(x1, y2 - coin);
      ctx.stroke();

      // Le contour complet, très léger : la zone reste lisible sans dominer l'image.
      ctx.globalAlpha *= 0.35;
      ctx.lineWidth = trait * 0.6;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.globalAlpha /= 0.35;
      ctx.lineWidth = trait;

      // Étiquette sur pastille : lisible sur fond clair comme sur fond sombre.
      const texte = `${joliLabel(d.label)} ${Math.round(d.confidence * 100)} %`;
      const largeur = ctx.measureText(texte).width + taillePolice * 0.7;
      const hauteur = taillePolice * 1.5;
      const yPastille = y1 - hauteur - trait < 0 ? y1 + trait : y1 - hauteur - trait;
      ctx.fillStyle = couleur;
      ctx.beginPath();
      ctx.roundRect(x1, yPastille, largeur, hauteur, hauteur / 2.5);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(texte, x1 + taillePolice * 0.35, yPastille + hauteur * 0.72);
    });
    ctx.globalAlpha = 1;
  }, []);

  const boucleDessin = useCallback(() => {
    dessiner();
    if (running.current) rafId.current = requestAnimationFrame(boucleDessin);
  }, [dessiner]);

  const loop = async () => {
    running.current = true;
    setLive(true);
    setMsg("");
    ajusterCadre();
    rafId.current = requestAnimationFrame(boucleDessin);

    let echecs = 0;
    let lisse = 0;
    while (running.current) {
      const t0 = performance.now();
      try {
        const file = await grabLive();
        // En mode fruit on laisse le seuil calibré du modèle : il est plus juste que le curseur
        // réglé pour les feuilles.
        const courant = modeRef.current;
        const { data } = await predict(file, { conf: courant === "fruit" ? undefined : conf, mode: courant });
        if (!running.current) break;
        const latence = performance.now() - t0;
        persistance.current = persistancePour(latence);
        setLent(latence > LATENCE_TROP_LENTE);
        dernieres.current = {
          at: performance.now(),
          boites: (data.detections ?? [])
            .slice()
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, MAX_BOITES_LIVE)
            .map((d) => ({
            class_id: d.class_id,
            label: d.label,
            confidence: d.confidence,
            x1: d.box.x1 / data.image_width,
            y1: d.box.y1 / data.image_height,
            x2: d.box.x2 / data.image_width,
            y2: d.box.y2 / data.image_height,
          }))
            .map((b) => ({ ...b, globale: (b.x2 - b.x1) * (b.y2 - b.y1) >= PART_IMAGE_ENTIERE })),
        };
        echecs = 0;
        const instant = 1000 / Math.max(1, performance.now() - t0);
        lisse = lisse ? lisse * 0.7 + instant * 0.3 : instant;
        setFps(lisse);
      } catch (e) {
        if (!running.current) break;
        echecs += 1;
        if (echecs >= ECHECS_TOLERES) {
          setMsg(errorMessage(e));
          running.current = false;
          setLive(false);
          cancelAnimationFrame(rafId.current);
          break;
        }
        await new Promise((r) => setTimeout(r, 400)); // on laisse passer l'incident réseau
      }
    }
  };

  const changerMode = (m) => {
    setModeState(m);
    modeRef.current = m;
    try { localStorage.setItem(MODE_KEY, m); } catch { /* stockage indisponible */ }
    // Les boîtes affichées viennent de l'autre modèle : les garder serait un faux diagnostic.
    dernieres.current = { boites: [], at: 0 };
    dessiner();
  };

  const arreterLive = () => {
    running.current = false;
    cancelAnimationFrame(rafId.current);
    dernieres.current = { boites: [], at: 0 };
    dessiner();
    setLive(false);
    setFps(0);
    setLent(false);
  };

  return (
    <div className="space-y-3">
      {(!supported || liveUnavailable) && (
        <p className="rounded-xl bg-[#f2f6ee] p-3 text-xs leading-5 text-[#65735f]">
          {liveUnavailable ? msg : t("cameraFallbackHelp")}
        </p>
      )}
      {/* Choix du modèle AVANT de viser : feuilles et fruits sont deux modèles distincts. */}
      <div role="tablist" aria-label={lang === "derja" ? "Naw3 el ta7lil" : "Type d'analyse"} className="flex gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => changerMode(m.id)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition ${
              mode === m.id ? "bg-[#1f3528] text-white" : "bg-[#edf6e8] text-[#3d7241]"
            }`}
          >
            <Icon name={m.icon} className="h-4 w-4" />
            {lang === "derja" ? m.derja : m.fr}
          </button>
        ))}
      </div>

      <div ref={cadre} className={`relative overflow-hidden rounded-xl bg-[#17241a] ${on ? "" : "hidden"}`}>
        {/* object-contain : la vidéo n'est pas rognée, donc le canvas se superpose au pixel près. */}
        <video
          ref={video}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={ajusterCadre}
          className="absolute inset-0 h-full w-full object-contain"
        />
        <canvas ref={overlay} className="absolute inset-0 h-full w-full" />
        {live && (
          <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-[#1f3528]/85 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a7e65a]" />
            LIVE · {(lang === "derja" ? MODES.find((m) => m.id === mode)?.derja : MODES.find((m) => m.id === mode)?.fr)} · {fps.toFixed(1)} FPS
          </span>
        )}
      </div>
      {live && lent && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Le serveur répond en plus de deux secondes : les cadres ne suivent plus la caméra.
          Vise la feuille, garde le téléphone immobile, puis touche « Capturer ».
        </p>
      )}
      {msg && !liveUnavailable && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        {!on ? (
          <>
            <button type="button" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#edf6e8] px-3 text-xs font-semibold text-[#3d7241] transition hover:bg-[#e2f0d8]" onClick={start}>
              <Icon name="camera" className="h-4 w-4" />
              {t("start")}
            </button>
            {(!supported || liveUnavailable) && (
              <>
                <button type="button" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4b963b] px-3 text-xs font-semibold text-white" onClick={() => cameraInput.current?.click()}>
                  <Icon name="camera" className="h-4 w-4" />
                  {t("takePhoto")}
                </button>
                <button type="button" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#edf6e8] px-3 text-xs font-semibold text-[#3d7241]" onClick={() => galleryInput.current?.click()}>
                  <Icon name="gallery" className="h-4 w-4" />
                  {t("pick")}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4b963b] px-3 text-xs font-semibold text-white"
              onClick={async () => {
                try { onCapture(await grab()); } catch (e) { setMsg(errorMessage(e)); }
              }}
            >
              <Icon name="camera" className="h-4 w-4" />
              {t("capture")}
            </button>
            <button type="button" className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#edf6e8] px-3 text-xs font-semibold text-[#3d7241]" onClick={() => (live ? arreterLive() : loop())}>
              <Icon name={live ? "stop" : "live"} className="h-4 w-4" />
              {live ? t("stop") : t("live")}
            </button>
            <button type="button" aria-label={t("stop")} className="flex min-h-10 w-10 items-center justify-center rounded-xl bg-[#f7eeee] text-[#9b5544]" onClick={stop}>
              <Icon name="close" className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFallbackImage} />
      <input ref={galleryInput} type="file" accept="image/*" className="hidden" onChange={handleFallbackImage} />
    </div>
  );
}