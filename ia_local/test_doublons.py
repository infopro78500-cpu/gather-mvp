from imagededup.methods import CNN

cnn = CNN()

# Traitement du dossier test
encodings = cnn.encode_images(image_dir='ia_local')
duplicates = cnn.find_duplicates(encoding_map=encodings, min_similarity_threshold=0.80)

# Affichage
for img, dups in duplicates.items():
    if dups:
        print(f"🔁 Doublons trouvés pour {img} → {dups}")
