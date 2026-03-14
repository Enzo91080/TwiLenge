// =============================================================
// ROUTES DEBUG — Disponibles uniquement en developpement
// =============================================================
// Permet de simuler des evenements Twitch sans etre affilié.
// Ces routes NE SONT PAS enregistrees en production.
// =============================================================

import type { FastifyInstance } from 'fastify'
import type { ChannelPointsMapping } from '@challenge-hub/shared'
import { handleChannelPointsRedemption } from '../twitch/eventsub.js'
import { getSetting } from '../db/index.js'

export async function debugRoutes(fastify: FastifyInstance) {
  // POST /api/debug/simulate-channel-points
  // Simule un rachat de Channel Points par un viewer.
  // Body : { rewardName: string, userName?: string }
  //   - rewardName : nom exact de la recompense a simuler (doit etre dans les mappings)
  //   - userName   : pseudo du viewer simule (defaut : "SimulatedViewer")
  fastify.post('/debug/simulate-channel-points', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const body = (request.body ?? {}) as { rewardName?: string; userName?: string }

    // Si rewardName non fourni, prendre le premier mapping configure
    let rewardName = body.rewardName
    if (!rewardName) {
      const raw = await getSetting(streamerId, 'channel_points_mappings')
      const mappings: ChannelPointsMapping[] = raw ? JSON.parse(raw) : []
      if (mappings.length === 0) {
        return reply.status(400).send({ error: 'Aucun mapping Channel Points configure.' })
      }
      rewardName = mappings[0].rewardName
    }

    const userName = body.userName ?? 'SimulatedViewer'
    const result = await handleChannelPointsRedemption(streamerId, rewardName, userName)

    if (!result.success) {
      return reply.status(400).send({ error: result.reason })
    }

    return { success: true, challengeDescription: result.challengeDescription, simulatedBy: userName, rewardName }
  })
}
