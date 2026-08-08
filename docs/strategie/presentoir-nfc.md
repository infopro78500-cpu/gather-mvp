# Le présentoir de table NFC

> **Date** : 08/08/2026 · **Origine** : Nico · **Statut** : spécification produit, **décisions d'industrialisation à prendre**.
> Un présentoir par table, portant une belle photo, une puce NFC **et** un QR. L'invité pose son téléphone — ou scanne, s'il préfère.

---

## 1. Pourquoi le NFC change la nature du produit

**Le QR demande une action, le tap n'en demande pas.** Scanner suppose d'ouvrir l'appareil photo, viser, attendre, appuyer sur une notification. Poser son téléphone sur une plaque ne suppose rien. Sur une table de mariage, la différence ne se joue pas sur la technologie mais sur **qui participe** : l'invité de 60 ans qui n'aurait jamais scanné pose son téléphone comme tout le monde.

Le présentoir n'est donc pas un produit dérivé. C'est **le multiplicateur du taux de participation** — et comme le panier d'impression scale avec le nombre de photos déposées, c'est le seul produit du catalogue qui **augmente mécaniquement les ventes de tous les autres**.

**On garde le QR sur la même pièce.** C'est ce que fait Renka sur ses Point Fixe : « TAPEZ ICI » + trois arcs d'ondes + un QR. Deux portes d'entrée, aucun invité exclu (iPhone ancien, NFC désactivé, Android récalcitrant). Et comme les deux chemins sont distincts côté serveur (§4), on saura lequel les invités utilisent vraiment.

---

## 2. La puce est intégrée d'usine — ✅ **RÉSOLU le 08/08/2026**

**Nico a le fournisseur : celui du Point Fixe de Renka, qui livre le chevalet avec le tag déjà à l'intérieur.**

C'est le cas idéal, et c'est exactement le modèle qui marche chez Renka pour leurs cartes (`lika-app/docs/process-fabrication.md`) :

> « RENKA n'encapsule pas la puce NFC. Le fournisseur livre des cartes vierges déjà finies : matériau, puce + antenne déjà encapsulées. **Rien à assembler côté RENKA.** »

Conséquence : l'atelier **imprime un décor sur un support déjà équipé**. Pas de pastille à coller, donc **aucun rebut de pose**, aucun décollement, aucune réclamation sur ce point. Le geste le plus risqué de la chaîne n'existe pas.

Restent à la charge de l'atelier : l'impression, **l'encodage unitaire par table**, le contrôle par tap, et le verrouillage.

> *Note d'honnêteté sur la version précédente de cette page : j'y écrivais qu'il ne fallait « jamais poser de puce ». La règle vaut chez Renka pour leurs cartes, où l'alternative intégrée est un produit standard — mais Renka lui-même utilise un tag rapporté sur son petit carré 10×10 du Pack Mobilité (~0,92 €). La règle n'est donc pas absolue ; elle l'est ici parce que le support intégré existe et qu'on l'a.*

### Formats disponibles

Le catalogue fournisseur propose deux tailles, reprises telles quelles (cotes Renka, `lika-app/src/lib/offer.ts`) :

| Taille | Cotes (l × h) | Pièces par passe (plateau 610×420) | QR imprimé |
|---|---|---|---|
| **Moyen** | 7 × 10 cm | **36** | ~4,3 cm |
| **Grand** | 7,5 × 12 cm | **25** | ~4,7 cm |

Un QR de 4,3 cm se scanne largement (2 cm suffisent en pratique). Les deux tailles sont au catalogue ; le moyen est le format naturel sur une table dressée, le grand pour les tables d'honneur ou les mariages où le présentoir doit se voir de loin.

---

## 3. Le trou de Renka qu'il ne faut pas reproduire : l'encodage

Renka a documenté au millimètre l'imposition, le blanc de soutien, le retournement « page de livre »… et **n'a jamais spécifié l'encodage des puces**. Aucun code, aucun outil nommé, aucun temps par pièce, aucun verrouillage — classé « hors périmètre MVP » dans leur README. La seule trace du geste est un commentaire dans le bon de tri : *« case → client (répartition physique **et encodage des puces**) »*. C'est donc manuel, à l'unité, sans procédure écrite.

**Chez nous c'est plus lourd** : une carte Renka = un encodage ; **un mariage = 10 à 15 encodages**. D'où l'arbitrage central :

| Option | Ce qu'on gagne | Ce qu'on paie |
|---|---|---|
| **Une URL par événement** — tous les présentoirs identiques | Pré-encodage par lot trivial, zéro risque d'interversion, CQ = « je tape n'importe lequel » | On perd la table : pas de galerie par table, pas de plan de salle statistique |
| **Une URL par table** — `/t/<eventId>-t7` | La **galerie par table** décidée le 07/08, le plan de salle, les mots par table | 15 encodages distincts, risque d'interversion ×15, bon de tri par table obligatoire |

**La décision du 07/08 sur les galeries par table impose la seconde option.** Les deux idées sont liées : sans URL par table, pas de galerie par table. Il faut donc assumer l'encodage unitaire — et le sécuriser :

- **bon de tri par table** (transposé de `print-queue.ts` de Renka : case → client devient présentoir → table) ;
- **le numéro de table est imprimé sur la pièce**, donc le contrôle est visuel autant qu'électronique ;
- **CQ obligatoire** : taper chaque présentoir et vérifier qu'il ouvre **la bonne table**. Dix secondes par pièce, deux minutes par mariage.

**À chiffrer dès la première série** : le temps réel d'encodage par pièce et le **taux de rebut** — deux chiffres que Renka n'a jamais mesurés et qui manquent cruellement à leur pilotage.

---

## 4. Verrouiller la puce — un risque que Renka n'a pas

Renka ne mentionne **nulle part** le verrouillage en lecture seule. Sur une carte de visite qu'on garde dans sa poche, le risque est théorique.

**Sur un présentoir posé sur une table toute une soirée, à portée de 80 personnes dont certaines ont bu, il ne l'est pas.** N'importe qui avec NFC Tools réécrit la puce en dix secondes — et redirige les invités où il veut. Sur un produit de mariage, l'incident est irréparable.

**Les puces doivent être verrouillées en lecture seule** (NTAG21x : bits de lock statiques et dynamiques). C'est irréversible, donc l'opération vient **après** le contrôle qualité, et elle doit figurer dans la procédure opérateur.

---

## 5. La photo et l'antenne — la contrainte à mesurer avant de dessiner

Le produit porte **une belle photo**. Or Renka maintient une zone d'exclusion d'antenne (`card-geometry.ts`) avec un garde-fou qui refuse le rendu si un motif la traverse — parce qu'**un film métallisé ou holographique posé sur l'antenne tue la puce** (« l'écrantage tue la carte », répété trois fois dans leur projet).

Deux règles pour nous :

1. **Mesurer la zone d'antenne sur un exemplaire réel dès le premier échantillon.** Renka ne l'a jamais fait : leur constante est un placeholder, et ça **bloque une option produit à 15-20 € depuis des semaines**. Ne répétons pas ça.
2. **Aucune finition métallisée, dorée ou holographique au-dessus de l'antenne.** Une impression quadri normale ne gêne pas ; un vernis métallisé, si.

À noter : le métal **ne pose pas de problème NFC** quand la puce est pré-encapsulée avec une antenne calibrée pour ce support — le problème du métal chez Renka est purement un problème d'encre (il faut un blanc de soutien). Cette nuance compte si on veut un présentoir haut de gamme.

---

## 6. L'architecture technique — à copier de Renka

Leur `lib/tap.ts` est propre et résout trois pièges déjà :

- **Log avant redirection** : un tap est compté même si la page ne charge jamais ensuite.
- **`no-store` + `force-dynamic`** : jamais servi depuis un cache, chaque tap compte réellement.
- **`Location` relative** (RFC 7231) : robuste derrière proxy et CDN.
- **Slug malformé → 302 vers l'accueil**, jamais une 404 — « pour quelqu'un qui vient de taper une carte physique ».
- **Rate limit** anti-bot, et log en `try/catch` silencieux : *le log ne doit JAMAIS bloquer l'arrivée du visiteur*.

**Deux routes distinctes vers la même destination** : `/t/<slug>` gravé dans la puce, `/q/<slug>` encodé dans le QR, avec un paramètre `?s=` propagé. C'est ce qui permettra de **prouver au client que le présentoir a généré N % des dépôts** — et de savoir si le NFC sert vraiment ou si tout le monde scanne quand même.

**L'URL gravée est irrévocable.** Renka conserve son ancien domaine en redirection 308 **au moins trois ans** « (cartes gravées) ». Un présentoir de mariage traîne sur une table, puis chez les mariés, puis dans un carton. Le domaine `usegather.app` doit être fixé **avant** de graver la première puce, et redirigé indéfiniment — ce qui est déjà notre règle pour les QR imprimés.

---

## 7. Le bonus que Renka a repéré sans l'exploiter

Dans leur business plan, une idée laissée en question ouverte : **un jeton secret dans l'URL comme preuve de présence physique** — « tap = tampon ».

Pour un mariage, c'est excellent. **Un QR se photographie et se transfère par WhatsApp ; une puce, il faut être devant.** Un invité qui a tapé le présentoir est prouvablement dans la salle. Ça garantit que le coffre reste entre les vrais invités, et c'est un argument que le QR ne peut pas égaler.

À garder pour plus tard, mais à ne pas perdre.

---

## 8. Prix

Renka a validé une grille Point Fixe : **29 €** le présentoir 7×10 posé, **39 €** le 7,5×12, avec un escalier de +5 € par cran de visibilité. Mais **ils vendent une unité par commerçant, nous en vendons dix à quinze par mariage** — le prix unitaire ne se transpose pas, il faut raisonner en **prix par table dégressif**.

**Moyen — 7 × 10 cm**

| Lot | Prix | Par table | Coût estimé | Marge |
|---|---|---|---|---|
| 5 tables | **45,00 €** | 9,00 € | ~15 € | 67 % |
| 10 tables | **79,00 €** | 7,90 € | ~28 € | 65 % |
| 15 tables | **109,00 €** | 7,27 € | ~40 € | 63 % |
| 20 tables | **135,00 €** | 6,75 € | ~52 € | 61 % |

**Grand — 7,5 × 12 cm**

| Lot | Prix | Par table | Coût estimé | Marge |
|---|---|---|---|---|
| 5 tables | **55,00 €** | 11,00 € | ~18 € | 67 % |
| 10 tables | **99,00 €** | 9,90 € | ~34 € | 66 % |
| 15 tables | **135,00 €** | 9,00 € | ~49 € | 64 % |
| 20 tables | **169,00 €** | 8,45 € | ~64 € | 62 % |

Coût estimé : chevalet à tag intégré (~2 à 2,50 € pièce), impression, encodage unitaire, emballage. **Le prix d'achat du chevalet est le chiffre le plus incertain de cette page** — il vient directement du fournisseur, c'est la première donnée à obtenir.

Comparaison : Renka vend son présentoir moyen **29 € l'unité** ; dix coûteraient 290 €. À 79 €, on est très en dessous — justifié par le volume et par le fait qu'on ne vend pas un support de prospection commerciale mais un accessoire d'événement, acheté par lot.

---

## 9. Ce qu'il faut décider avant de produire

1. ~~**Le fournisseur**~~ → ✅ **RÉSOLU** : celui du Point Fixe de Renka, chevalet livré tag inclus. Reste à obtenir **le prix d'achat par pièce et la quantité minimale** — c'est la donnée qui verrouille la grille §8.
2. ~~**Le format**~~ → ✅ deux tailles au catalogue : **7 × 10** et **7,5 × 12**, reprises du fournisseur.
3. **Le modèle exact de puce** (NTAG213 ou 215 ?) et **la position de l'antenne** dans le chevalet — à mesurer sur un échantillon avant de figer les gabarits photo.
4. **L'outil d'encodage** : encodeur USB + script, ou application mobile à la main ? **Combien de temps par pièce** — c'est ce qui détermine si un mariage de 15 tables reste rentable.
5. **Le verrouillage** en lecture seule après contrôle : confirmé, et avec quel outil ?
6. **L'impression sur ce support** : le chevalet passe-t-il sous la Mimaki tel quel, ou faut-il un gabarit de maintien ? (chez Renka, les cartes sont tenues dans un gabarit 23 cases — il faudra l'équivalent)

---

## 10. Le piège à éviter, tiré de Renka

Leur famille Point Fixe est **en ligne, tarifée et photographiée — sans aucun process de fabrication documenté** : ni matière, ni fournisseur, ni étape d'impression, ni contrôle qualité. Elle a été *vendue avant d'être industrialisée*.

Ne refaisons pas ça. **Le présentoir NFC ne va pas au catalogue public tant que la question n°1 (le fournisseur) n'a pas de réponse** et qu'une première série n'a pas été produite et testée.

---

*Sources : exploration du projet Lika-NFC/Renka le 08/08/2026 — `lika-app/src/lib/offer.ts`, `docs/process-fabrication.md`, `src/lib/tap.ts`, `src/lib/profile-codec.ts`, `src/lib/card-geometry.ts`, `docs/decisions-validees.md`, `docs/journal-decisions.md`, `README.md`.*
