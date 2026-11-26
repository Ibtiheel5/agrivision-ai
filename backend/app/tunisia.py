"""Gouvernorats de Tunisie : coordonnées du chef-lieu, utilisées par la météo et la carte des risques."""

GOVERNORATES = [
    {"id": "tunis", "name": "Tunis", "lat": 36.80, "lon": 10.18},
    {"id": "ariana", "name": "Ariana", "lat": 36.86, "lon": 10.19},
    {"id": "ben-arous", "name": "Ben Arous", "lat": 36.75, "lon": 10.22},
    {"id": "manouba", "name": "Manouba", "lat": 36.81, "lon": 10.10},
    {"id": "bizerte", "name": "Bizerte", "lat": 37.27, "lon": 9.87},
    {"id": "nabeul", "name": "Nabeul", "lat": 36.46, "lon": 10.74},
    {"id": "zaghouan", "name": "Zaghouan", "lat": 36.40, "lon": 10.14},
    {"id": "beja", "name": "Béja", "lat": 36.73, "lon": 9.18},
    {"id": "jendouba", "name": "Jendouba", "lat": 36.50, "lon": 8.78},
    {"id": "le-kef", "name": "Le Kef", "lat": 36.17, "lon": 8.70},
    {"id": "siliana", "name": "Siliana", "lat": 36.08, "lon": 9.37},
    {"id": "sousse", "name": "Sousse", "lat": 35.83, "lon": 10.64},
    {"id": "monastir", "name": "Monastir", "lat": 35.78, "lon": 10.83},
    {"id": "mahdia", "name": "Mahdia", "lat": 35.50, "lon": 11.06},
    {"id": "sfax", "name": "Sfax", "lat": 34.74, "lon": 10.76},
    {"id": "kairouan", "name": "Kairouan", "lat": 35.68, "lon": 10.10},
    {"id": "kasserine", "name": "Kasserine", "lat": 35.17, "lon": 8.83},
    {"id": "sidi-bouzid", "name": "Sidi Bouzid", "lat": 35.04, "lon": 9.49},
    {"id": "gabes", "name": "Gabès", "lat": 33.88, "lon": 10.10},
    {"id": "medenine", "name": "Médenine", "lat": 33.35, "lon": 10.50},
    {"id": "tataouine", "name": "Tataouine", "lat": 32.93, "lon": 10.45},
    {"id": "gafsa", "name": "Gafsa", "lat": 34.42, "lon": 8.78},
    {"id": "tozeur", "name": "Tozeur", "lat": 33.92, "lon": 8.13},
    {"id": "kebili", "name": "Kébili", "lat": 33.70, "lon": 8.97},
]

BY_ID = {g["id"]: g for g in GOVERNORATES}


def nearest(lat: float, lon: float) -> dict:
    """Gouvernorat dont le chef-lieu est le plus proche (distance euclidienne, suffisante ici)."""
    return min(GOVERNORATES, key=lambda g: (g["lat"] - lat) ** 2 + (g["lon"] - lon) ** 2)
