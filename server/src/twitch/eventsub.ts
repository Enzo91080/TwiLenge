// =============================================================
// TWITCH EVENTSUB - CHANNEL POINTS
// =============================================================
// Ecoute les rachats de Channel Points en temps reel.
// Quand un viewer rachete la recompense configuree,
// l'app active automatiquement un defi aleatoire.
// =============================================================

import { ApiClient } from '@twurple/api'
import { RefreshingAuthProvider } from '@twurple/auth'
import { EventSubWsListener } from '@twurple/eventsub-ws'
import { getSetting, setSetting, updateSessionChallengeStatus } from '../db/index.js'
import { state } from '../state.js'
import { broadcastState, broadcast } from '../ws/manager.js'
import { stopTimer } from '../state.js'

let listener: EventSubWsListener | null = null

export async function startEventSub() {
  const enabled = (await getSetting('channel_points_enabled')) === 'true'
  const clientId = await getSetting('twitch_client_id')
  const clientSecret = await getSetting('twitch_client_secret')
  const channel = await getSetting('twitch_channel')

  if (!enabled || !clientId || !clientSecret || !channel) {
    console.log('[EventSub] Channel Points desactives ou non configures.')
    return
  }

  const accessToken = await getSetting('twitch_access_token')
  const refreshToken = await getSetting('twitch_refresh_token')

  if (!accessToken || !refreshToken) {
    console.log('[EventSub] Tokens Twitch manquants.')
    return
  }

  const rewardName = (await getSetting('channel_points_reward_name')) ?? 'Defi aleatoire'

  try {
    const authProvider = new RefreshingAuthProvider({ clientId, clientSecret })

    await authProvider.addUserForToken({
      accessToken,
      refreshToken,
      expiresIn: null,
      obtainmentTimestamp: Date.now(),
      scope: ['channel:read:redemptions', 'chat:read', 'chat:edit'],
    }, ['channel:read:redemptions'])

    authProvider.onRefresh((_userId, newToken) => {
      setSetting('twitch_access_token', newToken.accessToken)
      if (newToken.refreshToken) setSetting('twitch_refresh_token', newToken.refreshToken)
    })

    const apiClient = new ApiClient({ authProvider })
    listener = new EventSubWsListener({ apiClient })

    await listener.start()

    const user = await apiClient.users.getUserByName(channel)
    if (!user) {
      console.error(`[EventSub] Utilisateur Twitch "${channel}" introuvable.`)
      return
    }

    listener.onChannelRedemptionAdd(user, async (event) => {
      console.log(`[EventSub] Rachat : "${event.rewardTitle}" par ${event.userDisplayName}`)

      if (event.rewardTitle.toLowerCase() !== rewardName.toLowerCase()) return

      if (!state.session) {
        console.log('[EventSub] Rachat ignore : pas de session en cours.')
        return
      }

      const pending = state.pendingChallenges.filter((sc) => sc.status === 'pending')
      if (pending.length === 0) {
        console.log('[EventSub] Rachat ignore : plus de defis en attente.')
        return
      }

      if (state.activeChallenge) {
        await updateSessionChallengeStatus(state.activeChallenge.id, 'skipped')
        state.skippedCount++
        stopTimer()
        state.timerSecondsLeft = null
      }

      const random = pending[Math.floor(Math.random() * pending.length)]
      const activated = (await updateSessionChallengeStatus(random.id, 'active'))!
      state.activeChallenge = activated
      state.pendingChallenges = state.pendingChallenges.filter((sc) => sc.id !== random.id)
      state.votes = {}

      broadcast({ type: 'WHEEL_SPUN', data: activated })
      broadcastState()

      console.log(`[EventSub] Defi active par ${event.userDisplayName}: ${activated.challenge.title}`)
    })

    console.log(`[EventSub] En ecoute des Channel Points de ${channel}`)

  } catch (err) {
    console.error('[EventSub] Erreur:', err)
  }
}

export function stopEventSub() {
  listener?.stop()
  listener = null
}
