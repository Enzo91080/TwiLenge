// =============================================================
// BOT TWITCH CHAT
// =============================================================
// Le bot se connecte au chat Twitch et repond aux commandes.
// La configuration (client_id, channel, etc.) est stockee en BDD
// et modifiable depuis l'interface Settings.
//
// COMMANDES :
//   !defi     - affiche le defi en cours
//   !score    - affiche les compteurs de la session
//   !prochains - affiche les prochains defis
//   !vote <n> - voter pour un defi
//   !skip     - passer le defi (streamer seulement)
//   !ok       - valider le defi (streamer seulement)
//   !fail     - echouer le defi (streamer seulement)
// =============================================================

import { RefreshingAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'
import { getSetting, setSetting, updateSessionChallengeStatus } from '../db/index.js'
import { state } from '../state.js'
import { broadcast, broadcastState } from '../ws/manager.js'
import { stopTimer } from '../state.js'
import { DIFFICULTY_LABELS } from '@challenge-hub/shared'

let chatClient: ChatClient | null = null

export async function startTwitchBot() {
  const botEnabled = (await getSetting('bot_enabled')) === 'true'
  const clientId = await getSetting('twitch_client_id')
  const clientSecret = await getSetting('twitch_client_secret')
  const channel = await getSetting('twitch_channel')

  if (!botEnabled || !clientId || !clientSecret || !channel) {
    console.log('[Bot] Bot Twitch desactive ou non configure.')
    return
  }

  const accessToken = await getSetting('twitch_access_token')
  const refreshToken = await getSetting('twitch_refresh_token')
  const expiresAt = await getSetting('twitch_token_expires_at')

  if (!accessToken || !refreshToken) {
    console.log('[Bot] Tokens Twitch manquants. Va dans Parametres > Connexion Twitch.')
    return
  }

  try {
    const authProvider = new RefreshingAuthProvider({ clientId, clientSecret })

    await authProvider.addUserForToken({
      accessToken,
      refreshToken,
      expiresIn: expiresAt ? Math.floor((parseInt(expiresAt) - Date.now()) / 1000) : null,
      obtainmentTimestamp: Date.now(),
      scope: ['chat:read', 'chat:edit'],
    }, ['chat'])

    authProvider.onRefresh((_userId, newToken) => {
      setSetting('twitch_access_token', newToken.accessToken)
      if (newToken.refreshToken) setSetting('twitch_refresh_token', newToken.refreshToken)
      if (newToken.expiresIn) setSetting('twitch_token_expires_at', String(Date.now() + newToken.expiresIn * 1000))
      console.log('[Bot] Token Twitch rafraichi.')
    })

    chatClient = new ChatClient({ authProvider, channels: [channel] })
    await chatClient.connect()

    console.log(`[Bot] Connecte au chat de ${channel}`)

    chatClient.onMessage(async (chatChannel, user, text) => {
      const prefix = (await getSetting('bot_prefix')) ?? '!'
      const msg = text.trim()
      if (!msg.startsWith(prefix)) return

      const [cmd, ...args] = msg.slice(prefix.length).toLowerCase().split(/\s+/)
      const currentChannel = (await getSetting('twitch_channel')) ?? ''
      const isStreamer = user.toLowerCase() === currentChannel.toLowerCase()

      const isCmdEnabled = async (key: string) => (await getSetting(`bot_cmd_${key}`)) !== 'false'

      // --- COMMANDES PUBLIQUES ---

      if ((cmd === 'defi' || cmd === 'challenge') && await isCmdEnabled('defi')) {
        if (!state.activeChallenge) {
          chatClient?.say(chatChannel, 'Aucun defi actif pour le moment !')
        } else {
          const c = state.activeChallenge.challenge
          const timer = state.timerSecondsLeft !== null ? ` | Timer: ${formatTime(state.timerSecondsLeft)}` : ''
          chatClient?.say(chatChannel, `[DEFI EN COURS] ${c.title} (${DIFFICULTY_LABELS[c.difficulty]})${timer}`)
        }
        return
      }

      if (cmd === 'score' && await isCmdEnabled('score')) {
        if (!state.session) {
          chatClient?.say(chatChannel, 'Aucune session en cours.')
        } else {
          chatClient?.say(chatChannel,
            `Completes: ${state.completedCount} | Echoues: ${state.failedCount} | Passes: ${state.skippedCount}`,
          )
        }
        return
      }

      if ((cmd === 'prochains' || cmd === 'next') && await isCmdEnabled('prochains')) {
        const pending = state.pendingChallenges.slice(0, 3)
        if (pending.length === 0) {
          chatClient?.say(chatChannel, 'Plus aucun defi en attente.')
        } else {
          const list = pending.map((sc, i) => `${i + 1}. ${sc.challenge.title}`).join(' | ')
          chatClient?.say(chatChannel, `Prochains defis : ${list}`)
        }
        return
      }

      if (cmd === 'vote' && await isCmdEnabled('vote')) {
        const num = parseInt(args[0])
        if (isNaN(num) || num < 1) {
          chatClient?.say(chatChannel, `Usage: ${prefix}vote <numero> (ex: ${prefix}vote 1)`)
          return
        }
        const target = state.pendingChallenges[num - 1]
        if (!target) {
          chatClient?.say(chatChannel, `Defi #${num} introuvable.`)
          return
        }
        state.votes[target.id] = (state.votes[target.id] ?? 0) + 1
        broadcast({ type: 'VOTE_UPDATE', data: state.votes })
        return
      }

      // --- COMMANDES STREAMER SEULEMENT ---

      if (!isStreamer) return

      if ((cmd === 'ok' || cmd === 'complete') && await isCmdEnabled('ok')) {
        if (!state.activeChallenge) {
          chatClient?.say(chatChannel, 'Aucun defi actif.')
          return
        }
        stopTimer()
        state.timerSecondsLeft = null
        const completed = (await updateSessionChallengeStatus(state.activeChallenge.id, 'completed'))!
        state.completedCount++
        state.activeChallenge = null
        broadcast({ type: 'CHALLENGE_COMPLETED', data: completed })
        broadcastState()
        chatClient?.say(chatChannel, 'DEFI COMPLETE !')
        return
      }

      if (cmd === 'fail' && await isCmdEnabled('fail')) {
        if (!state.activeChallenge) {
          chatClient?.say(chatChannel, 'Aucun defi actif.')
          return
        }
        stopTimer()
        state.timerSecondsLeft = null
        const failed = (await updateSessionChallengeStatus(state.activeChallenge.id, 'failed'))!
        state.failedCount++
        state.activeChallenge = null
        broadcast({ type: 'CHALLENGE_FAILED', data: failed })
        broadcastState()
        chatClient?.say(chatChannel, 'Defi echoue !')
        return
      }

      if (cmd === 'skip' && await isCmdEnabled('skip')) {
        if (!state.activeChallenge) {
          chatClient?.say(chatChannel, 'Aucun defi actif.')
          return
        }
        stopTimer()
        state.timerSecondsLeft = null
        const skipped = (await updateSessionChallengeStatus(state.activeChallenge.id, 'skipped'))!
        state.skippedCount++
        state.activeChallenge = null
        broadcast({ type: 'CHALLENGE_SKIPPED', data: skipped })
        broadcastState()
        chatClient?.say(chatChannel, 'Defi passe !')
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
