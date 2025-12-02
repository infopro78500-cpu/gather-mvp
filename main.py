import argparse

from encodeur import encoder_images
from recherche import trouver_similaires


def _encoder(args: argparse.Namespace) -> None:
    encoder_images(args.images, args.output)
    print(f"Embeddings générés et sauvegardés dans '{args.output}'.")


def _rechercher(args: argparse.Namespace) -> None:
    paires = trouver_similaires(args.output, args.seuil)
    if not paires:
        print("Aucun doublon détecté au-dessus du seuil fourni.")
        return

    print("Paires similaires trouvées :")
    for image1, image2, score in paires:
        print(f"- {image1} <> {image2} (similarité : {score:.4f})")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Encoder des images et rechercher des doublons à partir des embeddings."
    )
    parser.add_argument(
        "--images",
        default="data/images/",
        help="Dossier contenant les images à encoder (par défaut: data/images/).",
    )
    parser.add_argument(
        "--output",
        default="data/embeddings.pkl",
        help="Chemin du fichier de sortie pour les embeddings (par défaut: data/embeddings.pkl).",
    )
    parser.add_argument(
        "--seuil",
        type=float,
        default=0.85,
        help="Seuil de similarité pour détecter les doublons (par défaut: 0.85).",
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

    args = parser.parse_args()

    if not args.encode and not args.search:
        parser.error("Aucune action spécifiée. Utilisez --encode, --search ou les deux.")

    if args.encode:
        _encoder(args)

    if args.search:
        _rechercher(args)


if __name__ == "__main__":
    main()
