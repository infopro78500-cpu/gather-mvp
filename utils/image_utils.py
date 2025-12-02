from pathlib import Path
from typing import List, Sequence

import matplotlib.pyplot as plt
import torch
from PIL import Image
from torchvision import transforms


_SUPPORTED_EXTENSIONS: Sequence[str] = (".png", ".jpg", ".jpeg")


def charger_images(dossier: str) -> List[Image.Image]:
    """Charge toutes les images PNG et JPG d'un dossier.

    Args:
        dossier: Chemin du dossier contenant les images.

    Returns:
        Liste d'instances PIL.Image.Image converties en RGB.
    """

    dossier_path = Path(dossier)
    if not dossier_path.is_dir():
        raise FileNotFoundError(f"Le dossier '{dossier}' est introuvable ou n'est pas un dossier.")

    images: List[Image.Image] = []
    for chemin in sorted(dossier_path.iterdir()):
        if chemin.is_file() and chemin.suffix.lower() in _SUPPORTED_EXTENSIONS:
            with Image.open(chemin) as img:
                images.append(img.convert("RGB"))
    return images


def afficher_images(img1: Image.Image, img2: Image.Image, titre1: str = "", titre2: str = "") -> None:
    """Affiche deux images côte à côte avec matplotlib."""

    fig, axes = plt.subplots(1, 2, figsize=(10, 5))
    axes[0].imshow(img1)
    axes[0].set_title(titre1)
    axes[0].axis("off")

    axes[1].imshow(img2)
    axes[1].set_title(titre2)
    axes[1].axis("off")

    fig.tight_layout()
    plt.show()


def preprocess_image(img: Image.Image) -> torch.Tensor:
    """Redimensionne et normalise une image pour les modèles ImageNet.

    La sortie est un tenseur de forme (3, 224, 224) avec une normalisation
    basée sur les moyennes et écarts-types d'ImageNet.
    """

    preprocess = transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return preprocess(img)


__all__ = ["charger_images", "afficher_images", "preprocess_image"]
