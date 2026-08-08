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

### Le bon de commande — données réelles (08/08/2026)

Ligne 5 du bon fournisseur : **`Acrylic Ntag215 stand card` — 1,20 $ pièce**, 50 unités (25 de chaque taille), cotes `127,5 + 50 × 76 mm` et `105 + 50 × 70 mm`. Puce **NTAG215** confirmée — la même que les cartes Renka, 504 octets utiles, très largement de quoi loger une URL courte.

**Le « + 50 mm », c'est le pied**, et c'est le détail qui change le calcul : la pièce occupe le plateau **à plat, pied compris**, alors que le client ne voit que la face imprimée.

| Taille | Face imprimée | À plat sur le plateau | Pièces par passe (610×420) | QR imprimé |
|---|---|---|---|---|
| **Moyen** | 7,0 × 10,5 cm | 7,0 × **15,5** cm | **18** | ~4,3 cm |
| **Grand** | 7,6 × 12,75 cm | 7,6 × **17,75** cm | **16** | ~4,7 cm |

*(À ne compter que la face visible on aurait cru 32 et 24 — presque le double. Le rendement réel se calcule sur l'encombrement à plat ; c'est figé dans un test.)*

Un QR de 4,3 cm se scanne largement (2 cm suffisent en pratique). Le moyen est le format naturel sur une table dressée, le grand pour les tables d'honneur ou les salles où le présentoir doit se voir de loin.

**Coût réel** : 1,20 $ + quote-part des 120 $ de DDP répartis sur les 715 $ de marchandise ≈ **1,40 $ rendu, soit ~1,23 €**. C'est **deux fois moins que mon estimation prudente** de 2 à 2,50 €.

**Contrainte d'approvisionnement à connaître** : production **8 à 12 jours ouvrés** après paiement, plus le transport. Avec 50 chevalets en stock, on couvre deux à trois mariages de 15 tables. Sur un produit à date impérative, **le réassort est un délai à anticiper** — c'est la vraie limite du produit, pas la production interne.

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

## 5. La photo et l'antenne — **non, ce n'est pas une contrainte**

On imprime plein cadre par-dessus l'antenne, **sans aucun effet sur la puce**. L'encre UV quadri, le blanc de soutien et le vernis sont des pigments dans une résine : ils ne sont pas conducteurs, ils n'écrantent pas le champ radio.

Renka maintient bien une zone d'exclusion d'antenne (`card-geometry.ts`), mais elle ne concerne que **les films métallisés et holographiques** de leur option « Signature » premium — de la vraie feuille métal, qui elle écrante et tue la carte. Ça ne s'applique pas à une photo imprimée.

**Donc rien à mesurer, rien à éviter, aucun gabarit à contraindre.** La seule situation où la question reviendrait, c'est si on ajoutait un jour une finition **dorure à chaud, feuille métallisée ou holographique** sur un présentoir haut de gamme — à ce moment-là seulement il faudra localiser l'antenne.

*(Note : cette page a d'abord présenté la mesure de l'antenne comme une action bloquante à la réception des échantillons. C'était une transposition abusive de la contrainte Renka — corrigé le 08/08/2026.)*

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
| 5 tables | **45,00 €** | 9,00 € | ~10 € | **78 %** |
| 10 tables | **79,00 €** | 7,90 € | ~18 € | **77 %** |
| 15 tables | **109,00 €** | 7,27 € | ~26 € | **76 %** |
| 20 tables | **135,00 €** | 6,75 € | ~35 € | **74 %** |

**Grand — 7,5 × 12 cm**

| Lot | Prix | Par table | Coût estimé | Marge |
|---|---|---|---|---|
| 5 tables | **55,00 €** | 11,00 € | ~12 € | **78 %** |
| 10 tables | **99,00 €** | 9,90 € | ~21 € | **79 %** |
| 15 tables | **135,00 €** | 9,00 € | ~30 € | **78 %** |
| 20 tables | **169,00 €** | 8,45 € | ~40 € | **76 %** |

Coût = chevalet rendu **1,23 €** (chiffre réel du bon de commande) + impression UV + encodage unitaire + emballage. **Marges de 74 à 79 %** — le chevalet ne pèse qu'un tiers du coût de revient, le reste est de la main-d'œuvre, donc le vrai levier est le **temps d'encodage par pièce**, pas le prix d'achat.

Comparaison : Renka vend son présentoir moyen **29 € l'unité** ; dix coûteraient 290 €. À 79 €, on est très en dessous — justifié par le volume et par le fait qu'on ne vend pas un support de prospection commerciale mais un accessoire d'événement, acheté par lot.

---

## 9. Ce qu'il faut décider avant de produire

1. ~~**Le fournisseur**~~ → ✅ commande passée le 08/08/2026, 50 chevalets (25 de chaque taille) à **1,20 $ pièce**.
2. ~~**Le format**~~ → ✅ **7,0 × 10,5** et **7,6 × 12,75** de face, pied de 5 cm en plus à plat.
3. ~~**Le modèle de puce**~~ → ✅ **NTAG215**.
4. ~~**La position de l'antenne**~~ → ✅ sans objet : on imprime en quadri, ça n'écrante rien (§5).
5. **L'outil d'encodage** : encodeur USB + script, ou application mobile à la main ? **Combien de temps par pièce** — le chevalet ne pèse qu'un tiers du coût de revient, l'encodage est le vrai levier de marge. *C'est désormais le seul vrai inconnu.*
6. **Le verrouillage** en lecture seule après contrôle : avec quel outil, et intégré à quelle étape ?
7. **Le gabarit de maintien** : le chevalet passe-t-il sous la Mimaki tel quel, ou faut-il un gabarit ? Chez Renka les cartes sont tenues dans un gabarit 23 cases dont la géométrie est figée et validée sur tirage réel — il faudra l'équivalent, calé sur **18 pièces par passe en moyen, 16 en grand**.
8. **Le réassort** : 8 à 12 jours ouvrés de production plus le transport. À intégrer au stock de sécurité, sur un produit dont la date de livraison ne se négocie pas.

---

## 10. Le piège à éviter, tiré de Renka

Leur famille Point Fixe est **en ligne, tarifée et photographiée — sans aucun process de fabrication documenté** : ni matière, ni fournisseur, ni étape d'impression, ni contrôle qualité. Elle a été *vendue avant d'être industrialisée*.

Ne refaisons pas ça. **Le présentoir NFC ne va pas au catalogue public tant que la question n°1 (le fournisseur) n'a pas de réponse** et qu'une première série n'a pas été produite et testée.

---

*Sources : exploration du projet Lika-NFC/Renka le 08/08/2026 — `lika-app/src/lib/offer.ts`, `docs/process-fabrication.md`, `src/lib/tap.ts`, `src/lib/profile-codec.ts`, `src/lib/card-geometry.ts`, `docs/decisions-validees.md`, `docs/journal-decisions.md`, `README.md`.*
