// =============================================================
// PAGE PARAMETRES
// =============================================================
// Configure l'integration Twitch et les options de l'application.
// =============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'

export function Settings() {
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  // Lire les params d'URL pour les retours d'auth Twitch
  const authResult = searchParams.get('auth') // 'success' | 'error'
  const authReason = searchParams.get('reason')

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: api.status.get,
  })

  const { data: authStatus, refetch: refetchAuth } = useQuery({
    queryKey: ['auth-status'],
    queryFn: api.auth.status,
  })

  // Rafraichir le statut auth apres un retour OAuth
  useEffect(() => {
    if (authResult) refetchAuth()
  }, [authResult, refetchAuth])

  const logoutMut = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth-status'] }),
  })

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Parametres</h1>

      {/* Retour d'auth Twitch */}
      {authResult === 'success' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-900/30 border border-green-500/30 text-green-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-medium">Twitch connecte avec succes !</div>
            <div className="text-sm opacity-80">Le bot et les channel points sont maintenant actifs.</div>
          </div>
        </div>
      )}

      {authResult === 'error' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400">
          <XCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-medium">Erreur de connexion Twitch</div>
            <div className="text-sm opacity-80">
              {authReason === 'no_code' && 'Autorisation annulee.'}
              {authReason === 'token_exchange' && 'Erreur lors de l\'echange de token. Verifie TWITCH_CLIENT_SECRET dans .env'}
              {!authReason && 'Erreur inconnue. Verifie la configuration dans .env'}
            </div>
          </div>
        </div>
      )}

      {/* Statut du serveur */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-white">Statut du serveur</h2>
        <StatusRow label="Serveur" value={`Port ${status?.port ?? 3001}`} ok={true} />
        <StatusRow
          label="Configuration Twitch"
          value={status?.twitchConfigured ? 'Configure' : 'Non configure (.env)'}
          ok={status?.twitchConfigured ?? false}
        />
        <StatusRow
          label="Bot Twitch"
          value={status?.botEnabled ? 'Active' : 'Desactive'}
          ok={status?.botEnabled ?? false}
        />
        <StatusRow
          label="Channel Points"
          value={status?.channelPointsEnabled ? 'Active' : 'Desactive'}
          ok={status?.channelPointsEnabled ?? false}
        />
      </section>

      {/* Connexion Twitch */}
      <section className="card space-y-4">
        <h2 className="font-semibold text-white">Connexion Twitch</h2>

        {!status?.twitchConfigured ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/20">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-300/80">
              <p className="font-medium text-yellow-300 mb-1">Twitch non configure</p>
              <p>Pour activer le bot et les channel points, remplis les variables suivantes dans le fichier <code className="bg-black/30 px-1 rounded">.env</code> :</p>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                <li>TWITCH_CLIENT_ID=...</li>
                <li>TWITCH_CLIENT_SECRET=...</li>
                <li>TWITCH_CHANNEL=ton_nom_de_chaine</li>
              </ul>
              <p className="mt-2">
                <a
                  href="https://dev.twitch.tv/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 underline"
                >
                  Obtenir les cles sur dev.twitch.tv
                </a>
              </p>
            </div>
          </div>
        ) : authStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-900/20 border border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <div className="text-sm font-medium text-green-400">Connecte en tant que @{authStatus.channel}</div>
                <div className="text-xs text-green-400/60">Le bot et les channel points sont actifs</div>
              </div>
            </div>
            <button
              onClick={() => logoutMut.mutate()}
              className="btn-danger"
            >
              Se deconnecter de Twitch
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-fortnite-muted">
              Autorise l'application a acceder a ton compte Twitch pour activer le bot et les channel points.
            </p>
            <a
              href="/auth/twitch"
              className="btn-primary inline-flex"
            >
              <ExternalLink className="w-4 h-4" />
              Connecter Twitch
            </a>
          </div>
        )}
      </section>

      {/* Liens utiles */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-white">Liens utiles</h2>
        <div className="space-y-2 text-sm">
          <LinkRow
            label="Overlay OBS"
            url="http://localhost:5174"
            description="A coller dans OBS comme Browser Source"
          />
          <LinkRow
            label="Overlay (coin bas-droite)"
            url="http://localhost:5174?position=bottom-right"
            description="Exemple avec position personnalisee"
          />
          <LinkRow
            label="API du serveur"
            url="http://localhost:3001/api/status"
            description="Statut de l'API (developpeurs)"
          />
        </div>
      </section>

      {/* Commandes bot */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-white">Commandes du bot Twitch</h2>
        <div className="space-y-1.5 text-sm">
          {[
            { cmd: '!defi', who: 'Tout le monde', desc: 'Affiche le defi en cours' },
            { cmd: '!score', who: 'Tout le monde', desc: 'Affiche le score de la session' },
            { cmd: '!prochains', who: 'Tout le monde', desc: 'Liste les 3 prochains defis' },
            { cmd: '!vote <n>', who: 'Tout le monde', desc: 'Voter pour le defi n° n' },
            { cmd: '!ok', who: 'Streamer', desc: 'Valider le defi en cours' },
            { cmd: '!fail', who: 'Streamer', desc: 'Echouer le defi en cours' },
            { cmd: '!skip', who: 'Streamer', desc: 'Passer le defi en cours' },
          ].map(({ cmd, who, desc }) => (
            <div key={cmd} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-white/3">
              <code className="text-fortnite-yellow w-28 shrink-0">{cmd}</code>
              <span className="text-fortnite-muted w-24 shrink-0 text-xs">{who}</span>
              <span className="text-white/70">{desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// --- COMPOSANTS INTERNES ---

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-fortnite-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white">{value}</span>
        {ok
          ? <CheckCircle className="w-4 h-4 text-green-400" />
          : <XCircle className="w-4 h-4 text-red-400" />
        }
      </div>
    </div>
  )
}

function LinkRow({ label, url, description }: { label: string; url: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-fortnite-darker">
      <div>
        <div className="font-medium text-white">{label}</div>
        <div className="text-xs text-fortnite-muted">{description}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <code className="text-xs text-fortnite-yellow bg-black/30 px-2 py-1 rounded">{url}</code>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1.5">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}
