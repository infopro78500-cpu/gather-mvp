from __future__ import annotations

import csv
import shutil
from pathlib import Path
import pickle
from typing import Dict, List, Tuple

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def _charger_embeddings(fichier_embeddings: str) -> tuple[Dict[str, List[float]], Path | None]:
    chemin = Path(fichier_embeddings).expanduser().resolve()
    if not chemin.is_file():
        raise FileNotFoundError(
            f"Le fichier d'embeddings '{fichier_embeddings}' est introuvable."
        )

    with chemin.open("rb") as fichier:
        donnees = pickle.load(fichier)

    if isinstance(donnees, dict) and "embeddings" in donnees:
        base_dir = (
            Path(donnees.get("base_dir")).expanduser() if donnees.get("base_dir") else None
        )
        embeddings: Dict[str, List[float]] = donnees.get("embeddings", {})
    else:
        base_dir = None
        embeddings = donnees

    if base_dir is None:
        base_dir = chemin.parent

    return embeddings or {}, base_dir


def _résoudre_chemins(embeddings: Dict[str, List[float]], base_dir: Path | None) -> Dict[str, List[float]]:
    """Normalise les chemins des images pour garantir des chemins absolus."""

    chemins_normalisés: Dict[str, List[float]] = {}
    for nom, vecteur in embeddings.items():
        chemin_image = Path(nom)
        if not chemin_image.is_absolute():
            if base_dir:
                chemin_image = base_dir / chemin_image
            chemin_image = chemin_image.resolve()
        chemins_normalisés[str(chemin_image)] = vecteur

    return chemins_normalisés


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

    embeddings, base_dir = _charger_embeddings(fichier_embeddings)
    if not embeddings:
        return []

    embeddings = _résoudre_chemins(embeddings, base_dir)
    noms = list(embeddings.keys())
    vecteurs = np.array([embeddings[nom] for nom in noms], dtype=float)
    similarites = cosine_similarity(vecteurs)

    paires: List[Tuple[str, str, float]] = []
    for i in range(len(noms)):
        for j in range(i + 1, len(noms)):
            score = float(similarites[i, j])
            if score >= seuil:
                paires.append((noms[i], noms[j], score))

    return paires


def déplacer_doublons(
    paires: List[Tuple[str, str, float]], dossier_cible: str | Path = "ia_local/data/doublons_detectés"
) -> None:
    dossier_doublons = Path(dossier_cible).expanduser().resolve()
    dossier_doublons.mkdir(parents=True, exist_ok=True)

    deplacés: set[Path] = set()
    for _, image2, score in paires:
        chemin_image2 = Path(image2).expanduser().resolve()
        if chemin_image2 in deplacés:
            continue

        if not chemin_image2.exists():
            print(f"⚠️  Fichier introuvable, impossible à déplacer : {chemin_image2}")
            continue

        destination = dossier_doublons / chemin_image2.name
        suffixe = 1
        while destination.exists():
            destination = dossier_doublons / f"{chemin_image2.stem}_{suffixe}{chemin_image2.suffix}"
            suffixe += 1

        try:
            shutil.move(str(chemin_image2), str(destination))
            deplacés.add(chemin_image2)
            print(
                f"🗂️  Déplacé : {chemin_image2.name} → {destination} (similarité : {score:.4f})"
            )
        except OSError as exc:
            print(f"❌  Échec du déplacement de {chemin_image2}: {exc}")


def enregistrer_doublons_csv(paires: List[Tuple[str, str, float]], fichier_csv: str | Path) -> None:
    chemin_csv = Path(fichier_csv).expanduser()
    chemin_csv.parent.mkdir(parents=True, exist_ok=True)

    with chemin_csv.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["image1", "image2", "similarité"])
        for image1, image2, score in paires:
            writer.writerow([image1, image2, f"{score:.6f}"])


__all__ = ["trouver_similaires", "déplacer_doublons", "enregistrer_doublons_csv"]
