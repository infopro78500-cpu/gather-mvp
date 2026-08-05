# Usegather — Décisions validées (source de vérité)

> **Rôle** : les décisions actées par l'équipe. En cas de conflit avec un autre document, **celui-ci fait foi** (sauf entrée plus récente du journal). Les *pourquoi* détaillés sont dans `journal-decisions.md`. Une décision ne se ré-ouvre que sur fait nouveau.

---

## 1. Identité & marque

- **Le nom public est « Usegather »** — partout, tout le temps. « Gather » seul est banni des supports publics : non protégé, marques tierces existantes, et son usage exclusif fragiliserait notre propre marque (déchéance pour non-usage possible après 5 ans).
- **Marque INPI n° 5200774** : marque verbale française « Usegather », déposée le 20/11/2025, **enregistrée le 13/03/2026 sans opposition**, classes 9/35/42, expire le 20/11/2035. Titulaire : **Nicolas Verseron en nom propre** → cession/apport à la société **obligatoire à l'immatriculation** (les investisseurs le vérifient).
- **Domaine canonique : `usegather.app`**. L'ancien `gather-mvp.vercel.app` est conservé en redirection **à vie** : les QR déjà imprimés pointent dessus. Le projet Vercel ne doit jamais être supprimé.
- Prononciation : assumée à la française, sans complexe. Le logo doit aider à lire le nom (lockup « use » léger + « **gather** » gras). Ne pas créer de double nom d'usage.
- **EUIPO** (~1 050 €, 3 classes) : à déclencher avant toute vraie traction hors France, pas avant. Délai de priorité dépassé — sans conséquence bloquante.

## 2. Positionnement

- **Le produit** : coffre photo éphémère d'événement — un QR/PIN, tout le monde dépose **sans compte**, tout le monde repart avec tout. 24 h ou 7 jours, puis purge (préservation possible).
- **Beachhead : le mariage, en France** (~220 000/an) — fort potentiel d'impression, viralité invités. Les autres verticales (écoles, corporate, festivals) viennent après.
- **Différenciateur — les 5 cases que personne ne coche ensemble** : sans compte + offline + multi-OS + impression intégrée + EU/RGPD.
- **Le deck reste honnête** (v2, juillet 2026) : traction beta = 50+ événements / 700+ photos (fait), 0 actif à l'instant T (fait aussi) — aucun claim gonflé.

## 3. Équipe & gouvernance

- 4 associés : **Nico** (CEO/fondateur, produit & marque, accès Printerkut), **Arnaud** (lead dev, sécurité = chantier n°1), **Jérem** (finance & juridique, structuration), **Corentin** (commercial & marketing).
- Chaque **branche** du cockpit a un propriétaire ; les décisions structurantes passent par la vue **⚖️ Décisions** du cockpit et sont tracées au journal. Nico tranche produit/marque.
- **Pacte d'associés avec vesting** à caler dès la constitution (l'équipe apporte du travail, pas du cash).

## 4. Monétisation

- **Freemium B2C** : coffre gratuit à durée limitée → premium (conservation, quotas, HD).
- **Impression Printerkut** : partenaire de production dédié (société du frère de Nico). Gather encaisse, capte la marge, zéro CapEx. **Contrat d'approvisionnement exclusif à formaliser avant de pitcher.**
- **Early access** (pages `/infos/*`) : points = montant × multiplicateur (x20/x15/x12 selon entrée, plafond 1 000 €, cercle limité à 200 personnes ; investisseurs privés 5–20 k€ à x5). **Accord de contribution écrit systématique** — ce ne sont pas des parts de société, le dire clairement partout.
- **B2B** (écoles, clubs, corporate) : plus tard (V2).

## 5. Financement & structure

- **Cap : non-dilutif d'abord, < 50 k€** pour démarrer.
- **Piste principale : Luxembourg** — Fit4Start & aides Luxinnovation (Jérem & Corentin sur place). **Décision ouverte : immatriculation LU vs FR** — conditionne la cession de marque, les aides éligibles et le montage Printerkut.
- Leviers FR en parallèle : prêt d'honneur, French Tech, pré-vente type Ulule (décision à prendre).
- **Offre Supabase payante avant tout lancement sérieux** (leçon de l'incident de juillet 2026 : projet gratuit mis en pause, données beta reconstruites).

## 6. Produit — règles actées

- Pas de vente de données. Bucket privé + URLs signées à expiration. Analytics sans cookie.
- Purge automatique à expiration (cron quotidien) avec préservation opt-in par événement.
- Les clés locales `gather_device_id` / `gather_voter_id` / `gather-upload-queue` sont **intouchables** (identité device, votes, file d'upload).
- V1 « lançable publiquement » = comptes hôtes + intégration Printerkut + paiement + infra stable + sécurité par événement (périmètre : `strategie/POINT-SITUATION-GATHER.md §4`).
