// =============================================================
// CONFIGURATION DU SERVEUR
// =============================================================
// Toutes les variables d'environnement sont lues ici.
// Les valeurs viennent du fichier .env a la racine du projet.
// =============================================================

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Le .env est a la racine du monorepo (deux niveaux au-dessus de server/src/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const config = {
  // Port d'ecoute du serveur (defaut: 3001)
  PORT: parseInt(process.env.PORT ?? '3001'),

  // Chemin vers la base de donnees SQLite
  DB_PATH: path.resolve(__dirname, '../../', process.env.DB_PATH ?? 'data/challenge-hub.db'),

  // --- TWITCH ---
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ?? '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET ?? '',
  TWITCH_CHANNEL: process.env.TWITCH_CHANNEL?.toLowerCase() ?? '',

  // Prefixe des commandes bot (! par defaut)
  BOT_PREFIX: process.env.BOT_PREFIX ?? '!',
  BOT_ENABLED: process.env.BOT_ENABLED === 'true',

  CHANNEL_POINTS_ENABLED: process.env.CHANNEL_POINTS_ENABLED === 'true',
  CHANNEL_POINTS_REWARD_NAME: process.env.CHANNEL_POINTS_REWARD_NAME ?? 'Defi aleatoire',

  // URL publique de l'application
  // Render injecte RENDER_EXTERNAL_URL, Railway injecte RAILWAY_PUBLIC_DOMAIN
  // En local : http://localhost:3001
  PUBLIC_URL: process.env.PUBLIC_URL
    ?? process.env.RENDER_EXTERNAL_URL
    ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
    ?? `http://localhost:${process.env.PORT ?? 3001}`,

  // URL du dashboard web (pour les redirections CORS en dev local)
  WEB_URL: process.env.WEB_URL ?? 'http://localhost:5173',
  OVERLAY_URL: process.env.OVERLAY_URL ?? 'http://localhost:5174',

  // Twitch OAuth redirect URL (utilise PUBLIC_URL en production)
  get AUTH_CALLBACK_URL() {
    const base = process.env.PUBLIC_URL
      ?? process.env.RENDER_EXTERNAL_URL
      ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
      ?? `http://localhost:${process.env.PORT ?? 3001}`
    return `${base}/auth/callback`
  },
}

// Verifie que la configuration Twitch est valide si activee
export function isTwitchConfigured(): boolean {
  return !!(config.TWITCH_CLIENT_ID && config.TWITCH_CLIENT_SECRET && config.TWITCH_CHANNEL)
}
