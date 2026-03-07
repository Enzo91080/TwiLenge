// =============================================================
// BASE DE DONNEES MONGODB
// =============================================================
// Utilise le driver officiel MongoDB.
// URL de connexion : MONGODB_URI dans .env (defaut: localhost)
// Collections : challenges, sessions, sessionChallenges, settings, counters
// =============================================================

import { MongoClient, Db } from 'mongodb'
import { randomBytes } from 'crypto'
import { config } from '../config.js'
import type { Challenge, Session, SessionChallenge } from '@challenge-hub/shared'

// Types des documents MongoDB (avec _id numerique ou string)
interface ChallengeDoc {
  _id: number
  title: string; description: string; category: string; difficulty: string
  timerSeconds: number | null; sortOrder: number; createdAt: string
}
interface SessionDoc {
  _id: number; startedAt: string; endedAt: string | null; notes: string
}
interface SessionChallengeDoc {
  _id: number; sessionId: number; challengeId: number; status: string
  activatedAt: string | null; completedAt: string | null
}
interface SettingDoc { _id: string; value: string }
interface CounterDoc { _id: string; seq: number }
interface AuthSessionDoc { _id: string; login: string; expiresAt: Date }

let client: MongoClient
let db: Db

// =============================================================
// CONNEXION
// =============================================================

export async function initDB(): Promise<void> {
  client = new MongoClient(config.MONGODB_URI)
  await client.connect()
  db = client.db()
  console.log('[DB] Connecte a MongoDB.')

  // Index de performance
  await challenges().createIndex({ sortOrder: 1 })
  await sessionChallenges().createIndex({ sessionId: 1 })
  // TTL index : supprime automatiquement les sessions expirees
  await db.collection<AuthSessionDoc>('authSessions').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  )

  // Seed des parametres par defaut + credentials Twitch depuis .env (seulement si absent)
  await seedDefaultSettings()

  // Seed des defis par defaut si la collection est vide
  const count = await challenges().countDocuments()
  if (count === 0) {
    await seedDefaultChallenges()
  }
}

// =============================================================
// AUTO-INCREMENT (IDs numeriques comme avec SQLite)
// =============================================================

function counters() { return db.collection<CounterDoc>('counters') }
function challenges() { return db.collection<ChallengeDoc>('challenges') }
function sessions() { return db.collection<SessionDoc>('sessions') }
function sessionChallenges() { return db.collection<SessionChallengeDoc>('sessionChallenges') }
function settings() { return db.collection<SettingDoc>('settings') }

async function getNextId(name: string): Promise<number> {
  const result = await counters().findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  return result!.seq
}

// =============================================================
// CONVERSIONS DOCUMENT -> TYPE PARTAGE
// =============================================================

function docToChallenge(doc: any): Challenge {
  return {
    id: doc._id,
    title: doc.title,
    description: doc.description ?? '',
    category: doc.category,
    difficulty: doc.difficulty,
    timerSeconds: doc.timerSeconds ?? null,
    sortOrder: doc.sortOrder ?? 0,
    createdAt: doc.createdAt,
  }
}

function docToSession(doc: any): Session {
  return {
    id: doc._id,
    startedAt: doc.startedAt,
    endedAt: doc.endedAt ?? null,
    notes: doc.notes ?? '',
  }
}

function docToSessionChallenge(scDoc: any): SessionChallenge {
  return {
    id: scDoc._id,
    sessionId: scDoc.sessionId,
    challengeId: scDoc.challengeId,
    status: scDoc.status,
    activatedAt: scDoc.activatedAt ?? null,
    completedAt: scDoc.completedAt ?? null,
    challenge: docToChallenge(scDoc.challengeData),
  }
}

// Pipeline d'aggregation commun pour joindre les defis
const sessionChallengesPipeline = [
  { $lookup: { from: 'challenges', localField: 'challengeId', foreignField: '_id', as: 'challengeData' } },
  { $unwind: '$challengeData' },
]

// =============================================================
// REQUETES CHALLENGES
// =============================================================

export async function getAllChallenges(): Promise<Challenge[]> {
  const docs = await challenges().find().sort({ sortOrder: 1, _id: 1 }).toArray()
  return docs.map(docToChallenge)
}

export async function getChallengeById(id: number): Promise<Challenge | null> {
  const doc = await challenges().findOne({ _id: id })
  return doc ? docToChallenge(doc) : null
}

export async function createChallenge(data: Omit<Challenge, 'id' | 'createdAt'>): Promise<Challenge> {
  const id = await getNextId('challenges')
  const doc: ChallengeDoc = {
    _id: id,
    title: data.title,
    description: data.description ?? '',
    category: data.category,
    difficulty: data.difficulty,
    timerSeconds: data.timerSeconds ?? null,
    sortOrder: data.sortOrder ?? 0,
    createdAt: new Date().toISOString(),
  }
  await challenges().insertOne(doc)
  return docToChallenge(doc)
}

export async function updateChallenge(id: number, data: Partial<Omit<Challenge, 'id' | 'createdAt'>>): Promise<Challenge | null> {
  const current = await getChallengeById(id)
  if (!current) return null

  const update: Partial<ChallengeDoc> = {}
  if (data.title !== undefined) update.title = data.title
  if (data.description !== undefined) update.description = data.description
  if (data.category !== undefined) update.category = data.category
  if (data.difficulty !== undefined) update.difficulty = data.difficulty
  if (data.timerSeconds !== undefined) update.timerSeconds = data.timerSeconds
  if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder

  await challenges().updateOne({ _id: id }, { $set: update })
  return getChallengeById(id)
}

export async function deleteChallenge(id: number): Promise<boolean> {
  const result = await challenges().deleteOne({ _id: id })
  return result.deletedCount > 0
}

export async function reorderChallenges(orderedIds: number[]): Promise<void> {
  if (orderedIds.length === 0) return
  const ops = orderedIds.map((id, index) => ({
    updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
  }))
  await challenges().bulkWrite(ops)
}

export async function resetToDefaultChallenges(): Promise<void> {
  await challenges().deleteMany({})
  await counters().deleteOne({ _id: 'challenges' })
  await seedDefaultChallenges()
}

// =============================================================
// REQUETES SESSIONS
// =============================================================

export async function getActiveSession(): Promise<Session | null> {
  const doc = await sessions().findOne({ endedAt: null }, { sort: { _id: -1 } })
  return doc ? docToSession(doc) : null
}

export async function getSessionById(id: number): Promise<Session | null> {
  const doc = await sessions().findOne({ _id: id })
  return doc ? docToSession(doc) : null
}

export async function getAllSessions(): Promise<Session[]> {
  const docs = await sessions().find().sort({ _id: -1 }).toArray()
  return docs.map(docToSession)
}

export async function createSession(): Promise<Session> {
  const id = await getNextId('sessions')
  const doc: SessionDoc = {
    _id: id,
    startedAt: new Date().toISOString(),
    endedAt: null,
    notes: '',
  }
  await sessions().insertOne(doc)
  return docToSession(doc)
}

export async function endSession(id: number): Promise<Session | null> {
  await sessions().updateOne({ _id: id }, { $set: { endedAt: new Date().toISOString() } })
  return getSessionById(id)
}

// =============================================================
// REQUETES SESSION CHALLENGES
// =============================================================

export async function getSessionChallengeById(id: number): Promise<SessionChallenge | null> {
  const docs = await sessionChallenges().aggregate([
    { $match: { _id: id } },
    ...sessionChallengesPipeline,
  ]).toArray()
  return docs[0] ? docToSessionChallenge(docs[0]) : null
}

export async function getSessionChallenges(sessionId: number): Promise<SessionChallenge[]> {
  const docs = await sessionChallenges().aggregate([
    { $match: { sessionId } },
    { $sort: { _id: 1 } },
    ...sessionChallengesPipeline,
  ]).toArray()
  return docs.map(docToSessionChallenge)
}

export async function addChallengeToSession(sessionId: number, challengeId: number): Promise<SessionChallenge> {
  const id = await getNextId('sessionChallenges')
  const doc: SessionChallengeDoc = {
    _id: id,
    sessionId,
    challengeId,
    status: 'pending',
    activatedAt: null,
    completedAt: null,
  }
  await sessionChallenges().insertOne(doc)
  return (await getSessionChallengeById(id))!
}

export async function updateSessionChallengeStatus(
  id: number,
  status: 'active' | 'completed' | 'failed' | 'skipped',
): Promise<SessionChallenge | null> {
  if (status === 'active') {
    await sessionChallenges().updateOne(
      { _id: id },
      { $set: { status: 'active', activatedAt: new Date().toISOString() } },
    )
  } else {
    await sessionChallenges().updateOne(
      { _id: id },
      { $set: { status, completedAt: new Date().toISOString() } },
    )
  }
  return getSessionChallengeById(id)
}

// =============================================================
// REQUETES SETTINGS
// =============================================================

export async function getSetting(key: string): Promise<string | null> {
  const doc = await settings().findOne({ _id: key })
  return doc?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await settings().updateOne({ _id: key }, { $set: { value } }, { upsert: true })
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const docs = await settings().find().toArray()
  return Object.fromEntries(docs.map((d) => [d._id, d.value]))
}

// Verifie si la config Twitch est complete (lue depuis la BDD)
// Verifie si les credentials Twitch (Client ID + Secret) sont presents
// Le channel est defini automatiquement au premier login OAuth, pas besoin de le verifier ici
export async function isTwitchConfigured(): Promise<boolean> {
  const clientId = await getSetting('twitch_client_id')
  const clientSecret = await getSetting('twitch_client_secret')
  return !!(clientId && clientSecret)
}

// =============================================================
// SESSIONS D'AUTHENTIFICATION DASHBOARD
// =============================================================

export async function createAuthSession(login: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
  await db.collection<AuthSessionDoc>('authSessions').insertOne({ _id: token, login, expiresAt })
  return token
}

export async function getAuthSession(token: string): Promise<{ login: string } | null> {
  const doc = await db.collection<AuthSessionDoc>('authSessions').findOne({
    _id: token,
    expiresAt: { $gt: new Date() },
  })
  return doc ? { login: doc.login } : null
}

export async function deleteAuthSession(token: string): Promise<void> {
  await db.collection<AuthSessionDoc>('authSessions').deleteOne({ _id: token })
}

// =============================================================
// SEED PAR DEFAUT
// =============================================================

async function seedDefaultSettings(): Promise<void> {
  // $setOnInsert : n'ecrase pas les valeurs existantes
  const defaults: [string, string][] = [
    ['bot_prefix', '!'],
    ['bot_enabled', 'false'],
    ['channel_points_enabled', 'false'],
    ['channel_points_reward_name', 'Defi aleatoire'],
  ]
  for (const [key, value] of defaults) {
    await settings().updateOne(
      { _id: key },
      { $setOnInsert: { value } },
      { upsert: true },
    )
  }
}

async function seedDefaultChallenges(): Promise<void> {
  const defaults: Omit<Challenge, 'id' | 'createdAt'>[] = [
    { title: 'Victoire Royale', description: 'Gagner une partie', category: 'placement', difficulty: 'hard', timerSeconds: null, sortOrder: 0 },
    { title: 'Top 3 sans tirer', description: 'Finir dans le top 3 sans avoir tire un seul coup de feu', category: 'placement', difficulty: 'hard', timerSeconds: null, sortOrder: 1 },
    { title: 'Sniper only', description: 'Utiliser uniquement des snipers toute la partie', category: 'loadout', difficulty: 'hard', timerSeconds: null, sortOrder: 2 },
    { title: 'Triple elim', description: 'Faire 3 eliminations dans la meme partie', category: 'elimination', difficulty: 'medium', timerSeconds: null, sortOrder: 3 },
    { title: 'Elim longue distance', description: 'Eliminer un ennemi a plus de 100m', category: 'elimination', difficulty: 'medium', timerSeconds: null, sortOrder: 4 },
    { title: 'Outils de base seulement', description: 'Jouer avec uniquement des armes grises (common)', category: 'loadout', difficulty: 'hard', timerSeconds: null, sortOrder: 5 },
    { title: 'Farmer 500/500/500', description: 'Obtenir 500 bois, 500 pierres et 500 metal', category: 'custom', difficulty: 'easy', timerSeconds: 600, sortOrder: 6 },
    { title: 'Zone seulement', description: 'Ne jamais sortir de la zone safe durant toute la partie', category: 'chaos', difficulty: 'hard', timerSeconds: null, sortOrder: 7 },
    { title: 'Top 10 sans construire', description: 'Finir dans le top 10 sans avoir construit une seule structure', category: 'placement', difficulty: 'medium', timerSeconds: null, sortOrder: 8 },
    { title: 'Coffre mythique', description: 'Trouver et utiliser un coffre ou une arme mythique', category: 'custom', difficulty: 'easy', timerSeconds: null, sortOrder: 9 },
  ]
  for (const data of defaults) {
    await createChallenge(data)
  }
}
