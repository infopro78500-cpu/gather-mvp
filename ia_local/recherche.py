from pathlib import Path
import pickle
from typing import Dict, List, Tuple

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity



def trouver_similaires(fichier_embeddings: str, seuil: float) -> List[Tuple[str, str, float]]:
    """
    Charge des embeddings depuis un fichier pickle et retourne les paires d'images
    dont la similarité cosinus dépasse un seuil donné.

    Args:
        fichier_embeddings: Chemin vers le fichier pickle contenant un dictionnaire
            {nom_image: vecteur_embedding}.
        seuil: Seuil strict au-dessus duquel les paires sont conservées.

    Returns:
        Liste de tuples (image1, image2, score) pour chaque paire dont la similarité
        est supérieure au seuil.
    """

    chemin = Path(fichier_embeddings)
    if not chemin.is_file():
        raise FileNotFoundError(
            f"Le fichier d'embeddings '{fichier_embeddings}' est introuvable."
        )

    with chemin.open("rb") as fichier:
        embeddings: Dict[str, List[float]] = pickle.load(fichier)

    if not embeddings:
        return []

    noms = list(embeddings.keys())
    vecteurs = np.array([embeddings[nom] for nom in noms], dtype=float)
    similarites = cosine_similarity(vecteurs)

    paires: List[Tuple[str, str, float]] = []
    for i in range(len(noms)):
        for j in range(i + 1, len(noms)):
            score = float(similarites[i, j])
            if score > seuil:
                paires.append((noms[i], noms[j], score))

    return paires


__all__ = ["trouver_similaires"]
