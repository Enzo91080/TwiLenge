// =============================================================
// BASE DE DONNEES MONGODB — MULTI-TENANT
// =============================================================
// Chaque streamer est identifie par son twitchLogin (streamerId).
// Toutes les collections challenges/sessions/settings sont
// isolees par streamerId.
// =============================================================

import { MongoClient, Db } from 'mongodb'
import { randomBytes } from 'crypto'
import { config } from '../config.js'
import type { Challenge, Session, SessionChallenge } from '@challenge-hub/shared'

interface ChallengeDoc {
  _id: number
  streamerId: string
  title: string; description: string; category: string; difficulty: string
  timerSeconds: number | null; sortOrder: number; createdAt: string
}
interface SessionDoc {
  _id: number
  streamerId: string
  startedAt: string; endedAt: string | null; notes: string
}
interface SessionChallengeDoc {
  _id: number
  streamerId: string
  sessionId: number; challengeId: number; status: string
  activatedAt: string | null; completedAt: string | null
}
interface SettingDoc { _id: string; value: string }   // _id = "streamerId:key"
interface CounterDoc { _id: string; seq: number }     // _id = "name" (global) ou "name:streamerId"
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
  await challenges().createIndex({ streamerId: 1, sortOrder: 1 })
  await sessions().createIndex({ streamerId: 1 })
  await sessionChallenges().createIndex({ streamerId: 1, sessionId: 1 })
  // TTL index : supprime automatiquement les sessions auth expirees
  await db.collection<AuthSessionDoc>('authSessions').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  )
}

// =============================================================
// AUTO-INCREMENT (IDs numeriques par streamer)
// =============================================================

function counters() { return db.collection<CounterDoc>('counters') }
function challenges() { return db.collection<ChallengeDoc>('challenges') }
function sessions() { return db.collection<SessionDoc>('sessions') }
function sessionChallenges() { return db.collection<SessionChallengeDoc>('sessionChallenges') }
function settings() { return db.collection<SettingDoc>('settings') }

// IDs globaux : uniques sur toute la collection, peu importe le streamer
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

// Pipeline d'aggregation : joint les defis en filtrant par streamerId
function makeSessionChallengesPipeline(streamerId: string) {
  return [
    {
      $lookup: {
        from: 'challenges',
        let: { cid: '$challengeId', sid: streamerId },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$_id', '$$cid'] }, { $eq: ['$streamerId', '$$sid'] }] } } },
        ],
        as: 'challengeData',
      },
    },
    { $unwind: '$challengeData' },
  ]
}

// =============================================================
// REQUETES CHALLENGES
// =============================================================

export async function getAllChallenges(streamerId: string): Promise<Challenge[]> {
  const docs = await challenges().find({ streamerId }).sort({ sortOrder: 1, _id: 1 }).toArray()
  return docs.map(docToChallenge)
}

export async function getChallengeById(streamerId: string, id: number): Promise<Challenge | null> {
  const doc = await challenges().findOne({ _id: id, streamerId })
  return doc ? docToChallenge(doc) : null
}

export async function createChallenge(streamerId: string, data: Omit<Challenge, 'id' | 'createdAt'>): Promise<Challenge> {
  const id = await getNextId('challenges')
  const doc: ChallengeDoc = {
    _id: id,
    streamerId,
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

export async function updateChallenge(streamerId: string, id: number, data: Partial<Omit<Challenge, 'id' | 'createdAt'>>): Promise<Challenge | null> {
  const current = await getChallengeById(streamerId, id)
  if (!current) return null

  const update: Partial<ChallengeDoc> = {}
  if (data.title !== undefined) update.title = data.title
  if (data.description !== undefined) update.description = data.description
  if (data.category !== undefined) update.category = data.category
  if (data.difficulty !== undefined) update.difficulty = data.difficulty
  if (data.timerSeconds !== undefined) update.timerSeconds = data.timerSeconds
  if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder

  await challenges().updateOne({ _id: id, streamerId }, { $set: update })
  return getChallengeById(streamerId, id)
}

export async function deleteChallenge(streamerId: string, id: number): Promise<boolean> {
  const result = await challenges().deleteOne({ _id: id, streamerId })
  return result.deletedCount > 0
}

export async function reorderChallenges(streamerId: string, orderedIds: number[]): Promise<void> {
  if (orderedIds.length === 0) return
  const ops = orderedIds.map((id, index) => ({
    updateOne: { filter: { _id: id, streamerId }, update: { $set: { sortOrder: index } } },
  }))
  await challenges().bulkWrite(ops)
}

export async function resetToDefaultChallenges(streamerId: string): Promise<void> {
  await challenges().deleteMany({ streamerId })
  await seedDefaultChallenges(streamerId)
}

// =============================================================
// REQUETES SESSIONS
// =============================================================

export async function getActiveSession(streamerId: string): Promise<Session | null> {
  const doc = await sessions().findOne({ streamerId, endedAt: null }, { sort: { _id: -1 } })
  return doc ? docToSession(doc) : null
}

export async function getSessionById(streamerId: string, id: number): Promise<Session | null> {
  const doc = await sessions().findOne({ _id: id, streamerId })
  return doc ? docToSession(doc) : null
}

export async function getAllSessions(streamerId: string): Promise<Session[]> {
  const docs = await sessions().find({ streamerId }).sort({ _id: -1 }).toArray()
  return docs.map(docToSession)
}

export async function createSession(streamerId: string): Promise<Session> {
  const id = await getNextId('sessions')
  const doc: SessionDoc = {
    _id: id,
    streamerId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    notes: '',
  }
  await sessions().insertOne(doc)
  return docToSession(doc)
}

export async function endSession(streamerId: string, id: number): Promise<Session | null> {
  await sessions().updateOne({ _id: id, streamerId }, { $set: { endedAt: new Date().toISOString() } })
  return getSessionById(streamerId, id)
}

// =============================================================
// REQUETES SESSION CHALLENGES
// =============================================================

export async function getSessionChallengeById(streamerId: string, id: number): Promise<SessionChallenge | null> {
  const docs = await sessionChallenges().aggregate([
    { $match: { _id: id, streamerId } },
    ...makeSessionChallengesPipeline(streamerId),
  ]).toArray()
  return docs[0] ? docToSessionChallenge(docs[0]) : null
}

export async function getSessionChallenges(streamerId: string, sessionId: number): Promise<SessionChallenge[]> {
  const docs = await sessionChallenges().aggregate([
    { $match: { sessionId, streamerId } },
    { $sort: { _id: 1 } },
    ...makeSessionChallengesPipeline(streamerId),
  ]).toArray()
  return docs.map(docToSessionChallenge)
}

export async function addChallengeToSession(streamerId: string, sessionId: number, challengeId: number): Promise<SessionChallenge> {
  const id = await getNextId('sessionChallenges')
  const doc: SessionChallengeDoc = {
    _id: id,
    streamerId,
    sessionId,
    challengeId,
    status: 'pending',
    activatedAt: null,
    completedAt: null,
  }
  await sessionChallenges().insertOne(doc)
  return (await getSessionChallengeById(streamerId, id))!
}

export async function updateSessionChallengeStatus(
  streamerId: string,
  id: number,
  status: 'active' | 'completed' | 'failed' | 'skipped',
): Promise<SessionChallenge | null> {
  if (status === 'active') {
    await sessionChallenges().updateOne(
      { _id: id, streamerId },
      { $set: { status: 'active', activatedAt: new Date().toISOString() } },
    )
  } else {
    await sessionChallenges().updateOne(
      { _id: id, streamerId },
      { $set: { status, completedAt: new Date().toISOString() } },
    )
  }
  return getSessionChallengeById(streamerId, id)
}

// =============================================================
// REQUETES SETTINGS (cle = "streamerId:key")
// =============================================================

export async function getSetting(streamerId: string, key: string): Promise<string | null> {
  const doc = await settings().findOne({ _id: `${streamerId}:${key}` })
  return doc?.value ?? null
}

export async function setSetting(streamerId: string, key: string, value: string): Promise<void> {
  await settings().updateOne({ _id: `${streamerId}:${key}` }, { $set: { value } }, { upsert: true })
}

export async function getAllSettings(streamerId: string): Promise<Record<string, string>> {
  const prefix = `${streamerId}:`
  const docs = await settings().find({ _id: { $regex: `^${prefix}` } }).toArray()
  return Object.fromEntries(docs.map((d) => [d._id.slice(prefix.length), d.value]))
}

// =============================================================
// SESSIONS D'AUTHENTIFICATION DASHBOARD
// =============================================================

export async function createAuthSession(login: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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

export async function getActiveAuthSessions(): Promise<{ login: string }[]> {
  const docs = await db.collection<AuthSessionDoc>('authSessions').find({
    expiresAt: { $gt: new Date() },
  }).toArray()
  return docs.map((d) => ({ login: d.login }))
}

// =============================================================
// SEED PAR DEFAUT (par streamer, au premier login)
// =============================================================

export async function seedStreamerDefaults(streamerId: string): Promise<void> {
  await seedDefaultSettings(streamerId)

  const count = await challenges().countDocuments({ streamerId })
  if (count === 0) {
    await seedDefaultChallenges(streamerId)
  }
}

async function seedDefaultSettings(streamerId: string): Promise<void> {
  const defaults: [string, string][] = [
    ['bot_prefix', '!'],
    ['bot_enabled', 'false'],
    ['channel_points_enabled', 'false'],
    ['channel_points_reward_name', 'Defi aleatoire'],
    ['ws_token', randomBytes(32).toString('hex')],
    ['bot_cmd_defi', 'true'],
    ['bot_cmd_score', 'true'],
    ['bot_cmd_prochains', 'true'],
    ['bot_cmd_vote', 'true'],
    ['bot_cmd_ok', 'true'],
    ['bot_cmd_fail', 'true'],
    ['bot_cmd_skip', 'true'],
  ]
  for (const [key, value] of defaults) {
    await settings().updateOne(
      { _id: `${streamerId}:${key}` },
      { $setOnInsert: { value } },
      { upsert: true },
    )
  }
}

async function seedDefaultChallenges(streamerId: string): Promise<void> {
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
    await createChallenge(streamerId, data)
  }
}
