// =============================================================
// CONFIGURATION DU SERVEUR
// =============================================================
// Variables d'infrastructure + credentials Twitch app-level.
// En multi-tenant, TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET
// sont geres par l'operateur dans .env (une seule app Twitch
// pour tous les streameurs).
// =============================================================

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Le .env est a la racine du monorepo (optionnel)
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const config = {
  // Port d'ecoute du serveur (defaut: 3001)
  PORT: parseInt(process.env.PORT ?? '3001'),

  // URL de connexion MongoDB (defaut: localhost sans auth)
  MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/challenge-hub',

  // URL publique de l'application
  PUBLIC_URL: process.env.PUBLIC_URL
    ?? process.env.RENDER_EXTERNAL_URL
    ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
    ?? `http://localhost:${process.env.PORT ?? 3001}`,

  // URL du dashboard web (pour les redirections apres OAuth)
  get WEB_URL() {
    return process.env.WEB_URL
      ?? process.env.PUBLIC_URL
      ?? process.env.RENDER_EXTERNAL_URL
      ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
      ?? 'http://localhost:5173'
  },

  OVERLAY_URL: process.env.OVERLAY_URL ?? 'http://localhost:5174',

  // Credentials Twitch app-level (operateur uniquement, dans .env)
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID ?? '',
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET ?? '',

  // Twitch OAuth redirect URL
  get AUTH_CALLBACK_URL() {
    const base = process.env.PUBLIC_URL
      ?? process.env.RENDER_EXTERNAL_URL
      ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
      ?? `http://localhost:${process.env.PORT ?? 3001}`
    return `${base}/auth/callback`
  },
}
