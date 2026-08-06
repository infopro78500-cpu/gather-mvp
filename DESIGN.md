# DESIGN.md — règles durables de l'outil atelier (`/atelier`)

> **Périmètre** : le tableau de bord atelier Printerkut uniquement. L'app grand public
> Usegather garde son identité sombre — ce document ne la concerne pas.
> **Origine** : audit `docs/audit-ux-atelier.md` (06/08/2026), palette claire actée par Nico
> (décision du 06/08, `docs/journal-decisions.md`). Une règle d'ici ne se change que par
> décision nouvelle, pas par goût du moment.

## 1. Le principe qui gouverne tout

**On juge des photos avant de les imprimer.** Toute surface qui porte une photo (tuile,
panneau, modale) a un entourage **neutre clair** (`#ECEBE6`), même en thème sombre — un
entourage sombre fausse la perception de luminosité et de saturation (raison du gris clair
des outils photo professionnels). Chaque section répond à une question d'opérateur en
moins de 5 secondes.

## 2. Tokens de couleur

Portés par des variables CSS (`--at-*`) posées sur la racine du composant `AtelierBoard`.

| Token | Clair (défaut) | Sombre (optionnel) | Usage |
|---|---|---|---|
| `--at-bg` | `#F6F6F4` | `#12151A` | fond de page |
| `--at-card` | `#FFFFFF` | `#1B2027` | cartes |
| `--at-border` / `--at-border-2` | `#E2E1DC` / `#D8D6CF` | `#2B323C` / `#3A434F` | bordures |
| `--at-text` / `--at-text-2` / `--at-text-3` | `#1A1A18` / `#6B6A63` / `#8A8983` | `#F1F0EC` / `#A8AFB9` / `#7E8590` | texte |
| `--at-soft` | `#EFEEE9` | `#242B34` | surfaces discrètes, barres |
| `--at-accent` (+`-2`, `-text`) | `#0b0f19` | `#E9E7E2` | bouton d'action primaire |

Le sombre `#0b0f19` de l'app grand public ne sert ici que d'**accent** (boutons primaires),
jamais de fond. Le thème sombre est un confort optionnel (`localStorage.atelier_theme`) —
le clair reste le défaut et la référence.

## 3. Pastilles matière (catégorie ≠ statut)

La matière est l'info n°1 de l'atelier (quel stock charger). Toujours **couleur + texte**,
jamais couleur seule (daltonisme).

| Matière | Point | Fond | Texte |
|---|---|---|---|
| Papier photo | `#C9A874` | `#FBF3E4` | `#6B4F1D` |
| Canvas | `#B9673F` | `#FBEAE1` | `#7C3A1D` |
| Forex | `#7C6FB0` | `#EFEBFA` | `#463A78` |
| Alu-Dibond | `#6B7A8F` | `#EAEDF1` | `#3C4857` |
| Plexi | `#3FA6B0` | `#E3F5F6` | `#1C5F66` |

## 4. Couleurs de statut (état d'avancement)

| Statut | Couleur | Règle |
|---|---|---|
| En file / à surveiller | ambre `#B7791F` sur `#FEF3C7` | |
| En lot / à imprimer | bleu `#2563EB` sur `#DBEAFE` | l'action du jour |
| Imprimé / à expédier | sarcelle `#0F9D8A` sur `#D1FAE5` | |
| Expédié | gris neutre | visuellement « fermé » |
| **Rouge** `#DC2626` sur `#FEE2E2` | **réservé aux vrais problèmes** (retard confirmé, lien invalide) | jamais pour un état transitoire — une coupure réseau est **ambre** |

## 5. Typographie, tactile, icônes

- Corps 16 px minimum ; 14 px seulement pour le secondaire. Compteurs en graisse forte +
  `tabular-nums` (pas de chiffres qui sautent au refresh).
- Cibles tactiles ≥ 44 px (opérateur ganté, tablette posée).
- Icônes : jeu SVG maison, traits fins (1.8), monochromes — la couleur vient du texte.
  **Pas d'émojis fonctionnels dans l'UI** (ils restent admis dans l'email atelier).
- Wordmark : `use` léger + `gather` gras, suivi de « × Printerkut ». Jamais « Gather » seul.

## 6. Règles d'interaction

- **Sélectionner puis agir** : cliquer une pièce ouvre LE panneau contextuel (un seul à la
  fois) ; aucune liste ne répète un bouton d'action par ligne, SAUF dans une liste déjà
  filtrée pour cette action (ex. onglet « À expédier » = checklist, boutons légitimes).
- **Confirmation à 2 clics** sur toute action destructrice (retirer, retirage, forcer,
  expédier) ; timeout 3,5 s ; **changer de sélection désarme la confirmation**.
- **Poll léger 10 s** (compteurs + lots sans détail) ; le détail d'un lot, les vignettes
  et les stats se chargent **à la demande**. Ne jamais re-signer en boucle ce qui peut
  être mis en cache.
- **Erreurs en langage humain** : réseau = ambre + « nouvel essai automatique » + bouton ;
  lien invalide = message dédié sans retry ; états vides = phrase rassurante.
- Vignettes : 480 px de côté long, JPEG q70, générées au gel du fichier (`sharp`) —
  jamais de transformation à la volée dépendante de l'offre Supabase.

## 7. Ce qui ne se discute pas sans nouveau tirage réel

Hérité de Renka : une planche/un lot = UNE matière · fichiers sans transparence · tout
investissement qualité se valide sur un tirage physique avant généralisation.
