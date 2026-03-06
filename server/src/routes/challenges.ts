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

// Validation des donnees d'un defi avec Zod
// Si une valeur ne correspond pas, l'API retourne une erreur 400 claire
const ChallengeSchema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(100),
  description: z.string().max(500).default(''),
  category: z.enum(['elimination', 'placement', 'loadout', 'chaos', 'custom']).default('custom'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  points: z.number().int().min(0).max(9999).default(100),
  // timerSeconds = null signifie "pas de timer"
  timerSeconds: z.number().int().min(30).max(3600).nullable().default(null),
  sortOrder: z.number().int().default(0),
})

export async function challengeRoutes(fastify: FastifyInstance) {
  // GET /api/challenges - Liste tous les defis
  fastify.get('/challenges', async () => {
    return getAllChallenges()
  })

  // POST /api/challenges - Creer un nouveau defi
  fastify.post('/challenges', async (request, reply) => {
    const body = ChallengeSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }

    const challenge = createChallenge(body.data)
    return reply.status(201).send(challenge)
  })

  // PUT /api/challenges/:id - Modifier un defi existant
  fastify.put('/challenges/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = ChallengeSchema.partial().safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten() })
    }

    const challenge = updateChallenge(parseInt(id), body.data)
    if (!challenge) return reply.status(404).send({ error: 'Defi introuvable' })

    return challenge
  })

  // DELETE /api/challenges/:id - Supprimer un defi
  fastify.delete('/challenges/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const deleted = deleteChallenge(parseInt(id))
    if (!deleted) return reply.status(404).send({ error: 'Defi introuvable' })

    return { success: true }
  })

  // POST /api/challenges/reorder - Changer l'ordre des defis
  // Body: { ids: [3, 1, 2, 4] } (tableau d'IDs dans le nouvel ordre)
  fastify.post('/challenges/reorder', async (request, reply) => {
    const body = z.object({ ids: z.array(z.number()) }).safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'ids doit etre un tableau de nombres' })
    }

    reorderChallenges(body.data.ids)
    return { success: true }
  })

  // POST /api/challenges/reset - Reinitialiser aux defis par defaut
  fastify.post('/challenges/reset', async () => {
    resetToDefaultChallenges()
    return getAllChallenges()
  })

  // GET /api/challenges/export - Exporter tous les defis en JSON
  fastify.get('/challenges/export', async (_, reply) => {
    const challenges = getAllChallenges()
    reply.header('Content-Disposition', 'attachment; filename="challenges.json"')
    return challenges
  })

  // POST /api/challenges/import - Importer des defis depuis JSON
  // Le body doit etre un tableau de defis (meme format que l'export)
  fastify.post('/challenges/import', async (request, reply) => {
    const body = z.array(ChallengeSchema).safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Format invalide. Utilise le fichier exporte par cette application.' })
    }

    // Creer chaque defi importe
    const created = body.data.map((c) => createChallenge(c))
    return reply.status(201).send(created)
  })
}
