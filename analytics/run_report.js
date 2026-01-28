import 'dotenv/config'
// @ts-check

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { DateTime } = require("luxon");
const { createClient } = require("@supabase/supabase-js");

dotenv.config({ path: path.join(process.cwd(), ".env") });

const OUTPUT_DIR = path.join(process.cwd(), "analytics_output");
const PAGE_SIZE = 1000;
const TIMEZONE = "Europe/Paris";

const REQUIRED_TABLES = [
  { schema: "public", name: "events" },
  { schema: "public", name: "members" },
  { schema: "public", name: "photos" },
  { schema: "public", name: "leads_landing" },
  { schema: "auth", name: "users" },
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, headers, rows) {
  const headerLine = headers.map(csvEscape).join(",");
  const lines = rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","));
  fs.writeFileSync(filePath, [headerLine, ...lines].join("\n"), "utf8");
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createSupabaseClient() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertTableExists(supabase, table) {
  const { schema, name } = table;
  const { error, count } = await supabase
    .schema(schema)
    .from(name)
    .select("id", { head: true, count: "exact" });

  if (error) {
    throw new Error(`Missing required table: ${schema}.${name} (${error.message})`);
  }

  console.log(`[analytics] Table OK: ${schema}.${name} (rows: ${count ?? "unknown"})`);
}

async function fetchCount(supabase, table) {
  const { schema, name } = table;
  const { error, count } = await supabase
    .schema(schema)
    .from(name)
    .select("id", { head: true, count: "exact" });

  if (error) {
    throw new Error(`Failed to count ${schema}.${name}: ${error.message}`);
  }
  return count ?? 0;
}

async function fetchAllRows(supabase, table, columns) {
  const { schema, name } = table;
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .schema(schema)
      .from(name)
      .select(columns.join(","))
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch ${schema}.${name}: ${error.message}`);
    }

    rows.push(...(data || []));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  console.log(`[analytics] Loaded ${rows.length} rows from ${schema}.${name}.`);
  return rows;
}

function average(values) {
  if (!values.length) {
    return null;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function toDayKey(isoString) {
  return DateTime.fromISO(isoString, { zone: "utc" }).setZone(TIMEZONE).toISODate();
}

function buildDailySeries(entries, fields) {
  const dayMap = new Map();

  for (const entry of entries) {
    const day = entry.day;
    if (!day) {
      continue;
    }
    if (!dayMap.has(day)) {
      dayMap.set(day, { date: day, ...fields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {}) });
    }
    const current = dayMap.get(day);
    current[entry.field] += 1;
  }

  if (dayMap.size === 0) {
    return [];
  }

  const sortedDays = Array.from(dayMap.keys()).sort();
  const firstDay = DateTime.fromISO(sortedDays[0], { zone: TIMEZONE }).startOf("day");
  const lastDay = DateTime.fromISO(sortedDays[sortedDays.length - 1], { zone: TIMEZONE }).startOf("day");
  const output = [];
  let cursor = firstDay;

  while (cursor <= lastDay) {
    const key = cursor.toISODate();
    if (dayMap.has(key)) {
      output.push(dayMap.get(key));
    } else {
      output.push({ date: key, ...fields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {}) });
    }
    cursor = cursor.plus({ days: 1 });
  }

  return output;
}

async function main() {
  ensureDir(OUTPUT_DIR);

  const supabase = createSupabaseClient();
  console.log("[analytics] Using SUPABASE_SERVICE_ROLE_KEY for admin access.");

  for (const table of REQUIRED_TABLES) {
    await assertTableExists(supabase, table);
  }

  const eventsTable = { schema: "public", name: "events" };
  const membersTable = { schema: "public", name: "members" };
  const photosTable = { schema: "public", name: "photos" };
  const leadsTable = { schema: "public", name: "leads_landing" };
  const usersTable = { schema: "auth", name: "users" };

  const totalEvents = await fetchCount(supabase, eventsTable);
  const totalMembers = await fetchCount(supabase, membersTable);
  const totalPhotos = await fetchCount(supabase, photosTable);
  const totalLeads = await fetchCount(supabase, leadsTable);
  const totalUsers = await fetchCount(supabase, usersTable);

  console.log("[analytics] Row counts:");
  console.log(`- events: ${totalEvents}`);
  console.log(`- members: ${totalMembers}`);
  console.log(`- photos: ${totalPhotos}`);
  console.log(`- leads_landing: ${totalLeads}`);
  console.log(`- auth.users: ${totalUsers}`);

  const eventsRows = await fetchAllRows(supabase, eventsTable, [
    "id",
    "created_at",
    "is_closed",
    "lifetime_days",
    "host_user_id",
  ]);
  const membersRows = await fetchAllRows(supabase, membersTable, ["id", "created_at"]);
  const photosRows = await fetchAllRows(supabase, photosTable, ["id", "created_at", "event_id", "member_id"]);

  const activeEvents = eventsRows.filter((event) => event.is_closed === false).length;
  const closedEvents = eventsRows.filter((event) => event.is_closed === true).length;
  const lifetimeValues = eventsRows
    .map((event) => Number(event.lifetime_days))
    .filter((value) => Number.isFinite(value));
  const avgEventLifetimeDays = average(lifetimeValues);

  const hostIds = new Set(eventsRows.map((event) => event.host_user_id).filter(Boolean));
  const totalHosts = hostIds.size;

  const avgMembersPerEvent = totalEvents ? totalMembers / totalEvents : null;
  const avgPhotosPerEvent = totalEvents ? totalPhotos / totalEvents : null;
  const avgPhotosPerMember = totalMembers ? totalPhotos / totalMembers : null;
  const eventsPerHost = totalHosts ? totalEvents / totalHosts : null;

  const kpiResults = [
    { kpi_name: "total_events", value: totalEvents, unit: "count", notes: "" },
    { kpi_name: "active_events", value: activeEvents, unit: "count", notes: "is_closed = false" },
    { kpi_name: "closed_events", value: closedEvents, unit: "count", notes: "is_closed = true" },
    {
      kpi_name: "avg_event_lifetime_days",
      value: avgEventLifetimeDays ?? "NOT_AVAILABLE",
      unit: "days",
      notes: avgEventLifetimeDays === null ? "No lifetime_days values found." : "",
    },
    { kpi_name: "total_members", value: totalMembers, unit: "count", notes: "" },
    {
      kpi_name: "avg_members_per_event",
      value: avgMembersPerEvent ?? "NOT_AVAILABLE",
      unit: "count",
      notes: totalEvents ? "" : "No events found.",
    },
    { kpi_name: "total_photos", value: totalPhotos, unit: "count", notes: "" },
    {
      kpi_name: "avg_photos_per_event",
      value: avgPhotosPerEvent ?? "NOT_AVAILABLE",
      unit: "count",
      notes: totalEvents ? "" : "No events found.",
    },
    {
      kpi_name: "avg_photos_per_member",
      value: avgPhotosPerMember ?? "NOT_AVAILABLE",
      unit: "count",
      notes: totalMembers ? "" : "No members found.",
    },
    { kpi_name: "total_hosts", value: totalHosts, unit: "count", notes: "Distinct host_user_id." },
    {
      kpi_name: "events_per_host",
      value: eventsPerHost ?? "NOT_AVAILABLE",
      unit: "count",
      notes: totalHosts ? "" : "No host_user_id values found.",
    },
    { kpi_name: "total_leads", value: totalLeads, unit: "count", notes: "" },
    { kpi_name: "users_total", value: totalUsers, unit: "count", notes: "auth.users" },
  ];

  const dailyEntries = [];
  for (const event of eventsRows) {
    if (event.created_at) {
      dailyEntries.push({ day: toDayKey(event.created_at), field: "events" });
    }
  }
  for (const member of membersRows) {
    if (member.created_at) {
      dailyEntries.push({ day: toDayKey(member.created_at), field: "members" });
    }
  }
  for (const photo of photosRows) {
    if (photo.created_at) {
      dailyEntries.push({ day: toDayKey(photo.created_at), field: "photos" });
    }
  }

  const dailySeries = buildDailySeries(dailyEntries, ["events", "members", "photos"]);

  const analysisPath = path.join(OUTPUT_DIR, "analysis_table.csv");
  const dailyPath = path.join(OUTPUT_DIR, "daily_timeseries.csv");
  const reportPath = path.join(OUTPUT_DIR, "report.md");

  writeCsv(analysisPath, ["kpi_name", "value", "unit", "notes"], kpiResults);
  writeCsv(dailyPath, ["date", "events", "members", "photos"], dailySeries);

  const missingKpis = kpiResults.filter((kpi) => kpi.value === "NOT_AVAILABLE");
  const reportLines = [
    "# Rapport KPI Gather MVP",
    "",
    "## Sources",
    "- Supabase (service role) via @supabase/supabase-js.",
    "- Tables utilisées : public.events, public.members, public.photos, public.leads_landing, auth.users.",
    "",
    "## KPI calculés",
    ...kpiResults.map(
      (kpi) => `- **${kpi.kpi_name}**: ${kpi.value}${kpi.unit ? ` (${kpi.unit})` : ""} ${kpi.notes ? `— ${kpi.notes}` : ""}`
    ),
    "",
    "## Série temporelle quotidienne",
    `- Périmètre: toutes les dates disponibles (timezone ${TIMEZONE}).`,
    "- Colonnes: events, members, photos.",
    "",
    "## Gaps & limites",
    missingKpis.length
      ? missingKpis.map((kpi) => `- ${kpi.kpi_name}: ${kpi.notes || "Non calculable"}`).join("\n")
      : "- Aucun KPI manquant.",
    "- La taille de stockage des photos n'est pas disponible dans le schéma (pas de colonne file_size/bytes).",
    "",
    "## Supabase / RLS / schéma",
    "- Aucune migration requise pour ces KPI (schéma existant suffisant).",
    "- Le service role contourne RLS ; si vous souhaitez exécuter avec une clé anon, ajouter des policies SELECT en lecture seule sur les tables concernées.",
    "- Appels Supabase principaux: .from('events'|'members'|'photos'|'leads_landing'), .schema('auth').from('users').",
    "",
    "## Fichiers générés",
    `- ${analysisPath}`,
    `- ${dailyPath}`,
    `- ${reportPath}`,
  ];

  fs.writeFileSync(reportPath, reportLines.join("\n"), "utf8");

  console.log("\n[analytics] KPI summary:");
  for (const kpi of kpiResults) {
    console.log(`- ${kpi.kpi_name}: ${kpi.value}`);
  }
  console.log("[analytics] Output files:");
  console.log(`- ${analysisPath}`);
  console.log(`- ${dailyPath}`);
  console.log(`- ${reportPath}`);
}

main().catch((error) => {
  console.error("[analytics] Failed to run report:", error);
  process.exitCode = 1;
});
