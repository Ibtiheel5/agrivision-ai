"""Visualisation des détections (équivalent de gradcam.py pour l'Axe 3 : détection)."""
import base64
import io

from PIL import Image


def decode_annotated(b64: str) -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64)))
