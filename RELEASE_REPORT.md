# Release report

## Résultat
**NO-GO (checks non exécutés)**

## Commandes à lancer
```bash
npm i
npm run check:release
npm run smoke
```

## Routes testées + statut
- `/` (landing) — **pending** (exécuté par `npm run smoke`)
- `/api/health` — **pending** (exécuté par `npm run smoke` et `npm run test:health`)
- Route clé auto-détectée (`/login`, `/join`, `/coming-soon`, `/infos/investisseur-v2`, `/infos/investissement-fonctionnement`) — **pending** (exécuté par `npm run smoke`)

## Points à surveiller (non bloquants)
- **Expiration**: le smoke test signale si une page testée contient `Invalid Date` ou `NaN`. Les pages d’événement dynamiques ne sont pas testées sans données.
- **Vercel/runtimes**:
  - `pages/api/scan-hash.ts`: `child_process.spawn` (exécute Python). Assurer un runtime Node compatible.
  - `app/api/scan/scan.ts`: `child_process.spawn` (exécute Python). Assurer un runtime Node compatible.
  - `app/api/scan/route.ts`: `child_process.spawn` (exécute Python). Assurer un runtime Node compatible.
  - `app/api/events/[eventId]/upload-image/route.ts`: `fs.promises.mkdir`/`writeFile` + `child_process.spawn`. Écriture disque à vérifier (préférer `/tmp` sur Vercel).
