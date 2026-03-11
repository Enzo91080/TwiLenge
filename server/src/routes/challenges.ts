// =============================================================
// ROUTES API : GESTION DES DEFIS — MULTI-TENANT
// =============================================================

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  getAllChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  reorderChallenges,
  resetToDefaultChallenges,
} from '../db/index.js'

const ChallengeSchema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(100),
  description: z.string().max(500).default(''),
  category: z.enum(['elimination', 'placement', 'loadout', 'chaos', 'custom']).default('custom'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  timerSeconds: z.number().int().min(30).max(3600).nullable().default(null),
  sortOrder: z.number().int().default(0),
})

export async function challengeRoutes(fastify: FastifyInstance) {
  // GET /api/challenges
  fastify.get('/challenges', async (request) => {
    const streamerId = (request as any).twitchLogin as string
    return getAllChallenges(streamerId)
  })

  // POST /api/challenges
  fastify.post('/challenges', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const body = ChallengeSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const challenge = await createChallenge(streamerId, body.data)
    return reply.status(201).send(challenge)
  })

  // PUT /api/challenges/:id
  fastify.put('/challenges/:id', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const { id } = request.params as { id: string }
    const numId = parseInt(id)
    if (isNaN(numId)) return reply.status(400).send({ error: 'ID invalide' })
    const body = ChallengeSchema.partial().safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })
    const challenge = await updateChallenge(streamerId, numId, body.data)
    if (!challenge) return reply.status(404).send({ error: 'Defi introuvable' })
    return challenge
  })

  // DELETE /api/challenges/:id
  fastify.delete('/challenges/:id', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const { id } = request.params as { id: string }
    const numId = parseInt(id)
    if (isNaN(numId)) return reply.status(400).send({ error: 'ID invalide' })
    const deleted = await deleteChallenge(streamerId, numId)
    if (!deleted) return reply.status(404).send({ error: 'Defi introuvable' })
    return { success: true }
  })

  // POST /api/challenges/reorder
  fastify.post('/challenges/reorder', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const body = z.object({ ids: z.array(z.number()) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'ids doit etre un tableau de nombres' })
    await reorderChallenges(streamerId, body.data.ids)
    return { success: true }
  })

  // POST /api/challenges/reset
  fastify.post('/challenges/reset', async (request) => {
    const streamerId = (request as any).twitchLogin as string
    await resetToDefaultChallenges(streamerId)
    return getAllChallenges(streamerId)
  })

  // GET /api/challenges/export
  fastify.get('/challenges/export', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const challenges = await getAllChallenges(streamerId)
    reply.header('Content-Disposition', 'attachment; filename="challenges.json"')
    return challenges
  })

  // POST /api/challenges/import
  fastify.post('/challenges/import', async (request, reply) => {
    const streamerId = (request as any).twitchLogin as string
    const body = z.array(ChallengeSchema).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Format invalide.' })
    const created = await Promise.all(body.data.map((c) => createChallenge(streamerId, c)))
    return reply.status(201).send(created)
  })
}
