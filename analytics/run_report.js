// @ts-check

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { DateTime } = require("luxon");
const { Client: PgClient } = require("pg");
const mysql = require("mysql2/promise");
const { MongoClient } = require("mongodb");

dotenv.config({ path: path.join(process.cwd(), ".env") });

const OUTPUT_DIR = path.join(process.cwd(), "analytics_output");
const PERIOD = {
  start: DateTime.fromISO("2025-12-20T00:00:00", { zone: "Europe/Paris" }),
  end: DateTime.fromISO("2026-01-05T23:59:59", { zone: "Europe/Paris" }),
};

const KEYWORDS = {
  events: ["event", "events"],
  elements: ["element", "elements", "item", "items"],
  users: ["user", "users", "account", "accounts", "member", "members"],
  photos: ["photo", "photos", "media", "image", "images"],
  chests: ["chest", "chests", "storage", "container", "inventory"],
  participants: ["participant", "participants", "attendee", "attendees", "member", "members"],
  items: ["item", "items", "inventory_item", "inventory_items"],
};

const CREATED_COLUMNS = [
  "created_at",
  "createdat",
  "created_at_utc",
  "created",
  "created_on",
  "createdon",
  "inserted_at",
  "timestamp",
];

const UPDATED_COLUMNS = ["updated_at", "updatedat", "modified_at", "modified", "updated_on", "updatedon"];

const USER_COLUMNS = [
  "user_id",
  "userid",
  "owner_id",
  "ownerid",
  "created_by",
  "createdby",
  "creator_id",
  "creatorid",
  "author_id",
  "authorid",
];

const NAME_COLUMNS = ["name", "title", "label"];
const SIZE_COLUMNS = ["size", "bytes", "file_size", "filesize", "content_length"];
const WEIGHT_COLUMNS = ["weight", "mass", "total_weight", "totalweight", "load"];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function normalizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function pickColumn(columns, candidates) {
  const normalized = new Map(columns.map((col) => [normalizeName(col), col]));
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate);
    if (normalized.has(normalizedCandidate)) {
      return normalized.get(normalizedCandidate) || null;
    }
  }
  return null;
}

function pickIdColumn(columns, tableName) {
  const normalized = normalizeName(tableName);
  const candidates = ["id", `${normalized}id`, `${normalized}_id`];
  return pickColumn(columns, candidates);
}

function detectDb() {
  const env = process.env;
  const mongoUrl = env.MONGO_URL || env.MONGODB_URI;
  if (mongoUrl) {
    return { type: "mongo", url: mongoUrl };
  }
  const sqlUrl =
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.POSTGRES_URL_NON_POOLING ||
    env.SUPABASE_DB_URL ||
    env.SUPABASE_DATABASE_URL ||
    env.MYSQL_URL;
  if (!sqlUrl) {
    return null;
  }
  if (sqlUrl.startsWith("postgres")) {
    return { type: "postgres", url: sqlUrl };
  }
  if (sqlUrl.startsWith("mysql")) {
    return { type: "mysql", url: sqlUrl };
  }
  if (sqlUrl.startsWith("mongodb")) {
    return { type: "mongo", url: sqlUrl };
  }
  return { type: "postgres", url: sqlUrl };
}

function scoreTable(name, keywords) {
  const normalized = normalizeName(name);
  return keywords.reduce((score, keyword) => {
    if (normalized.includes(normalizeName(keyword))) {
      return score + 1;
    }
    return score;
  }, 0);
}

function findBestTable(tables, keywords) {
  let best = null;
  let bestScore = 0;
  for (const table of tables) {
    const score = scoreTable(table.name, keywords);
    if (score > bestScore) {
      bestScore = score;
      best = table;
    }
  }
  return bestScore > 0 ? best : null;
}

function findParticipantTable(tables) {
  let best = null;
  for (const table of tables) {
    const columns = table.columns.map((col) => normalizeName(col.name));
    const hasUser = USER_COLUMNS.some((col) => columns.includes(normalizeName(col)));
    const hasElement = columns.includes("elementid") || columns.includes("element_id") || columns.includes("event_id") || columns.includes("eventid");
    if (hasUser && hasElement) {
      const score = scoreTable(table.name, KEYWORDS.participants);
      if (score > 0 || !best) {
        best = table;
      }
    }
  }
  return best;
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

function formatDate(dateTime) {
  return dateTime.toISODate();
}

function parseDayValue(value) {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: "utc" });
  }
  if (typeof value === "string") {
    return DateTime.fromISO(value, { zone: "utc" });
  }
  return DateTime.fromJSDate(new Date(value), { zone: "utc" });
}

function dateRange(start, end) {
  const days = [];
  let cursor = start.startOf("day");
  const endDay = end.startOf("day");
  while (cursor <= endDay) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }
  return days;
}

async function loadSchema(db) {
  if (db.type === "postgres") {
    const client = new PgClient({ connectionString: db.url });
    await client.connect();
    const tablesResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE'"
    );
    const columnsResult = await client.query(
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema')"
    );
    const tables = tablesResult.rows.map((row) => ({ name: row.table_name, columns: [] }));
    const tableMap = new Map(tables.map((table) => [table.name, table]));
    for (const row of columnsResult.rows) {
      const table = tableMap.get(row.table_name);
      if (table) {
        table.columns.push({ name: row.column_name, type: row.data_type });
      }
    }
    return { db, client, tables };
  }

  if (db.type === "mysql") {
    const connection = await mysql.createConnection(db.url);
    const [tablesRows] = await connection.execute(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
    );
    const [columnsRows] = await connection.execute(
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = DATABASE()"
    );
    const tables = tablesRows.map((row) => ({ name: row.TABLE_NAME || row.table_name, columns: [] }));
    const tableMap = new Map(tables.map((table) => [table.name, table]));
    for (const row of columnsRows) {
      const table = tableMap.get(row.TABLE_NAME || row.table_name);
      if (table) {
        table.columns.push({ name: row.COLUMN_NAME || row.column_name, type: row.DATA_TYPE || row.data_type });
      }
    }
    return { db, connection, tables };
  }

  if (db.type === "mongo") {
    const client = new MongoClient(db.url);
    await client.connect();
    const dbName =
      process.env.MONGO_DB_NAME ||
      (() => {
        try {
          const parsed = new URL(db.url);
          return parsed.pathname.replace("/", "") || "test";
        } catch (error) {
          return "test";
        }
      })();
    const database = client.db(dbName);
    const collections = await database.listCollections().toArray();
    const tables = [];
    for (const collection of collections) {
      const docs = await database.collection(collection.name).find({}).limit(200).toArray();
      const fields = new Set();
      for (const doc of docs) {
        if (doc && typeof doc === "object") {
          Object.keys(doc).forEach((key) => fields.add(key));
        }
      }
      tables.push({ name: collection.name, columns: Array.from(fields).map((name) => ({ name, type: "unknown" })) });
    }
    return { db, client, database, tables };
  }

  throw new Error("Unsupported database type.");
}

function buildMapping(tables) {
  return {
    events: findBestTable(tables, KEYWORDS.events),
    elements: findBestTable(tables, KEYWORDS.elements),
    users: findBestTable(tables, KEYWORDS.users),
    photos: findBestTable(tables, KEYWORDS.photos),
    chests: findBestTable(tables, KEYWORDS.chests),
    participants: findParticipantTable(tables),
    items: findBestTable(tables, KEYWORDS.items),
  };
}

function resolveColumns(table) {
  if (!table) {
    return null;
  }
  const columns = table.columns.map((column) => column.name);
  return {
    createdAt: pickColumn(columns, CREATED_COLUMNS),
    updatedAt: pickColumn(columns, UPDATED_COLUMNS),
    userId: pickColumn(columns, USER_COLUMNS),
    name: pickColumn(columns, NAME_COLUMNS),
    id: pickIdColumn(columns, table.name),
    size: pickColumn(columns, SIZE_COLUMNS),
    weight: pickColumn(columns, WEIGHT_COLUMNS),
  };
}

function sqlQuote(dbType, identifier) {
  if (dbType === "mysql") {
    return `\`${identifier.replace(/`/g, "``")}\``;
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function sqlCountCreated(dbType, client, table, createdColumn, startUtc, endUtc) {
  if (!table || !createdColumn) {
    return null;
  }
  const sql = `SELECT COUNT(*)::bigint as count FROM ${sqlQuote(dbType, table.name)} WHERE ${sqlQuote(
    dbType,
    createdColumn
  )} BETWEEN $1 AND $2`;
  const params = [startUtc, endUtc];
  if (dbType === "mysql") {
    const mysqlSql = sql.replace(/\$1/g, "?").replace(/\$2/g, "?").replace("::bigint", "");
    const [rows] = await client.execute(mysqlSql, params);
    return Number(rows[0].count || rows[0]["COUNT(*)"] || rows[0].COUNT);
  }
  const result = await client.query(sql, params);
  return Number(result.rows[0]?.count || 0);
}

async function sqlSum(dbType, client, table, column, startUtc, endUtc, createdColumn) {
  if (!table || !column) {
    return null;
  }
  const whereClause = createdColumn
    ? ` WHERE ${sqlQuote(dbType, createdColumn)} BETWEEN $1 AND $2`
    : "";
  const sql = `SELECT SUM(${sqlQuote(dbType, column)})::numeric as total FROM ${sqlQuote(
    dbType,
    table.name
  )}${whereClause}`;
  const params = createdColumn ? [startUtc, endUtc] : [];
  if (dbType === "mysql") {
    const mysqlSql = sql.replace(/\$1/g, "?").replace(/\$2/g, "?").replace("::numeric", "");
    const [rows] = await client.execute(mysqlSql, params);
    return rows[0]?.total !== null && rows[0]?.total !== undefined ? Number(rows[0].total) : null;
  }
  const result = await client.query(sql, params);
  return result.rows[0]?.total !== null && result.rows[0]?.total !== undefined ? Number(result.rows[0].total) : null;
}

async function sqlAvg(dbType, client, table, column, startUtc, endUtc, createdColumn) {
  if (!table || !column) {
    return null;
  }
  const whereClause = createdColumn
    ? ` WHERE ${sqlQuote(dbType, createdColumn)} BETWEEN $1 AND $2`
    : "";
  const sql = `SELECT AVG(${sqlQuote(dbType, column)})::numeric as avg FROM ${sqlQuote(
    dbType,
    table.name
  )}${whereClause}`;
  const params = createdColumn ? [startUtc, endUtc] : [];
  if (dbType === "mysql") {
    const mysqlSql = sql.replace(/\$1/g, "?").replace(/\$2/g, "?").replace("::numeric", "");
    const [rows] = await client.execute(mysqlSql, params);
    return rows[0]?.avg !== null && rows[0]?.avg !== undefined ? Number(rows[0].avg) : null;
  }
  const result = await client.query(sql, params);
  return result.rows[0]?.avg !== null && result.rows[0]?.avg !== undefined ? Number(result.rows[0].avg) : null;
}

async function sqlDailyCounts(dbType, client, table, createdColumn, startUtc, endUtc) {
  if (!table || !createdColumn) {
    return null;
  }
  if (dbType === "postgres") {
    const sql = `SELECT date_trunc('day', ${sqlQuote(dbType, createdColumn)} AT TIME ZONE 'Europe/Paris')::date AS day, COUNT(*)::bigint AS count
      FROM ${sqlQuote(dbType, table.name)}
      WHERE ${sqlQuote(dbType, createdColumn)} BETWEEN $1 AND $2
      GROUP BY 1
      ORDER BY 1`;
    const result = await client.query(sql, [startUtc, endUtc]);
    return result.rows.map((row) => ({ day: row.day, count: Number(row.count) }));
  }
  if (dbType === "mysql") {
    const sql = `SELECT DATE(CONVERT_TZ(${sqlQuote(dbType, createdColumn)}, '+00:00', '+01:00')) AS day, COUNT(*) AS count
      FROM ${sqlQuote(dbType, table.name)}
      WHERE ${sqlQuote(dbType, createdColumn)} BETWEEN ? AND ?
      GROUP BY 1
      ORDER BY 1`;
    const [rows] = await client.execute(sql, [startUtc, endUtc]);
    return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
  }
  return null;
}

async function sqlDistinctUsers(dbType, client, activityQueries, startUtc, endUtc) {
  if (activityQueries.length === 0) {
    return null;
  }
  const unionSql = activityQueries.join(" UNION ALL ");
  if (dbType === "postgres") {
    const sql = `SELECT COUNT(DISTINCT user_id)::bigint as count FROM (${unionSql}) as activity`; 
    const result = await client.query(sql, [startUtc, endUtc]);
    return Number(result.rows[0]?.count || 0);
  }
  if (dbType === "mysql") {
    const sql = `SELECT COUNT(DISTINCT user_id) as count FROM (${unionSql}) as activity`; 
    const params = activityQueries.flatMap(() => [startUtc, endUtc]);
    const [rows] = await client.execute(sql, params);
    return Number(rows[0]?.count || 0);
  }
  return null;
}

async function sqlDailyActiveUsers(dbType, client, activityQueries, startUtc, endUtc) {
  if (activityQueries.length === 0) {
    return null;
  }
  const unionSql = activityQueries.join(" UNION ALL ");
  if (dbType === "postgres") {
    const sql = `SELECT day, COUNT(DISTINCT user_id)::bigint as count FROM (${unionSql}) as activity GROUP BY day ORDER BY day`;
    const result = await client.query(sql, [startUtc, endUtc]);
    return result.rows.map((row) => ({ day: row.day, count: Number(row.count) }));
  }
  if (dbType === "mysql") {
    const sql = `SELECT day, COUNT(DISTINCT user_id) as count FROM (${unionSql}) as activity GROUP BY day ORDER BY day`;
    const params = activityQueries.flatMap(() => [startUtc, endUtc]);
    const [rows] = await client.execute(sql, params);
    return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
  }
  return null;
}

function buildActivityQueries(dbType, table, columns) {
  const queries = [];
  if (!table || !columns?.userId) {
    return queries;
  }
  const userId = sqlQuote(dbType, columns.userId);
  if (columns.createdAt) {
    if (dbType === "postgres") {
      queries.push(
        `SELECT date_trunc('day', ${sqlQuote(
          dbType,
          columns.createdAt
        )} AT TIME ZONE 'Europe/Paris')::date AS day, ${userId} as user_id FROM ${sqlQuote(dbType, table.name)} WHERE ${sqlQuote(
          dbType,
          columns.createdAt
        )} BETWEEN $1 AND $2 AND ${userId} IS NOT NULL`
      );
    } else {
      queries.push(
        `SELECT DATE(CONVERT_TZ(${sqlQuote(
          dbType,
          columns.createdAt
        )}, '+00:00', '+01:00')) AS day, ${userId} as user_id FROM ${sqlQuote(dbType, table.name)} WHERE ${sqlQuote(
          dbType,
          columns.createdAt
        )} BETWEEN ? AND ? AND ${userId} IS NOT NULL`
      );
    }
  }
  if (columns.updatedAt) {
    if (dbType === "postgres") {
      queries.push(
        `SELECT date_trunc('day', ${sqlQuote(
          dbType,
          columns.updatedAt
        )} AT TIME ZONE 'Europe/Paris')::date AS day, ${userId} as user_id FROM ${sqlQuote(dbType, table.name)} WHERE ${sqlQuote(
          dbType,
          columns.updatedAt
        )} BETWEEN $1 AND $2 AND ${userId} IS NOT NULL`
      );
    } else {
      queries.push(
        `SELECT DATE(CONVERT_TZ(${sqlQuote(
          dbType,
          columns.updatedAt
        )}, '+00:00', '+01:00')) AS day, ${userId} as user_id FROM ${sqlQuote(dbType, table.name)} WHERE ${sqlQuote(
          dbType,
          columns.updatedAt
        )} BETWEEN ? AND ? AND ${userId} IS NOT NULL`
      );
    }
  }
  return queries;
}

async function sqlPeoplePerElement(dbType, client, participants, participantsColumns, elements, elementColumns) {
  if (!participants || !participantsColumns) {
    return null;
  }
  const columns = participants.columns.map((col) => normalizeName(col.name));
  const elementIdColumn =
    participantsColumns.elementId ||
    (columns.includes("element_id") ? "element_id" : null) ||
    (columns.includes("elementid") ? "elementid" : null) ||
    (columns.includes("event_id") ? "event_id" : null) ||
    (columns.includes("eventid") ? "eventid" : null);
  const userIdColumn = participantsColumns.userId || pickColumn(participants.columns.map((col) => col.name), USER_COLUMNS);
  if (!elementIdColumn || !userIdColumn) {
    return null;
  }
  const elementIdQuoted = sqlQuote(dbType, elementIdColumn);
  const userIdQuoted = sqlQuote(dbType, userIdColumn);
  const tableName = sqlQuote(dbType, participants.name);
  const countsSql = `SELECT ${elementIdQuoted} as element_id, COUNT(${userIdQuoted})::bigint as people_count FROM ${tableName} WHERE ${elementIdQuoted} IS NOT NULL GROUP BY ${elementIdQuoted}`;
  if (dbType === "mysql") {
    const [rows] = await client.execute(countsSql.replace("::bigint", ""));
    let top = null;
    if (elements && elementColumns?.name && elementColumns?.id) {
      const joinSql = `SELECT p.element_id, p.people_count, e.${sqlQuote(dbType, elementColumns.name)} as element_name
        FROM (${countsSql}) as p
        LEFT JOIN ${sqlQuote(dbType, elements.name)} e ON e.${sqlQuote(dbType, elementColumns.id)} = p.element_id
        ORDER BY p.people_count DESC
        LIMIT 10`;
      const [topRows] = await client.execute(joinSql.replace("::bigint", ""));
      top = topRows.map((row) => ({
        element_id: row.element_id,
        element_name: row.element_name,
        count: Number(row.people_count),
      }));
    }
    return { counts: rows.map((row) => ({ element_id: row.element_id, count: Number(row.people_count) })), top };
  }
  const result = await client.query(countsSql);
  let topRows = result.rows;
  if (elements && elementColumns?.name && elementColumns?.id) {
    const joinSql = `SELECT p.element_id, p.people_count, e.${sqlQuote(dbType, elementColumns.name)} as element_name
      FROM (${countsSql}) as p
      LEFT JOIN ${sqlQuote(dbType, elements.name)} e ON e.${sqlQuote(dbType, elementColumns.id)} = p.element_id
      ORDER BY p.people_count DESC
      LIMIT 10`;
    const joinResult = await client.query(joinSql);
    topRows = joinResult.rows.map((row) => ({
      element_id: row.element_id,
      element_name: row.element_name,
      count: Number(row.people_count),
    }));
    return { counts: result.rows.map((row) => ({ element_id: row.element_id, count: Number(row.people_count) })), top: topRows };
  }
  return { counts: result.rows.map((row) => ({ element_id: row.element_id, count: Number(row.people_count) })) };
}

function computeMedian(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

async function sqlTopCreators(dbType, client, tablesWithUsers, startUtc, endUtc) {
  const queries = [];
  for (const entry of tablesWithUsers) {
    const { table, columns } = entry;
    if (!columns?.userId || !columns?.createdAt) {
      continue;
    }
    const userId = sqlQuote(dbType, columns.userId);
    if (dbType === "postgres") {
      queries.push(
        `SELECT ${userId} as user_id FROM ${sqlQuote(dbType, table.name)} WHERE ${userId} IS NOT NULL AND ${sqlQuote(
          dbType,
          columns.createdAt
        )} BETWEEN $1 AND $2`
      );
    } else {
      queries.push(
        `SELECT ${userId} as user_id FROM ${sqlQuote(dbType, table.name)} WHERE ${userId} IS NOT NULL AND ${sqlQuote(
          dbType,
          columns.createdAt
        )} BETWEEN ? AND ?`
      );
    }
  }
  if (!queries.length) {
    return null;
  }
  const unionSql = queries.join(" UNION ALL ");
  const sql = `SELECT user_id, COUNT(*)::bigint as total FROM (${unionSql}) as creations GROUP BY user_id ORDER BY total DESC LIMIT 10`;
  if (dbType === "mysql") {
    const params = queries.flatMap(() => [startUtc, endUtc]);
    const [rows] = await client.execute(sql.replace("::bigint", ""), params);
    return rows.map((row) => ({ user_id: row.user_id, total: Number(row.total) }));
  }
  const result = await client.query(sql, [startUtc, endUtc]);
  return result.rows.map((row) => ({ user_id: row.user_id, total: Number(row.total) }));
}

async function sqlChestStats(dbType, client, chests, chestColumns, items, itemColumns) {
  if (!chests) {
    return null;
  }
  if (chestColumns?.weight) {
    const weightCol = sqlQuote(dbType, chestColumns.weight);
    const tableName = sqlQuote(dbType, chests.name);
    if (dbType === "postgres") {
      const statsSql = `SELECT AVG(${weightCol})::numeric as avg, MIN(${weightCol})::numeric as min, MAX(${weightCol})::numeric as max,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${weightCol}) as median
        FROM ${tableName} WHERE ${weightCol} IS NOT NULL`;
      const stats = await client.query(statsSql);
      const bucketSql = `SELECT
        SUM(CASE WHEN ${weightCol} < 1 THEN 1 ELSE 0 END)::bigint as bucket_0_1,
        SUM(CASE WHEN ${weightCol} >= 1 AND ${weightCol} < 5 THEN 1 ELSE 0 END)::bigint as bucket_1_5,
        SUM(CASE WHEN ${weightCol} >= 5 AND ${weightCol} < 10 THEN 1 ELSE 0 END)::bigint as bucket_5_10,
        SUM(CASE WHEN ${weightCol} >= 10 THEN 1 ELSE 0 END)::bigint as bucket_10_plus
        FROM ${tableName} WHERE ${weightCol} IS NOT NULL`;
      const buckets = await client.query(bucketSql);
      return { stats: stats.rows[0], buckets: buckets.rows[0] };
    }
    if (dbType === "mysql") {
      const [rows] = await client.execute(
        `SELECT ${weightCol} as weight FROM ${tableName} WHERE ${weightCol} IS NOT NULL`
      );
      const weights = rows.map((row) => Number(row.weight)).filter((value) => !Number.isNaN(value));
      const avg = weights.reduce((sum, value) => sum + value, 0) / (weights.length || 1);
      const min = weights.length ? Math.min(...weights) : null;
      const max = weights.length ? Math.max(...weights) : null;
      const median = computeMedian(weights);
      const buckets = {
        bucket_0_1: weights.filter((value) => value < 1).length,
        bucket_1_5: weights.filter((value) => value >= 1 && value < 5).length,
        bucket_5_10: weights.filter((value) => value >= 5 && value < 10).length,
        bucket_10_plus: weights.filter((value) => value >= 10).length,
      };
      return { stats: { avg, min, max, median }, buckets };
    }
  }

  if (items && itemColumns?.weight) {
    const chestIdColumn = pickColumn(items.columns.map((col) => col.name), ["chest_id", "chestid", "container_id", "inventory_id"]);
    if (!chestIdColumn) {
      return null;
    }
    const weightCol = sqlQuote(dbType, itemColumns.weight);
    const chestIdCol = sqlQuote(dbType, chestIdColumn);
    const tableName = sqlQuote(dbType, items.name);
    if (dbType === "postgres") {
      const statsSql = `SELECT AVG(total_weight)::numeric as avg, MIN(total_weight)::numeric as min, MAX(total_weight)::numeric as max,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_weight) as median
        FROM (SELECT ${chestIdCol} as chest_id, SUM(${weightCol}) as total_weight FROM ${tableName} GROUP BY ${chestIdCol}) as weights`;
      const stats = await client.query(statsSql);
      const bucketSql = `SELECT
        SUM(CASE WHEN total_weight < 1 THEN 1 ELSE 0 END)::bigint as bucket_0_1,
        SUM(CASE WHEN total_weight >= 1 AND total_weight < 5 THEN 1 ELSE 0 END)::bigint as bucket_1_5,
        SUM(CASE WHEN total_weight >= 5 AND total_weight < 10 THEN 1 ELSE 0 END)::bigint as bucket_5_10,
        SUM(CASE WHEN total_weight >= 10 THEN 1 ELSE 0 END)::bigint as bucket_10_plus
        FROM (SELECT ${chestIdCol} as chest_id, SUM(${weightCol}) as total_weight FROM ${tableName} GROUP BY ${chestIdCol}) as weights`;
      const buckets = await client.query(bucketSql);
      return { stats: stats.rows[0], buckets: buckets.rows[0], derived: true };
    }
    if (dbType === "mysql") {
      const [rows] = await client.execute(
        `SELECT ${chestIdCol} as chest_id, SUM(${weightCol}) as total_weight FROM ${tableName} GROUP BY ${chestIdCol}`
      );
      const weights = rows.map((row) => Number(row.total_weight)).filter((value) => !Number.isNaN(value));
      const avg = weights.reduce((sum, value) => sum + value, 0) / (weights.length || 1);
      const min = weights.length ? Math.min(...weights) : null;
      const max = weights.length ? Math.max(...weights) : null;
      const median = computeMedian(weights);
      const buckets = {
        bucket_0_1: weights.filter((value) => value < 1).length,
        bucket_1_5: weights.filter((value) => value >= 1 && value < 5).length,
        bucket_5_10: weights.filter((value) => value >= 5 && value < 10).length,
        bucket_10_plus: weights.filter((value) => value >= 10).length,
      };
      return { stats: { avg, min, max, median }, buckets, derived: true };
    }
  }
  return null;
}

async function mongoAggregateCounts(collection, createdField, startUtc, endUtc) {
  if (!collection || !createdField) {
    return null;
  }
  const pipeline = [
    { $match: { [createdField]: { $gte: startUtc.toJSDate(), $lte: endUtc.toJSDate() } } },
    { $count: "count" },
  ];
  const results = await collection.aggregate(pipeline).toArray();
  return results[0]?.count || 0;
}

async function mongoDailyCounts(collection, createdField, startUtc, endUtc) {
  if (!collection || !createdField) {
    return null;
  }
  const pipeline = [
    { $match: { [createdField]: { $gte: startUtc.toJSDate(), $lte: endUtc.toJSDate() } } },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: `$${createdField}`,
            unit: "day",
            timezone: "Europe/Paris",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const results = await collection.aggregate(pipeline).toArray();
  return results.map((row) => ({ day: row._id, count: row.count }));
}

async function main() {
  ensureDir(OUTPUT_DIR);

  const dbConfig = detectDb();
  if (!dbConfig) {
    console.error("No database configuration found in environment variables.");
    process.exitCode = 1;
    return;
  }

  console.log(`[analytics] Detected database: ${dbConfig.type}`);
  const schema = await loadSchema(dbConfig);
  console.log(`[analytics] Loaded ${schema.tables.length} tables/collections.`);

  const mapping = buildMapping(schema.tables);
  const mappingColumns = {
    events: resolveColumns(mapping.events),
    elements: resolveColumns(mapping.elements),
    users: resolveColumns(mapping.users),
    photos: resolveColumns(mapping.photos),
    chests: resolveColumns(mapping.chests),
    participants: resolveColumns(mapping.participants),
    items: resolveColumns(mapping.items),
  };

  console.log("[analytics] Mapping summary:");
  for (const [key, value] of Object.entries(mapping)) {
    console.log(`  - ${key}: ${value?.name || "NOT_FOUND"}`);
  }

  const startUtc = PERIOD.start.toUTC();
  const endUtc = PERIOD.end.toUTC();

  const kpiResults = [];
  const timeseries = new Map();
  const days = dateRange(PERIOD.start, PERIOD.end).map((day) => formatDate(day));
  for (const day of days) {
    timeseries.set(day, {
      date: day,
      events_created: 0,
      elements_created: 0,
      photos_uploaded: 0,
      active_users: 0,
      new_users: 0,
    });
  }

  const periodStart = PERIOD.start.toISO();
  const periodEnd = PERIOD.end.toISO();

  const recordKpi = (name, value, unit, notes) => {
    kpiResults.push({
      kpi_name: name,
      value: value === null || value === undefined ? "NOT_AVAILABLE" : value,
      unit,
      period_start: periodStart,
      period_end: periodEnd,
      notes: notes || "",
    });
  };

  if (schema.db.type === "postgres" || schema.db.type === "mysql") {
    const client = schema.db.type === "postgres" ? schema.client : schema.connection;
    const dbType = schema.db.type;

    const totalEvents = await sqlCountCreated(dbType, client, mapping.events, mappingColumns.events?.createdAt, startUtc.toISO(), endUtc.toISO());
    recordKpi(
      "total_events_created",
      totalEvents,
      "count",
      totalEvents === null ? "Missing events table or created_at column." : ""
    );

    const totalElements = await sqlCountCreated(
      dbType,
      client,
      mapping.elements,
      mappingColumns.elements?.createdAt,
      startUtc.toISO(),
      endUtc.toISO()
    );
    recordKpi(
      "total_elements_created",
      totalElements,
      "count",
      totalElements === null ? "Missing elements table or created_at column." : ""
    );

    const newUsers = await sqlCountCreated(dbType, client, mapping.users, mappingColumns.users?.createdAt, startUtc.toISO(), endUtc.toISO());
    recordKpi(
      "total_users_new",
      newUsers,
      "count",
      newUsers === null ? "Missing users table or created_at column." : ""
    );

    const activityQueries = [];
    const activityTables = [
      { table: mapping.events, columns: mappingColumns.events },
      { table: mapping.elements, columns: mappingColumns.elements },
      { table: mapping.photos, columns: mappingColumns.photos },
      { table: mapping.chests, columns: mappingColumns.chests },
    ];

    for (const entry of activityTables) {
      if (entry.table && entry.columns) {
        activityQueries.push(...buildActivityQueries(dbType, entry.table, entry.columns));
      }
    }

    const totalActiveUsers = await sqlDistinctUsers(dbType, client, activityQueries, startUtc.toISO(), endUtc.toISO());
    recordKpi(
      "total_users_active",
      totalActiveUsers,
      "count",
      totalActiveUsers === null ? "Missing activity tables with user_id and created/updated timestamps." : ""
    );

    const participantColumns = mappingColumns.participants
      ? { ...mappingColumns.participants }
      : null;
    if (participantColumns && mapping.participants) {
      participantColumns.elementId = pickColumn(
        mapping.participants.columns.map((col) => col.name),
        ["element_id", "elementid", "event_id", "eventid"]
      );
    }
    const peopleData = await sqlPeoplePerElement(
      dbType,
      client,
      mapping.participants,
      participantColumns,
      mapping.elements,
      mappingColumns.elements
    );

    if (peopleData?.counts) {
      const counts = peopleData.counts.map((row) => Number(row.count));
      const avg = counts.reduce((sum, value) => sum + value, 0) / (counts.length || 1);
      const median = computeMedian(counts);
      recordKpi("avg_people_per_element", avg, "people", "Computed from participants relation.");
      recordKpi("median_people_per_element", median, "people", "Computed from participants relation.");
      recordKpi(
        "top_10_elements_by_people",
        JSON.stringify(peopleData.top || []),
        "json",
        peopleData.top ? "Element name provided when available." : "Top list unavailable without elements table."
      );
    } else {
      recordKpi("avg_people_per_element", null, "people", "Missing participants relation or element_id/user_id fields.");
      recordKpi("median_people_per_element", null, "people", "Missing participants relation or element_id/user_id fields.");
      recordKpi("top_10_elements_by_people", null, "json", "Missing participants relation or element_id/user_id fields.");
    }

    const totalPhotos = await sqlCountCreated(dbType, client, mapping.photos, mappingColumns.photos?.createdAt, startUtc.toISO(), endUtc.toISO());
    recordKpi(
      "total_photos_uploaded",
      totalPhotos,
      "count",
      totalPhotos === null ? "Missing photos table or created_at column." : ""
    );

    const photoBytes = await sqlSum(
      dbType,
      client,
      mapping.photos,
      mappingColumns.photos?.size,
      startUtc.toISO(),
      endUtc.toISO(),
      mappingColumns.photos?.createdAt
    );
    const photoAvg = await sqlAvg(
      dbType,
      client,
      mapping.photos,
      mappingColumns.photos?.size,
      startUtc.toISO(),
      endUtc.toISO(),
      mappingColumns.photos?.createdAt
    );
    recordKpi(
      "total_photo_storage_bytes",
      photoBytes,
      "bytes",
      photoBytes === null ? "Missing photos size column." : ""
    );
    recordKpi(
      "avg_photo_size_bytes",
      photoAvg,
      "bytes",
      photoAvg === null ? "Missing photos size column." : ""
    );

    if (mapping.photos && mappingColumns.photos?.size) {
      const topSql = `SELECT ${sqlQuote(dbType, mappingColumns.photos.id || "id")} as id, ${sqlQuote(
        dbType,
        mappingColumns.photos.size
      )} as size, ${mappingColumns.photos.userId ? sqlQuote(dbType, mappingColumns.photos.userId) + " as owner_id" : "NULL as owner_id"}
        FROM ${sqlQuote(dbType, mapping.photos.name)}
        WHERE ${sqlQuote(dbType, mappingColumns.photos.size)} IS NOT NULL
        ORDER BY ${sqlQuote(dbType, mappingColumns.photos.size)} DESC
        LIMIT 10`;
      if (dbType === "mysql") {
        const [rows] = await client.execute(topSql);
        recordKpi("top_10_biggest_photos", JSON.stringify(rows), "json", "Top 10 by size, owner_id if available.");
      } else {
        const result = await client.query(topSql);
        recordKpi("top_10_biggest_photos", JSON.stringify(result.rows), "json", "Top 10 by size, owner_id if available.");
      }
    } else {
      recordKpi("top_10_biggest_photos", null, "json", "Missing photos table or size column.");
    }

    const chestStats = await sqlChestStats(dbType, client, mapping.chests, mappingColumns.chests, mapping.items, mappingColumns.items);
    if (chestStats?.stats) {
      recordKpi("avg_chest_weight", chestStats.stats.avg, "kg", chestStats.derived ? "Derived from items weights." : "");
      recordKpi("median_chest_weight", chestStats.stats.median, "kg", chestStats.derived ? "Derived from items weights." : "");
      recordKpi("min_chest_weight", chestStats.stats.min, "kg", chestStats.derived ? "Derived from items weights." : "");
      recordKpi("max_chest_weight", chestStats.stats.max, "kg", chestStats.derived ? "Derived from items weights." : "");
      recordKpi(
        "distribution_chest_weight_buckets",
        JSON.stringify({
          "0-1kg": Number(chestStats.buckets.bucket_0_1),
          "1-5kg": Number(chestStats.buckets.bucket_1_5),
          "5-10kg": Number(chestStats.buckets.bucket_5_10),
          "10kg+": Number(chestStats.buckets.bucket_10_plus),
        }),
        "json",
        chestStats.derived ? "Derived from items weights." : ""
      );
    } else {
      recordKpi("avg_chest_weight", null, "kg", "Missing chest weight or items weights.");
      recordKpi("median_chest_weight", null, "kg", "Missing chest weight or items weights.");
      recordKpi("min_chest_weight", null, "kg", "Missing chest weight or items weights.");
      recordKpi("max_chest_weight", null, "kg", "Missing chest weight or items weights.");
      recordKpi("distribution_chest_weight_buckets", null, "json", "Missing chest weight or items weights.");
    }

    if (mapping.events && mappingColumns.events?.id && mapping.photos) {
      const photoEventId = pickColumn(mapping.photos.columns.map((col) => col.name), ["event_id", "eventid"]);
      if (photoEventId) {
        const sql = `SELECT COUNT(DISTINCT ${sqlQuote(dbType, photoEventId)})::bigint as events_with_photos FROM ${sqlQuote(
          dbType,
          mapping.photos.name
        )} WHERE ${sqlQuote(dbType, photoEventId)} IS NOT NULL`;
        const totalEventsAll = await sqlCountCreated(dbType, client, mapping.events, mappingColumns.events?.createdAt, startUtc.toISO(), endUtc.toISO());
        if (dbType === "mysql") {
          const [rows] = await client.execute(sql.replace("::bigint", ""));
          const count = Number(rows[0]?.events_with_photos || 0);
          recordKpi(
            "proportion_events_with_photos",
            totalEventsAll ? count / totalEventsAll : null,
            "ratio",
            totalEventsAll ? "" : "Missing events count."
          );
        } else {
          const result = await client.query(sql);
          const count = Number(result.rows[0]?.events_with_photos || 0);
          recordKpi(
            "proportion_events_with_photos",
            totalEventsAll ? count / totalEventsAll : null,
            "ratio",
            totalEventsAll ? "" : "Missing events count."
          );
        }
      } else {
        recordKpi("proportion_events_with_photos", null, "ratio", "Missing photo event_id column.");
      }
    } else {
      recordKpi("proportion_events_with_photos", null, "ratio", "Missing events or photos table.");
    }

    if (mapping.elements && mappingColumns.elements?.id && mapping.participants) {
      const participantElementId = pickColumn(mapping.participants.columns.map((col) => col.name), ["element_id", "elementid"]);
      if (participantElementId) {
        const sql = `SELECT COUNT(DISTINCT ${sqlQuote(dbType, participantElementId)})::bigint as elements_with_people FROM ${sqlQuote(
          dbType,
          mapping.participants.name
        )} WHERE ${sqlQuote(dbType, participantElementId)} IS NOT NULL`;
        const totalElementsAll = await sqlCountCreated(dbType, client, mapping.elements, mappingColumns.elements?.createdAt, startUtc.toISO(), endUtc.toISO());
        if (dbType === "mysql") {
          const [rows] = await client.execute(sql.replace("::bigint", ""));
          const count = Number(rows[0]?.elements_with_people || 0);
          recordKpi(
            "proportion_elements_with_people",
            totalElementsAll ? count / totalElementsAll : null,
            "ratio",
            totalElementsAll ? "" : "Missing elements count."
          );
        } else {
          const result = await client.query(sql);
          const count = Number(result.rows[0]?.elements_with_people || 0);
          recordKpi(
            "proportion_elements_with_people",
            totalElementsAll ? count / totalElementsAll : null,
            "ratio",
            totalElementsAll ? "" : "Missing elements count."
          );
        }
      } else {
        recordKpi("proportion_elements_with_people", null, "ratio", "Missing participant element_id column.");
      }
    } else {
      recordKpi("proportion_elements_with_people", null, "ratio", "Missing elements or participants table.");
    }

    if (mapping.elements && mappingColumns.elements?.id && mapping.events) {
      const eventIdColumn = pickColumn(mapping.elements.columns.map((col) => col.name), ["event_id", "eventid"]);
      if (eventIdColumn) {
        const sql = `SELECT AVG(element_count)::numeric as avg_elements FROM (
          SELECT ${sqlQuote(dbType, eventIdColumn)} as event_id, COUNT(*)::bigint as element_count
          FROM ${sqlQuote(dbType, mapping.elements.name)}
          WHERE ${sqlQuote(dbType, eventIdColumn)} IS NOT NULL
          GROUP BY ${sqlQuote(dbType, eventIdColumn)}
        ) as counts`;
        if (dbType === "mysql") {
          const [rows] = await client.execute(sql.replace(/::numeric|::bigint/g, ""));
          recordKpi("avg_elements_per_event", rows[0]?.avg_elements || null, "count", "");
        } else {
          const result = await client.query(sql);
          recordKpi("avg_elements_per_event", result.rows[0]?.avg_elements || null, "count", "");
        }
      } else {
        recordKpi("avg_elements_per_event", null, "count", "Missing elements event_id column.");
      }
    } else {
      recordKpi("avg_elements_per_event", null, "count", "Missing elements or events table.");
    }

    const topCreators = await sqlTopCreators(dbType, client, activityTables, startUtc.toISO(), endUtc.toISO());
    recordKpi(
      "top_creators",
      topCreators ? JSON.stringify(topCreators) : null,
      "json",
      topCreators ? "Top 10 by total created records across main tables." : "Missing user_id columns in activity tables."
    );

    const eventsDaily = await sqlDailyCounts(dbType, client, mapping.events, mappingColumns.events?.createdAt, startUtc.toISO(), endUtc.toISO());
    if (eventsDaily) {
      for (const row of eventsDaily) {
        const day = formatDate(parseDayValue(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).events_created = Number(row.count);
        }
      }
    }

    const elementsDaily = await sqlDailyCounts(dbType, client, mapping.elements, mappingColumns.elements?.createdAt, startUtc.toISO(), endUtc.toISO());
    if (elementsDaily) {
      for (const row of elementsDaily) {
        const day = formatDate(parseDayValue(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).elements_created = Number(row.count);
        }
      }
    }

    const photosDaily = await sqlDailyCounts(dbType, client, mapping.photos, mappingColumns.photos?.createdAt, startUtc.toISO(), endUtc.toISO());
    if (photosDaily) {
      for (const row of photosDaily) {
        const day = formatDate(parseDayValue(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).photos_uploaded = Number(row.count);
        }
      }
    }

    const activeDaily = await sqlDailyActiveUsers(dbType, client, activityQueries, startUtc.toISO(), endUtc.toISO());
    if (activeDaily) {
      for (const row of activeDaily) {
        const day = formatDate(parseDayValue(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).active_users = Number(row.count);
        }
      }
    }

    const newUsersDaily = await sqlDailyCounts(dbType, client, mapping.users, mappingColumns.users?.createdAt, startUtc.toISO(), endUtc.toISO());
    if (newUsersDaily) {
      for (const row of newUsersDaily) {
        const day = formatDate(parseDayValue(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).new_users = Number(row.count);
        }
      }
    }

    if (dbType === "postgres") {
      await schema.client.end();
    } else {
      await schema.connection.end();
    }
  }

  if (schema.db.type === "mongo") {
    const database = schema.database;
    const collectionMap = new Map(schema.tables.map((table) => [table.name, database.collection(table.name)]));

    const resolveCollection = (table) => (table ? collectionMap.get(table.name) : null);

    const eventsCollection = resolveCollection(mapping.events);
    const elementsCollection = resolveCollection(mapping.elements);
    const usersCollection = resolveCollection(mapping.users);
    const photosCollection = resolveCollection(mapping.photos);

    const totalEvents = await mongoAggregateCounts(eventsCollection, mappingColumns.events?.createdAt, startUtc, endUtc);
    recordKpi(
      "total_events_created",
      totalEvents,
      "count",
      totalEvents === null ? "Missing events collection or createdAt field." : ""
    );

    const totalElements = await mongoAggregateCounts(elementsCollection, mappingColumns.elements?.createdAt, startUtc, endUtc);
    recordKpi(
      "total_elements_created",
      totalElements,
      "count",
      totalElements === null ? "Missing elements collection or createdAt field." : ""
    );

    const totalNewUsers = await mongoAggregateCounts(usersCollection, mappingColumns.users?.createdAt, startUtc, endUtc);
    recordKpi(
      "total_users_new",
      totalNewUsers,
      "count",
      totalNewUsers === null ? "Missing users collection or createdAt field." : ""
    );

    recordKpi("total_users_active", null, "count", "Active user calculation not implemented for MongoDB.");
    recordKpi("avg_people_per_element", null, "people", "Participants mapping not implemented for MongoDB.");
    recordKpi("median_people_per_element", null, "people", "Participants mapping not implemented for MongoDB.");
    recordKpi("top_10_elements_by_people", null, "json", "Participants mapping not implemented for MongoDB.");

    const totalPhotos = await mongoAggregateCounts(photosCollection, mappingColumns.photos?.createdAt, startUtc, endUtc);
    recordKpi(
      "total_photos_uploaded",
      totalPhotos,
      "count",
      totalPhotos === null ? "Missing photos collection or createdAt field." : ""
    );

    recordKpi("total_photo_storage_bytes", null, "bytes", "Photo size aggregation not implemented for MongoDB.");
    recordKpi("avg_photo_size_bytes", null, "bytes", "Photo size aggregation not implemented for MongoDB.");
    recordKpi("top_10_biggest_photos", null, "json", "Photo size aggregation not implemented for MongoDB.");

    recordKpi("avg_chest_weight", null, "kg", "Chest weight aggregation not implemented for MongoDB.");
    recordKpi("median_chest_weight", null, "kg", "Chest weight aggregation not implemented for MongoDB.");
    recordKpi("min_chest_weight", null, "kg", "Chest weight aggregation not implemented for MongoDB.");
    recordKpi("max_chest_weight", null, "kg", "Chest weight aggregation not implemented for MongoDB.");
    recordKpi("distribution_chest_weight_buckets", null, "json", "Chest weight aggregation not implemented for MongoDB.");

    recordKpi("proportion_events_with_photos", null, "ratio", "Event-photo relation not implemented for MongoDB.");
    recordKpi("proportion_elements_with_people", null, "ratio", "Participants mapping not implemented for MongoDB.");
    recordKpi("avg_elements_per_event", null, "count", "Elements per event not implemented for MongoDB.");
    recordKpi("top_creators", null, "json", "Top creators not implemented for MongoDB.");

    const eventsDaily = await mongoDailyCounts(eventsCollection, mappingColumns.events?.createdAt, startUtc, endUtc);
    if (eventsDaily) {
      for (const row of eventsDaily) {
        const day = formatDate(DateTime.fromJSDate(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).events_created = Number(row.count);
        }
      }
    }

    const elementsDaily = await mongoDailyCounts(elementsCollection, mappingColumns.elements?.createdAt, startUtc, endUtc);
    if (elementsDaily) {
      for (const row of elementsDaily) {
        const day = formatDate(DateTime.fromJSDate(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).elements_created = Number(row.count);
        }
      }
    }

    const photosDaily = await mongoDailyCounts(photosCollection, mappingColumns.photos?.createdAt, startUtc, endUtc);
    if (photosDaily) {
      for (const row of photosDaily) {
        const day = formatDate(DateTime.fromJSDate(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).photos_uploaded = Number(row.count);
        }
      }
    }

    const newUsersDaily = await mongoDailyCounts(usersCollection, mappingColumns.users?.createdAt, startUtc, endUtc);
    if (newUsersDaily) {
      for (const row of newUsersDaily) {
        const day = formatDate(DateTime.fromJSDate(row.day).setZone("Europe/Paris"));
        if (timeseries.has(day)) {
          timeseries.get(day).new_users = Number(row.count);
        }
      }
    }

    await schema.client.close();
  }

  const analysisPath = path.join(OUTPUT_DIR, "analysis_table.csv");
  const dailyPath = path.join(OUTPUT_DIR, "daily_timeseries.csv");
  const reportPath = path.join(OUTPUT_DIR, "report.md");

  writeCsv(
    analysisPath,
    ["kpi_name", "value", "unit", "period_start", "period_end", "notes"],
    kpiResults
  );

  writeCsv(
    dailyPath,
    ["date", "events_created", "elements_created", "photos_uploaded", "active_users", "new_users"],
    Array.from(timeseries.values())
  );

  const missingKpis = kpiResults.filter((kpi) => kpi.value === "NOT_AVAILABLE");

  const reportLines = [
    "# Rapport d'activité Gather",
    "",
    "## Contexte",
    "Rapport généré automatiquement via le script d'analytics sur la base des tables/collections détectées.",
    "",
    "## Période",
    `Du ${PERIOD.start.toFormat("yyyy-LL-dd HH:mm:ss ZZZZ")} au ${PERIOD.end.toFormat("yyyy-LL-dd HH:mm:ss ZZZZ")} (Europe/Paris).`,
    "",
    "## Méthodologie",
    "- Détection automatique du type de base et introspection du schéma.",
    "- Mapping heuristique des entités (events, elements, users, photos, chests).",
    "- Agrégations SQL/Mongo côté base pour limiter le volume transféré.",
    "",
    "### Mapping détecté",
    ...Object.entries(mapping).map(([key, value]) => `- ${key}: ${value?.name || "NOT_FOUND"}`),
    "",
    "## KPI principaux",
    ...kpiResults.map((kpi) => `- **${kpi.kpi_name}**: ${kpi.value}${kpi.unit ? ` (${kpi.unit})` : ""} ${kpi.notes ? `— ${kpi.notes}` : ""}`),
    "",
    "## Interprétation (volume / charge / adoption)",
    "- Le volume d'activité est résumé dans les comptes totaux et la série temporelle quotidienne.",
    "- Les KPI de participants et médias indiquent l'intensité d'usage par élément.",
    "- Le poids des coffres sert d'indicateur de charge logistique potentielle.",
    "",
    "## Limites & champs manquants",
    missingKpis.length
      ? missingKpis.map((kpi) => `- ${kpi.kpi_name}: ${kpi.notes || "Non calculable"}`).join("\n")
      : "- Aucun champ manquant détecté.",
    "",
    "## Supabase / RLS / schéma",
    "- Aucune migration n'a été exécutée. Si des champs sont manquants pour certains KPI, prévoir une évolution du schéma (ex: created_at standardisé, relations event_id/element_id).",
    "- Vérifier les policies RLS pour autoriser les agrégations nécessaires côté service role si besoin.",
    "",
    "## Fichiers générés",
    `- ${analysisPath}`,
    `- ${dailyPath}`,
    `- ${reportPath}`,
  ];

  fs.writeFileSync(reportPath, reportLines.join("\n"), "utf8");

  console.log("\n[analytics] KPI summary:");
  for (const kpi of kpiResults) {
    if (["total_events_created", "total_elements_created", "total_users_active", "total_users_new", "total_photos_uploaded"].includes(kpi.kpi_name)) {
      console.log(`- ${kpi.kpi_name}: ${kpi.value}`);
    }
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
