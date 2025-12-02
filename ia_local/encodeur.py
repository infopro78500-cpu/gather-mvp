from pathlib import Path
import pickle
from typing import Dict, List

import torch
from PIL import Image
from torchvision import transforms
from torchvision.models import MobileNet_V3_Large_Weights, mobilenet_v3_large


# Supported image extensions for simple filtering
_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}


def _charger_images(dossier_images: Path) -> Dict[str, Image.Image]:
    images: Dict[str, Image.Image] = {}
    for chemin in dossier_images.iterdir():
        if chemin.is_file() and chemin.suffix.lower() in _IMAGE_EXTENSIONS:
            with Image.open(chemin) as img:
                images[chemin.name] = img.convert("RGB")
    return images


def encoder_images(dossier_images: str, sortie: str) -> None:
    """
    Charge toutes les images du dossier, encode chaque image avec MobileNetV3,
    puis sauvegarde les vecteurs résultants dans un fichier pickle.
    """

    dossier_path = Path(dossier_images)
    if not dossier_path.is_dir():
        raise FileNotFoundError(f"Le dossier '{dossier_images}' est introuvable ou n'est pas un dossier.")

    # Chargement du modèle et des transformations associées
    weights = MobileNet_V3_Large_Weights.DEFAULT
    preprocess: transforms.Compose = weights.transforms()
    model = mobilenet_v3_large(weights=weights)
    model.eval()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    images = _charger_images(dossier_path)
    resultats: Dict[str, List[float]] = {}

    with torch.no_grad():
        for nom_image, image in images.items():
            entree = preprocess(image).unsqueeze(0).to(device)
            sortie_modele = model(entree)
            vecteur = sortie_modele.flatten().cpu().tolist()
            resultats[nom_image] = vecteur

    sortie_path = Path(sortie)
    sortie_path.parent.mkdir(parents=True, exist_ok=True)
    with sortie_path.open("wb") as fichier_sortie:
        pickle.dump({"base_dir": str(dossier_path.resolve()), "embeddings": resultats}, fichier_sortie)


__all__ = ["encoder_images"]
