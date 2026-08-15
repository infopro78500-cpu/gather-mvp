# Pilote club — le mode d'emploi clé en main

> **Date** : 09/08/2026 · **Statut** : plan d'exécution, à lancer sur décision Nico.
> Objectif : prouver sur UN club, en un trimestre, que les familles commandent
> vraiment — avec **ce qui est déjà codé**, zéro dev neuf. Cadrage :
> `segment-clubs-associations.md`. Porteur proposé : Corentin + Nico (canal atelier).

---

## 0. La question à laquelle ce pilote répond

**Une seule** : *en libre-service, sur une saison, quelle part des familles
commande des tirages — et pour quel panier ?* Tout le reste (commission auto,
rôles multiples, calendrier) ne se construit **que si** cette réponse est bonne.
On ne cherche pas à faire joli, on cherche **un chiffre**.

---

## 1. Le club à choisir (le profil idéal)

- **Via le canal chaud** : un club déjà client de l'atelier (première conversation = un appel).
- **80 à 200 familles** — assez pour un chiffre lisible, assez petit pour rester simple.
- **Un président ou un bénévole com' motivé** — le pilote vit ou meurt sur cette personne.
- **Un événement à venir sous 3-4 semaines** (tournoi, gala, fin de saison) : le
  coup d'envoi parfait, plein de photos d'un coup, tout le monde présent.
- **Bonus** : un club avec beaucoup de **jeunes/mineurs** → l'argument droit à
  l'image porte à fond, et on teste s'il fait basculer.

Un club, pas trois. On veut de la profondeur, pas de la moyenne.

---

## 2. Le kit à livrer (tout est déjà produisible à l'atelier)

| Élément | Quantité | Rôle |
|---|--:|---|
| **Présentoirs NFC + QR** | 1 par équipe + 2-3 communs | vestiaires, club house, table de l'événement |
| **Panneau de bienvenue** | 1 | entrée du tournoi/gala : « Scannez, partagez les photos du jour » |
| **Affichettes QR** (A5) | 10-15 | buvette, portes, tables — le QR doit être partout |
| **Flyer famille** (½ A5) | 1 par famille | « Vos photos de la saison ici + comment commander », remis à l'événement |

Chaque support porte le **QR de la bonne équipe** (`/join?pin=…&table=U13`) — la
génération est codée, un lot de N visuels différents part à l'atelier comme les
présentoirs de mariage.

---

## 3. Ce qu'on installe (côté logiciel, 10 minutes)

1. **Créer le coffre de saison** du club (durée longue — `lifetime_days`, pas 7 j).
2. **Créer les équipes** = galeries par table renommées (U11, U13, seniors…).
3. **Générer les QR par équipe** + les visuels des supports (présentoirs/panneaux).
4. **Activer le concours photo** (« photo du mois »).
5. **Donner l'accès** au président/bénévole com'.
   → *Limite V1 assumée : un seul appareil « hôte » aujourd'hui. Pour le pilote,
   ça suffit (le bénévole com' pilote) ; les rôles multiples viendront après.*

---

## 4. Le jour J (l'événement de coup d'envoi)

- Présentoirs et panneau posés **avant** l'arrivée des gens.
- Le bénévole com' (ou nous) **montre le geste une fois** à quelques parents :
  « posez le téléphone, déposez vos photos ». L'effet boule de neige fait le reste.
- Flyer famille distribué : il explique **où retrouver les photos et comment
  commander**.
- On shoote nous-mêmes quelques belles photos pour **amorcer** chaque galerie
  (une galerie vide ne donne envie à personne).

---

## 5. Le suivi de la saison / du trimestre

- **Semaine 1-2** : relance douce du bénévole com' (« la galerie est ouverte,
  ajoutez vos photos du tournoi »). Annoncer le concours.
- **Chaque temps fort** : rappeler le QR. Poster la « photo de la semaine ».
- **Fin de trimestre** : pousser la **boutique** — « commandez vos tirages, le
  poster d'équipe, les plaques ». C'est le moment où on mesure.
- **Commission V1 (manuelle)** : on cumule les commandes du club, on affiche le
  total dû, on **vire à la main** en fin de pilote. Pas besoin de Stripe Connect
  pour prouver le modèle.

---

## 6. Les 3 chiffres qu'on mesure (et rien d'autre)

1. **Taux de participation** — % de familles qui ont déposé au moins une photo,
   et nombre de photos par événement. *(La galerie se remplit-elle toute seule ?)*
2. **Attach rate boutique** — % de familles qui ont commandé au moins une fois, et
   **panier moyen**. *(LE chiffre. Le même que le mariage pilote.)*
3. **La bascule** — à la question « pourquoi vous adoptez ça ? », le président
   répond quoi en premier : *le contrôle des photos des enfants* (RGPD) ou *l'argent*
   (commission) ? *(Ça oriente tout le marketing du segment.)*

Bonus qualitatif : **charge du bénévole**. L'outil doit se prouver « zéro travail
en plus », sinon il ne se répliquera pas.

---

## 7. La décision au bout du pilote (la porte)

- **Attach rate ≥ ~20 % et panier ≥ ~20 €** → le segment est validé : on branche
  la **commission automatique** (Stripe Connect) et les **rôles multiples**, et on
  déroule sur les clients assos de l'atelier.
- **Participation forte mais boutique faible** → le produit plaît mais ne se
  monétise pas en l'état : revoir le catalogue / le moment de la relance / le prix.
- **Participation faible** → le geste ne prend pas en club : on repriorise derrière
  le voyage. **Coût de ce test : trois présentoirs et une après-midi.** C'est tout
  l'intérêt — on le sait vite et pas cher.

---

## 8. Ce que ça coûte / mobilise (ordre de grandeur)

- **Production du kit** : présentoirs + panneau + affichettes = coût matière atelier
  (quelques dizaines d'euros), offert au club pilote.
- **Temps** : un appel + une installation (10 min) + une présence le jour J + une
  relance par temps fort. Léger.
- **Aucun dev** avant la porte du §7.

---

## 9. Check-list de lancement

- [ ] Choisir le club (canal atelier) + confirmer un événement sous 3-4 semaines
- [ ] Créer le coffre de saison + les équipes + activer le concours
- [ ] Générer et produire le kit (présentoirs/panneau/affichettes/flyers)
- [ ] Caler le jour J avec le bénévole com'
- [ ] Amorcer chaque galerie avec quelques belles photos
- [ ] Poser le tableau de suivi des 3 chiffres (§6)
- [ ] Relancer la boutique en fin de trimestre + verser la commission à la main
- [ ] Trancher la porte du §7

---

*Interne : `segment-clubs-associations.md` (le pourquoi + l'économie),
`idee-galeries-par-table.md` (la mécanique réutilisée), `gamme-produits-impression.md`
(le catalogue), `decisions-validees.md`.*
