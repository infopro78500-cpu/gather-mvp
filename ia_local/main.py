import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))


import argparse
from pathlib import Path

from encodeur import encoder_images
from recherche import (
    déplacer_doublons,
    enregistrer_doublons_csv,
    trouver_similaires,
)



_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_IMAGES = Path("ia_local/data/test_photos")
_DEFAULT_OUTPUT = Path("ia_local/data/embeddings.pkl")


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
    

    args = parser.parse_args()

    if not args.encode and not args.search:
        parser.error("Aucune action spécifiée. Utilisez --encode, --search ou les deux.")

    if args.encode:
        _encoder(args)

    if args.search:
        _rechercher(args)


if __name__ == "__main__":
    main()
