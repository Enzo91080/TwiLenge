// =============================================================
// BOT TWITCH CHAT — MULTI-TENANT
// =============================================================
// Une instance ChatClient par streamer, indexee par streamerId.
// Les credentials app-level viennent de config.TWITCH_CLIENT_ID/SECRET.
// =============================================================

import { RefreshingAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'
import { getSetting, setSetting, updateSessionChallengeStatus } from '../db/index.js'
import { getState, stopTimer } from '../state.js'
import { broadcast, broadcastState } from '../ws/manager.js'
import { config } from '../config.js'
import { DIFFICULTY_LABELS } from '@challenge-hub/shared'

const chatClients = new Map<string, ChatClient>()

export async function startTwitchBot(streamerId: string): Promise<void> {
  const botEnabled = (await getSetting(streamerId, 'bot_enabled')) === 'true'
  const channel = await getSetting(streamerId, 'twitch_channel')

  if (!botEnabled || !channel) {
    console.log(`[Bot:${streamerId}] Bot desactive ou channel non configure.`)
    return
  }

  if (!config.TWITCH_CLIENT_ID || !config.TWITCH_CLIENT_SECRET) {
    console.log('[Bot] TWITCH_CLIENT_ID/SECRET manquants dans .env')
    return
  }

  const accessToken = await getSetting(streamerId, 'twitch_access_token')
  const refreshToken = await getSetting(streamerId, 'twitch_refresh_token')
  const expiresAt = await getSetting(streamerId, 'twitch_token_expires_at')

  if (!accessToken || !refreshToken) {
    console.log(`[Bot:${streamerId}] Tokens manquants. Reconnecte-toi via Twitch.`)
    return
  }

  // Arreter l'instance existante si elle tourne
  stopTwitchBot(streamerId)

  try {
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

    authProvider.onRefresh((_userId, newToken) => {
      setSetting(streamerId, 'twitch_access_token', newToken.accessToken)
      if (newToken.refreshToken) setSetting(streamerId, 'twitch_refresh_token', newToken.refreshToken)
      if (newToken.expiresIn) setSetting(streamerId, 'twitch_token_expires_at', String(Date.now() + newToken.expiresIn * 1000))
      console.log(`[Bot:${streamerId}] Token rafraichi.`)
    })

    const chatClient = new ChatClient({ authProvider, channels: [channel] })
    await chatClient.connect()
    chatClients.set(streamerId, chatClient)

    console.log(`[Bot:${streamerId}] Connecte au chat de ${channel}`)

    chatClient.onMessage(async (chatChannel, user, text) => {
      const s = getState(streamerId)
      const prefix = (await getSetting(streamerId, 'bot_prefix')) ?? '!'
      const msg = text.trim()
      if (!msg.startsWith(prefix)) return

      const [cmd, ...args] = msg.slice(prefix.length).toLowerCase().split(/\s+/)
      const currentChannel = (await getSetting(streamerId, 'twitch_channel')) ?? ''
      const isStreamer = user.toLowerCase() === currentChannel.toLowerCase()

      const isCmdEnabled = async (key: string) => (await getSetting(streamerId, `bot_cmd_${key}`)) !== 'false'

      // --- COMMANDES PUBLIQUES ---

      if ((cmd === 'defi' || cmd === 'challenge') && await isCmdEnabled('defi')) {
        if (!s.activeChallenge) {
          chatClient.say(chatChannel, 'BOT: Aucun defi actif pour le moment !')
        } else {
          const c = s.activeChallenge.challenge
          const timer = s.timerSecondsLeft !== null ? ` | Timer: ${formatTime(s.timerSecondsLeft)}` : ''
          chatClient.say(chatChannel, `[DEFI EN COURS] ${c.title} (${DIFFICULTY_LABELS[c.difficulty]})${timer}`)
        }
        return
      }

      if (cmd === 'score' && await isCmdEnabled('score')) {
        if (!s.session) {
          chatClient.say(chatChannel, 'Aucune session en cours.')
        } else {
          chatClient.say(chatChannel,
            `Completes: ${s.completedCount} | Echoues: ${s.failedCount} | Passes: ${s.skippedCount}`,
          )
        }
        return
      }

      if ((cmd === 'prochains' || cmd === 'next') && await isCmdEnabled('prochains')) {
        const pending = s.pendingChallenges.slice(0, 3)
        if (pending.length === 0) {
          chatClient.say(chatChannel, 'BOT: Plus aucun defi en attente.')
        } else {
          const list = pending.map((sc, i) => `${i + 1}. ${sc.challenge.title}`).join(' | ')
          chatClient.say(chatChannel, `BOT: Prochains defis : ${list}`)
        }
        return
      }

      if (cmd === 'vote' && await isCmdEnabled('vote')) {
        const num = parseInt(args[0])
        if (isNaN(num) || num < 1) {
          chatClient.say(chatChannel, `Usage: ${prefix}vote <numero> (ex: ${prefix}vote 1)`)
          return
        }
        const target = s.pendingChallenges[num - 1]
        if (!target) {
          chatClient.say(chatChannel, `Defi #${num} introuvable.`)
          return
        }
        s.votes[target.id] = (s.votes[target.id] ?? 0) + 1
        broadcast(streamerId, { type: 'VOTE_UPDATE', data: s.votes })
        return
      }

      // --- COMMANDES STREAMER SEULEMENT ---

      if (!isStreamer) return

      if ((cmd === 'ok' || cmd === 'complete') && await isCmdEnabled('ok')) {
        if (!s.activeChallenge) { chatClient.say(chatChannel, 'BOT: Aucun defi actif.'); return }
        stopTimer(streamerId)
        s.timerSecondsLeft = null
        const completed = (await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'completed'))!
        s.completedCount++
        s.activeChallenge = null
        broadcast(streamerId, { type: 'CHALLENGE_COMPLETED', data: completed })
        broadcastState(streamerId)
        chatClient.say(chatChannel, 'DEFI COMPLETE !')
        return
      }

      if (cmd === 'fail' && await isCmdEnabled('fail')) {
        if (!s.activeChallenge) { chatClient.say(chatChannel, 'BOT: Aucun defi actif.'); return }
        stopTimer(streamerId)
        s.timerSecondsLeft = null
        const failed = (await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'failed'))!
        s.failedCount++
        s.activeChallenge = null
        broadcast(streamerId, { type: 'CHALLENGE_FAILED', data: failed })
        broadcastState(streamerId)
        chatClient.say(chatChannel, 'Defi echoue !')
        return
      }

      if (cmd === 'skip' && await isCmdEnabled('skip')) {
        if (!s.activeChallenge) { chatClient.say(chatChannel, 'BOT: Aucun defi actif.'); return }
        stopTimer(streamerId)
        s.timerSecondsLeft = null
        const skipped = (await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'skipped'))!
        s.skippedCount++
        s.activeChallenge = null
        broadcast(streamerId, { type: 'CHALLENGE_SKIPPED', data: skipped })
        broadcastState(streamerId)
        chatClient.say(chatChannel, 'Defi passe !')
        return
      }

      if (cmd === 'roue' && await isCmdEnabled('roue')) {
        if (!s.session) { chatClient.say(chatChannel, 'BOT: Aucune session en cours.'); return }
        const pending = s.pendingChallenges.filter((sc) => sc.status === 'pending')
        if (pending.length === 0) { chatClient.say(chatChannel, 'BOT: Plus aucun defi en attente.'); return }
        if (s.activeChallenge) {
          await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'skipped')
          s.skippedCount++
          stopTimer(streamerId)
          s.timerSecondsLeft = null
        }
        const random = pending[Math.floor(Math.random() * pending.length)]
        const activated = (await updateSessionChallengeStatus(streamerId, random.id, 'active'))!
        // Snapshot AVANT de filtrer pour que l'overlay ait la liste complète
        const challengesSnapshot = [...s.pendingChallenges]
        s.activeChallenge = activated
        s.pendingChallenges = s.pendingChallenges.filter((sc) => sc.id !== random.id)
        s.votes = {}
        broadcast(streamerId, { type: 'WHEEL_SPUN', data: { activated, challenges: challengesSnapshot } })
        broadcastState(streamerId)
        chatClient.say(chatChannel, `La roue a selectionne : ${activated.challenge.description}`)
        return
      }
    })

  } catch (err) {
    console.error(`[Bot:${streamerId}] Erreur:`, err)
    chatClients.delete(streamerId)
  }
}

export function stopTwitchBot(streamerId: string): void {
  chatClients.get(streamerId)?.quit()
  chatClients.delete(streamerId)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
