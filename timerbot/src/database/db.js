'use strict';

/**
 * Database module using sql.js (pure WebAssembly SQLite — no native build required).
 * Persists to disk by writing the database file after every mutating operation.
 */

const path = require('path');
const fs   = require('fs');
require('dotenv').config();

const DB_PATH    = process.env.DB_PATH || './data/timers.db';
const resolvedPath = path.resolve(DB_PATH);
const dataDir      = path.dirname(resolvedPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;     // sql.js Database instance
let SQL;    // sql.js module

// ─── Init ─────────────────────────────────────────────────────────────────────

async function initDb() {
  if (db) return db;

  // sql.js is an ES module when imported via require — use dynamic import
  const sqljs = await import('sql.js');
  SQL = await sqljs.default();

  if (fs.existsSync(resolvedPath)) {
    const fileBuffer = fs.readFileSync(resolvedPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createSchema();
  persist();
  return db;
}

/** Write current DB state to disk. Call after every mutating statement. */
function persist() {
  const data = db.export();
  fs.writeFileSync(resolvedPath, Buffer.from(data));
}

/** Run CREATE TABLE IF NOT EXISTS statements and apply safe migrations. */
function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS guild_configs (
      guild_id         TEXT PRIMARY KEY,
      voice_channel_id TEXT,
      text_channel_id  TEXT,
      log_channel_id   TEXT,
      admin_role_id    TEXT,
      timezone         TEXT NOT NULL DEFAULT 'UTC',
      created_at       INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at       INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS timers (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id         TEXT NOT NULL,
      voice_channel_id TEXT NOT NULL,
      text_channel_id  TEXT NOT NULL,
      label            TEXT NOT NULL,
      start_time       TEXT NOT NULL,
      end_time         TEXT NOT NULL,
      date             TEXT NOT NULL,
      timezone         TEXT NOT NULL DEFAULT 'UTC',
      is_active        INTEGER NOT NULL DEFAULT 1,
      is_daily         INTEGER NOT NULL DEFAULT 0,
      start_fired      INTEGER NOT NULL DEFAULT 0,
      end_fired        INTEGER NOT NULL DEFAULT 0,
      created_by       TEXT NOT NULL,
      created_at       INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS action_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id   TEXT NOT NULL,
      action     TEXT NOT NULL,
      channel_id TEXT,
      user_id    TEXT,
      details    TEXT,
      timestamp  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Safe migrations: add new columns to existing databases
  try { db.run('ALTER TABLE timers ADD COLUMN is_daily INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE guild_configs ADD COLUMN mention_role_id TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE timers ADD COLUMN mention_role_id TEXT'); } catch (_) {}
}

// ─── Helper: exec a statement and return the rows as plain objects ──────────

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return query(sql, params)[0] ?? null;
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

// ─── Guild Config ─────────────────────────────────────────────────────────────

function getConfig(guildId) {
  return queryOne('SELECT * FROM guild_configs WHERE guild_id = ?', [guildId]);
}

function upsertConfig(guildId, fields) {
  const existing = getConfig(guildId);
  if (existing) {
    const setClauses = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
    run(
      `UPDATE guild_configs SET ${setClauses}, updated_at = strftime('%s','now') WHERE guild_id = ?`,
      [...Object.values(fields), guildId]
    );
  } else {
    const keys = ['guild_id', ...Object.keys(fields)];
    const placeholders = keys.map(() => '?').join(', ');
    run(
      `INSERT INTO guild_configs (${keys.join(', ')}) VALUES (${placeholders})`,
      [guildId, ...Object.values(fields)]
    );
  }
  return getConfig(guildId);
}

// ─── Timers ───────────────────────────────────────────────────────────────────

function getAllTimers(guildId) {
  return query(
    'SELECT * FROM timers WHERE guild_id = ? AND is_active = 1 ORDER BY date ASC, start_time ASC',
    [guildId]
  );
}

function getAllActiveTimers() {
  return query('SELECT * FROM timers WHERE is_active = 1');
}

function getTimerById(id) {
  return queryOne('SELECT * FROM timers WHERE id = ?', [id]);
}

function insertTimer(data) {
  run(
    `INSERT INTO timers
      (guild_id, voice_channel_id, text_channel_id, label, start_time, end_time, date, timezone, is_daily, mention_role_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.guild_id, data.voice_channel_id, data.text_channel_id,
      data.label, data.start_time, data.end_time,
      data.date, data.timezone, data.is_daily ?? 0,
      data.mention_role_id ?? null, data.created_by,
    ]
  );
  const row = queryOne('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: row?.id };
}

/**
 * For daily timers: roll the date forward to today and reset fired flags.
 * Called by the scheduler at the start of each new day.
 */
function resetDailyTimer(id, newDate) {
  run('UPDATE timers SET date = ?, start_fired = 0, end_fired = 0 WHERE id = ?', [newDate, id]);
}

function deleteTimer(id, guildId) {
  run('UPDATE timers SET is_active = 0 WHERE id = ? AND guild_id = ?', [id, guildId]);
}

function markStartFired(id) {
  run('UPDATE timers SET start_fired = 1 WHERE id = ?', [id]);
}

function markEndFired(id) {
  run('UPDATE timers SET end_fired = 1 WHERE id = ?', [id]);
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

function insertLog(data) {
  run(
    'INSERT INTO action_logs (guild_id, action, channel_id, user_id, details) VALUES (?, ?, ?, ?, ?)',
    [data.guild_id, data.action, data.channel_id ?? null, data.user_id ?? null, data.details ?? null]
  );
}

function getRecentLogs(guildId, limit = 20) {
  return query(
    'SELECT * FROM action_logs WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?',
    [guildId, limit]
  );
}

module.exports = {
  initDb,
  getConfig,
  upsertConfig,
  getAllTimers,
  getAllActiveTimers,
  getTimerById,
  insertTimer,
  resetDailyTimer,
  deleteTimer,
  markStartFired,
  markEndFired,
  insertLog,
  getRecentLogs,
};
