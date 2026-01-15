# Release report

## Résultat
**NO-GO (checks non exécutés)**

## Commandes à lancer
```bash
npm i
npm run release:verify
```

## Routes testées + statut
- `/` (landing) — **pending** (exécuté par `npm run smoke`)
- `/api/health` — **pending** (exécuté par `npm run smoke` et `npm run test:health`)
- Route clé auto-détectée (`/login`, `/join`, `/coming-soon`, `/infos/investisseur-v2`, `/infos/investissement-fonctionnement`) — **pending** (exécuté par `npm run smoke`)

## Checklist mode concours
- [ ] Event OFF: rien n’apparaît, endpoints refusent.
- [ ] Event ON: likes OK, compteur OK, classement OK.
- [ ] Après ends_at: votes bloqués, “Vote terminé”.

## Points à surveiller (non bloquants)
- **Expiration**: le smoke test signale si une page testée contient `Invalid Date` ou `NaN`. Les pages d’événement dynamiques ne sont pas testées sans données.
- **Tester Vercel**:
  - PowerShell: `$env:SMOKE_BASE_URL="https://<ton-url>"; npm run smoke`
  - CMD: `set SMOKE_BASE_URL=https://<ton-url> && npm run smoke`
- **Vercel/runtimes**:
  - `pages/api/scan-hash.ts`: `child_process.spawn` (exécute Python). Assurer un runtime Node compatible.
  - `app/api/scan/scan.ts`: `child_process.spawn` (exécute Python). Assurer un runtime Node compatible.
  - `app/api/scan/route.ts`: `child_process.spawn` (exécute Python). Assurer un runtime Node compatible.
  - `app/api/events/[eventId]/upload-image/route.ts`: `fs.promises.mkdir`/`writeFile` + `child_process.spawn`. Écriture disque à vérifier (préférer `/tmp` sur Vercel).

## Modifications
- ESLint ignore désormais les environnements Python et caches, et le lint est ciblé sur Next.js via `next lint` pour éviter les scans hors projet.
- Les smoke tests réutilisent un build existant et interprètent mieux les codes de sortie pour fiabiliser `test:health`/`smoke`.
- Ajout du mode concours (migrations, API, UI admin et galerie, countdown, likes et classement).

## Fichiers modifiés
- `eslint.config.mjs`
- `package.json`
- `.gitignore`
- `scripts/smoke-utils.mjs`
- `supabase/migrations/20250305120000_add_event_contest_mode.sql`
- `app/api/events/[eventId]/contest/state/route.ts`
- `app/api/events/[eventId]/contest/photos/[photoId]/toggle-like/route.ts`
- `app/components/contest/ContestCountdown.tsx`
- `app/event/[eventId]/edit/page.tsx`
- `app/events/[pin]/page.tsx`
- `lib/photoId.ts`
- `lib/voterId.ts`
- `types/event.ts`
