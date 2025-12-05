import argparse
import csv
import hashlib
import sys
from itertools import combinations
from pathlib import Path
from typing import Iterable, List, Tuple

sys.path.append(str(Path(__file__).resolve().parent.parent))


from encodeur import encoder_images
from recherche import (
    déplacer_doublons,
    enregistrer_doublons_csv,
    trouver_similaires,
)



_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_IMAGES = Path("ia_local/data/test_photos")
_DEFAULT_OUTPUT = Path("ia_local/data/embeddings.pkl")
_DEFAULT_HASH_IMAGES = Path("ia_local/data/images")
_DEFAULT_HASH_OUTPUT = Path("ia_local/data/doublons_stricts.csv")


def _resolve_path(path_str: str) -> str:
    chemin = Path(path_str)
    if not chemin.is_absolute():
        chemin = _PROJECT_ROOT / chemin
    return str(chemin.resolve())


def _encoder(args: argparse.Namespace) -> None:
    images_path = _resolve_path(args.images)
    output_path = _resolve_path(args.output)
    encoder_images(images_path, output_path)
    print(f"Embeddings générés et sauvegardés dans '{output_path}'.")


def _rechercher(args: argparse.Namespace) -> None:
    embeddings_path = _resolve_path(args.output)
    paires = trouver_similaires(embeddings_path, args.seuil)

    if not paires:
        print("Aucun doublon détecté au-dessus du seuil fourni.")
        return

    print("Paires similaires trouvées :")
    for image1, image2, score in paires:
        print(f"- {image1} <> {image2} (similarité : {score:.4f})")

    if args.csv_export:
        csv_path = _resolve_path(args.csv_export)
        try:
            enregistrer_doublons_csv(paires, csv_path)
        except OSError as exc:
            print(
                f"❌ Impossible d'écrire le fichier CSV dans '{csv_path}': {exc}"
            )
        else:
            print(f"Liste des doublons sauvegardée dans '{csv_path}'.")

    if args.move:
        déplacer_doublons(paires)


def _collecter_images(dossier: Path) -> List[Path]:
    if not dossier.is_dir():
        raise FileNotFoundError(
            f"Le dossier d'images '{dossier}' est introuvable ou inaccessible."
        )

    extensions = {".jpg", ".jpeg", ".png"}
    return [
        chemin
        for chemin in dossier.rglob("*")
        if chemin.is_file() and chemin.suffix.lower() in extensions
    ]


def _calculer_hash_sha256(fichier: Path) -> str:
    sha256 = hashlib.sha256()
    with fichier.open("rb") as flux:
        for bloc in iter(lambda: flux.read(8192), b""):
            sha256.update(bloc)
    return sha256.hexdigest()


def _écrire_doublons_stricts_csv(
    paires: Iterable[Tuple[str, str, str]], sortie_csv: str | Path
) -> None:
    chemin_csv = Path(sortie_csv).expanduser()
    chemin_csv.parent.mkdir(parents=True, exist_ok=True)

    with chemin_csv.open("w", newline="", encoding="utf-8") as fichier:
        writer = csv.writer(fichier)
        writer.writerow(["image1", "image2", "hash"])
        for image1, image2, empreinte in paires:
            writer.writerow([image1, image2, empreinte])


def detecter_doublons_stricts(
    dossier_images: str | Path = _DEFAULT_HASH_IMAGES,
    sortie_csv: str | Path = _DEFAULT_HASH_OUTPUT,
) -> List[Tuple[str, str, str]]:
    dossier = Path(dossier_images).expanduser().resolve()
    images = _collecter_images(dossier)

    empreintes: dict[str, List[Path]] = {}
    for image in images:
        hash_image = _calculer_hash_sha256(image)
        empreintes.setdefault(hash_image, []).append(image)

    paires: List[Tuple[str, str, str]] = []
    for hash_image, fichiers in empreintes.items():
        if len(fichiers) < 2:
            continue

        fichiers_triés = sorted(fichiers)
        for image1, image2 in combinations(fichiers_triés, 2):
            paires.append((str(image1), str(image2), hash_image))

    _écrire_doublons_stricts_csv(paires, sortie_csv)
    return paires


def _hash_check(args: argparse.Namespace) -> None:
    images_dir = _resolve_path(args.hash_images)
    output_csv = _resolve_path(args.hash_output)

    try:
        paires = detecter_doublons_stricts(images_dir, output_csv)
    except FileNotFoundError as exc:
        print(f"❌ {exc}")
        return

    if not paires:
        print(
            "Aucun doublon strict détecté (hash SHA256). Fichier CSV initialisé pour référence."
        )
        return

    print("Doublons stricts détectés :")
    for image1, image2, empreinte in paires:
        print(f"- {image1} <> {image2} (hash : {empreinte})")

    print(f"Résultats sauvegardés dans '{output_csv}'.")

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Encoder des images et rechercher des doublons à partir des embeddings."
    )
    parser.add_argument(
        "--images",
        default=str(_DEFAULT_IMAGES),
        help=(
            "Dossier contenant les images à encoder (par défaut: ia_local/data/test_photos)."
        ),
    )
    parser.add_argument(
        "--output",
        default=str(_DEFAULT_OUTPUT),
        help="Chemin du fichier de sortie pour les embeddings (par défaut: ia_local/data/embeddings.pkl).",
    )
    parser.add_argument(
        "--seuil",
        type=float,
        default=0.85,
        help="Seuil de similarité pour détecter les doublons (par défaut: 0.85).",
    )
    parser.add_argument(
        "--move",
        action="store_true",
        help="Déplacer les doublons détectés dans un dossier séparé.",
    )
    parser.add_argument(
        "--encode",
        action="store_true",
        help="Encoder les images et sauvegarder les embeddings.",
    )
    parser.add_argument(
        "--search",
        action="store_true",
        help="Rechercher des doublons à partir des embeddings existants.",
    )
    parser.add_argument(
        "--csv-export",
        "--csv",
        dest="csv_export",
        help="Enregistrer les doublons détectés dans un fichier CSV (optionnel).",
    )
    parser.add_argument(
        "--hash-check",
        action="store_true",
        help="Détecter les doublons stricts (fichiers identiques) via SHA256.",
    )
    parser.add_argument(
        "--hash-images",
        default=str(_DEFAULT_HASH_IMAGES),
        help=(
            "Dossier contenant les images pour la détection de doublons stricts "
            "(par défaut: ia_local/data/images)."
        ),
    )
    parser.add_argument(
        "--hash-output",
        default=str(_DEFAULT_HASH_OUTPUT),
        help=(
            "Fichier CSV de sortie pour les doublons stricts "
            "(par défaut: ia_local/data/doublons_stricts.csv)."
        ),
    )
    

    args = parser.parse_args()

    if not args.encode and not args.search and not args.hash_check:
        parser.error(
            "Aucune action spécifiée. Utilisez --encode, --search, --hash-check ou les combiner."
        )

    if args.encode:
        _encoder(args)

    if args.search:
        _rechercher(args)

    if args.hash_check:
        _hash_check(args)


if __name__ == "__main__":
    main()
