const fs = require("fs/promises");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const OUTPUT_DIR = path.resolve(process.cwd(), "analytics_output");
const BUCKET_NAME = "event-photos";
const PAGE_SIZE = 1000;
const ACTIVE_DAYS_WINDOW = 30;

const toDateString = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const bytesToMb = (bytes) => {
  if (typeof bytes !== "number") return null;
  return bytes / (1024 * 1024);
};

const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return Number(value).toFixed(digits);
};

const buildSupabaseConfig = () => {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return { supabaseUrl, supabaseKey };
};

const ensureOutputDir = async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
};

const writeCsv = async (filename, header, rows) => {
  const lines = [header.join(","), ...rows.map((row) => row.join(","))];
  await fs.writeFile(path.join(OUTPUT_DIR, filename), lines.join("\n"), "utf-8");
};

const writeReport = async (content) => {
  await fs.writeFile(path.join(OUTPUT_DIR, "report.md"), content, "utf-8");
};

const listAllFiles = async (supabase, eventId) => {
  let offset = 0;
  const files = [];

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(eventId, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(
        `Storage list error for event ${eventId}: ${error.message ?? "unknown"}`
      );
    }

    if (!data || data.length === 0) {
      break;
    }

    files.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return files;
};

const fetchAllEvents = async (supabase) => {
  let offset = 0;
  const events = [];

  while (true) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Events query failed: ${error.message ?? "unknown"}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    events.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return events;
};

const buildDailyEntry = () => ({
  photosCount: 0,
  totalSizeBytes: 0,
  sizeCount: 0,
  uploaders: new Set(),
  events: new Map(),
});

const updateDailyEvent = (dailyEntry, eventId) => {
  if (!dailyEntry.events.has(eventId)) {
    dailyEntry.events.set(eventId, {
      photosCount: 0,
      totalSizeBytes: 0,
      sizeCount: 0,
      uploaders: new Set(),
    });
  }
  return dailyEntry.events.get(eventId);
};

const parseUploaderDeviceId = (filename) => {
  if (!filename || typeof filename !== "string") return null;
  if (!filename.includes("__")) return null;
  const [deviceId] = filename.split("__");
  return deviceId || null;
};

const runReport = async () => {
  await ensureOutputDir();

  const config = buildSupabaseConfig();
  if (!config) {
    await writeCsv(
      "analysis_table.csv",
      ["kpi", "value", "unit", "notes"],
      [
        [
          "events_count",
          "",
          "count",
          "SUPABASE_URL / SUPABASE_* key not set in environment",
        ],
        [
          "avg_users_per_event",
          "",
          "users/event",
          "SUPABASE_URL / SUPABASE_* key not set in environment",
        ],
        [
          "avg_photos_per_event",
          "",
          "photos/event",
          "SUPABASE_URL / SUPABASE_* key not set in environment",
        ],
        [
          "avg_photo_size_mb",
          "",
          "MB/photo",
          "SUPABASE_URL / SUPABASE_* key not set in environment",
        ],
        [
          "total_storage_per_event_mb",
          "",
          "MB/event",
          "SUPABASE_URL / SUPABASE_* key not set in environment",
        ],
        [
          "upload_errors_rate",
          "",
          "rate",
          "No upload error logs available in the database",
        ],
        [
          "session_completion_rate",
          "",
          "rate",
          "No session tracking available in the database",
        ],
        [
          "active_users",
          "",
          "users",
          "SUPABASE_URL / SUPABASE_* key not set in environment",
        ],
      ]
    );

    await writeCsv(
      "daily_timeseries.csv",
      [
        "date",
        "events_created_count",
        "photos_uploaded_count",
        "unique_uploaders_count",
        "avg_users_per_event",
        "avg_photos_per_event",
        "avg_photo_size_mb",
        "total_storage_per_event_mb",
        "active_users",
        "upload_errors_rate",
        "session_completion_rate",
      ],
      []
    );

    await writeReport(`# Rapport KPI GATHER MVP

## Statut d'exécution
- **Supabase non configuré** : variables \`SUPABASE_URL\` / \`SUPABASE_*KEY\` absentes.
- Les fichiers CSV ont été créés, mais sans données réelles.

## Sources attendues
- Table \`events\`
- Bucket Supabase Storage \`${BUCKET_NAME}\`

## Limites & données manquantes
- Sans accès Supabase, aucun KPI réel ne peut être calculé.
- Les métriques \`upload_errors_rate\` et \`session_completion_rate\` nécessitent des logs dédiés.

## Recommandations (schéma, RLS, instrumentation)
- **Table \`uploads\`** : \`id\`, \`event_id\`, \`device_id\`, \`user_id\`, \`file_path\`, \`file_size\`, \`status\`, \`error_code\`, \`created_at\`.
- **Table \`sessions\`** : \`id\`, \`event_id\`, \`device_id\`, \`started_at\`, \`ended_at\`, \`completed\`.
- **RLS** :
  - Autoriser \`select\` en lecture seule pour un rôle analytics.
  - Restreindre \`insert\` sur \`uploads\`/ \`sessions\` aux users authentifiés ou service role.
- **Appels Supabase** :
  - \`supabase.from('uploads').insert(...)\` lors d'un upload (succès/échec).
  - \`supabase.from('sessions').insert(...)\` au début d'une session et update à la fin.

## Prochaines étapes
Ajoutez les variables d’environnement Supabase puis relancez :

\`\`\`bash
node analytics/run_report.js
\`\`\`
`);
    return;
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false },
  });

  const events = await fetchAllEvents(supabase);
  const eventsCount = events.length;

  const eventSummaries = new Map();
  const dailyUploads = new Map();
  const eventsByDate = new Map();
  let totalPhotoCount = 0;
  let totalSizeBytes = 0;
  let totalSizeCount = 0;
  const allUploaders = new Set();
  const allUploaderEvents = new Map();

  events.forEach((event) => {
    const createdDate = toDateString(event.created_at);
    if (createdDate) {
      eventsByDate.set(createdDate, (eventsByDate.get(createdDate) ?? 0) + 1);
    }
  });

  for (const event of events) {
    const summary = {
      photosCount: 0,
      totalSizeBytes: 0,
      sizeCount: 0,
      uploaderIds: new Set(),
    };

    const files = await listAllFiles(supabase, event.id);
    for (const file of files) {
      summary.photosCount += 1;
      totalPhotoCount += 1;

      const sizeBytes =
        typeof file?.metadata?.size === "number" ? file.metadata.size : null;
      if (sizeBytes !== null) {
        summary.totalSizeBytes += sizeBytes;
        summary.sizeCount += 1;
        totalSizeBytes += sizeBytes;
        totalSizeCount += 1;
      }

      const uploaderDeviceId = parseUploaderDeviceId(file.name);
      if (uploaderDeviceId) {
        summary.uploaderIds.add(uploaderDeviceId);
        allUploaders.add(uploaderDeviceId);
        allUploaderEvents.set(uploaderDeviceId, true);
      }

      const uploadDate = toDateString(file.created_at ?? file.updated_at);
      if (uploadDate) {
        if (!dailyUploads.has(uploadDate)) {
          dailyUploads.set(uploadDate, buildDailyEntry());
        }
        const dailyEntry = dailyUploads.get(uploadDate);
        dailyEntry.photosCount += 1;
        if (sizeBytes !== null) {
          dailyEntry.totalSizeBytes += sizeBytes;
          dailyEntry.sizeCount += 1;
        }
        if (uploaderDeviceId) {
          dailyEntry.uploaders.add(uploaderDeviceId);
        }

        const dailyEvent = updateDailyEvent(dailyEntry, event.id);
        dailyEvent.photosCount += 1;
        if (sizeBytes !== null) {
          dailyEvent.totalSizeBytes += sizeBytes;
          dailyEvent.sizeCount += 1;
        }
        if (uploaderDeviceId) {
          dailyEvent.uploaders.add(uploaderDeviceId);
        }
      }
    }

    eventSummaries.set(event.id, summary);
  }

  const eventsWithUploaderCounts = [...eventSummaries.values()].filter(
    (summary) => summary.uploaderIds.size > 0
  );
  const eventsWithPhotoCounts = [...eventSummaries.values()].filter(
    (summary) => summary.photosCount > 0
  );

  const avgUsersPerEvent =
    eventsWithUploaderCounts.length > 0
      ? eventsWithUploaderCounts.reduce((acc, summary) => acc + summary.uploaderIds.size, 0) /
        eventsWithUploaderCounts.length
      : null;

  const avgPhotosPerEvent =
    eventsCount > 0 ? totalPhotoCount / eventsCount : null;

  const avgPhotoSizeMb =
    totalSizeCount > 0 ? bytesToMb(totalSizeBytes / totalSizeCount) : null;

  const totalStoragePerEventMb =
    eventsCount > 0 && totalSizeCount > 0 ? bytesToMb(totalSizeBytes / eventsCount) : null;

  const activeWindowStart = new Date();
  activeWindowStart.setDate(activeWindowStart.getDate() - ACTIVE_DAYS_WINDOW);
  let activeUsers = null;

  if (dailyUploads.size > 0) {
    const activeUsersSet = new Set();
    dailyUploads.forEach((entry, date) => {
      const parsedDate = new Date(date);
      if (!Number.isNaN(parsedDate.getTime()) && parsedDate >= activeWindowStart) {
        entry.uploaders.forEach((id) => activeUsersSet.add(id));
      }
    });
    activeUsers = activeUsersSet.size;
  }

  const analysisRows = [
    [
      "events_count",
      eventsCount.toString(),
      "count",
      "Total events in Supabase events table.",
    ],
    [
      "avg_users_per_event",
      avgUsersPerEvent === null ? "" : formatNumber(avgUsersPerEvent, 2),
      "users/event",
      avgUsersPerEvent === null
        ? "No uploader device IDs found in storage filenames."
        : "Based on unique device IDs parsed from storage filenames (prefix before '__').",
    ],
    [
      "avg_photos_per_event",
      avgPhotosPerEvent === null ? "" : formatNumber(avgPhotosPerEvent, 2),
      "photos/event",
      eventsCount === 0 ? "No events found." : "Based on storage objects per event.",
    ],
    [
      "avg_photo_size_mb",
      avgPhotoSizeMb === null ? "" : formatNumber(avgPhotoSizeMb, 2),
      "MB/photo",
      avgPhotoSizeMb === null
        ? "No file size metadata available from storage list."
        : "Average across storage objects with size metadata.",
    ],
    [
      "total_storage_per_event_mb",
      totalStoragePerEventMb === null ? "" : formatNumber(totalStoragePerEventMb, 2),
      "MB/event",
      totalStoragePerEventMb === null
        ? "Missing storage metadata or events."
        : "Total storage size divided by number of events.",
    ],
    [
      "upload_errors_rate",
      "",
      "rate",
      "No upload error logs available. Recommend logging upload attempts/errors.",
    ],
    [
      "session_completion_rate",
      "",
      "rate",
      "No session tracking available. Recommend adding session start/end tracking.",
    ],
    [
      "active_users",
      activeUsers === null ? "" : activeUsers.toString(),
      "users",
      activeUsers === null
        ? "No upload timestamps available to compute active users."
        : `Unique uploader device IDs in the last ${ACTIVE_DAYS_WINDOW} days.`,
    ],
  ];

  await writeCsv(
    "analysis_table.csv",
    ["kpi", "value", "unit", "notes"],
    analysisRows
  );

  const dailyRows = [...dailyUploads.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, entry]) => {
      const eventsCreatedCount = eventsByDate.get(date) ?? "";

      const avgUsersPerEventDaily =
        entry.events.size > 0
          ? [...entry.events.values()].reduce((acc, eventEntry) => {
              return acc + eventEntry.uploaders.size;
            }, 0) / entry.events.size
          : null;

      const avgPhotosPerEventDaily =
        entry.events.size > 0 ? entry.photosCount / entry.events.size : null;

      const avgPhotoSizeDaily =
        entry.sizeCount > 0
          ? bytesToMb(entry.totalSizeBytes / entry.sizeCount)
          : null;

      const storagePerEventDaily =
        entry.events.size > 0 && entry.sizeCount > 0
          ? bytesToMb(entry.totalSizeBytes / entry.events.size)
          : null;

      return [
        date,
        eventsCreatedCount,
        entry.photosCount.toString(),
        entry.uploaders.size.toString(),
        avgUsersPerEventDaily === null ? "" : formatNumber(avgUsersPerEventDaily, 2),
        avgPhotosPerEventDaily === null ? "" : formatNumber(avgPhotosPerEventDaily, 2),
        avgPhotoSizeDaily === null ? "" : formatNumber(avgPhotoSizeDaily, 2),
        storagePerEventDaily === null ? "" : formatNumber(storagePerEventDaily, 2),
        entry.uploaders.size.toString(),
        "",
        "",
      ];
    });

  await writeCsv(
    "daily_timeseries.csv",
    [
      "date",
      "events_created_count",
      "photos_uploaded_count",
      "unique_uploaders_count",
      "avg_users_per_event",
      "avg_photos_per_event",
      "avg_photo_size_mb",
      "total_storage_per_event_mb",
      "active_users",
      "upload_errors_rate",
      "session_completion_rate",
    ],
    dailyRows
  );

  const reportLines = [
    "# Rapport KPI GATHER MVP",
    "",
    "## Sources de données",
    "- Table `events` : création d'événements et métadonnées.",
    `- Supabase Storage bucket \`${BUCKET_NAME}\` : photos uploadées par événement.`,
    "- L'identifiant d'uploader est dérivé du nom de fichier (`<deviceId>__<filename>`).",
    "",
    "## KPI synthèse",
    `- events_count: ${eventsCount}`,
    `- avg_users_per_event: ${avgUsersPerEvent === null ? "ND" : formatNumber(avgUsersPerEvent, 2)}`,
    `- avg_photos_per_event: ${
      avgPhotosPerEvent === null ? "ND" : formatNumber(avgPhotosPerEvent, 2)
    }`,
    `- avg_photo_size_mb: ${avgPhotoSizeMb === null ? "ND" : formatNumber(avgPhotoSizeMb, 2)}`,
    `- total_storage_per_event_mb: ${
      totalStoragePerEventMb === null ? "ND" : formatNumber(totalStoragePerEventMb, 2)
    }`,
    "- upload_errors_rate: ND (pas de logs d'erreur d'upload)",
    "- session_completion_rate: ND (pas de tracking de sessions)",
    `- active_users: ${activeUsers === null ? "ND" : activeUsers}`,
    "",
    "## Limites & qualité des données",
    "- Les tailles de fichiers proviennent de `metadata.size` dans Storage. Si absent, les métriques de taille sont partielles.",
    "- Les uploaders sont approximés via le préfixe du nom de fichier. Si le préfixe est absent, l'uploader est inconnu.",
    "- L'activité journalière s'appuie sur `created_at` / `updated_at` des objets Storage.",
    "",
    "## Recommandations (schéma, RLS, instrumentation)",
    "- **Table `uploads`** : `id`, `event_id`, `device_id`, `user_id`, `file_path`, `file_size`, `status`, `error_code`, `created_at`.",
    "  - Permet de calculer `upload_errors_rate`, `avg_photo_size_mb`, `total_storage_per_event_mb` de façon fiable.",
    "- **Table `sessions`** : `id`, `event_id`, `device_id`, `started_at`, `ended_at`, `completed`.",
    "  - Permet de calculer `session_completion_rate`.",
    "- **RLS** :",
    "  - Autoriser `select` en lecture seule pour le rôle analytics.",
    "  - Restreindre `insert` sur `uploads`/`sessions` aux users authentifiés ou service role.",
    "- **Appels Supabase** :",
    "  - `supabase.from('uploads').insert(...)` lors d'un upload (succès/échec).",
    "  - `supabase.from('sessions').insert(...)` au début d'une session et update à la fin.",
  ];

  await writeReport(reportLines.join("\n"));
};

runReport().catch(async (error) => {
  await ensureOutputDir();
  await writeReport(`# Rapport KPI GATHER MVP

## Erreur d'exécution
${error.message}
`);
  console.error(error);
  process.exitCode = 1;
});
