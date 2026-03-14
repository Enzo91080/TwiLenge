// =============================================================
// TYPES PARTAGES entre le serveur, le dashboard et l'overlay
// =============================================================
// Si tu ajoutes une nouvelle propriete a un defi ou une session,
// c'est ici qu'il faut la declarer en premier.
// =============================================================

// --- CATEGORIES DE DEFIS ---
// Pour ajouter une categorie, ajoute-la ici ET dans ChallengeForm.tsx
export type ChallengeCategory =
  | 'elimination'
  | 'placement'
  | 'loadout'
  | 'chaos'
  | 'custom'

// --- DIFFICULTES ---
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard'

// --- STATUT D'UN DEFI DANS UNE SESSION ---
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped'

// --- DEFI (tel que stocke en base de donnees) ---
export interface Challenge {
  id: number
  title: string
  description: string
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  // Duree du timer en secondes (null = pas de timer)
  timerSeconds: number | null
  // Ordre d'affichage dans la liste
  sortOrder: number
  createdAt: string
}

// --- SESSION DE STREAM ---
export interface Session {
  id: number
  startedAt: string
  endedAt: string | null
  notes: string
}

// --- DEFI D'UNE SESSION (avec son statut) ---
export interface SessionChallenge {
  id: number
  sessionId: number
  challengeId: number
  status: ChallengeStatus
  activatedAt: string | null
  completedAt: string | null
  // Donnees du defi source (joints depuis la table challenges)
  challenge: Challenge
}

// --- ETAT GLOBAL DIFFUSE VIA WEBSOCKET ---
// C'est ce que le serveur envoie a tous les clients connectes
// quand quelque chose change.
export interface AppState {
  session: Session | null
  activeChallenge: SessionChallenge | null
  pendingChallenges: SessionChallenge[]
  completedCount: number
  failedCount: number
  skippedCount: number
  // Timer en cours (secondes restantes, null si pas de timer)
  timerSecondsLeft: number | null
  // Votes du chat { challengeId: nombreDeVotes }
  votes: Record<number, number>
}

// --- EVENEMENTS WEBSOCKET ---
// Chaque evenement a un "type" et des "data" specifiques.
// Le client (dashboard/overlay) ecoute ces evenements et met a jour l'UI.
export type WSEvent =
  | { type: 'STATE_SYNC'; data: AppState }
  | { type: 'CHALLENGE_ACTIVATED'; data: SessionChallenge }
  | { type: 'CHALLENGE_COMPLETED'; data: SessionChallenge }
  | { type: 'CHALLENGE_FAILED'; data: SessionChallenge }
  | { type: 'CHALLENGE_SKIPPED'; data: SessionChallenge }
  | { type: 'SESSION_STARTED'; data: Session }
  | { type: 'SESSION_ENDED'; data: Session }
  | { type: 'TIMER_TICK'; data: { secondsLeft: number } }
  | { type: 'TIMER_EXPIRED'; data: null }
  | { type: 'TIMER_STOPPED'; data: null }
  | { type: 'VOTE_UPDATE'; data: Record<number, number> }
  | { type: 'WHEEL_SPUN'; data: { activated: SessionChallenge; challenges: SessionChallenge[] } }
  | { type: 'REDEMPTION_LOGGED'; data: Redemption }

// --- CHANNEL POINTS : RACHAT TRACÉ ---

export interface Redemption {
  id: number
  // Session en cours au moment du rachat (null si aucune session active)
  sessionId: number | null
  // Pseudo Twitch du viewer
  userName: string
  // Nom de la récompense rachetée
  rewardName: string
  // Description du défi activé (null si échec)
  challengeDescription: string | null
  success: boolean
  // Raison de l'échec (null si succès)
  failReason: string | null
  redeemedAt: string
}

// --- CHANNEL POINTS : MAPPINGS RECOMPENSE → ACTION ---

export interface ChannelPointsMapping {
  // Nom exact de la récompense Twitch (comparaison insensible à la casse)
  rewardName: string
}

// --- STYLE VISUEL DE L'OVERLAY ---
export type OverlayStyle = 'gaming' | 'minimal' | 'neon' | 'banner' | 'pill'

// Catalogue des styles disponibles (label + description pour l'UI)
export const OVERLAY_STYLES: Record<OverlayStyle, { label: string; description: string }> = {
  gaming:  { label: 'Gaming',   description: 'Card sombre avec coin coupé, style HUD gaming' },
  minimal: { label: 'Minimal',  description: 'Fond semi-transparent discret et épuré' },
  neon:    { label: 'Néon',     description: 'Fond noir avec effets lumineux néon colorés' },
  banner:  { label: 'Bannière', description: 'Bande horizontale large, idéal en haut de scène' },
  pill:    { label: 'Pill',     description: 'Pastille compacte, très discrète' },
}

// --- PARAMETRES DE L'OVERLAY ---
// Recuperes depuis l'URL (ex: ?position=top-right&theme=dark&style=gaming)
export interface OverlayParams {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  theme: 'dark' | 'light'
  scale: number
  style: OverlayStyle
}

// --- LABELS LISIBLES PAR LES HUMAINS ---

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  elimination: 'Elimination',
  placement: 'Placement',
  loadout: 'Loadout',
  chaos: 'Chaos',
  custom: 'Custom',
}

export const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
}

export const STATUS_LABELS: Record<ChallengeStatus, string> = {
  pending: 'En attente',
  active: 'En cours',
  completed: 'Complete',
  failed: 'Echoue',
  skipped: 'Passe',
}
