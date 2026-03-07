// =============================================================
// ROUTES API : GESTION DES DEFIS
// =============================================================
// GET    /api/challenges          - liste tous les defis
// POST   /api/challenges          - creer un defi
// PUT    /api/challenges/:id      - modifier un defi
// DELETE /api/challenges/:id      - supprimer un defi
// POST   /api/challenges/reorder  - reordonner les defis
// POST   /api/challenges/reset    - reinitialiser aux defis par defaut
// GET    /api/challenges/export   - exporter en JSON
// POST   /api/challenges/import   - importer depuis JSON
// =============================================================

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  getAllChallenges,
  getChallengeById,
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
  // timerSeconds = null signifie "pas de timer"
  timerSeconds: z.number().int().min(30).max(3600).nullable().default(null),
  sortOrder: z.number().int().default(0),
})

export async function challengeRoutes(fastify: FastifyInstance) {
  // GET /api/challenges
  fastify.get('/challenges', async () => {
    return getAllChallenges()
  })

  // POST /api/challenges
  fastify.post('/challenges', async (request, reply) => {
    const body = ChallengeSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }
    const challenge = await createChallenge(body.data)
    return reply.status(201).send(challenge)
  })

  // PUT /api/challenges/:id
  fastify.put('/challenges/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = ChallengeSchema.partial().safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }
    const challenge = await updateChallenge(parseInt(id), body.data)
    if (!challenge) return reply.status(404).send({ error: 'Defi introuvable' })
    return challenge
  })

  // DELETE /api/challenges/:id
  fastify.delete('/challenges/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const deleted = await deleteChallenge(parseInt(id))
    if (!deleted) return reply.status(404).send({ error: 'Defi introuvable' })
    return { success: true }
  })

  // POST /api/challenges/reorder
  fastify.post('/challenges/reorder', async (request, reply) => {
    const body = z.object({ ids: z.array(z.number()) }).safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'ids doit etre un tableau de nombres' })
    }
    await reorderChallenges(body.data.ids)
    return { success: true }
  })

  // POST /api/challenges/reset
  fastify.post('/challenges/reset', async () => {
    await resetToDefaultChallenges()
    return getAllChallenges()
  })

  // GET /api/challenges/export
  fastify.get('/challenges/export', async (_, reply) => {
    const challenges = await getAllChallenges()
    reply.header('Content-Disposition', 'attachment; filename="challenges.json"')
    return challenges
  })

  // POST /api/challenges/import
  fastify.post('/challenges/import', async (request, reply) => {
    const body = z.array(ChallengeSchema).safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Format invalide. Utilise le fichier exporte par cette application.' })
    }
    const created = await Promise.all(body.data.map((c) => createChallenge(c)))
    return reply.status(201).send(created)
  })
}
