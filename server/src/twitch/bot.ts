// =============================================================
// BOT TWITCH CHAT
// =============================================================
// Le bot se connecte au chat Twitch et repond aux commandes.
// Il utilise le token OAuth sauvegarde en base de donnees.
//
// COMMANDES DISPONIBLES (configurables ci-dessous) :
//   !defi     - affiche le defi en cours
//   !score    - affiche le score de la session
//   !prochains - affiche les prochains defis
//   !vote <n> - voter pour un defi
//   !skip     - passer le defi (streamer seulement)
//   !ok       - valider le defi (streamer seulement)
//   !fail     - echouer le defi (streamer seulement)
// =============================================================

import { RefreshingAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'
import { config } from '../config.js'
import { getSetting, setSetting } from '../db/index.js'
import { state } from '../state.js'
import { broadcast, broadcastState } from '../ws/manager.js'
import { updateSessionChallengeStatus, updateSessionPoints } from '../db/index.js'
import { stopTimer } from '../state.js'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '@challenge-hub/shared'

let chatClient: ChatClient | null = null

export async function startTwitchBot() {
  if (!config.BOT_ENABLED || !config.TWITCH_CLIENT_ID) {
    console.log('[Bot] Bot Twitch desactive ou non configure.')
    return
  }

  const accessToken = getSetting('twitch_access_token')
  const refreshToken = getSetting('twitch_refresh_token')
  const expiresAt = getSetting('twitch_token_expires_at')

  if (!accessToken || !refreshToken) {
    console.log('[Bot] Tokens Twitch manquants. Va sur http://localhost:3001/auth/twitch pour autoriser.')
    return
  }

  try {
    // AuthProvider qui rafraichit automatiquement le token quand il expire
    const authProvider = new RefreshingAuthProvider({
      clientId: config.TWITCH_CLIENT_ID,
      clientSecret: config.TWITCH_CLIENT_SECRET,
    })

    await authProvider.addUserForToken({
      accessToken,
      refreshToken,
      expiresIn: expiresAt ? Math.floor((parseInt(expiresAt) - Date.now()) / 1000) : null,
      obtainmentTimestamp: Date.now(),
      scope: ['chat:read', 'chat:edit'],
    }, ['chat'])

    // Sauvegarder les nouveaux tokens quand ils sont rafraichis
    authProvider.onRefresh((_userId, newToken) => {
      setSetting('twitch_access_token', newToken.accessToken)
      if (newToken.refreshToken) setSetting('twitch_refresh_token', newToken.refreshToken)
      if (newToken.expiresIn) setSetting('twitch_token_expires_at', String(Date.now() + newToken.expiresIn * 1000))
      console.log('[Bot] Token Twitch rafraichi.')
    })

    chatClient = new ChatClient({ authProvider, channels: [config.TWITCH_CHANNEL] })
    await chatClient.connect()

    console.log(`[Bot] Connecte au chat de ${config.TWITCH_CHANNEL}`)

    // --- GESTION DES MESSAGES DU CHAT ---
    chatClient.onMessage(async (channel, user, text) => {
      const prefix = config.BOT_PREFIX
      const msg = text.trim()

      // Verifier si c'est une commande
      if (!msg.startsWith(prefix)) return

      const [cmd, ...args] = msg.slice(prefix.length).toLowerCase().split(/\s+/)

      // Verifier si l'utilisateur est le streamer (pour les commandes admin)
      const isStreamer = user.toLowerCase() === config.TWITCH_CHANNEL.toLowerCase()

      // --- COMMANDES PUBLIQUES ---

      if (cmd === 'defi' || cmd === 'challenge') {
        if (!state.activeChallenge) {
          chatClient?.say(channel, 'Aucun defi actif pour le moment !')
        } else {
          const c = state.activeChallenge.challenge
          const timer = state.timerSecondsLeft !== null ? ` | Timer: ${formatTime(state.timerSecondsLeft)}` : ''
          chatClient?.say(channel, `[DEFI EN COURS] ${c.title} (${DIFFICULTY_LABELS[c.difficulty]} - ${c.points} pts)${timer}`)
        }
        return
      }

      if (cmd === 'score') {
        if (!state.session) {
          chatClient?.say(channel, 'Aucune session en cours.')
        } else {
          chatClient?.say(channel,
            `Score: ${state.session.totalPoints} pts | ` +
            `Completes: ${state.completedCount} | ` +
            `Echoues: ${state.failedCount} | ` +
            `Passes: ${state.skippedCount}`
          )
        }
        return
      }

      if (cmd === 'prochains' || cmd === 'next') {
        const pending = state.pendingChallenges.slice(0, 3)
        if (pending.length === 0) {
          chatClient?.say(channel, 'Plus aucun defi en attente.')
        } else {
          const list = pending.map((sc, i) => `${i + 1}. ${sc.challenge.title}`).join(' | ')
          chatClient?.say(channel, `Prochains defis : ${list}`)
        }
        return
      }

      if (cmd === 'vote') {
        const num = parseInt(args[0])
        if (isNaN(num) || num < 1) {
          chatClient?.say(channel, `Usage: ${prefix}vote <numero> (ex: ${prefix}vote 1)`)
          return
        }

        const target = state.pendingChallenges[num - 1]
        if (!target) {
          chatClient?.say(channel, `Defi #${num} introuvable.`)
          return
        }

        // Incrementer le vote pour ce defi
        state.votes[target.id] = (state.votes[target.id] ?? 0) + 1
        broadcast({ type: 'VOTE_UPDATE', data: state.votes })
        // Pas de confirmation dans le chat pour eviter le spam
        return
      }

      // --- COMMANDES STREAMER SEULEMENT ---

      if (!isStreamer) return

      if (cmd === 'ok' || cmd === 'complete') {
        if (!state.activeChallenge) {
          chatClient?.say(channel, 'Aucun defi actif.')
          return
        }

        stopTimer()
        state.timerSecondsLeft = null
        const points = state.activeChallenge.challenge.points
        const completed = updateSessionChallengeStatus(state.activeChallenge.id, 'completed', points)!
        state.completedCount++
        state.session!.totalPoints += points
        updateSessionPoints(state.session!.id, state.session!.totalPoints)
        state.activeChallenge = null
        broadcast({ type: 'CHALLENGE_COMPLETED', data: completed })
        broadcastState()
        chatClient?.say(channel, `DEFI COMPLETE ! +${points} points ! Score total: ${state.session!.totalPoints} pts`)
        return
      }

      if (cmd === 'fail') {
        if (!state.activeChallenge) {
          chatClient?.say(channel, 'Aucun defi actif.')
          return
        }

        stopTimer()
        state.timerSecondsLeft = null
        const failed = updateSessionChallengeStatus(state.activeChallenge.id, 'failed', 0)!
        state.failedCount++
        state.activeChallenge = null
        broadcast({ type: 'CHALLENGE_FAILED', data: failed })
        broadcastState()
        chatClient?.say(channel, 'Defi echoue !')
        return
      }

      if (cmd === 'skip') {
        if (!state.activeChallenge) {
          chatClient?.say(channel, 'Aucun defi actif.')
          return
        }

        stopTimer()
        state.timerSecondsLeft = null
        const skipped = updateSessionChallengeStatus(state.activeChallenge.id, 'skipped', 0)!
        state.skippedCount++
        state.activeChallenge = null
        broadcast({ type: 'CHALLENGE_SKIPPED', data: skipped })
        broadcastState()
        chatClient?.say(channel, 'Defi passe !')
        return
      }
    })

  } catch (err) {
    console.error('[Bot] Erreur de connexion Twitch:', err)
  }
}

export function stopTwitchBot() {
  chatClient?.quit()
  chatClient = null
}

// Annonce dans le chat (appele depuis d'autres parties de l'app si besoin)
export function announce(message: string) {
  if (chatClient && config.TWITCH_CHANNEL) {
    chatClient.say(`#${config.TWITCH_CHANNEL}`, message)
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
