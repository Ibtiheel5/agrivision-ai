from PIL import Image, ImageDraw


def draw_boxes(image: Image.Image, detections):
    # detections : liste d'objets avec label, confidence et box [x1, y1, x2, y2]
    img = image.convert("RGB")
    d = ImageDraw.Draw(img)
    for det in detections:
        x1, y1, x2, y2 = det.box
        d.rectangle([x1, y1, x2, y2], outline=(47, 125, 90), width=3)
        d.text((x1 + 3, y1 + 3), f"{det.label} {det.confidence:.2f}", fill=(255, 255, 255))
    return img
