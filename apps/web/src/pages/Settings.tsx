// =============================================================
// PAGE PARAMÈTRES
// =============================================================
// Configure l'intégration Twitch et les options de l'application.
// =============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { ExternalLink, CheckCircle, XCircle, AlertTriangle, Twitch, Server, Bot, Zap } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Separator } from '../components/ui/separator'
import { cn } from '../lib/utils'

export function Settings() {
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const authResult = searchParams.get('auth')
  const authReason = searchParams.get('reason')

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: api.status.get,
  })

  const { data: authStatus, refetch: refetchAuth } = useQuery({
    queryKey: ['auth-status'],
    queryFn: api.auth.status,
  })

  useEffect(() => {
    if (authResult) refetchAuth()
  }, [authResult, refetchAuth])

  const logoutMut = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auth-status'] }),
  })

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Paramètres</h1>

      {/* Retour d'auth Twitch */}
      {authResult === 'success' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-900/30 border border-green-500/30 text-green-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-medium">Twitch connecté avec succès !</div>
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
              {authReason === 'no_code' && 'Autorisation annulée.'}
              {authReason === 'token_exchange' && "Erreur lors de l'échange de token. Vérifie TWITCH_CLIENT_SECRET dans .env"}
              {!authReason && 'Erreur inconnue. Vérifie la configuration dans .env'}
            </div>
          </div>
        </div>
      )}

      {/* Connexion Twitch — section principale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitch className="w-5 h-5 text-purple-400" />
            Connexion Twitch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.twitchConfigured ? (
            // Twitch non configuré dans .env
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-900/20 border border-yellow-500/20">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-300/80">
                <p className="font-medium text-yellow-300 mb-2">Twitch non configuré</p>
                <p>Remplis les variables suivantes dans le fichier <code className="bg-black/30 px-1.5 py-0.5 rounded text-xs">.env</code> :</p>
                <ul className="mt-2 space-y-1 font-mono text-xs bg-black/20 rounded-lg p-3">
                  <li>TWITCH_CLIENT_ID=...</li>
                  <li>TWITCH_CLIENT_SECRET=...</li>
                  <li>TWITCH_CHANNEL=ton_nom_de_chaine</li>
                </ul>
                <p className="mt-3">
                  <a
                    href="https://dev.twitch.tv/console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 underline underline-offset-2"
                  >
                    Obtenir les clés sur dev.twitch.tv →
                  </a>
                </p>
              </div>
            </div>
          ) : authStatus?.connected ? (
            // Connecté
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Twitch className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">@{authStatus.channel}</div>
                  <div className="text-sm text-purple-400/80">Connecté — bot et channel points actifs</div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => logoutMut.mutate()}
                disabled={logoutMut.isPending}
              >
                Se déconnecter de Twitch
              </Button>
            </div>
          ) : (
            // Configuré mais pas connecté
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-fortnite-darker border border-fortnite-border">
                <div className="w-10 h-10 rounded-full bg-fortnite-border flex items-center justify-center shrink-0">
                  <Twitch className="w-5 h-5 text-fortnite-muted" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Non connecté</div>
                  <div className="text-sm text-fortnite-muted">
                    Autorise l'accès à ton compte Twitch pour activer le bot et les channel points.
                  </div>
                </div>
              </div>
              <Button asChild>
                <a href="/auth/twitch">
                  <Twitch className="w-4 h-4" />
                  Connecter avec Twitch
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statut du serveur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-4 h-4 text-fortnite-muted" />
            Statut du serveur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatusRow
            icon={<Server className="w-4 h-4" />}
            label="Serveur"
            value={`Port ${status?.port ?? 3001}`}
            ok={true}
          />
          <Separator />
          <StatusRow
            icon={<Twitch className="w-4 h-4" />}
            label="Configuration Twitch"
            value={status?.twitchConfigured ? 'Configuré' : 'Non configuré (.env)'}
            ok={status?.twitchConfigured ?? false}
          />
          <Separator />
          <StatusRow
            icon={<Bot className="w-4 h-4" />}
            label="Bot Twitch"
            value={status?.botEnabled ? 'Actif' : 'Désactivé'}
            ok={status?.botEnabled ?? false}
          />
          <Separator />
          <StatusRow
            icon={<Zap className="w-4 h-4" />}
            label="Channel Points"
            value={status?.channelPointsEnabled ? 'Actif' : 'Désactivé'}
            ok={status?.channelPointsEnabled ?? false}
          />
        </CardContent>
      </Card>

      {/* Liens utiles */}
      <Card>
        <CardHeader>
          <CardTitle>Liens utiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <LinkRow
            label="Overlay OBS"
            url="http://localhost:5174"
            description="À coller dans OBS comme Browser Source"
          />
          <LinkRow
            label="Overlay (coin bas-droite)"
            url="http://localhost:5174?position=bottom-right"
            description="Exemple avec position personnalisée"
          />
          <LinkRow
            label="API du serveur"
            url="http://localhost:3001/api/status"
            description="Statut de l'API (développeurs)"
          />
        </CardContent>
      </Card>

      {/* Commandes bot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-fortnite-muted" />
            Commandes du bot Twitch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {[
              { cmd: '!defi', who: 'Tout le monde', desc: 'Affiche le défi en cours' },
              { cmd: '!score', who: 'Tout le monde', desc: 'Affiche le score de la session' },
              { cmd: '!prochains', who: 'Tout le monde', desc: 'Liste les 3 prochains défis' },
              { cmd: '!vote <n>', who: 'Tout le monde', desc: 'Voter pour le défi n° n' },
              { cmd: '!ok', who: 'Streameur', desc: 'Valider le défi en cours' },
              { cmd: '!fail', who: 'Streameur', desc: 'Échouer le défi en cours' },
              { cmd: '!skip', who: 'Streameur', desc: 'Passer le défi en cours' },
            ].map(({ cmd, who, desc }) => (
              <div
                key={cmd}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/3 transition-colors"
              >
                <code className="text-fortnite-yellow w-28 shrink-0 text-sm">{cmd}</code>
                <span className="text-fortnite-muted w-28 shrink-0 text-xs">{who}</span>
                <span className="text-white/70 text-sm">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- COMPOSANTS INTERNES ---

function StatusRow({
  icon,
  label,
  value,
  ok,
}: {
  icon: React.ReactNode
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        <span className={cn('shrink-0', ok ? 'text-fortnite-muted' : 'text-fortnite-muted/50')}>{icon}</span>
        <span className="text-sm text-fortnite-muted">{label}</span>
      </div>
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
    <div className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-fortnite-darker border border-fortnite-border">
      <div className="min-w-0">
        <div className="font-medium text-white text-sm">{label}</div>
        <div className="text-xs text-fortnite-muted">{description}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <code className="text-xs text-fortnite-yellow bg-black/30 px-2 py-1 rounded truncate max-w-[180px]">
          {url}
        </code>
        <Button variant="ghost" size="icon" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      </div>
    </div>
  )
}
