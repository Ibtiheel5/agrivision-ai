// Traductions en derja tunisien (lettres latines, chiffres 3 / 7 / 9 / 5 comme dans i18n.js).
// Fichier séparé à dessein : diseases.js et fruits.js restent inchangés, on ne fait que les enrichir.
// Clés = identifiants des fiches (diseases.js) et des produits (fruits.js).

/** Étiquettes de l'interface du bloc de conseils. */
export const UI_DERJA = {
  aFaire: "Ch'na3mel tawa",
  pourQueCaDure: "Bech yo93od behi",
  prevention: "Bech ma yarja3ch",
  urgence: { aucune: "Ma famech chay", surveiller: "Rod belek", agir: "Lezem t3alej" },
  etat: { abime: "khayeb", frais: "tazej", sain: "ma famech 3ila", malade: "fama mochkla" },
  incertain: "El natija mouch akida : 3awed sawwer men 9rib w fel dhaw.",
  aucuneFiche: "Mazel ma famech fiche l hal natija.",
  noteFeuille:
    "Hedha mousa3da fel 9arar, mouch tachkhis mte3 mouhandes filaha. Ma na3toch jar3a : "
    + "a9ra el étiquette mte3 el dwe w es2el el fani el filahi.",
  noteFruit:
    "Hedha far7 bel 3in 3la el tazeja, mouch ta7lil sa77i. Ken chakkit fi 7aja, ma takoulhech.",
  generiqueMalade: [
    "Na77i el awra9 el mradha w a5rejhom mel 7ou9la : ma t5allihomch 3al ardh.",
    "Es9i mel 9a3 el sbe7, bla ma tballel el wra9.",
    "Khalli el hwe ydour : na77i el awra9 el te7taniya w wassa3 bin el nabtet.",
    "Warri wra9a mradha lel fani el filahi 9bal ma t3alej.",
  ],
  generiqueSain: [
    "Ma famech chay : kammel kima enti 3amel.",
    "Rod belek koll jem3a, surtout ba3d chta walla s5ana.",
  ],
};

/** Fiches maladies : nom, résumé, traitement, prévention. */
export const FICHES_DERJA = {
  "tomate-mildiou": {
    fr: "Mildiou mte3 el tmatem",
    summary: "A59a maradh 3al tmatem : yenjem y5asser 7ou9la kemla fi ayem 9layel ki el jaw ratb w defi.",
    treatment: [
      "Na77i el awra9 w el 5oudhra el mradha w a5rejhom mel 7ou9la : ma t5allihomch 3al ardh.",
      "Khalli el hwe ydour : na77i el awra9 el te7taniya w wassa3 bin el nabtet.",
      "Momken tel7a9 dwe fongicide moura55as : es2el el fani el filahi w etba3 el étiquette.",
    ],
    prevention: [
      "Es9i mel 9a3, el sbe7, 3omrek ma tes9i fou9 el wra9.",
      "Tjanneb el ardh elli zra3t fiha tmatem walla batata el 3am elli fet.",
      "Rod belek barcha ba3d ayem ratba b lyali berda.",
    ],
  },
  "tomate-alternariose": {
    fr: "Alternariose mte3 el tmatem",
    summary: "Tebda mel awra9 el te7taniya w tetla3. Katira fi wa9t el s5ana ma3a nda fel lil.",
    treatment: [
      "Na77i el awra9 el msabba w a5rejhom mel 7ou9la.",
      "Khalli el hwe ydour bin el nabtet.",
      "Ken el maradh yetwassa3, es2el el fani el filahi 3la dwe moura55as.",
    ],
    prevention: [
      "Dawwer el zre3 : ma tzra3ch tmatem fi nafs el ardh koll 3am.",
      "Es9i mel 9a3 w bakri fel sbe7 bech el wra9 yenchef.",
      "Na77i el 7chich w el b9aya mte3 el mawsem elli fet.",
    ],
  },
  "tomate-septoriose": {
    fr: "Septoriose mte3 el tmatem",
    summary: "N9at s8ira barcha 3al awra9 el te7taniya, tetwassa3 fou9 ki el jaw ratb.",
    treatment: [
      "Na77i el awra9 el mradha awwel ma tchoufhom.",
      "Ma ta3melch chouf 3al nabtet ki el wra9 mballlin : el maradh yet3adda bel yeddin.",
      "Es2el el fani el filahi ken el maradh tla3 l fou9.",
    ],
    prevention: [
      "Es9i mel 9a3, 3omrek ma tballel el wra9.",
      "7ott paillage 3al ardh bech el ma ma yet7achchech.",
      "Dawwer el zre3 koll 3amin walla aktar.",
    ],
  },
  "tomate-tache-bacterienne": {
    fr: "N9at bactériennes 3al tmatem",
    summary: "N9at s8ira ratba, tet7awwel kahla. Tet3adda bel ma w bel yeddin.",
    treatment: [
      "Na77i el nabtet el mradha barcha w a5rejhom.",
      "8sel yeddik w el 3dod ba3d koll 5edma 3al nabtet el mradha.",
      "Ma3andhech 3lej kimiawi akid : el fani el filahi houwa elli y9ollek chnowa ta3mel.",
    ],
    prevention: [
      "Esta3mel zri3a sli7a w mra9ba.",
      "Ma ta5demch fel 7ou9la ki el nabtet mballlin.",
      "Dawwer el zre3 w na77i b9aya el mawsem el 9dim.",
    ],
  },
  "tomate-mosaique": {
    fr: "Virus el mosaïque mte3 el tmatem",
    summary: "Virus : el wra9 tarsem fiha mosaïque 5adhra w safra. Ma famech dwe, el wi9aya barka.",
    treatment: [
      "9ala3 el nabta el mradha kemla w a5rejha mel 7ou9la.",
      "8sel yeddik w el 3dod bel savon 9bal ma tmiss nabta o5ra.",
      "Ma tad5anch 9rib mel tmatem : el douk5an yet3adda bel virus.",
    ],
    prevention: [
      "Esta3mel zri3a mra9ba w nawa3 m9awem ken famma.",
      "Na77i el 7chich 7wali el 7ou9la.",
      "Ma tmissch el nabtet el sli7a ba3d el mradha.",
    ],
  },
  "tomate-tylcv": {
    fr: "Esfirar w ta9awwos el wra9 (TYLCV)",
    summary: "Virus yjibouh el aleyrode (mouche blanche). El wra9 tesfarr w tet9awwes l fou9, el nabta to93od s8ira.",
    treatment: [
      "9ala3 el nabta el msaba kemla : ma3andhech 3lej.",
      "7areb el mouche blanche : hiya elli tnakkel el virus.",
      "Es2el el fani el filahi 3la tari9a t7areb biha el 7achra.",
    ],
    prevention: [
      "7ott filet anti-insectes fou9 el chtel el s8ir.",
      "Esta3mel nawa3 m9awem lel TYLCV ken mawjoud 3andek.",
      "Na77i el 7chich elli to93od fih el mouche blanche.",
    ],
  },
  "tomate-cladosporiose": {
    fr: "Cladosporiose mte3 el tmatem",
    summary: "Katira fel serres : bo93a safra fou9 el wra9a w 8bar binni te7tha.",
    treatment: [
      "Na77i el awra9 el msabba w a5rejhom.",
      "Na99es el ratouba : 7ell el serre w khalli el hwe ydour.",
      "Es2el el fani el filahi ken el maradh ychedd.",
    ],
    prevention: [
      "Wassa3 bin el nabtet bech el hwe ydour.",
      "Es9i mel 9a3 w tjanneb el ma fou9 el wra9.",
      "Na77i b9aya el mawsem el 9dim mel serre.",
    ],
  },
  "tomate-acariens": {
    fr: "El 7almet (acariens) 3al tmatem",
    summary: "7achrat s8ar barcha te7t el wra9a. N9at safra w nsij rfi3 ki el jaw ye7mi w yenchef.",
    treatment: [
      "Rochch el ma 3la te7t el wra9 : el 7alma tekrah el ratouba.",
      "Na77i el awra9 el mdammra barcha.",
      "Es2el el fani el filahi ken el 7alma tetwassa3.",
    ],
    prevention: [
      "Rod belek fel wa9t el 7ami w el nechef.",
      "Chouf te7t el wra9 koll jem3a : 8adi fama tchoufhom bekri.",
      "Ma tzidch azote barcha : el wra9 el ratba tjib el 7alma.",
    ],
  },
  "tomate-saine": {
    fr: "Wra9a mte3 tmatem sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: [
      "Kammel kima enti 3amel : s9i montadhem mel 9a3, bla ma tballel el wra9.",
      "Rod belek koll jem3a, surtout ba3d chta walla s5ana.",
    ],
  },
  "pdt-mildiou": {
    fr: "Mildiou mte3 el batata",
    summary: "Maradh 5ater barcha : yenjem ye5sser el 7ou9la w el batata elli te7t el ardh.",
    treatment: [
      "Na77i el awra9 el mradha w a5rejhom mel 7ou9la.",
      "Ken el maradh ychedd, 9ass el 5adhra kemla bech t7ami el batata te7t.",
      "Es2el el fani el filahi 3la dwe moura55as 9bal ma t3alej.",
    ],
    prevention: [
      "7ott trab fou9 el batata bech ma tetlach lel dhaw.",
      "Es9i mel 9a3 w tjanneb el ma 3al wra9.",
      "Ma tzra3ch batata walla tmatem fi nafs el ardh 3amin wara ba3dhhom.",
    ],
  },
  "pdt-alternariose": {
    fr: "Alternariose mte3 el batata",
    summary: "N9at binniya b dwa2er, tebda mel awra9 el 9dima.",
    treatment: [
      "Na77i el awra9 el msabba.",
      "Zid el s9i montadhem : el nabta el dh3ifa tetsab aktar.",
      "Es2el el fani el filahi ken el maradh yetwassa3.",
    ],
    prevention: [
      "Dawwer el zre3.",
      "Sammed bel 9ima el lezma bech el nabta t9awa.",
      "Na77i b9aya el mawsem el 9dim.",
    ],
  },
  "pdt-saine": {
    fr: "Wra9a mte3 batata sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: [
      "Kammel kima enti 3amel : s9i montadhem mel 9a3.",
      "Rod belek koll jem3a, surtout ba3d chta.",
    ],
  },
  "poivron-tache": {
    fr: "N9at bactériennes 3al felfel",
    summary: "N9at s8ira ratba 3al wra9 w 3al felfel, tet3adda bel ma.",
    treatment: [
      "Na77i el nabtet el mradha w a5rejhom.",
      "8sel yeddik w el 3dod ba3d el 5edma.",
      "Es2el el fani el filahi : el 3lej el kimiawi ma3andouch fayda kbira houni.",
    ],
    prevention: [
      "Esta3mel zri3a mra9ba.",
      "Ma ta5demch ki el nabtet mballlin.",
      "Dawwer el zre3 koll 3amin.",
    ],
  },
  "poivron-saine": {
    fr: "Wra9a mte3 felfel sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek koll jem3a."],
  },
  "mais-cercosporiose": {
    fr: "El bo93a el ramadiya mte3 el dhra",
    summary: "N9at toula ramadiya bin 3rou9 el wra9a. Tetwassa3 ki el jaw ratb.",
    treatment: [
      "Na77i el awra9 el msabba el te7taniya ken 9lal.",
      "Es2el el fani el filahi ken el maradh tla3 l fou9 el nabta.",
    ],
    prevention: [
      "Dawwer el zre3 : ma tzra3ch dhra wara dhra.",
      "7rath w a5bi b9aya el mawsem el 9dim.",
      "Esta3mel nawa3 m9awem ken mawjoud.",
    ],
  },
  "mais-helminthosporiose": {
    fr: "7ar9 el wra9 mte3 el dhra",
    summary: "N9at toula kbira ramadiya-binniya, kima el 9ar3a. Tna99es el ma7soul barcha.",
    treatment: [
      "Rod belek 3al nabtet el o5rin : el maradh yetwassa3 fisa3.",
      "Es2el el fani el filahi 3la dwe moura55as ken el 7ou9la kemla msabba.",
    ],
    prevention: [
      "Dawwer el zre3 w a5bi el b9aya.",
      "Esta3mel nawa3 m9awem.",
      "Ma tzra3ch barcha 9rib bin ba3dhhom.",
    ],
  },
  "mais-rouille": {
    fr: "Sada el dhra",
    summary: "7boubet s8ira 7amra-binniya fou9 el wra9a, kima el sada.",
    treatment: [
      "8alben ma t7ebch 3lej : el dhra tkammel normal.",
      "Es2el el fani el filahi ken el sada tla3 bekri w 8attet el wra9 el kol.",
    ],
    prevention: [
      "Esta3mel nawa3 m9awem.",
      "Ezra3 bekri bech el nabta tkoun 9wiya 9bal el sada.",
    ],
  },
  "vigne-black-rot": {
    fr: "Black rot mte3 el dalya",
    summary: "N9at binniya 3al wra9 w el 3neb yetyabbes w yo93od m3alla9 3al 3ar9oub.",
    treatment: [
      "Na77i el 3neb el myabbes w el awra9 el mradha, w a5rejhom mel jnina.",
      "Khalli el hwe ydour : na77i el fro3 el ziyeda.",
      "Es2el el fani el filahi 3la dwe moura55as.",
    ],
    prevention: [
      "Na77i koll 3neb myabbes 9bal el mawsem el jdid : menou yebda el maradh.",
      "Rbot el fro3 bech el hwe ydour w el wra9 tenchef fisa3.",
      "Rod belek ba3d koll chta fel rbi3.",
    ],
  },
  "vigne-saine": {
    fr: "Wra9a mte3 dalya sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek ba3d el chta."],
  },
  "pommier-tavelure": {
    fr: "Tavelure mte3 el teffeh",
    summary: "N9at 5adhra-kahla 3al wra9 w 3al teffeh. Katira fel rbi3 el ratb.",
    treatment: [
      "Na77i el awra9 el ta7at el chajra w a7re9hom walla a5rejhom.",
      "Es2el el fani el filahi 3la barnemej 3lej fel rbi3.",
    ],
    prevention: [
      "Na77i el awra9 el ta7a fel 5rif : menhom yebda el maradh el 3am el jey.",
      "9ass el chajra bech el hwe ydour fi westha.",
      "Esta3mel nawa3 m9awem ki tazra3 jdid.",
    ],
  },
  "pommier-rouille": {
    fr: "Sada el teffeh",
    summary: "N9at safra-7amra 3al wra9a. El maradh yetnaddhem bin el teffeh w chajret el genévrier.",
    treatment: [
      "Na77i el awra9 el msabba ken 9lal.",
      "Es2el el fani el filahi ken el chajra msabba barcha.",
    ],
    prevention: [
      "Ba33ed el teffeh 3al genévrier ki te9der.",
      "Esta3mel nawa3 m9awem.",
    ],
  },
  "pommier-saine": {
    fr: "Wra9a mte3 teffeh sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek fel rbi3 el ratb."],
  },
  "courge-oidium": {
    fr: "Oïdium mte3 el 9ar3a",
    summary: "8bar abyedh kima el dqi9 fou9 el wra9a. Katir ki el nhar s5oun w el lil berd.",
    treatment: [
      "Na77i el awra9 el msabba barcha.",
      "Khalli el hwe ydour : na77i el wra9 el te7taniya.",
      "Es2el el fani el filahi 3la dwe moura55as ken yetwassa3.",
    ],
    prevention: [
      "Wassa3 bin el nabtet.",
      "Es9i mel 9a3 el sbe7.",
      "Rod belek fel 5rif ki el far9 bin el s5ana w el berd ykber.",
    ],
  },
  "fraisier-saine": {
    fr: "Wra9a mte3 frawla sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek koll jem3a."],
  },
  "cerisier-saine": {
    fr: "Wra9a mte3 7abb el molouk sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek koll jem3a."],
  },
  "pecher-saine": {
    fr: "Wra9a mte3 5ou5 sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek fel rbi3."],
  },
  "myrtillier-saine": {
    fr: "Wra9a mte3 myrtille sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek koll jem3a."],
  },
  "framboisier-saine": {
    fr: "Wra9a mte3 framboise sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek koll jem3a."],
  },
  "soja-saine": {
    fr: "Wra9a mte3 soja sli7a",
    summary: "Ma famech 3ila 3al wra9a hedhi.",
    treatment: ["Ma famech 3lej lezem."],
    prevention: ["Kammel kima enti 3amel.", "Rod belek koll jem3a."],
  },
};

/** Fruits et légumes : nom, conservation, cause, conduite ki el 7aja khayba. */
export const PRODUITS_DERJA = {
  apple: {
    fr: "Teffeh",
    conservation: [
      "Fel berd bin 0 w 4 °C : el teffeh yo93od jma3at w 7atta chhour.",
      "Ba3du 3al 8alla el o5ra : yetalla3 8az yeb9i el 8alla tastwi fisa3.",
      "Ma tarkemhomch fou9 ba3dhhom : el dharba tweli bo93a binniya fi ayem.",
    ],
    causes: "Dharbet wa9t el jani, w ba3d henna 3afen binni yebda mel blasa el madhrouba.",
    siAbime: [
      "A5rajha mel 9affa : teffe7a 3afna tfassed jiranha fi ayem.",
      "Bo93a 9asa7 w s8ira tetna77a bel 9ass; ama teffe7a ratba walla fiha 3fen, tetzyed.",
    ],
  },
  banana: {
    fr: "Banane",
    conservation: [
      "Fi 7rara 3adiya, 3omrek fel frigidaire : el berd ykahhel el 9chra.",
      "M3alla9a a7san men 7otta 3al tawla : a9all dha8t.",
      "Ba3dha 3al 8alla el o5ra, 5ater tbayya3hom fisa3.",
    ],
    causes: "Testwi fisa3 barcha, dharbet, w el berd elli y5asser el 9chra.",
    siAbime: [
      "9chra kahla ama el le7m 9asa7 : mazela behi lel tiyeb, esta3melha nhar bi nhar.",
      "Le7m ratb, ri7a mta5mra walla 3fen : tetzyed.",
    ],
  },
  bell_pepper: {
    fr: "Felfel",
    conservation: [
      "Bin 7 w 10 °C : a9all men hakka, el 9chra ta3mel n9at 8aw9a.",
      "Kemla w nechfa : el ratouba 3al 9chra tjib el 3fen.",
    ],
    causes: "3fen ratb yebda mel 3ar9oub, 8alben ba3d tar5in fi blasa ratba.",
    siAbime: [
      "Zidha ki el le7m yweli ratb walla ysil, surtout 7dha el 3ar9oub.",
      "Chouf fi westha : el 3fen yebda 7wali el zri3a w ma yetbayyench mel barra.",
    ],
  },
  carrot: {
    fr: "Sfennarya",
    conservation: [
      "Fel berd, bin 0 w 4 °C, fi sachet mathgoub.",
      "A9ta3 el 5adhra mel fou9 : techreb el ma mel 3ar9 w traykhou.",
    ],
    causes: "Tjeff w tweli taryya, w ba3d henna 3fen akhal fel atraf.",
    siAbime: [
      "Taryya ama sli7a : mazela tetkal metyyba, mouch nayya.",
      "Blayes kahla, mazlou9a walla ri7a 9wiya : tetzyed.",
    ],
  },
  cucumber: {
    fr: "Khyar",
    conservation: [
      "Bin 10 w 12 °C : fel frigidaire el 3adi ya3mel n9at fi ayem 9layel.",
      "Ba3du 3al teffeh w el tmatem, el 8az mte3hom ysaffrou.",
    ],
    causes: "Berd barcha, w ba3d henna 3fen ratb fel zouz atraf.",
    siAbime: [
      "Tarf ratb barka : 9ass barcha w koulou tawa.",
      "9chra mazlou9a walla fra8 fi westou : yetzyed.",
    ],
  },
  grape: {
    fr: "3neb",
    conservation: [
      "Fel berd, bla 8sil : el ma 3al 7abbet yjib el 3fen el ramadi.",
      "Fi 3anoud kemla, fi 3olba elli yed5olha el hwe.",
    ],
    causes: "3fen ramadi (Botrytis) yet3adda men 7abba l 7abba fi nhar walla zouz.",
    siAbime: [
      "Na77i el 7abbet el msabba wa7da b wa7da, awwel ma tchoufhom : el be9i yetsallek.",
      "8bar ramadi 3la barcha 7abbet : zid el 3anoud kemla.",
    ],
  },
  guava: {
    fr: "Jwefa",
    conservation: [
      "Fi 7rara 3adiya 7atta testwi, w ba3d henna fel berd youmin walla tletha.",
      "Bla ma tarkem : el le7m yetdharreb fisa3 barcha.",
    ],
    causes: "Testwi fisa3 ba3d el jani, w anthracnose yetbayyen b n9at binniya 8aw9a.",
    siAbime: [
      "N9at binniya ratba w 8aw9a : tetzyed, el le7m msab fel 3om9.",
      "Mestwiya barcha ama sli7a : koulha nhar bi nhar, walla a3melha 3asir.",
    ],
  },
  jujube: {
    fr: "Nbeg",
    conservation: [
      "Fi blasa nechfa w berda : el nbeg yo93od behi, w yetnachef mli7.",
      "Farra9 9bal el tar5in : 7abba mchag9a tweli 3afna w tfassed el koll.",
    ],
    causes: "El 9chra tetchag9 ba3d el chta, w el 3fen yod5ol mel chag.",
    siAbime: [
      "7abba mkarkcha ama 9as7a : mazela behi, hedha bdeyet el tanchif el tabi3i.",
      "7abba ratba, mchag9a walla fiha 3fen : tetzyed.",
    ],
  },
  mango: {
    fr: "Manga",
    conservation: [
      "Fi 7rara 3adiya 7atta trakhi chwaya te7t el sba3, w ba3d henna fel berd.",
      "3omrek fel berd 9bal ma testwi : ma tastwich w el 9chra ta3mel n9at.",
    ],
    causes: "Anthracnose : n9at kahla tetwassa3, 8alben mawjouda mel 7ou9la.",
    siAbime: [
      "Bo93a kahla s8ira 3al barra : 9ass barcha 7waliha w koul el be9i tawa.",
      "Le7m binni, ratb, ri7a mta5mra : yetzyed.",
    ],
  },
  orange: {
    fr: "Bortgan",
    conservation: [
      "Fel berd w fi blasa yed5olha el hwe ; fi 9affa, mouch fi sachet msakker.",
      "Farra9 ki ted5ol lel ma5zen : bortgana wa7da 3afna tfassed el 9affa.",
    ],
    causes: "3fen a5dhar walla azra9 (Penicillium), yod5ol men jar7a fel 9chra.",
    siAbime: [
      "8bar a5dhar walla azra9 : zid el 8alla kemla w chouf jiranha dhaka.",
      "Ma t9assech 7wali 8alla 7amdhiya 3afna : el 3fen de5el fel le7m.",
    ],
  },
  pomegranate: {
    fr: "Romman",
    conservation: [
      "Fel berd : el romman yo93od cheher walla zouz bla mochkla.",
      "9chra nechfa : el ratouba tjib el 3fen fel taj.",
    ],
    causes: "El 9chra tetchag9 ki el s9i mouch montadhem, w ba3d henna 3fen fi westha.",
    siAbime: [
      "9chra nechfa w 9as7a ama el 7abb behi : el romman mazel yetkal.",
      "7abb binni, ratb walla ri7a 7amdha : yetzyed, 7atta ken el barra tbayyen sli7a.",
    ],
  },
  potato: {
    fr: "Batata",
    conservation: [
      "Fel dhlem kemel : el dhaw yetalla3 el 5dhoura.",
      "Bin 6 w 10 °C, nechfa w yed5olha el hwe ; mouch fel frigidaire, el berd y7allilha el le7m.",
      "Ba3dha 3al basla, el basla tnabbethe fisa3.",
    ],
    causes: "T5adhdher fel dhaw, tnabbet fel s5ana, w te3fen fel ratouba.",
    siAbime: [
      "Nabtet 9sar w el batata 9as7a : na77ihom barcha 9bal el tiyeb.",
      "Blayes 5adhra : 9asshom barcha ; ken el 5dhoura de5la fel 3om9, zidha.",
      "Batata ratba, tsil walla ri7etha 5ayba : tetzyed, ma tsallek chay menha.",
    ],
  },
  strawberry: {
    fr: "Frawla",
    conservation: [
      "Fel berd tawa ba3d el jani, bla 8sil, fi 3olba yed5olha el hwe.",
      "Saf wa7ed barka : el the9l yetrass el 8alla elli te7t.",
      "T8sselha ki t7eb tekoulha barka.",
    ],
    causes: "3fen ramadi, fisa3 barcha : 8alla wa7da tfassed el 3olba fi nhar.",
    siAbime: [
      "Na77i el 8alla el 3afna awwel ma tchoufha, bla ma tsanna.",
      "8alla taryya w fiha 3fen tetzyed kemla : ma t9assech 7waliha.",
    ],
  },
  tomato: {
    fr: "Tmatem",
    conservation: [
      "Fi 7rara 3adiya, 3omrek fel frigidaire : el berd ywaddar el tfa3a.",
      "El 3ar9oub l fou9, bla ma tarkem.",
      "Ba3dha 3al 8alla el 7assesa : tetalla3 8az barcha.",
    ],
    causes: "Dharbet ki tet7arrek, w ba3d henna 3fen ratb yebda mel blasa el madhrouba.",
    siAbime: [
      "Blasa madhrouba s8ira w 9as7a : 9ass barcha w esta3mel el be9i fel tiyeb, nhar bi nhar.",
      "Tmatma ratba, mchag9a walla fiha 3fen : tetzyed.",
    ],
  },
};
