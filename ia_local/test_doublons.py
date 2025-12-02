from pathlib import Path

from imagededup.methods import CNN


DATA_DIR = Path(__file__).resolve().parent / "data" / "test_photos"

cnn = CNN()

# Traitement du dossier test
encodings = cnn.encode_images(image_dir=str(DATA_DIR))
duplicates = cnn.find_duplicates(encoding_map=encodings, min_similarity_threshold=0.80)

# Affichage
for img, dups in duplicates.items():
    if dups:
        print(f"🔁 Doublons trouvés pour {img} → {dups}")
