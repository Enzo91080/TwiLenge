// =============================================================
// TWITCH EVENTSUB — MULTI-TENANT
// =============================================================
// Une instance EventSubWsListener par streamer.
// =============================================================

import { ApiClient } from '@twurple/api'
import { RefreshingAuthProvider } from '@twurple/auth'
import { EventSubWsListener } from '@twurple/eventsub-ws'
import { getSetting, setSetting, updateSessionChallengeStatus } from '../db/index.js'
import { getState, stopTimer } from '../state.js'
import { broadcastState, broadcast } from '../ws/manager.js'
import { config } from '../config.js'

const listeners = new Map<string, EventSubWsListener>()

export async function startEventSub(streamerId: string): Promise<void> {
  const enabled = (await getSetting(streamerId, 'channel_points_enabled')) === 'true'
  const channel = await getSetting(streamerId, 'twitch_channel')

  if (!enabled || !channel) {
    console.log(`[EventSub:${streamerId}] Channel Points desactives ou channel non configure.`)
    return
  }

  if (!config.TWITCH_CLIENT_ID || !config.TWITCH_CLIENT_SECRET) {
    console.log('[EventSub] TWITCH_CLIENT_ID/SECRET manquants dans .env')
    return
  }

  const accessToken = await getSetting(streamerId, 'twitch_access_token')
  const refreshToken = await getSetting(streamerId, 'twitch_refresh_token')

  if (!accessToken || !refreshToken) {
    console.log(`[EventSub:${streamerId}] Tokens manquants.`)
    return
  }

  // Arreter l'instance existante
  stopEventSub(streamerId)

  const rewardName = (await getSetting(streamerId, 'channel_points_reward_name')) ?? 'Defi aleatoire'

  try {
    const authProvider = new RefreshingAuthProvider({
      clientId: config.TWITCH_CLIENT_ID,
      clientSecret: config.TWITCH_CLIENT_SECRET,
    })

    await authProvider.addUserForToken({
      accessToken,
      refreshToken,
      expiresIn: null,
      obtainmentTimestamp: Date.now(),
      scope: ['channel:read:redemptions', 'chat:read', 'chat:edit'],
    }, ['channel:read:redemptions'])

    authProvider.onRefresh((_userId, newToken) => {
      setSetting(streamerId, 'twitch_access_token', newToken.accessToken)
      if (newToken.refreshToken) setSetting(streamerId, 'twitch_refresh_token', newToken.refreshToken)
    })

    const apiClient = new ApiClient({ authProvider })
    const listener = new EventSubWsListener({ apiClient })

    await listener.start()
    listeners.set(streamerId, listener)

    const user = await apiClient.users.getUserByName(channel)
    if (!user) {
      console.error(`[EventSub:${streamerId}] Utilisateur "${channel}" introuvable.`)
      return
    }

    listener.onChannelRedemptionAdd(user, async (event) => {
      if (event.rewardTitle.toLowerCase() !== rewardName.toLowerCase()) return

      const s = getState(streamerId)
      if (!s.session) return

      const pending = s.pendingChallenges.filter((sc) => sc.status === 'pending')
      if (pending.length === 0) return

      if (s.activeChallenge) {
        await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'skipped')
        s.skippedCount++
        stopTimer(streamerId)
        s.timerSecondsLeft = null
      }

      const random = pending[Math.floor(Math.random() * pending.length)]
      const activated = (await updateSessionChallengeStatus(streamerId, random.id, 'active'))!
      s.activeChallenge = activated
      s.pendingChallenges = s.pendingChallenges.filter((sc) => sc.id !== random.id)
      s.votes = {}

      broadcast(streamerId, { type: 'WHEEL_SPUN', data: activated })
      broadcastState(streamerId)

      console.log(`[EventSub:${streamerId}] Defi active par ${event.userDisplayName}: ${activated.challenge.title}`)
    })

    console.log(`[EventSub:${streamerId}] En ecoute des Channel Points de ${channel}`)

  } catch (err) {
    console.error(`[EventSub:${streamerId}] Erreur:`, err)
    listeners.get(streamerId)?.stop()
    listeners.delete(streamerId)
  }
}

export function stopEventSub(streamerId: string): void {
  listeners.get(streamerId)?.stop()
  listeners.delete(streamerId)
}
