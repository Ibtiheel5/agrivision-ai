/**
 * Fiches des 29 classes du modèle AgriVision (voir models/classes.txt).
 * `model` reprend le libellé exact renvoyé par l'API : c'est la clé de correspondance.
 * Aucune dose de produit n'est donnée : la lutte chimique renvoie à l'étiquette et au technicien.
 */
export const CROPS = {
  tomate: "Tomate",
  pommeDeTerre: "Pomme de terre",
  poivron: "Poivron",
  mais: "Maïs",
  vigne: "Vigne",
  pommier: "Pommier",
  courge: "Courge",
  fraisier: "Fraisier",
  autres: "Autres cultures",
};

export const TYPES = {
  saine: { fr: "Feuille saine", icon: "check", tone: "ok" },
  fongique: { fr: "Maladie fongique", icon: "droplet", tone: "warn" },
  bacterienne: { fr: "Maladie bactérienne", icon: "alert", tone: "danger" },
  virale: { fr: "Maladie virale", icon: "alert", tone: "danger" },
  ravageur: { fr: "Ravageur", icon: "bug", tone: "warn" },
};

const SAINE = {
  type: "saine",
  symptoms: ["Feuille uniforme, sans taches ni décoloration.", "Bords réguliers, pas de déformation ni de flétrissement."],
  treatment: ["Aucun traitement nécessaire."],
  prevention: [
    "Continue la même conduite : arrosage régulier au pied, sans mouiller le feuillage.",
    "Surveille chaque semaine, surtout après une pluie ou un coup de chaleur.",
  ],
};

export const DISEASES = [
  // ---------- Tomate ----------
  {
    id: "tomate-mildiou",
    model: "Tomato leaf late blight",
    fr: "Mildiou de la tomate",
    crop: "tomate",
    type: "fongique",
    summary: "Maladie la plus destructrice de la tomate : elle peut détruire une parcelle en quelques jours par temps humide et doux.",
    symptoms: [
      "Taches huileuses vert sombre, puis brunes, souvent au bord du limbe.",
      "Duvet blanchâtre sous la feuille par temps humide.",
      "Tiges brunies et fruits marbrés de brun dur.",
    ],
    treatment: [
      "Retire et sors de la parcelle les feuilles et fruits atteints : ne les laisse pas au sol.",
      "Aère : supprime les feuilles basses et élargis les écartements.",
      "Un fongicide homologué peut être nécessaire : demande au technicien agricole et suis l'étiquette.",
    ],
    prevention: [
      "Arrose au pied, le matin, jamais sur le feuillage.",
      "Évite les parcelles où tomate ou pomme de terre ont poussé l'année précédente.",
      "Surveille de près après plusieurs jours humides avec des nuits fraîches.",
    ],
  },
  {
    id: "tomate-alternariose",
    model: "Tomato Early blight leaf",
    fr: "Alternariose de la tomate",
    crop: "tomate",
    type: "fongique",
    summary: "Commence par les feuilles du bas et remonte. Fréquente en saison chaude avec rosée nocturne.",
    symptoms: [
      "Taches brunes à anneaux concentriques, comme une cible.",
      "Halo jaune autour des taches.",
      "Les feuilles du bas jaunissent et tombent en premier.",
    ],
    treatment: [
      "Enlève les feuilles basses atteintes dès les premiers signes.",
      "Maintiens la plante vigoureuse : une plante affaiblie est plus touchée.",
      "Traitement fongicide à décider avec le technicien agricole.",
    ],
    prevention: [
      "Paille le sol pour éviter les éclaboussures de terre sur les feuilles.",
      "Rotation d'au moins deux ans avec une culture non solanacée.",
      "Tuteure pour écarter le feuillage du sol.",
    ],
  },
  {
    id: "tomate-septoriose",
    model: "Tomato Septoria leaf spot",
    fr: "Septoriose de la tomate",
    crop: "tomate",
    type: "fongique",
    summary: "Petites taches très nombreuses qui provoquent une chute rapide du feuillage et exposent les fruits au soleil.",
    symptoms: [
      "Taches rondes de 2 à 3 mm, centre gris clair et bord brun foncé.",
      "Petits points noirs visibles au centre des taches.",
      "Défoliation en partant du bas.",
    ],
    treatment: [
      "Retire les feuilles atteintes et brûle-les ou sors-les de la parcelle.",
      "Évite de travailler dans les rangs quand le feuillage est mouillé : tu transportes les spores.",
      "Fongicide éventuel selon l'avis du technicien.",
    ],
    prevention: [
      "Élimine les résidus de culture en fin de saison.",
      "Désherbe : les mauvaises herbes de la famille des solanacées hébergent le champignon.",
      "Arrosage au goutte-à-goutte plutôt qu'en aspersion.",
    ],
  },
  {
    id: "tomate-tache-bacterienne",
    model: "Tomato leaf bacterial spot",
    fr: "Tache bactérienne de la tomate",
    crop: "tomate",
    type: "bacterienne",
    summary: "Bactérie favorisée par la chaleur humide et les blessures. Les fongicides classiques n'agissent pas dessus.",
    symptoms: [
      "Petites taches sombres anguleuses, parfois translucides à contre-jour.",
      "Taches en relief et rugueuses sur les fruits.",
      "Bords de feuilles déchirés quand les taches se rejoignent.",
    ],
    treatment: [
      "Arrache et évacue les plants très atteints pour protéger le reste.",
      "Ne travaille pas sur feuillage mouillé et désinfecte les outils de taille.",
      "Les produits cupriques sont parfois utilisés : décision et modalités avec le technicien.",
    ],
    prevention: [
      "Utilise des semences et des plants sains et certifiés.",
      "Rotation de deux à trois ans.",
      "Évite l'irrigation par aspersion.",
    ],
  },
  {
    id: "tomate-mosaique",
    model: "Tomato leaf mosaic virus",
    fr: "Virus de la mosaïque de la tomate",
    crop: "tomate",
    type: "virale",
    summary: "Virus très contagieux qui se transmet au toucher, par les mains et les outils. Il n'existe aucun traitement curatif.",
    symptoms: [
      "Mosaïque de vert clair et vert foncé sur le limbe.",
      "Feuilles gaufrées, parfois filiformes.",
      "Croissance ralentie et fruits moins nombreux.",
    ],
    treatment: [
      "Arrache les plants atteints et sors-les du champ : il n'y a pas de traitement.",
      "Lave-toi les mains et désinfecte les outils avant de toucher d'autres plants.",
      "Ne fume pas pendant le travail : le virus se transmet par le tabac.",
    ],
    prevention: [
      "Choisis des variétés résistantes quand elles existent.",
      "Semences certifiées et désinfection du matériel de repiquage.",
      "Élimine les repousses et les adventices hôtes.",
    ],
  },
  {
    id: "tomate-tylcv",
    model: "Tomato leaf yellow virus",
    fr: "Jaunisse en cuillère de la tomate (TYLCV)",
    crop: "tomate",
    type: "virale",
    summary: "Transmis par la mouche blanche. Très présent au Maghreb : la lutte vise l'insecte, pas le virus.",
    symptoms: [
      "Feuilles jeunes petites, enroulées en cuillère vers le haut.",
      "Jaunissement du bord des feuilles.",
      "Plante rabougrie, chute des fleurs, très peu de fruits.",
    ],
    treatment: [
      "Arrache les plants atteints tôt, dans un sac fermé, pour ne pas disperser les mouches blanches.",
      "Lutte contre la mouche blanche : pièges jaunes englués, surveillance sous les feuilles.",
      "Traitement insecticide éventuel à valider avec le technicien agricole.",
    ],
    prevention: [
      "Variétés tolérantes au TYLCV, largement disponibles.",
      "Filets anti-insectes sur les ouvertures de serre.",
      "Évite de planter à côté d'une culture en fin de cycle infestée.",
    ],
  },
  {
    id: "tomate-cladosporiose",
    model: "Tomato mold leaf",
    fr: "Cladosporiose de la tomate",
    crop: "tomate",
    type: "fongique",
    summary: "Typique des serres mal ventilées, avec forte humidité et températures douces.",
    symptoms: [
      "Taches jaune pâle sur le dessus de la feuille.",
      "Feutrage olive à brun sous la feuille, en face des taches.",
      "Feuilles qui se dessèchent et pendent sans tomber.",
    ],
    treatment: [
      "Augmente l'aération de la serre, surtout le matin.",
      "Retire les feuilles atteintes et évacue-les.",
      "Fongicide homologué si l'attaque progresse : voir le technicien.",
    ],
    prevention: [
      "Ouvre la serre pour faire baisser l'humidité nocturne.",
      "Espace les plants et effeuille le bas régulièrement.",
      "Variétés résistantes si tu cultives souvent sous abri.",
    ],
  },
  {
    id: "tomate-acariens",
    model: "Tomato two spotted spider mites leaf",
    fr: "Acariens tétranyques sur tomate",
    crop: "tomate",
    type: "ravageur",
    summary: "Minuscules acariens qui explosent par temps chaud et sec. Ils se voient mieux à la loupe.",
    symptoms: [
      "Fines piqûres claires qui donnent un aspect poussiéreux ou bronzé.",
      "Toiles très fines sous les feuilles et aux aisselles.",
      "Feuilles qui grisent, se dessèchent et tombent.",
    ],
    treatment: [
      "Douche le dessous du feuillage à l'eau : cela fait chuter les populations.",
      "Retire les feuilles les plus infestées.",
      "Acaricide ou lâcher d'auxiliaires : à décider avec le technicien agricole.",
    ],
    prevention: [
      "Évite le stress hydrique : les plantes sèches sont les plus attaquées.",
      "Surveille le dessous des feuilles chaque semaine en été.",
      "Limite les insecticides à large spectre, qui détruisent les prédateurs naturels.",
    ],
  },
  { id: "tomate-saine", model: "Tomato leaf", fr: "Feuille de tomate saine", crop: "tomate", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },

  // ---------- Pomme de terre ----------
  {
    id: "pdt-mildiou",
    model: "Potato leaf late blight",
    fr: "Mildiou de la pomme de terre",
    crop: "pommeDeTerre",
    type: "fongique",
    summary: "Même agent que le mildiou de la tomate. Il peut détruire le feuillage en moins d'une semaine.",
    symptoms: [
      "Taches brun foncé à vert d'eau, souvent sur la pointe et le bord des folioles.",
      "Duvet blanc sous la feuille par temps humide.",
      "Odeur de pourriture et tubercules tachés de brun rouille.",
    ],
    treatment: [
      "Coupe et évacue le feuillage atteint avant l'arrachage.",
      "Ne laisse pas de tas de déchets de récolte près du champ.",
      "Programme de fongicides à établir avec le technicien agricole.",
    ],
    prevention: [
      "Plants certifiés indemnes.",
      "Buttage suffisant pour protéger les tubercules.",
      "Surveillance renforcée après des journées humides et douces.",
    ],
  },
  {
    id: "pdt-alternariose",
    model: "Potato leaf early blight",
    fr: "Alternariose de la pomme de terre",
    crop: "pommeDeTerre",
    type: "fongique",
    summary: "Touche surtout les plantes âgées ou carencées, en fin de cycle.",
    symptoms: [
      "Taches brunes avec anneaux concentriques.",
      "Feuilles du bas atteintes en premier.",
      "Dessèchement progressif du feuillage.",
    ],
    treatment: [
      "Maintiens la fertilisation : la carence en azote aggrave la maladie.",
      "Évacue les feuilles sèches atteintes.",
      "Fongicide si nécessaire, selon l'avis du technicien.",
    ],
    prevention: ["Rotation d'au moins deux ans.", "Irrigation régulière, sans à-coups.", "Destruction des résidus après récolte."],
  },
  { id: "pdt-saine", model: "Potato leaf", fr: "Feuille de pomme de terre saine", crop: "pommeDeTerre", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },

  // ---------- Poivron ----------
  {
    id: "poivron-tache",
    model: "Bell_pepper leaf spot",
    fr: "Tache bactérienne du poivron",
    crop: "poivron",
    type: "bacterienne",
    summary: "Bactérie favorisée par la chaleur humide, l'aspersion et les blessures du vent.",
    symptoms: [
      "Taches anguleuses vert sombre puis brunes, limitées par les nervures.",
      "Halo jaune autour des taches.",
      "Chute des feuilles et fruits exposés au soleil.",
    ],
    treatment: [
      "Retire les plants les plus atteints.",
      "Ne manipule pas la culture sur feuillage mouillé.",
      "Produits cupriques parfois utilisés : décision avec le technicien.",
    ],
    prevention: ["Semences et plants certifiés.", "Rotation de deux ans minimum.", "Irrigation localisée au pied."],
  },
  { id: "poivron-saine", model: "Bell_pepper leaf", fr: "Feuille de poivron saine", crop: "poivron", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },

  // ---------- Maïs ----------
  {
    id: "mais-cercosporiose",
    model: "Corn Gray leaf spot",
    fr: "Tache grise du maïs",
    crop: "mais",
    type: "fongique",
    summary: "Lésions rectangulaires alignées entre les nervures, qui réduisent fortement le remplissage des grains.",
    symptoms: [
      "Taches gris-brun rectangulaires, nettement délimitées par les nervures.",
      "Lésions qui se rejoignent et brûlent la feuille.",
      "Attaque qui monte vers l'épi.",
    ],
    treatment: [
      "Peu d'action en cours de saison : évaluer avant tout l'intérêt économique d'un traitement.",
      "Fongicide foliaire possible autour de la floraison : voir le technicien.",
    ],
    prevention: [
      "Enfouis les résidus de maïs : le champignon y passe l'hiver.",
      "Rotation avec une culture non céréalière.",
      "Variétés tolérantes si la parcelle est touchée tous les ans.",
    ],
  },
  {
    id: "mais-helminthosporiose",
    model: "Corn leaf blight",
    fr: "Brûlure foliaire du maïs",
    crop: "mais",
    type: "fongique",
    summary: "Longues lésions en forme de cigare, favorisées par l'humidité et les températures modérées.",
    symptoms: [
      "Lésions allongées gris-vert puis brunes, de plusieurs centimètres.",
      "Feuilles basses atteintes en premier.",
      "Dessèchement étendu si l'attaque est précoce.",
    ],
    treatment: ["Traitement foliaire à envisager avec le technicien si l'attaque arrive avant la floraison."],
    prevention: ["Variétés résistantes.", "Enfouissement des résidus.", "Rotation culturale."],
  },
  {
    id: "mais-rouille",
    model: "Corn rust leaf",
    fr: "Rouille du maïs",
    crop: "mais",
    type: "fongique",
    summary: "Pustules poudreuses qui tachent les doigts en rouille. Rarement grave seule, sauf attaque précoce.",
    symptoms: [
      "Petites pustules brun-rouille sur les deux faces de la feuille.",
      "Poudre qui se dépose sur les doigts au toucher.",
      "Jaunissement général quand les pustules sont nombreuses.",
    ],
    treatment: ["Surveille l'évolution : une attaque tardive ne justifie souvent aucun traitement."],
    prevention: ["Variétés tolérantes.", "Évite les semis trop tardifs.", "Surveillance en période humide."],
  },

  // ---------- Vigne ----------
  {
    id: "vigne-black-rot",
    model: "grape leaf black rot",
    fr: "Black rot de la vigne",
    crop: "vigne",
    type: "fongique",
    summary: "Attaque feuilles et grappes. Les baies se momifient et restent accrochées, ce qui contamine l'année suivante.",
    symptoms: [
      "Taches brun clair cerclées de brun foncé sur les feuilles.",
      "Petits points noirs disposés en cercle dans les taches.",
      "Baies qui brunissent, se rident et se momifient.",
    ],
    treatment: [
      "Enlève et détruis les grappes momifiées, sur le cep et au sol.",
      "Aère la végétation par un effeuillage raisonnable.",
      "Programme de traitement à caler avec le technicien, surtout après la floraison.",
    ],
    prevention: [
      "Élimination des bois et fruits momifiés à la taille.",
      "Palissage soigné pour sécher rapidement le feuillage.",
      "Surveillance après chaque pluie chaude.",
    ],
  },
  { id: "vigne-saine", model: "grape leaf", fr: "Feuille de vigne saine", crop: "vigne", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },

  // ---------- Pommier ----------
  {
    id: "pommier-tavelure",
    model: "Apple Scab Leaf",
    fr: "Tavelure du pommier",
    crop: "pommier",
    type: "fongique",
    summary: "Principale maladie du pommier en climat humide au printemps. Déprécie fortement les fruits.",
    symptoms: [
      "Taches veloutées vert olive puis brun-noir sur les feuilles.",
      "Feuilles qui se déforment et tombent tôt.",
      "Croûtes liégeuses et crevasses sur les fruits.",
    ],
    treatment: [
      "Ramasse et évacue les feuilles tombées, source de contamination.",
      "Taille pour aérer le centre de l'arbre.",
      "Programme de traitement de printemps à définir avec le technicien.",
    ],
    prevention: ["Variétés peu sensibles.", "Élimination du feuillage mort en hiver.", "Éviter l'aspersion sur le feuillage."],
  },
  {
    id: "pommier-rouille",
    model: "Apple rust leaf",
    fr: "Rouille du pommier",
    crop: "pommier",
    type: "fongique",
    summary: "Nécessite un hôte alternatif, souvent un genévrier proche, pour accomplir son cycle.",
    symptoms: [
      "Taches jaune orangé vif sur le dessus des feuilles.",
      "Petites excroissances sur la face inférieure.",
      "Chute prématurée des feuilles si l'attaque est forte.",
    ],
    treatment: ["Retire les feuilles atteintes.", "Traitement préventif de printemps à discuter avec le technicien."],
    prevention: ["Éloigne les genévriers ornementaux des vergers.", "Variétés tolérantes.", "Aération de la frondaison."],
  },
  { id: "pommier-saine", model: "Apple leaf", fr: "Feuille de pommier saine", crop: "pommier", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },

  // ---------- Courge ----------
  {
    id: "courge-oidium",
    model: "Squash Powdery mildew leaf",
    fr: "Oïdium de la courge",
    crop: "courge",
    type: "fongique",
    summary: "Contrairement au mildiou, l'oïdium se développe par temps chaud et sec, avec des nuits humides.",
    symptoms: [
      "Feutrage blanc poudreux sur le dessus des feuilles, comme de la farine.",
      "Taches qui s'étendent et jaunissent.",
      "Feuilles qui se dessèchent, fruits moins sucrés et brûlés par le soleil.",
    ],
    treatment: [
      "Supprime les feuilles les plus couvertes dès le début.",
      "Aère en relevant ou espaçant les tiges.",
      "Traitement à base de soufre souvent utilisé : vérifie l'étiquette et la température, et demande au technicien.",
    ],
    prevention: ["Variétés résistantes.", "Écartements suffisants.", "Arrosage au pied le matin."],
  },

  // ---------- Feuilles saines diverses ----------
  { id: "fraisier-saine", model: "Strawberry leaf", fr: "Feuille de fraisier saine", crop: "fraisier", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },
  { id: "cerisier-saine", model: "Cherry leaf", fr: "Feuille de cerisier saine", crop: "autres", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },
  { id: "pecher-saine", model: "Peach leaf", fr: "Feuille de pêcher saine", crop: "autres", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },
  { id: "myrtillier-saine", model: "Blueberry leaf", fr: "Feuille de myrtillier saine", crop: "autres", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },
  { id: "framboisier-saine", model: "Raspberry leaf", fr: "Feuille de framboisier saine", crop: "autres", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },
  { id: "soja-saine", model: "Soybean leaf", fr: "Feuille de soja saine", crop: "autres", summary: "Aucun symptôme détecté sur cette feuille.", ...SAINE },
];

const normalise = (value) => String(value).replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim().toLocaleLowerCase("en");

const PAR_MODELE = new Map(DISEASES.map((d) => [normalise(d.model), d]));

/** Retrouve la fiche correspondant à un libellé renvoyé par le modèle. */
export const findDisease = (label) => (label ? PAR_MODELE.get(normalise(label)) ?? null : null);

export const getDisease = (id) => DISEASES.find((d) => d.id === id) ?? null;

/** Nom français d'une classe du modèle, ou le libellé nettoyé si la fiche manque. */
export const labelFr = (label) =>
  findDisease(label)?.fr ?? String(label).replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
