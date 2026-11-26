// Modèle fruits / légumes : 14 produits × 2 états (frais / abîmé), soit les 28 classes du
// pipeline détecteur + classifieur. C'est un contrôle de QUALITÉ après récolte, pas un
// diagnostic de maladie : on dit si le produit est encore bon, pas de quel pathogène il souffre.

export const ETATS = {
  frais: { fr: "Frais", derja: "Tazej", tone: "ok", icon: "check" },
  abime: { fr: "Abîmé", derja: "Khayeb", tone: "danger", icon: "alert" },
};

/**
 * Un produit = son nom, sa conservation quand il est frais, et la conduite à tenir quand il
 * est abîmé. Les conseils « abîmé » suivent une règle constante : trier tôt, isoler, et ne
 * jamais récupérer un produit tendre moisi.
 */
export const PRODUITS = [
  {
    id: "apple", model: "Apple", fr: "Pomme", derja: "Teffeh", famille: "fruit",
    conservation: [
      "Au frais entre 0 et 4 °C : la pomme tient plusieurs semaines, parfois des mois.",
      "À l'écart des autres fruits : elle dégage de l'éthylène et accélère leur mûrissement.",
      "Sans les empiler : un choc devient une tache brune en quelques jours.",
    ],
    causes: "Chocs à la récolte, puis pourriture brune qui part du point meurtri.",
    siAbime: [
      "Retire-la du cageot : une pomme pourrie contamine ses voisines en quelques jours.",
      "Une tache ferme et limitée peut être coupée largement ; une pomme molle ou moisie se jette.",
    ],
  },
  {
    id: "banana", model: "Banana", fr: "Banane", derja: "Banane", famille: "fruit",
    conservation: [
      "À température ambiante, jamais au réfrigérateur : le froid noircit la peau.",
      "Suspendue plutôt que posée : moins de points de pression.",
      "Séparée des autres fruits, qu'elle fait mûrir très vite.",
    ],
    causes: "Sur-maturation rapide, chocs, et froid qui abîme la peau.",
    siAbime: [
      "Peau noire mais chair ferme : encore bonne à cuisiner, à utiliser le jour même.",
      "Chair molle, odeur fermentée ou moisissure : à jeter.",
    ],
  },
  {
    id: "bell_pepper", model: "Bell_pepper", fr: "Poivron", derja: "Felfel", famille: "légume",
    conservation: [
      "Entre 7 et 10 °C : plus froid, la peau se creuse de petites taches.",
      "Entier et sec ; l'humidité sur la peau lance la pourriture.",
    ],
    causes: "Pourriture molle à partir du pédoncule, souvent après un stockage humide.",
    siAbime: [
      "Jette-le dès que la chair est molle ou suintante, surtout autour de la queue.",
      "Vérifie l'intérieur : la moisissure commence souvent autour des graines, invisible de l'extérieur.",
    ],
  },
  {
    id: "carrot", model: "Carrot", fr: "Carotte", derja: "Sfennarya", famille: "légume",
    conservation: [
      "Au froid, autour de 0 à 4 °C, dans un sac perforé.",
      "Fanes coupées : elles pompent l'eau de la racine et la ramollissent.",
    ],
    causes: "Déshydratation qui la rend souple, puis pourriture noire aux extrémités.",
    siAbime: [
      "Molle mais saine : encore utilisable en cuisson, pas en crudité.",
      "Zones noires, visqueuses ou odeur forte : à jeter.",
    ],
  },
  {
    id: "cucumber", model: "Cucumber", fr: "Concombre", derja: "Khyar", famille: "légume",
    conservation: [
      "Entre 10 et 12 °C : au réfrigérateur classique il se pique de taches en quelques jours.",
      "À l'écart des pommes et des tomates, dont l'éthylène le fait jaunir.",
    ],
    causes: "Froid excessif, puis pourriture molle aux deux extrémités.",
    siAbime: [
      "Extrémité molle seule : coupe largement et consomme tout de suite.",
      "Peau visqueuse ou creux liquide à l'intérieur : à jeter.",
    ],
  },
  {
    id: "grape", model: "Grape", fr: "Raisin", derja: "3neb", famille: "fruit",
    conservation: [
      "Au froid, non lavé : l'eau sur les grains lance la moisissure grise.",
      "En grappe entière, dans une boîte aérée.",
    ],
    causes: "Moisissure grise (Botrytis) qui passe d'un grain à l'autre en un ou deux jours.",
    siAbime: [
      "Retire les grains atteints un par un, dès les premiers : le reste de la grappe se sauve.",
      "Duvet gris sur plusieurs grains : jette la grappe entière.",
    ],
  },
  {
    id: "guava", model: "Guava", fr: "Goyave", derja: "Jwefa", famille: "fruit",
    conservation: [
      "À température ambiante jusqu'à maturité, puis au frais deux à trois jours.",
      "Sans empiler : la chair se marque très facilement.",
    ],
    causes: "Maturation très rapide après cueillette, et anthracnose qui apparaît en taches brunes enfoncées.",
    siAbime: [
      "Taches brunes molles et enfoncées : à jeter, la chair est atteinte en profondeur.",
      "Très mûre mais saine : à consommer le jour même, ou en jus.",
    ],
  },
  {
    id: "jujube", model: "Jujube", fr: "Jujube", derja: "Nbeg", famille: "fruit",
    conservation: [
      "Au sec et au frais : le jujube se conserve bien, et se sèche très bien.",
      "Trié avant stockage : un fruit fendu moisit et contamine le lot.",
    ],
    causes: "Fentes de la peau après la pluie, puis moisissure dans la fente.",
    siAbime: [
      "Fruit ridé mais ferme : encore bon, c'est le début du séchage naturel.",
      "Fruit mou, fendu ou moisi : à jeter.",
    ],
  },
  {
    id: "mango", model: "Mango", fr: "Mangue", derja: "Manga", famille: "fruit",
    conservation: [
      "À température ambiante jusqu'à ce qu'elle cède sous le doigt, puis au frais.",
      "Jamais au froid avant maturité : elle ne mûrira plus et la peau se tache.",
    ],
    causes: "Anthracnose : taches noires qui s'étendent, souvent déjà présentes au verger.",
    siAbime: [
      "Petite tache noire en surface : coupe largement autour et consomme le reste tout de suite.",
      "Chair brune, molle, odeur d'alcool : à jeter.",
    ],
  },
  {
    id: "orange", model: "Orange", fr: "Orange", derja: "Bortgan", famille: "fruit",
    conservation: [
      "Au frais et aéré ; en caisse, pas en sac fermé.",
      "Trie à l'entrée du stock : une seule orange moisie contamine la caisse.",
    ],
    causes: "Moisissure verte ou bleue (Penicillium), qui entre par une blessure de la peau.",
    siAbime: [
      "Duvet vert ou bleu : jette le fruit entier et vérifie ses voisins immédiatement.",
      "Ne coupe pas autour d'un agrume moisi : la moisissure est déjà dans la chair.",
    ],
  },
  {
    id: "pomegranate", model: "Pomegranate", fr: "Grenade", derja: "Romman", famille: "fruit",
    conservation: [
      "Au frais : la grenade se garde un à deux mois sans problème.",
      "Peau sèche : l'humidité favorise la pourriture du couronnement.",
    ],
    causes: "Fentes de la peau après irrigation irrégulière, puis pourriture interne.",
    siAbime: [
      "Peau sèche et dure mais grains intacts : le fruit reste bon.",
      "Grains bruns, mous ou odeur aigre : à jeter, même si l'extérieur paraît sain.",
    ],
  },
  {
    id: "potato", model: "Potato", fr: "Pomme de terre", derja: "Batata", famille: "légume",
    conservation: [
      "À l'obscurité complète : la lumière fait verdir les tubercules.",
      "Entre 6 et 10 °C, aéré et sec ; pas au réfrigérateur, qui sucre la chair.",
      "À l'écart des oignons, qui accélèrent la germination.",
    ],
    causes: "Verdissement à la lumière, germination à la chaleur, pourriture molle à l'humidité.",
    siAbime: [
      "Germes courts sur un tubercule ferme : retire-les largement avant cuisson.",
      "Zones vertes : coupe-les généreusement ; si le tubercule est vert en profondeur, jette-le.",
      "Tubercule mou, suintant ou malodorant : à jeter, ne récupère rien.",
    ],
  },
  {
    id: "strawberry", model: "Strawberry", fr: "Fraise", derja: "Frawla", famille: "fruit",
    conservation: [
      "Au froid immédiatement après la récolte, non lavée, dans une barquette aérée.",
      "En une seule couche : le poids écrase les fruits du dessous.",
      "Lavée seulement au moment de manger.",
    ],
    causes: "Moisissure grise, très rapide : un fruit atteint contamine la barquette en une journée.",
    siAbime: [
      "Retire les fruits moisis dès que tu les vois, sans attendre.",
      "Un fruit tendre moisi se jette entier : ne coupe pas autour.",
    ],
  },
  {
    id: "tomato", model: "Tomato", fr: "Tomate", derja: "Tmatem", famille: "légume",
    conservation: [
      "À température ambiante, jamais au réfrigérateur : le froid lui fait perdre son goût.",
      "Pédoncule vers le haut, sans empiler.",
      "À l'écart des fruits sensibles : elle dégage beaucoup d'éthylène.",
    ],
    causes: "Chocs à la manipulation, puis pourriture molle qui part du point meurtri.",
    siAbime: [
      "Petite zone meurtrie ferme : coupe largement et utilise le reste en cuisson, le jour même.",
      "Tomate molle, fendue ou moisie : à jeter.",
    ],
  },
];

const PAR_MODELE = new Map(PRODUITS.map((p) => [p.model.toLowerCase(), p]));

/** "Tomato__rotten" → { produit, etat } ; null si l'étiquette ne vient pas du modèle fruits. */
export function lireEtiquetteFruit(label) {
  if (!label) return null;
  const m = String(label).trim().match(/^(.+?)__(fresh|rotten)$/i);
  if (!m) return null;
  const produit = PAR_MODELE.get(m[1].toLowerCase());
  if (!produit) return null;
  return { produit, etat: m[2].toLowerCase() === "fresh" ? "frais" : "abime" };
}

export const getProduit = (id) => PRODUITS.find((p) => p.id === id) ?? null;