"""Extrait une photo par classe depuis ton dataset (PlantDoc / PlantSeg) vers l'application.

Les photos obtenues correspondent exactement aux classes que le modèle reconnaît : c'est la
meilleure illustration possible, et elles viennent de tes propres données.

Usage :
    python scripts/extract_crop_photos.py CHEMIN_DU_DATASET
    python scripts/extract_crop_photos.py D:/datasets/plantdoc/train --par-classe 1

Le dossier du dataset doit contenir un sous-dossier par classe, nommé comme dans models/classes.txt
(la correspondance tolère les underscores, la casse et les espaces multiples), par exemple :
    plantdoc/train/Tomato leaf late blight/0001.jpg

Sortie :
    frontend/public/images/diseases/<id-fiche>.jpg   (une par classe)
    frontend/public/images/crops/<culture>.jpg       (la plus nette de chaque culture)

Vérifie la licence de ton dataset avant de publier l'application : PlantDoc est distribué sous
licence libre mais demande une attribution. Ajoute-la dans l'écran « À propos ».
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
PUBLIC = RACINE / "frontend" / "public" / "images"
FICHES = RACINE / "frontend" / "src" / "data" / "diseases.js"

EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def normalise(valeur: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[_/]+", " ", valeur)).strip().lower()


def lire_fiches() -> list:
    """Lit id, model et crop depuis data/diseases.js, sans dépendre de Node."""
    texte = FICHES.read_text(encoding="utf-8")
    fiches = []
    for bloc in re.finditer(r'id:\s*"([^"]+)".*?model:\s*"([^"]+)".*?crop:\s*"([^"]+)"', texte, re.S):
        fiches.append({"id": bloc.group(1), "model": bloc.group(2), "crop": bloc.group(3)})
    return fiches


def meilleures_images(dossier: Path, combien: int) -> list:
    """Les images les plus lourdes : en pratique les mieux définies et les moins compressées."""
    images = [f for f in dossier.iterdir() if f.is_file() and f.suffix.lower() in EXTENSIONS]
    return sorted(images, key=lambda f: f.stat().st_size, reverse=True)[:combien]


def copier(source: Path, destination: Path, largeur: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        from PIL import Image  # redimensionne si Pillow est disponible

        with Image.open(source) as im:
            im = im.convert("RGB")
            if im.width > largeur:
                im = im.resize((largeur, round(im.height * largeur / im.width)), Image.LANCZOS)
            im.save(destination, "JPEG", quality=82, optimize=True)
    except ImportError:
        shutil.copy2(source, destination)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dataset", help="dossier contenant un sous-dossier par classe")
    ap.add_argument("--largeur", type=int, default=800, help="largeur maximale des images produites")
    ap.add_argument("--par-classe", type=int, default=1, help="images candidates examinées par classe")
    args = ap.parse_args()

    dataset = Path(args.dataset)
    if not dataset.is_dir():
        print(f"Dossier introuvable : {dataset}", file=sys.stderr)
        return 1

    fiches = lire_fiches()
    if not fiches:
        print(f"Aucune fiche lue dans {FICHES}", file=sys.stderr)
        return 1

    par_nom = {normalise(d.name): d for d in dataset.iterdir() if d.is_dir()}
    faites, manquantes, cultures = 0, [], {}

    for fiche in fiches:
        dossier = par_nom.get(normalise(fiche["model"]))
        if not dossier:
            manquantes.append(fiche["model"])
            continue
        images = meilleures_images(dossier, args.par_classe)
        if not images:
            manquantes.append(fiche["model"])
            continue
        source = images[0]
        copier(source, PUBLIC / "diseases" / f"{fiche['id']}.jpg", args.largeur)
        faites += 1
        # la plus lourde de la culture sert aussi de couverture
        taille = source.stat().st_size
        if taille > cultures.get(fiche["crop"], (0, None))[0]:
            cultures[fiche["crop"]] = (taille, source)

    for culture, (_, source) in cultures.items():
        copier(source, PUBLIC / "crops" / f"{culture}.jpg", args.largeur)

    print(f"{faites} photo(s) de maladie écrites dans {PUBLIC / 'diseases'}")
    print(f"{len(cultures)} photo(s) de culture écrites dans {PUBLIC / 'crops'}")
    if manquantes:
        print("\nClasses sans dossier correspondant dans le dataset :")
        for nom in manquantes:
            print(f"  - {nom}")
        print("Renomme ces dossiers comme dans models/classes.txt, ou dépose les photos à la main.")
    print(json.dumps({"maladies": faites, "cultures": len(cultures), "manquantes": len(manquantes)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
