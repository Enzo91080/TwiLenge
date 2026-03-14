// Script de nettoyage DB — vide les collections de données et les compteurs.
// Les settings et sessions auth sont conservés (les streamers n'ont pas à se reconnecter).
// A exécuter une seule fois après la migration multi-tenant.

import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../../.env')

// Lire le MONGODB_URI depuis .env
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => l.split('=').map(s => s.trim()))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join('=')])
)

const uri = env.MONGODB_URI
if (!uri) { console.error('MONGODB_URI introuvable dans .env'); process.exit(1) }

const client = new MongoClient(uri)
await client.connect()
const db = client.db()

console.log('Nettoyage des collections...')

const r1 = await db.collection('challenges').deleteMany({})
console.log(`  challenges      : ${r1.deletedCount} supprimés`)

const r2 = await db.collection('sessions').deleteMany({})
console.log(`  sessions        : ${r2.deletedCount} supprimés`)

const r3 = await db.collection('sessionChallenges').deleteMany({})
console.log(`  sessionChallenges : ${r3.deletedCount} supprimés`)

const r4 = await db.collection('counters').deleteMany({})
console.log(`  counters        : ${r4.deletedCount} supprimés`)

console.log('\nOK — relance pnpm dev et reconnecte-toi avec Twitch pour re-seeder.')

await client.close()
