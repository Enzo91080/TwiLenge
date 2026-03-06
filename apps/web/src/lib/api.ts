// =============================================================
// CLIENT API
// =============================================================
// Toutes les fonctions qui communiquent avec le serveur.
// Si tu changes le port du serveur dans .env,
// change aussi VITE_API_URL dans apps/web/.env.local
// =============================================================

import type { Challenge, AppState, Session, SessionChallenge } from '@challenge-hub/shared'

const API_BASE = '/api'

// Fonction helper pour faire des requetes et gerer les erreurs
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (options?.body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Erreur ${res.status}`)
  }

  return res.json()
}

// Les routes /auth/* sont enregistrees SANS prefixe /api sur le serveur.
// On utilise une fonction separee qui n'ajoute pas /api, afin que le proxy
// Vite (et la prod Fastify) les trouve correctement sur /auth/...
async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (options?.body) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, { headers, ...options })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Erreur ${res.status}`)
  }

  return res.json()
}

// --- DEFIS ---

export const api = {
  challenges: {
    list: () => request<Challenge[]>('/challenges'),
    create: (data: Omit<Challenge, 'id' | 'createdAt'>) =>
      request<Challenge>('/challenges', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Omit<Challenge, 'id' | 'createdAt'>>) =>
      request<Challenge>(`/challenges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/challenges/${id}`, { method: 'DELETE' }),
    reorder: (ids: number[]) =>
      request<{ success: boolean }>('/challenges/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
    reset: () => request<Challenge[]>('/challenges/reset', { method: 'POST' }),
    exportUrl: `${API_BASE}/challenges/export`,
    import: (challenges: Partial<Challenge>[]) =>
      request<Challenge[]>('/challenges/import', { method: 'POST', body: JSON.stringify(challenges) }),
  },

  session: {
    // Etat complet de la session en cours
    get: () => request<AppState>('/session'),
    start: () => request<AppState>('/session/start', { method: 'POST' }),
    end: () => request<{ success: boolean; session: Session }>('/session/end', { method: 'POST' }),
    // Activer un defi specifique (id = id du SessionChallenge, pas du Challenge)
    activate: (sessionChallengeId: number) =>
      request<AppState>(`/session/activate/${sessionChallengeId}`, { method: 'POST' }),
    complete: () => request<AppState>('/session/complete', { method: 'POST' }),
    fail: () => request<AppState>('/session/fail', { method: 'POST' }),
    skip: () => request<AppState>('/session/skip', { method: 'POST' }),
    spin: () => request<AppState>('/session/spin', { method: 'POST' }),
    timer: {
      start: () => request<{ success: boolean; secondsLeft: number }>('/session/timer/start', { method: 'POST' }),
      stop: () => request<{ success: boolean }>('/session/timer/stop', { method: 'POST' }),
    },
  },

  history: {
    list: () => request<(Session & { challenges: SessionChallenge[] })[]>('/history'),
    get: (id: number) => request<Session & { challenges: SessionChallenge[] }>(`/history/${id}`),
  },

  settings: {
    get: () => request<Record<string, string>>('/settings'),
    update: (data: Record<string, string>) =>
      request<Record<string, string>>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  status: {
    get: () => request<{
      twitchConfigured: boolean
      twitchChannel: string | null
      botEnabled: boolean
      channelPointsEnabled: boolean
      port: number
    }>('/status'),
  },

  auth: {
    status: () => authRequest<{ connected: boolean; channel?: string; login?: string; profileImageUrl?: string | null; reason?: string }>('/auth/status'),
    twitchUrl: '/auth/twitch',
    logout: () => authRequest<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  },
}
