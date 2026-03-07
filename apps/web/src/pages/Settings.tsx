// =============================================================
// PAGE PARAMÈTRES
// =============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ExternalLink, CheckCircle, XCircle, AlertTriangle,
  Twitch, Server, Bot, Zap, Copy, Save, Eye, EyeOff,
} from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { cn } from '../lib/utils'

export function Settings() {
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const authResult = searchParams.get('auth')
  const authReason = searchParams.get('reason')

  const { data: status, refetch: refetchStatus } = useQuery({ queryKey: ['status'], queryFn: api.status.get })
  const { data: authStatus, refetch: refetchAuth } = useQuery({
    queryKey: ['auth-status'],
    queryFn: api.auth.status,
  })

  useEffect(() => {
    if (authResult) {
      refetchAuth()
      refetchStatus()
    }
  }, [authResult, refetchAuth, refetchStatus])

  const logoutMut = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-status'] })
      qc.invalidateQueries({ queryKey: ['status'] })
    },
  })

const { data: settings = {} } = useQuery({ queryKey: ['settings'], queryFn: api.settings.get })
  const settingsMut = useMutation({
    mutationFn: api.settings.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['status'] })
    },
  })

  // --- Config Twitch locale (formulaire) ---
  const [twitchForm, setTwitchForm] = useState({ clientId: '', clientSecret: '' })
  const [showSecret, setShowSecret] = useState(false)
  const [twitchSaved, setTwitchSaved] = useState(false)

  // Pre-remplir depuis les settings recus
  useEffect(() => {
    setTwitchForm({
      clientId: settings['twitch_client_id'] ?? '',
      clientSecret: '', // jamais retourné par l'API (securite)
    })
  }, [settings])

  const saveTwitchConfig = () => {
    const data: Record<string, string> = {
      twitch_client_id: twitchForm.clientId.trim(),
    }
    if (twitchForm.clientSecret) {
      data['twitch_client_secret'] = twitchForm.clientSecret.trim()
    }
    settingsMut.mutate(data, {
      onSuccess: () => {
        setTwitchSaved(true)
        setTimeout(() => setTwitchSaved(false), 3000)
        qc.invalidateQueries({ queryKey: ['status'] })
      },
    })
  }

  const isCmdEnabled = (key: string) => settings[`bot_cmd_${key}`] !== 'false'
  const toggleCmd = (key: string, enabled: boolean) =>
    settingsMut.mutate({ [`bot_cmd_${key}`]: enabled ? 'true' : 'false' })

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text).catch(() => {})

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-white">Paramètres</h1>

      {/* Bannière succès/erreur OAuth */}
      {authResult === 'success' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-900/30 border border-green-500/30 text-green-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-semibold">Twitch connecté avec succès !</div>
            <div className="text-sm opacity-80">Le bot et les channel points sont maintenant actifs.</div>
          </div>
        </div>
      )}
      {authResult === 'error' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400">
          <XCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-semibold">Erreur de connexion Twitch</div>
            <div className="text-sm opacity-80">
              {authReason === 'no_code' && 'Autorisation annulée.'}
              {authReason === 'token_exchange' && 'Erreur lors de l\'échange de token. Vérifie le Client Secret.'}
              {authReason === 'no_credentials' && 'Client ID ou Client Secret manquant.'}
              {!authReason && 'Erreur inconnue.'}
            </div>
          </div>
        </div>
      )}

        {/* Connexion OAuth Twitch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitch className="w-5 h-5 text-purple-400" />
            Connexion Twitch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.twitchConfigured ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/20">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-300/80">
                Remplis d'abord la configuration ci-dessus (Client ID, Secret, Channel) puis sauvegarde.
              </p>
            </div>
          ) : authStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                {authStatus.profileImageUrl ? (
                  <img src={authStatus.profileImageUrl} alt={authStatus.channel}
                    className="w-12 h-12 rounded-full border-2 border-purple-500/40 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Twitch className="w-6 h-6 text-purple-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white">@{authStatus.channel}</div>
                  <div className="text-sm text-purple-400/80">Connecté · bot et channel points actifs</div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              </div>
              <Button variant="destructive" size="sm"
                onClick={() => logoutMut.mutate()} disabled={logoutMut.isPending}>
                Se déconnecter de Twitch
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-fortnite-darker border border-fortnite-border">
                <div className="w-12 h-12 rounded-full bg-fortnite-border flex items-center justify-center shrink-0">
                  <Twitch className="w-6 h-6 text-fortnite-muted" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">Non connecté</div>
                  <div className="text-sm text-fortnite-muted">
                    Autorise l'accès à ton compte Twitch pour activer le bot.
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


      {/* Configuration Twitch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitch className="w-5 h-5 text-purple-400" />
            Configuration Twitch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-fortnite-muted">
            Crée une application sur{' '}
            <a href="https://dev.twitch.tv/console" target="_blank" rel="noopener noreferrer"
              className="text-purple-400 underline underline-offset-2">
              dev.twitch.tv/console
            </a>{' '}
            pour obtenir ton Client ID et Secret.
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Client ID</Label>
              <Input
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twitchForm.clientId}
                onChange={(e) => setTwitchForm({ ...twitchForm, clientId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder={settings['twitch_client_id'] ? '(déjà configuré — laisser vide pour conserver)' : 'xxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                  value={twitchForm.clientSecret}
                  onChange={(e) => setTwitchForm({ ...twitchForm, clientSecret: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fortnite-muted hover:text-white"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* URL Callback à enregistrer */}
          {status?.authCallbackUrl && (
            <div className="p-3 rounded-lg bg-fortnite-darker border border-fortnite-border space-y-1.5">
              <p className="text-xs font-semibold text-white">URL à enregistrer dans Twitch Developer Console :</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-fortnite-yellow break-all flex-1">{status.authCallbackUrl}</code>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(status.authCallbackUrl)}
                  title="Copier" className="shrink-0 h-7 w-7">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={saveTwitchConfig}
            disabled={settingsMut.isPending || !twitchForm.clientId}
            variant={twitchSaved ? 'success' : 'default'}
            className="w-full"
          >
            {twitchSaved
              ? <><CheckCircle className="w-4 h-4" /> Sauvegardé !</>
              : <><Save className="w-4 h-4" /> Sauvegarder la configuration</>
            }
          </Button>
        </CardContent>
      </Card>

    
      {/* Statut serveur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="w-4 h-4 text-fortnite-muted" />
            Statut du serveur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-fortnite-border/50">
          <StatusRow icon={<Server className="w-4 h-4" />} label="Serveur" value={`Port ${status?.port ?? 3001}`} ok={true} />
          <StatusRow icon={<Twitch className="w-4 h-4" />} label="Config Twitch" value={status?.twitchConfigured ? 'Configuré' : 'Non configuré'} ok={status?.twitchConfigured ?? false} />
          <StatusRow icon={<Bot className="w-4 h-4" />} label="Bot Twitch" value={status?.botEnabled ? 'Actif' : 'Désactivé'} ok={status?.botEnabled ?? false} />
          <StatusRow icon={<Zap className="w-4 h-4" />} label="Channel Points" value={status?.channelPointsEnabled ? 'Actif' : 'Désactivé'} ok={status?.channelPointsEnabled ?? false} />
        </CardContent>
      </Card>

      {/* Options Bot & Channel Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="w-4 h-4 text-fortnite-muted" />
            Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-fortnite-border/50">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-white font-medium">Bot chat actif</div>
              <div className="text-xs text-fortnite-muted">Répond aux commandes dans le chat</div>
            </div>
            <Switch
              checked={settings['bot_enabled'] === 'true'}
              onCheckedChange={(v) => settingsMut.mutate({ bot_enabled: v ? 'true' : 'false' })}
              disabled={settingsMut.isPending}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-white font-medium">Channel Points actifs</div>
              <div className="text-xs text-fortnite-muted">Active un défi via rachat de points</div>
            </div>
            <Switch
              checked={settings['channel_points_enabled'] === 'true'}
              onCheckedChange={(v) => settingsMut.mutate({ channel_points_enabled: v ? 'true' : 'false' })}
              disabled={settingsMut.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Liens utiles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Liens utiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <LinkRow label="Overlay OBS" url="http://localhost:5174" description="Browser Source pour OBS" />
          <LinkRow label="Overlay (coin bas-droite)" url="http://localhost:5174?position=bottom-right" description="Exemple avec position personnalisée" />
        </CardContent>
      </Card>

      {/* Commandes bot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="w-4 h-4 text-fortnite-muted" />
            Commandes du bot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0.5">
            {[
              { key: 'defi', cmd: '!defi', who: 'Chat', desc: 'Défi en cours' },
              { key: 'score', cmd: '!score', who: 'Chat', desc: 'Compteurs de la session' },
              { key: 'prochains', cmd: '!prochains', who: 'Chat', desc: '3 prochains défis' },
              { key: 'vote', cmd: '!vote <n>', who: 'Chat', desc: 'Voter pour le défi n°n' },
              { key: 'ok', cmd: '!ok', who: 'Toi', desc: 'Valider le défi' },
              { key: 'fail', cmd: '!fail', who: 'Toi', desc: 'Échouer le défi' },
              { key: 'skip', cmd: '!skip', who: 'Toi', desc: 'Passer le défi' },
            ].map(({ key, cmd, who, desc }) => {
              const enabled = isCmdEnabled(key)
              return (
                <div key={cmd} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/3 transition-colors">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleCmd(key, v)}
                    disabled={settingsMut.isPending}
                  />
                  <code className={cn('text-sm shrink-0 w-24 transition-colors', enabled ? 'text-fortnite-yellow' : 'text-fortnite-muted/40 line-through')}>{cmd}</code>
                  <span className="text-fortnite-muted/60 text-xs shrink-0 w-10">{who}</span>
                  <span className={cn('text-sm transition-colors', enabled ? 'text-white/70' : 'text-fortnite-muted/40')}>{desc}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusRow({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        <span className="text-fortnite-muted/60 shrink-0">{icon}</span>
        <span className="text-sm text-fortnite-muted">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white">{value}</span>
        {ok ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
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
      <Button variant="ghost" size="icon" asChild className="shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </Button>
    </div>
  )
}
