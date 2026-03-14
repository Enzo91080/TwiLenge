// =============================================================
// TWITCH EVENTSUB — MULTI-TENANT
// =============================================================
// Une instance EventSubWsListener par streamer.
// =============================================================

import { ApiClient } from '@twurple/api'
import { RefreshingAuthProvider } from '@twurple/auth'
import { EventSubWsListener } from '@twurple/eventsub-ws'
import type { ChannelPointsMapping } from '@challenge-hub/shared'
import { getSetting, setSetting, updateSessionChallengeStatus, addRedemption } from '../db/index.js'
import { getState, stopTimer } from '../state.js'
import { broadcastState, broadcast } from '../ws/manager.js'
import { config } from '../config.js'

const listeners = new Map<string, EventSubWsListener>()

// =============================================================
// LOGIQUE DE RACHAT — appelee par EventSub ET par le debug endpoint
// =============================================================
// Retourne false si les conditions ne sont pas reunies (pas de session,
// plus de defis en attente, etc.), true si un defi a ete active.
// =============================================================

export async function handleChannelPointsRedemption(
  streamerId: string,
  rewardName: string,
  userName: string,
): Promise<{ success: false; reason: string } | { success: true; challengeDescription: string }> {
  // Charger les mappings configures
  const raw = await getSetting(streamerId, 'channel_points_mappings')
  const mappings: ChannelPointsMapping[] = raw ? JSON.parse(raw) : []

  const mapping = mappings.find((m) => m.rewardName.toLowerCase() === rewardName.toLowerCase())

  const s = getState(streamerId)
  const sessionId = s.session?.id ?? null

  // Fonction helper pour tracer et retourner un echec
  const fail = async (reason: string) => {
    const r = await addRedemption(streamerId, {
      sessionId,
      userName,
      rewardName,
      challengeDescription: null,
      success: false,
      failReason: reason,
      redeemedAt: new Date().toISOString(),
    })
    broadcast(streamerId, { type: 'REDEMPTION_LOGGED', data: r })
    return { success: false as const, reason }
  }

  if (!mapping) return fail(`Aucun mapping configure pour la recompense "${rewardName}"`)
  if (!s.session) return fail('Aucune session en cours')

  const pending = s.pendingChallenges.filter((sc) => sc.status === 'pending')
  if (pending.length === 0) return fail('Plus aucun defi en attente')

  const target = pending[Math.floor(Math.random() * pending.length)]

  // Passer le defi actuel en "skipped" si besoin
  if (s.activeChallenge) {
    await updateSessionChallengeStatus(streamerId, s.activeChallenge.id, 'skipped')
    s.skippedCount++
    stopTimer(streamerId)
    s.timerSecondsLeft = null
  }

  const activated = (await updateSessionChallengeStatus(streamerId, target.id, 'active'))!
  // Snapshot AVANT de filtrer pour que l'overlay ait la liste complète
  const challengesSnapshot = [...s.pendingChallenges]
  s.activeChallenge = activated
  s.pendingChallenges = s.pendingChallenges.filter((sc) => sc.id !== target!.id)
  s.votes = {}

  // Tracer le succes
  const redemption = await addRedemption(streamerId, {
    sessionId,
    userName,
    rewardName,
    challengeDescription: activated.challenge.description,
    success: true,
    failReason: null,
    redeemedAt: new Date().toISOString(),
  })

  broadcast(streamerId, { type: 'WHEEL_SPUN', data: { activated, challenges: challengesSnapshot } })
  broadcast(streamerId, { type: 'REDEMPTION_LOGGED', data: redemption })
  broadcastState(streamerId)

  console.log(`[EventSub:${streamerId}] Rachat par ${userName}: ${activated.challenge.description}`)
  return { success: true, challengeDescription: activated.challenge.description }
}

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
      await handleChannelPointsRedemption(streamerId, event.rewardTitle, event.userDisplayName)
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
