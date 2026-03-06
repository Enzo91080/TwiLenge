// =============================================================
// BASE DE DONNEES SQLITE
// =============================================================
// Utilise node:sqlite (integre dans Node.js 22+, zero installation).
// Les tables sont creees automatiquement au premier demarrage.
// Le fichier DB est cree dans server/data/challenge-hub.db
// =============================================================

import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'
import { config } from '../config.js'
import type { Challenge, Session, SessionChallenge } from '@challenge-hub/shared'

// S'assurer que le dossier data existe
const dataDir = path.dirname(config.DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

export const db = new DatabaseSync(config.DB_PATH)

// WAL mode = meilleures performances pour les lectures/ecritures concurrentes
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

// =============================================================
// CREATION DES TABLES
// =============================================================

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS challenges (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      description   TEXT    DEFAULT '',
      category      TEXT    DEFAULT 'custom',
      difficulty    TEXT    DEFAULT 'medium',
      points        INTEGER DEFAULT 100,
      timer_seconds INTEGER,
      sort_order    INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at   TEXT    DEFAULT CURRENT_TIMESTAMP,
      ended_at     TEXT,
      total_points INTEGER DEFAULT 0,
      notes        TEXT    DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS session_challenges (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    INTEGER NOT NULL REFERENCES sessions(id),
      challenge_id  INTEGER NOT NULL REFERENCES challenges(id),
      status        TEXT    DEFAULT 'pending',
      points_earned INTEGER DEFAULT 0,
      activated_at  TEXT,
      completed_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  const row = db.prepare('SELECT COUNT(*) as n FROM challenges').get() as { n: number }
  if (row.n === 0) {
    seedDefaultChallenges()
  }
}

// =============================================================
// DEFIS PAR DEFAUT
// =============================================================

function seedDefaultChallenges() {
  const insert = db.prepare(`
    INSERT INTO challenges (title, description, category, difficulty, points, timer_seconds, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const defaults: [string, string, string, string, number, number | null, number][] = [
    ['Victoire Royale', 'Gagner une partie', 'placement', 'hard', 500, null, 0],
    ['Top 3 sans tirer', 'Finir dans le top 3 sans avoir tire un seul coup de feu', 'placement', 'hard', 400, null, 1],
    ['Sniper only', 'Utiliser uniquement des snipers toute la partie', 'loadout', 'hard', 350, null, 2],
    ['Triple elim', 'Faire 3 eliminations dans la meme partie', 'elimination', 'medium', 200, null, 3],
    ['Elim longue distance', 'Eliminer un ennemi a plus de 100m', 'elimination', 'medium', 250, null, 4],
    ['Outils de base seulement', 'Jouer avec uniquement des armes grises (common)', 'loadout', 'hard', 300, null, 5],
    ['Farmer 500/500/500', 'Obtenir 500 bois, 500 pierres et 500 metal', 'custom', 'easy', 100, 600, 6],
    ['Zone seulement', 'Ne jamais sortir de la zone safe durant toute la partie', 'chaos', 'hard', 400, null, 7],
    ['Top 10 sans construire', 'Finir dans le top 10 sans avoir construit une seule structure', 'placement', 'medium', 250, null, 8],
    ['Coffre mythique', 'Trouver et utiliser un coffre ou une arme mythique', 'custom', 'easy', 150, null, 9],
  ]

  for (const args of defaults) {
    insert.run(...args)
  }
}

// =============================================================
// REQUETES CHALLENGES
// =============================================================

export function getAllChallenges(): Challenge[] {
  return db.prepare(`
    SELECT id, title, description, category, difficulty, points,
           timer_seconds as timerSeconds, sort_order as sortOrder, created_at as createdAt
    FROM challenges ORDER BY sort_order ASC, id ASC
  `).all() as unknown as Challenge[]
}

export function getChallengeById(id: number): Challenge | null {
  return db.prepare(`
    SELECT id, title, description, category, difficulty, points,
           timer_seconds as timerSeconds, sort_order as sortOrder, created_at as createdAt
    FROM challenges WHERE id = ?
  `).get(id) as unknown as Challenge | null
}

export function createChallenge(data: Omit<Challenge, 'id' | 'createdAt'>): Challenge {
  const result = db.prepare(`
    INSERT INTO challenges (title, description, category, difficulty, points, timer_seconds, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.title, data.description, data.category, data.difficulty, data.points, data.timerSeconds, data.sortOrder)

  return getChallengeById(Number(result.lastInsertRowid))!
}

export function updateChallenge(id: number, data: Partial<Omit<Challenge, 'id' | 'createdAt'>>): Challenge | null {
  const current = getChallengeById(id)
  if (!current) return null

  db.prepare(`
    UPDATE challenges
    SET title = ?, description = ?, category = ?, difficulty = ?,
        points = ?, timer_seconds = ?, sort_order = ?
    WHERE id = ?
  `).run(
    data.title ?? current.title,
    data.description ?? current.description,
    data.category ?? current.category,
    data.difficulty ?? current.difficulty,
    data.points ?? current.points,
    data.timerSeconds !== undefined ? data.timerSeconds : current.timerSeconds,
    data.sortOrder ?? current.sortOrder,
    id,
  )

  return getChallengeById(id)!
}

export function deleteChallenge(id: number): boolean {
  const result = db.prepare('DELETE FROM challenges WHERE id = ?').run(id)
  return result.changes > 0
}

export function reorderChallenges(orderedIds: number[]) {
  const update = db.prepare('UPDATE challenges SET sort_order = ? WHERE id = ?')
  db.exec('BEGIN')
  try {
    orderedIds.forEach((id, index) => update.run(index, id))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

export function resetToDefaultChallenges() {
  db.prepare('DELETE FROM challenges').run()
  seedDefaultChallenges()
}

// =============================================================
// REQUETES SESSIONS
// =============================================================

export function getActiveSession(): Session | null {
  return db.prepare(`
    SELECT id, started_at as startedAt, ended_at as endedAt,
           total_points as totalPoints, notes
    FROM sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1
  `).get() as unknown as Session | null
}

export function getSessionById(id: number): Session | null {
  return db.prepare(`
    SELECT id, started_at as startedAt, ended_at as endedAt,
           total_points as totalPoints, notes
    FROM sessions WHERE id = ?
  `).get(id) as unknown as Session | null
}

export function getAllSessions(): Session[] {
  return db.prepare(`
    SELECT id, started_at as startedAt, ended_at as endedAt,
           total_points as totalPoints, notes
    FROM sessions ORDER BY id DESC
  `).all() as unknown as Session[]
}

export function createSession(): Session {
  const result = db.prepare('INSERT INTO sessions DEFAULT VALUES').run()
  return getSessionById(Number(result.lastInsertRowid))!
}

export function endSession(id: number): Session | null {
  db.prepare(`UPDATE sessions SET ended_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id)
  return getSessionById(id)
}

export function updateSessionPoints(id: number, points: number) {
  db.prepare('UPDATE sessions SET total_points = ? WHERE id = ?').run(points, id)
}

// =============================================================
// REQUETES SESSION CHALLENGES
// =============================================================

function rowToSessionChallenge(row: any): SessionChallenge {
  return {
    id: row.id,
    sessionId: row.session_id,
    challengeId: row.challenge_id,
    status: row.status,
    pointsEarned: row.points_earned,
    activatedAt: row.activated_at,
    completedAt: row.completed_at,
    challenge: {
      id: row.challenge_id,
      title: row.title,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      points: row.points,
      timerSeconds: row.timer_seconds,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
    },
  }
}

export function getSessionChallenges(sessionId: number): SessionChallenge[] {
  const rows = db.prepare(`
    SELECT sc.*, c.title, c.description, c.category, c.difficulty,
           c.points, c.timer_seconds, c.sort_order, c.created_at
    FROM session_challenges sc
    JOIN challenges c ON c.id = sc.challenge_id
    WHERE sc.session_id = ?
    ORDER BY sc.id ASC
  `).all(sessionId)

  return rows.map(rowToSessionChallenge)
}

export function getSessionChallengeById(id: number): SessionChallenge | null {
  const row = db.prepare(`
    SELECT sc.*, c.title, c.description, c.category, c.difficulty,
           c.points, c.timer_seconds, c.sort_order, c.created_at
    FROM session_challenges sc
    JOIN challenges c ON c.id = sc.challenge_id
    WHERE sc.id = ?
  `).get(id)

  return row ? rowToSessionChallenge(row) : null
}

export function addChallengeToSession(sessionId: number, challengeId: number): SessionChallenge {
  const result = db.prepare(`
    INSERT INTO session_challenges (session_id, challenge_id) VALUES (?, ?)
  `).run(sessionId, challengeId)

  return getSessionChallengeById(Number(result.lastInsertRowid))!
}

export function updateSessionChallengeStatus(
  id: number,
  status: 'active' | 'completed' | 'failed' | 'skipped',
  pointsEarned = 0,
): SessionChallenge | null {
  if (status === 'active') {
    db.prepare(`
      UPDATE session_challenges
      SET status = 'active', activated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id)
  } else {
    db.prepare(`
      UPDATE session_challenges
      SET status = ?, points_earned = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, pointsEarned, id)
  }

  return getSessionChallengeById(id)
}

// =============================================================
// REQUETES SETTINGS
// =============================================================

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}
