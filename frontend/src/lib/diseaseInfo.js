const FALLBACK = {
  symptoms: ["Taches, d?coloration ou zones anormales visibles sur la feuille."],
  actions: ["Isolez la plante si possible.", "Prenez une photo nette de la zone touch?e.", "Surveillez l'?volution sur 2-3 jours."],
  prevention: ["?vitez l'exc?s d'humidit? sur le feuillage.", "Utilisez un outil propre lors de la taille."],
};

const DISEASES = {
  "Apple Scab Leaf": { symptoms:["Taches fonc?es/olive sur feuilles.","Feuilles d?form?es en cas d'attaque forte."], actions:["Retirez feuilles infect?es.","?vitez d'arroser le feuillage.","Demandez conseil pour traitement fongicide adapt?."], prevention:["Taille a?r?e.","Ramassez feuilles mortes."] },
  "Apple leaf": { symptoms:["Feuille globalement saine."], actions:["Aucune action urgente.","Continuez la surveillance r?guli?re."], prevention:["Arrosage ?quilibr?.","Bonne lumi?re."] },
  "Apple rust leaf": { symptoms:["Taches jaune-orange sur feuille."], actions:["Retirez feuilles tr?s atteintes.","Surveillez plantes h?tes proches.","Consultez un sp?cialiste si extension."], prevention:["A?ration.","?viter humidit? prolong?e."] },
  "Bell_pepper leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance r?guli?re."] },
  "Bell_pepper leaf spot": { symptoms:["Taches brunes/noires, parfois halo jaune."], actions:["Retirez parties atteintes.","?vitez ?claboussures d'eau.","Demander avis phytosanitaire."], prevention:["Arrosage au pied.","Rotation/semences saines."] },
  "Blueberry leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["pH et arrosage adapt?s."] },
  "Cherry leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance saisonni?re."] },
  "Corn Gray leaf spot": { symptoms:["L?sions rectangulaires grises/brunes."], actions:["Surveillez la progression.","?vitez stress hydrique.","Consultez sp?cialiste pour fongicide."], prevention:["Rotation des cultures.","Gestion des r?sidus."] },
  "Corn leaf blight": { symptoms:["Grandes l?sions allong?es brun-gris."], actions:["Retirez r?sidus infect?s.","Surveillez parcelle.","Avis agronomique si extension."], prevention:["Vari?t?s tol?rantes.","Rotation."] },
  "Corn rust leaf": { symptoms:["Pustules brun-orange/rouille."], actions:["Surveillez rapidement.","Consultez sp?cialiste selon stade."], prevention:["Vari?t?s r?sistantes.","Semis adapt?."] },
  "Peach leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance et taille sanitaire."] },
  "Potato leaf early blight": { symptoms:["Taches brunes ? anneaux concentriques."], actions:["Retirez feuilles atteintes.","?vitez humidit? sur feuillage.","Demander traitement adapt?."], prevention:["Rotation.","Fertilisation ?quilibr?e."] },
  "Potato leaf late blight": { symptoms:["Taches fonc?es humides, progression rapide."], actions:["Isolez/retirez parties atteintes.","Agissez vite, risque ?lev?.","Contactez sp?cialiste agricole."], prevention:["?viter humidit?.","Surveillance ?troite."] },
  "Raspberry leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["A?ration et arrosage au pied."] },
  "Soyabean leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance r?guli?re."] },
  "Soybean leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance r?guli?re."] },
  "Squash Powdery mildew leaf": { symptoms:["D?p?t blanc poudreux sur feuille."], actions:["Retirez feuilles tr?s atteintes.","Am?liorez a?ration.","Traitement adapt? si n?cessaire."], prevention:["?viter ombre humide.","Espacement des plants."] },
  "Strawberry leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Arrosage au pied."] },
  "Tomato Early blight leaf": { symptoms:["Taches brunes avec anneaux, jaunissement."], actions:["Retirez feuilles basses atteintes.","Arrosez au pied.","Avis sp?cialiste si propagation."], prevention:["Paillage.","Rotation."] },
  "Tomato Septoria leaf spot": { symptoms:["Petites taches grises/brunes ? bord sombre."], actions:["Retirez feuilles infect?es.","?vitez mouillage du feuillage.","Nettoyez outils."], prevention:["Rotation.","Espacement."] },
  "Tomato leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance r?guli?re."] },
  "Tomato leaf bacterial spot": { symptoms:["Petites taches sombres, parfois halo jaune."], actions:["Retirez parties atteintes.","?vitez travailler plantes mouill?es.","Demandez avis sp?cialis?."], prevention:["Semences/plants sains.","Hygi?ne."] },
  "Tomato leaf late blight": { symptoms:["L?sions fonc?es, propagation rapide, humidit?."], actions:["Action rapide : isoler/retirer.","?vitez contamination.","Contactez sp?cialiste."], prevention:["A?ration.","?viter arrosage foliaire."] },
  "Tomato leaf mosaic virus": { symptoms:["Mosa?que, d?formation, croissance r?duite."], actions:["Isolez la plante.","D?sinfectez outils/mains.","Pas d'antibiotique/fongicide efficace."], prevention:["Hygi?ne stricte.","Plants certifi?s."] },
  "Tomato leaf yellow virus": { symptoms:["Jaunissement, feuilles enroul?es, vigueur faible."], actions:["Contr?lez insectes vecteurs.","Isolez plantes affect?es.","Consultez sp?cialiste."], prevention:["Gestion des vecteurs.","Plants sains."] },
  "Tomato mold leaf": { symptoms:["Moisissure/taches sur face inf?rieure ou sup?rieure."], actions:["R?duisez humidit?.","Am?liorez ventilation.","Retirez feuilles atteintes."], prevention:["A?ration serre.","Arrosage matinal au pied."] },
  "Tomato two spotted spider mites leaf": { symptoms:["Petites piq?res, jaunissement, toile fine possible."], actions:["Inspectez face inf?rieure.","Douche d'eau l?g?re si adapt?.","Avis sp?cialiste pour lutte."], prevention:["Surveillez en temps sec.","?vitez stress hydrique."] },
  "grape leaf": { symptoms:["Feuille saine."], actions:["Aucune action urgente."], prevention:["Surveillance et taille."] },
  "grape leaf black rot": { symptoms:["Taches brunes avec bord sombre, l?sions."], actions:["Retirez organes infect?s.","Am?liorez a?ration.","Avis phytosanitaire."], prevention:["Hygi?ne du vignoble.","Gestion humidit?."] },
};

export function getDiseaseInfo(label) {
  const key = (label || "").trim();
  return DISEASES[key] || DISEASES[key.replace(/_/g, " ")] || FALLBACK;
}

export function isHealthyLabel(label = "") {
  return /healthy|leaf$|Blueberry leaf|Cherry leaf|Peach leaf|Raspberry leaf|Soyabean leaf|Soybean leaf|Strawberry leaf|grape leaf|Bell_pepper leaf|Tomato leaf/i.test(label) && !/spot|blight|rust|mold|virus|mites|rot|scab/i.test(label);
}
