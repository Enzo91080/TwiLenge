// =============================================================
// TWITCH EVENTSUB - CHANNEL POINTS
// =============================================================
// Ecoute les rachats de Channel Points en temps reel.
// Quand un viewer rachete la recompense configuree,
// l'app active automatiquement un defi aleatoire.
//
// Utilise EventSub WebSocket (fonctionne en local sans tunnel).
// =============================================================

import { ApiClient } from '@twurple/api'
import { RefreshingAuthProvider } from '@twurple/auth'
import { EventSubWsListener } from '@twurple/eventsub-ws'
import { config } from '../config.js'
import { getSetting, setSetting } from '../db/index.js'
import { state } from '../state.js'
import { broadcastState, broadcast } from '../ws/manager.js'
import { updateSessionChallengeStatus, updateSessionPoints } from '../db/index.js'
import { stopTimer } from '../state.js'

let listener: EventSubWsListener | null = null

export async function startEventSub() {
  if (!config.CHANNEL_POINTS_ENABLED || !config.TWITCH_CLIENT_ID) {
    console.log('[EventSub] Channel Points desactives ou non configures.')
    return
  }

  const accessToken = getSetting('twitch_access_token')
  const refreshToken = getSetting('twitch_refresh_token')

  if (!accessToken || !refreshToken) {
    console.log('[EventSub] Tokens Twitch manquants. Va sur /auth/twitch pour autoriser.')
    return
  }

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
      setSetting('twitch_access_token', newToken.accessToken)
      if (newToken.refreshToken) setSetting('twitch_refresh_token', newToken.refreshToken)
    })

    const apiClient = new ApiClient({ authProvider })
    listener = new EventSubWsListener({ apiClient })

    await listener.start()

    // Recuperer l'ID de l'utilisateur Twitch depuis l'API
    const user = await apiClient.users.getUserByName(config.TWITCH_CHANNEL)
    if (!user) {
      console.error(`[EventSub] Utilisateur Twitch "${config.TWITCH_CHANNEL}" introuvable.`)
      return
    }

    // S'abonner aux rachats de Channel Points
    listener.onChannelRedemptionAdd(user, (event) => {
      console.log(`[EventSub] Rachat : "${event.rewardTitle}" par ${event.userDisplayName}`)

      // Verifier si c'est la bonne recompense
      if (event.rewardTitle.toLowerCase() !== config.CHANNEL_POINTS_REWARD_NAME.toLowerCase()) {
        return
      }

      // Activer un defi aleatoire si une session est en cours
      if (!state.session) {
        console.log('[EventSub] Rachat ignore : pas de session en cours.')
        return
      }

      const pending = state.pendingChallenges.filter((sc) => sc.status === 'pending')
      if (pending.length === 0) {
        console.log('[EventSub] Rachat ignore : plus de defis en attente.')
        return
      }

      // Si un defi est deja actif, le passer
      if (state.activeChallenge) {
        updateSessionChallengeStatus(state.activeChallenge.id, 'skipped')
        state.skippedCount++
        stopTimer()
        state.timerSecondsLeft = null
      }

      // Activer le defi aleatoire
      const random = pending[Math.floor(Math.random() * pending.length)]
      const activated = updateSessionChallengeStatus(random.id, 'active')!
      state.activeChallenge = activated
      state.pendingChallenges = state.pendingChallenges.filter((sc) => sc.id !== random.id)
      state.votes = {}

      broadcast({ type: 'WHEEL_SPUN', data: activated })
      broadcastState()

      console.log(`[EventSub] Defi active par ${event.userDisplayName}: ${activated.challenge.title}`)
    })

    console.log(`[EventSub] En ecoute des Channel Points de ${config.TWITCH_CHANNEL}`)

  } catch (err) {
    console.error('[EventSub] Erreur:', err)
  }
}

export function stopEventSub() {
  listener?.stop()
  listener = null
}
