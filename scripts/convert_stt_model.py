"""Convertit un modèle Whisper Hugging Face en CTranslate2 int8 pour faster-whisper (CPU).

Usage (une seule fois, nécessite internet) :
    pip install ctranslate2 transformers torch
    python scripts/convert_stt_model.py                       # whisper-small tunisien -> backend/models/whisper-small-tn-ct2
    python scripts/convert_stt_model.py medyas/FarukSTT models/faruk-ct2 --low-mem   # plus précis, large-v3

FarukSTT (1,5 Md de paramètres) est plus risqué à convertir avec 8 Go de RAM : le faire plutôt sur Kaggle/Colab,
puis copier le dossier de sortie.
"""

import argparse
import sys
from pathlib import Path

from ctranslate2.converters import TransformersConverter

ap = argparse.ArgumentParser()
ap.add_argument("model", nargs="?", default="Arbi-Houssem/TunLangModel_test1.17")
DEFAULT_OUT = Path(__file__).resolve().parents[1] / "backend" / "models" / "whisper-small-tn-ct2"
ap.add_argument("output", nargs="?", default=str(DEFAULT_OUT))
ap.add_argument("--quantization", default="int8")
ap.add_argument("--low-mem", action="store_true", help="chargement économe en RAM (gros modèles)")
args = ap.parse_args()


def convert(copy_files):
    TransformersConverter(
        args.model,
        copy_files=copy_files,
        low_cpu_mem_usage=args.low_mem,
        load_as_float16=args.low_mem,
    ).convert(args.output, quantization=args.quantization, force=True)


try:
    convert(["tokenizer.json", "preprocessor_config.json"])
except Exception as exc:  # certains dépôts n'ont pas tokenizer.json
    print(f"Avertissement ({exc}) : nouvel essai sans copie de fichiers.", file=sys.stderr)
    convert(None)
print(f"OK → {args.output}")
