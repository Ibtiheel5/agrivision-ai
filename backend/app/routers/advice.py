"""Conseils par règles (transparents, sans LLM). Conseils GÉNÉRAUX : à valider par un technicien / CRDA."""
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/advice", tags=["advice"])
MIN_CONF = 0.5
DISCLAIMER = ("Conseils généraux fournis à titre indicatif. Avant tout traitement, faites confirmer "
              "le diagnostic par un technicien agricole (CRDA) et respectez les produits homologués en Tunisie.")

# L'ordre compte : règles spécifiques avant les génériques.
RULES = [
    (("healthy", "saine", "sain"), "sain", "Plante saine", "Aucun signe de maladie détecté sur cette photo.",
     ["Continuez la surveillance régulière (1 à 2 fois par semaine).",
      "Adaptez l'irrigation à la météo et évitez l'excès d'eau.",
      "Refaites une photo dès que des taches, déformations ou flétrissements apparaissent."], None),
    (("late blight", "mildiou"), "maladie", "Mildiou (late blight)", "Maladie fongique qui progresse vite par temps humide.",
     ["Retirez et éliminez les feuilles ou plants fortement atteints (ne pas les composter).",
      "Évitez l'aspersion : arrosez au pied, tôt le matin.",
      "Aérez la culture (espacement, tuteurage, taille).",
      "Si l'extension est rapide, demandez le traitement homologué à un technicien."], None),
    (("early blight", "alternariose"), "maladie", "Alternariose (early blight)", "Taches concentriques sur les feuilles les plus âgées.",
     ["Retirez les feuilles atteintes et les débris au sol.",
      "Pratiquez la rotation des cultures et évitez de mouiller le feuillage.",
      "Maintenez une bonne nutrition de la plante (plante affaiblie = plus sensible)."], None),
    (("bacterial", "bactérienne"), "maladie", "Maladie bactérienne", "Petites taches souvent anguleuses, parfois entourées d'un halo.",
     ["Évitez de manipuler les plants mouillés et désinfectez les outils.",
      "Retirez les feuilles atteintes, évitez l'arrosage par aspersion.",
      "Utilisez des plants/semences sains et pratiquez la rotation."],
     "Une maladie bactérienne ressemble à des maladies fongiques : confirmez avec un technicien en cas de doute."),
    (("mold", "moisissure"), "maladie", "Moisissure foliaire", "Souvent liée à une humidité élevée et un manque d'aération.",
     ["Améliorez la ventilation (serre ouverte, espacement).",
      "Réduisez l'humidité autour des plants, arrosez au pied.",
      "Retirez les feuilles atteintes."], None),
    (("rust", "rouille"), "maladie", "Rouille", "Pustules orangées ou brunes sous les feuilles.",
     ["Retirez les feuilles atteintes.", "Évitez l'humidité prolongée sur le feuillage.",
      "Pratiquez la rotation et surveillez les plants voisins."], None),
    (("powdery", "oïdium", "oidium", "downy"), "maladie", "Oïdium / mildiou duveteux", "Feutrage blanc ou grisâtre sur les feuilles.",
     ["Aérez la culture et évitez l'excès d'azote.", "Retirez les parties très atteintes.",
      "Surveillez l'évolution et demandez conseil avant tout traitement."], None),
    (("virus", "curl", "mosaic", "mosaïque"), "maladie", "Maladie virale", "Les virus n'ont pas de traitement curatif.",
     ["Éliminez les plants atteints pour limiter la propagation.",
      "Contrôlez les insectes vecteurs (aleurodes, pucerons).", "Désinfectez les outils."], None),
    (("mite", "spider", "acarien"), "maladie", "Acariens", "Petits points décolorés et fine toile possible.",
     ["Regardez le dessous des feuilles.", "Évitez les conditions très chaudes et sèches prolongées.",
      "Demandez conseil pour un traitement adapté."], None),
    (("spot", "tache"), "maladie", "Taches foliaires", "Taches sur les feuilles : plusieurs causes possibles (fongique, bactérienne).",
     ["Retirez les feuilles atteintes.", "Évitez de mouiller le feuillage.",
      "Prenez des photos supplémentaires et consultez un technicien."], None),
]
GENERIC = ("maladie", "Problème détecté", "Un problème a été détecté mais aucune fiche détaillée n'existe pour cette classe.",
           ["Isolez la plante si possible.", "Prenez 2 à 3 photos (face et dos de la feuille, plante entière).",
            "Consultez un technicien agricole avant de traiter."], None)


class AdviceIn(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)


@router.post("")
def advice(body: AdviceIn):
    name = body.label.lower().replace("_", " ")
    if body.confidence < MIN_CONF:
        return {"status": "incertain", "title": "Résultat incertain",
                "summary": f"Le modèle n'est pas assez sûr ({body.confidence:.0%}).",
                "actions": ["Reprenez la photo en pleine lumière, feuille nette et centrée.",
                            "Ajoutez une photo du dessous de la feuille et une de la plante entière.",
                            "En cas de doute, demandez l'avis d'un technicien."],
                "extra": None, "disclaimer": DISCLAIMER}
    for keys, status, title, summary, actions, extra in RULES:
        if any(k in name for k in keys):
            return {"status": status, "title": title, "summary": summary, "actions": actions,
                    "extra": extra, "disclaimer": DISCLAIMER}
    status, title, summary, actions, extra = GENERIC
    return {"status": status, "title": title, "summary": summary, "actions": actions,
            "extra": extra, "disclaimer": DISCLAIMER}
