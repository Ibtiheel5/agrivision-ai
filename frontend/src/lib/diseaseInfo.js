const FALLBACK = {
  symptoms: ["Taches, décoloration ou zones anormales visibles sur la feuille."],
  actions: ["Isolez la plante si possible.", "Prenez une photo nette de la zone touchée.", "Surveillez l'évolution sur 2-3 jours."],
  prevention: ["Évitez l'excès d'humidité sur le feuillage.", "Utilisez un outil propre lors de la taille."],
};

const DISEASES = {
  "Apple Scab Leaf": { symptoms:["Taches foncées/olive sur feuilles.","Feuilles déformées en cas d'attaque forte."], actions:["Retirez feuilles infectées.","Évitez d'arroser le feuillage.","Demandez conseil pour traitement fongicide adapté."], prevention:["Taille aérée.","Ramassez feuilles mortes."] },
  "Apple leaf": { symptoms:["Feuille globalement saine."], actions:["Aucune action urgente.","Continuez la surveillance régulière."], prevention:["Arrosage équilibré.","Bonne lumière."] },
  "Apple rust leaf": { symptoms:["Taches jaune-orange sur feuille."], actions:["Retirez feuilles très atteintes.","Surveillez plantes hôtes proches.","Consultez un spécialiste si extension."], prevention:["Aération.","Éviter humidité prolongée."] },
  "Bell_pepper leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance régulière."] },
  "Bell_pepper leaf spot": { symptoms:["Taches brunes/noires, parfois halo jaune."], actions:["Retirez parties atteintes.","Évitez ?claboussures d'eau.","Demander avis phytosanitaire."], prevention:["Arrosage au pied.","Rotation/semences saines."] },
  "Blueberry leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["pH et arrosage adaptés."] },
  "Cherry leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance saisonnière."] },
  "Corn Gray leaf spot": { symptoms:["Lésions rectangulaires grises/brunes."], actions:["Surveillez la progression.","Évitez stress hydrique.","Consultez spécialiste pour fongicide."], prevention:["Rotation des cultures.","Gestion des résidus."] },
  "Corn leaf blight": { symptoms:["Grandes lésions allongées brun-gris."], actions:["Retirez résidus infectés.","Surveillez parcelle.","Avis agronomique si extension."], prevention:["Variétés tolérantes.","Rotation."] },
  "Corn rust leaf": { symptoms:["Pustules brun-orange/rouille."], actions:["Surveillez rapidement.","Consultez spécialiste selon stade."], prevention:["Variétés résistantes.","Semis adapté."] },
  "Peach leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance et taille sanitaire."] },
  "Potato leaf early blight": { symptoms:["Taches brunes à anneaux concentriques."], actions:["Retirez feuilles atteintes.","Évitez humidité sur feuillage.","Demander traitement adapté."], prevention:["Rotation.","Fertilisation équilibrée."] },
  "Potato leaf late blight": { symptoms:["Taches foncées humides, progression rapide."], actions:["Isolez/retirez parties atteintes.","Agissez vite, risque élevé.","Contactez spécialiste agricole."], prevention:["Éviter humidité.","Surveillance étroite."] },
  "Raspberry leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Aération et arrosage au pied."] },
  "Soyabean leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance régulière."] },
  "Soybean leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance régulière."] },
  "Squash Powdery mildew leaf": { symptoms:["Dépôt blanc poudreux sur feuille."], actions:["Retirez feuilles très atteintes.","Améliorez aération.","Traitement adapté si nécessaire."], prevention:["Éviter ombre humide.","Espacement des plants."] },
  "Strawberry leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Arrosage au pied."] },
  "Tomato Early blight leaf": { symptoms:["Taches brunes avec anneaux, jaunissement."], actions:["Retirez feuilles basses atteintes.","Arrosez au pied.","Avis spécialiste si propagation."], prevention:["Paillage.","Rotation."] },
  "Tomato Septoria leaf spot": { symptoms:["Petites taches grises/brunes ? bord sombre."], actions:["Retirez feuilles infectées.","Évitez mouillage du feuillage.","Nettoyez outils."], prevention:["Rotation.","Espacement."] },
  "Tomato leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance régulière."] },
  "Tomato leaf bacterial spot": { symptoms:["Petites taches sombres, parfois halo jaune."], actions:["Retirez parties atteintes.","Évitez travailler plantes mouill?es.","Demandez avis sp?cialis?."], prevention:["Semences/plants sains.","Hygi?ne."] },
  "Tomato leaf late blight": { symptoms:["Lésions foncées, propagation rapide, humidité."], actions:["Action rapide : isoler/retirer.","Évitez contamination.","Contactez spécialiste."], prevention:["Aération.","Éviter arrosage foliaire."] },
  "Tomato leaf mosaic virus": { symptoms:["Mosa?que, d?formation, croissance r?duite."], actions:["Isolez la plante.","D?sinfectez outils/mains.","Pas d'antibiotique/fongicide efficace."], prevention:["Hygi?ne stricte.","Plants certifi?s."] },
  "Tomato leaf yellow virus": { symptoms:["Jaunissement, feuilles enroul?es, vigueur faible."], actions:["Contr?lez insectes vecteurs.","Isolez plantes affect?es.","Consultez spécialiste."], prevention:["Gestion des vecteurs.","Plants sains."] },
  "Tomato mold leaf": { symptoms:["Moisissure/taches sur face inf?rieure ou sup?rieure."], actions:["R?duisez humidité.","Améliorez ventilation.","Retirez feuilles atteintes."], prevention:["Aération serre.","Arrosage matinal au pied."] },
  "Tomato two spotted spider mites leaf": { symptoms:["Petites piq?res, jaunissement, toile fine possible."], actions:["Inspectez face inf?rieure.","Douche d'eau l?g?re si adapté.","Avis spécialiste pour lutte."], prevention:["Surveillez en temps sec.","Évitez stress hydrique."] },
  "grape leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance et taille."] },
  "grape leaf black rot": { symptoms:["Taches brunes avec bord sombre, lésions."], actions:["Retirez organes infectés.","Améliorez aération.","Avis phytosanitaire."], prevention:["Hygi?ne du vignoble.","Gestion humidité."] },
};

export function getDiseaseInfo(label) {
  const key = (label || "").trim();
  return DISEASES[key] || DISEASES[key.replace(/_/g, " ")] || FALLBACK;
}

export function isHealthyLabel(label = "") {
  return /healthy|leaf$|Blueberry leaf|Cherry leaf|Peach leaf|Raspberry leaf|Soyabean leaf|Soybean leaf|Strawberry leaf|grape leaf|Bell_pepper leaf|Tomato leaf/i.test(label) && !/spot|blight|rust|mold|virus|mites|rot|scab/i.test(label);
}
