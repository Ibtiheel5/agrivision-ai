// Signalement anonyme vers la carte des risques, uniquement si l'utilisateur l'a accepté.
import { API } from "../lib/assistant";
import { loadSettings } from "./settings";

/** Causes d'échec possibles, pour pouvoir les afficher au lieu de les avaler. */
export const RAISONS = {
  ok: "ok",
  partageDesactive: "partage-desactive",
  pasDeLabel: "pas-de-label",
  nonSecurise: "non-securise",
  apiAbsente: "api-absente",
  refusee: "permission-refusee",
  indisponible: "position-indisponible",
  delaiDepasse: "delai-depasse",
  serveur: "serveur",
};

/** Messages lisibles, dans les deux langues. */
export const MESSAGES = {
  fr: {
    "ok": "Position envoyée.",
    "partage-desactive": "Le partage de position est désactivé dans les Réglages.",
    "pas-de-label": "Aucune détection à signaler.",
    "non-securise": "La page n'est pas en HTTPS : le navigateur refuse la géolocalisation.",
    "api-absente": "Ce navigateur ne propose pas la géolocalisation.",
    "permission-refusee": "Position refusée. Autorisez-la pour ce site, puis rechargez la page.",
    "position-indisponible": "Position introuvable. Sortez à l'air libre et réessayez.",
    "delai-depasse": "La position a mis trop de temps à arriver.",
    "serveur": "Le serveur n'a pas accepté le signalement.",
  },
  derja: {
    "ok": "El blasa tab3thet.",
    "partage-desactive": "Mcharket el blasa matfiya fel réglages.",
    "pas-de-label": "Ma famech natija bech tetsajjel.",
    "non-securise": "El page mouch b HTTPS : el navigateur yarfodh el géolocalisation.",
    "api-absente": "El navigateur hedha ma3andouch géolocalisation.",
    "permission-refusee": "El blasa marfoudha. A3ti permission lel site hedha w 3awed 7ell el page.",
    "position-indisponible": "Ma l9inech el blasa. Okhrej lel barra w 3awed jarreb.",
    "delai-depasse": "El blasa 5dhet wa9t barcha.",
    "serveur": "El serveur ma 9belch el signalement.",
  },
};

export const messageRaison = (raison, lang = "fr") =>
  (MESSAGES[lang] ?? MESSAGES.fr)[raison] ?? raison;

/** Traduit une erreur du navigateur en raison exploitable. */
function raisonDepuisErreur(err) {
  if (err?.code === 1) return RAISONS.refusee;
  if (err?.code === 2) return RAISONS.indisponible;
  if (err?.code === 3) return RAISONS.delaiDepasse;
  return RAISONS.indisponible;
}

/** Demande la position courante. Rejette avec une erreur du navigateur. */
export const position = (timeout = 8000) =>
  new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      reject({ code: -1, raison: RAISONS.nonSecurise });
      return;
    }
    if (!navigator.geolocation) {
      reject({ code: -2, raison: RAISONS.apiAbsente });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout, maximumAge: 600000 });
  });

/**
 * Envoie une détection à la carte. Ne fait rien si le partage est désactivé.
 * Ne lève jamais : la carte ne doit pas bloquer l'analyse. Mais la raison de l'échec est
 * renvoyée, pour pouvoir l'afficher dans les Réglages au lieu de la deviner.
 * @returns {Promise<{ok: boolean, raison: string}>}
 */
export async function reportDetection(label) {
  if (!label) return { ok: false, raison: RAISONS.pasDeLabel };
  if (!loadSettings().shareLocation) return { ok: false, raison: RAISONS.partageDesactive };
  try {
    const { coords } = await position();
    const r = await fetch(`${API}/risk-map/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, lat: coords.latitude, lon: coords.longitude }),
    });
    return r.ok ? { ok: true, raison: RAISONS.ok } : { ok: false, raison: RAISONS.serveur };
  } catch (err) {
    return { ok: false, raison: err?.raison ?? raisonDepuisErreur(err) };
  }
}

/**
 * Diagnostic pour l'écran Réglages : dit exactement ce qui bloque, étape par étape.
 * Sur téléphone il n'y a pas de console : ce test est le seul moyen de voir l'erreur.
 */
export async function testerPosition() {
  const etapes = [];
  const secure = typeof window === "undefined" || window.isSecureContext !== false;
  etapes.push({ cle: "https", ok: secure });
  etapes.push({ cle: "api", ok: Boolean(navigator?.geolocation) });
  etapes.push({ cle: "partage", ok: Boolean(loadSettings().shareLocation) });

  let permission = null;
  try {
    permission = (await navigator.permissions?.query({ name: "geolocation" }))?.state ?? null;
  } catch {
    permission = null; // Safari ancien : l'API Permissions n'existe pas, ce n'est pas une erreur
  }

  if (!secure) return { ok: false, raison: RAISONS.nonSecurise, etapes, permission };
  if (!navigator?.geolocation) return { ok: false, raison: RAISONS.apiAbsente, etapes, permission };

  try {
    const { coords } = await position(12000);
    return {
      ok: true,
      raison: RAISONS.ok,
      etapes,
      permission,
      precisionM: Math.round(coords.accuracy ?? 0),
    };
  } catch (err) {
    return { ok: false, raison: err?.raison ?? raisonDepuisErreur(err), etapes, permission };
  }
}
