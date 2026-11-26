// Point d'entrée unique pour les conseils affichés après une prédiction, quel que soit le modèle.
// Les deux modèles produisent des étiquettes de forme très différente :
//   feuilles : "Tomato leaf late blight"   → fiche maladie (diseases.js)
//   fruits   : "Tomato__rotten"            → fiche qualité (fruits.js)
// L'interface n'a pas à connaître cette différence : elle appelle conseilPour() et affiche.

import { CROPS, DISEASES, findDisease } from "./diseases";
import { lireEtiquetteFruit } from "./fruits";
import { FICHES_DERJA, PRODUITS_DERJA, UI_DERJA } from "./conseils.derja";


// ---------------------------------------------------------------------------
// Les modèles ne nomment pas les classes de la même façon :
//   "Tomato leaf late blight"      (modèle 29 classes)
//   "Tomato___Late_blight"         (modèle 136 classes, nommage PlantVillage)
//   "potato healthy" / "Potato leaf"
// On ramène tout à un jeu de mots-clés comparable, pour retrouver la même fiche.
// ---------------------------------------------------------------------------

const MOTS_IGNORES = new Set(["leaf", "leaves", "plant", "healthy", "sain", "saine", "the", "and"]);

function jetons(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((mot) => mot && !MOTS_IGNORES.has(mot));
}

const cle = (label) => jetons(label).slice().sort().join(" ");

const PAR_JETONS = new Map(DISEASES.map((d) => [cle(d.model), d]));
// Premier mot de chaque étiquette = la culture ("tomato", "potato", "grape"…).
const CULTURE_PAR_MOT = new Map(DISEASES.map((d) => [jetons(d.model)[0], d.crop]));

/** Vrai quand l'étiquette dit explicitement que la plante est saine. */
const estSaine = (label) => /\b(healthy|sain|saine)\b/i.test(String(label || ""));

/** Retrouve la fiche malgré les différences de nommage entre modèles. */
export function trouverFiche(label) {
  return findDisease(label) ?? PAR_JETONS.get(cle(label)) ?? null;
}

// Conseils génériques quand la classe prédite n'a pas encore de fiche détaillée : mieux vaut
// une conduite à tenir raisonnable qu'un écran vide.
const GENERIQUE_MALADE = [
  "Retire les feuilles atteintes et sors-les de la parcelle : ne les laisse pas au sol.",
  "Arrose au pied, le matin, sans mouiller le feuillage.",
  "Aère : supprime les feuilles basses et élargis les écartements.",
  "Montre une feuille atteinte à un technicien agricole avant tout traitement.",
];
const GENERIQUE_SAIN = [
  "Rien à faire : continue la même conduite.",
  "Surveille chaque semaine, surtout après une pluie ou un coup de chaleur.",
];

// En dessous de ce score, on invite d'abord à refaire la photo avant de suivre les conseils.
export const SEUIL_INCERTAIN = 0.5;

const NOTE_FEUILLE =
  "Aide à la décision, pas un diagnostic agronomique. Aucune dose n'est donnée ici : "
  + "suis l'étiquette du produit et demande conseil à un technicien agricole.";
const NOTE_FRUIT =
  "Contrôle visuel de fraîcheur, pas une analyse sanitaire. En cas de doute sur un produit, ne le consomme pas.";

const ISOLER_DERJA = "A5rjou mel 9affa tawa : 7aja khayba tfassed el o5rin fi nhar walla zouz.";
const ISOLER = "Sors-le du lot tout de suite : un produit abîmé en contamine d'autres en un ou deux jours.";

/**
 * Renvoie un conseil normalisé pour une étiquette de l'un ou l'autre modèle.
 * @returns {null|{source,id,titre,derja,etat,urgence,tone,icon,resume,conseils,prevention,note,incertain}}
 */
export function conseilPour(label, { confidence, lang = "fr" } = {}) {
  const derja = lang === "derja";
  const incertain = typeof confidence === "number" && confidence < SEUIL_INCERTAIN;

  const fruit = lireEtiquetteFruit(label);
  if (fruit) {
    const { produit, etat } = fruit;
    const abime = etat === "abime";
    const tr = derja ? PRODUITS_DERJA[produit.id] : null;
    const nom = tr?.fr ?? produit.fr;
    return {
      source: "fruit",
      id: produit.id,
      titre: derja
        ? `${nom} — ${abime ? UI_DERJA.etat.abime : UI_DERJA.etat.frais}`
        : `${produit.fr} — ${abime ? "abîmé" : "frais"}`,
      derja: derja ? null : produit.derja,
      etat: abime ? "abime" : "sain",
      urgence: abime ? "agir" : "aucune",
      tone: abime ? "danger" : "ok",
      icon: abime ? "alert" : "check",
      resume: derja
        ? (abime
          ? `Hedha ma3adch yetba3 kima houwa. ${tr?.causes ?? produit.causes}`
          : "Hedha behi. Haw kifech t5allih behi atwal wa9t momken.")
        : (abime
          ? `Ce ${produit.famille} n'est plus commercialisable en l'état. ${produit.causes}`
          : `Ce ${produit.famille} est sain. Voici comment le garder ainsi le plus longtemps possible.`),
      conseils: abime
        ? [derja ? ISOLER_DERJA : ISOLER, ...(tr?.siAbime ?? produit.siAbime)]
        : (tr?.conservation ?? produit.conservation),
      prevention: abime ? (tr?.conservation ?? produit.conservation) : [],
      note: derja ? UI_DERJA.noteFruit : NOTE_FRUIT,
      incertain,
    };
  }

  const fiche = trouverFiche(label);
  if (!fiche) {
    const mots = jetons(label);
    // On ne produit des conseils génériques que si la culture est reconnue : sans cela,
    // n'importe quelle chaîne donnerait un bloc de conseils, ce qui serait trompeur.
    const crop = mots.map((m) => CULTURE_PAR_MOT.get(m)).find(Boolean);
    if (!crop) return null;
    const saine = estSaine(label);
    const nomCulture = CROPS[crop] ?? crop;
    return {
      source: "feuille",
      id: null,
      titre: derja
        ? `${nomCulture} — ${saine ? UI_DERJA.etat.sain : UI_DERJA.etat.malade}`
        : `${nomCulture} — ${saine ? "aucun symptôme" : "problème détecté"}`,
      derja: null,
      etat: saine ? "sain" : "malade",
      urgence: saine ? "aucune" : "surveiller",
      tone: saine ? "ok" : "warn",
      icon: saine ? "check" : "alert",
      resume: derja
        ? (saine ? "Ma famech 3ila 3al wra9a hedhi." : "Fama mochkla, ama mazel ma famech fiche mfassla l hadhi.")
        : (saine
          ? "Aucun symptôme repéré sur cette feuille."
          : "Un problème est détecté, mais aucune fiche détaillée ne correspond encore à cette classe."),
      conseils: derja
        ? (saine ? UI_DERJA.generiqueSain : UI_DERJA.generiqueMalade)
        : (saine ? GENERIQUE_SAIN : GENERIQUE_MALADE),
      prevention: [],
      note: derja ? UI_DERJA.noteFeuille : NOTE_FEUILLE,
      incertain,
      generique: true,
    };
  }
  const saine = fiche.type === "saine";
  const tf = derja ? FICHES_DERJA[fiche.id] : null;
  return {
    source: "feuille",
    id: fiche.id,
    titre: tf?.fr ?? fiche.fr,
    derja: null,
    etat: saine ? "sain" : "malade",
    urgence: saine ? "aucune" : "agir",
    tone: saine ? "ok" : fiche.type === "fongique" || fiche.type === "ravageur" ? "warn" : "danger",
    icon: saine ? "check" : "alert",
    resume: tf?.summary ?? fiche.summary,
    conseils: tf?.treatment ?? fiche.treatment,
    prevention: tf?.prevention ?? fiche.prevention,
    note: derja ? UI_DERJA.noteFeuille : NOTE_FEUILLE,
    incertain,
    generique: false,
  };
}

/** Phrase courte à placer sous le titre du résultat, en une ligne. */
export function resumeCourt(conseil, lang = "fr") {
  const derja = lang === "derja";
  if (!conseil) return derja ? UI_DERJA.aucuneFiche : "Aucune fiche ne correspond à ce résultat.";
  if (conseil.incertain) {
    return derja ? UI_DERJA.incertain : "Résultat peu sûr : refais une photo nette et de près avant d'agir.";
  }
  return conseil.resume;
}
