// =============================================================
// PAGE PARAMÈTRES — Onboarding guidé étape par étape
// =============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ExternalLink, CheckCircle, XCircle,
  Twitch, Server, Bot, Zap, Copy, Save, Eye, EyeOff,
  Check, Lock, ChevronDown, Monitor,
} from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { cn } from '../lib/utils'

// =============================================================
// COMPOSANT ÉTAPE
// =============================================================

type StepStatus = 'done' | 'current' | 'locked'

function SetupStep({
  number, title, description, status, autoExpand = true, children,
}: {
  number: number
  title: string
  description: string
  status: StepStatus
  autoExpand?: boolean
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(() => autoExpand && status === 'current')

  useEffect(() => {
    if (status === 'locked') { setExpanded(false); return }
    if (!autoExpand) return
    if (status === 'done') setExpanded(false)
    else if (status === 'current') setExpanded(true)
  }, [status, autoExpand])

  const canToggle = status !== 'locked'

  return (
    <Card className={cn(
      'overflow-hidden transition-colors',
      status === 'current' && 'border-fortnite-yellow/25',
      status === 'done' && 'border-green-500/20',
      status === 'locked' && 'opacity-50',
    )}>
      {/* En-tête cliquable */}
      <button
        className={cn(
          'w-full flex items-center gap-3 p-4 text-left',
          canToggle && 'hover:bg-white/[0.02] transition-colors',
        )}
        onClick={() => canToggle && setExpanded(e => !e)}
        disabled={!canToggle}
      >
        {/* Numéro / check */}
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all',
          status === 'done' && 'bg-green-500/15 text-green-400',
          status === 'current' && 'bg-fortnite-yellow/15 text-fortnite-yellow ring-1 ring-fortnite-yellow/20',
          status === 'locked' && 'bg-fortnite-border text-fortnite-muted/50',
        )}>
          {status === 'done' ? <Check className="w-3.5 h-3.5" /> : number}
        </div>

        {/* Titre + description */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-sm font-semibold leading-tight',
            status === 'locked' ? 'text-fortnite-muted/60' : 'text-white',
          )}>
            {title}
          </div>
          <div className="text-xs text-fortnite-muted mt-0.5">{description}</div>
        </div>

        {/* Indicateur droit */}
        <div className="flex items-center gap-2 shrink-0">
          {status === 'done' && !expanded && (
            <span className="text-xs font-medium text-green-400 hidden sm:block">Terminé</span>
          )}
          {canToggle ? (
            <ChevronDown className={cn(
              'w-4 h-4 text-fortnite-muted/60 transition-transform duration-200',
              expanded && 'rotate-180',
            )} />
          ) : (
            <Lock className="w-3.5 h-3.5 text-fortnite-muted/30" />
          )}
        </div>
      </button>

      {/* Contenu */}
      {expanded && (
        <div className="border-t border-fortnite-border/50 p-4 space-y-4">
          {children}
        </div>
      )}
    </Card>
  )
}

// =============================================================
// BARRE DE PROGRESSION
// =============================================================

function SetupProgress({ step1Done, step2Done }: { step1Done: boolean; step2Done: boolean }) {
  const steps = [
    { label: 'API', done: step1Done },
    { label: 'Auth', done: step2Done },
    { label: 'Bot', done: false },
    { label: 'OBS', done: false },
  ]
  const doneCount = steps.filter(s => s.done).length

  // Masquer si tout est configuré
  if (step1Done && step2Done) return null

  return (
    <div className="space-y-2 px-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-fortnite-muted uppercase tracking-widest">Progression</span>
        <span className="text-xs text-fortnite-muted tabular-nums">{doneCount} / {steps.length}</span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((step, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 h-1 rounded-full transition-all duration-700',
              i < doneCount ? 'bg-green-400' :
              i === doneCount ? 'bg-fortnite-yellow/60' :
              'bg-fortnite-border',
            )}
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex-1 text-center">
            <span className={cn(
              'text-xs',
              i < doneCount ? 'text-green-400' :
              i === doneCount ? 'text-fortnite-yellow' :
              'text-fortnite-muted/40',
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================
// PAGE PRINCIPALE
// =============================================================

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

  const [twitchForm, setTwitchForm] = useState({ clientId: '', clientSecret: '' })
  const [showSecret, setShowSecret] = useState(false)
  const [twitchSaved, setTwitchSaved] = useState(false)

  useEffect(() => {
    setTwitchForm({
      clientId: settings['twitch_client_id'] ?? '',
      clientSecret: '',
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

  const step1Done = status?.twitchConfigured ?? false
  const step2Done = authStatus?.connected ?? false
  const wsToken = settings['ws_token'] ?? ''
  const overlayBase = `${window.location.origin}/overlay`
  const overlayTokenParam = wsToken ? `token=${wsToken}` : ''
  const overlayUrl = (extra?: string) => {
    const params = [overlayTokenParam, extra].filter(Boolean).join('&')
    return params ? `${overlayBase}?${params}` : overlayBase
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-2xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-white">Paramètres</h1>

      {/* Bannières résultat OAuth */}
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
              {authReason === 'token_exchange' && "Erreur lors de l'échange de token. Vérifie le Client Secret."}
              {authReason === 'no_credentials' && 'Client ID ou Client Secret manquant.'}
              {!authReason && 'Erreur inconnue.'}
            </div>
          </div>
        </div>
      )}

      {/* Barre de progression */}
      <SetupProgress step1Done={step1Done} step2Done={step2Done} />

      {/* ─── ÉTAPE 1 : Créer une application Twitch ─── */}
      <SetupStep
        number={1}
        title="Créer une application Twitch"
        description="Configure ton Client ID et Client Secret depuis le portail développeur"
        status={step1Done ? 'done' : 'current'}
      >
        <p className="text-sm text-fortnite-muted">
          Crée une application sur{' '}
          <a href="https://dev.twitch.tv/console" target="_blank" rel="noopener noreferrer"
            className="text-purple-400 underline underline-offset-2 inline-flex items-center gap-1">
            dev.twitch.tv/console <ExternalLink className="w-3 h-3" />
          </a>{' '}
          et entre tes identifiants ci-dessous.
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

        {/* URL de callback */}
        {status?.authCallbackUrl && (
          <div className="p-3 rounded-lg bg-fortnite-darker border border-fortnite-border space-y-1.5">
            <p className="text-xs font-semibold text-white">
              URL de callback à enregistrer dans la Twitch Developer Console :
            </p>
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
      </SetupStep>

      {/* ─── ÉTAPE 2 : Connexion OAuth ─── */}
      <SetupStep
        number={2}
        title="Connecter ton compte Twitch"
        description="Autorise le bot à accéder à ton channel en temps réel"
        status={!step1Done ? 'locked' : step2Done ? 'done' : 'current'}
      >
        {step2Done ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              {authStatus?.profileImageUrl ? (
                <img src={authStatus.profileImageUrl} alt={authStatus.channel}
                  className="w-12 h-12 rounded-full border-2 border-purple-500/40 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Twitch className="w-6 h-6 text-purple-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white">@{authStatus?.channel}</div>
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
            <div className="flex items-center gap-3 p-3 rounded-xl bg-fortnite-darker border border-fortnite-border">
              <div className="w-10 h-10 rounded-full bg-fortnite-border/60 flex items-center justify-center shrink-0">
                <Twitch className="w-5 h-5 text-fortnite-muted" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Non connecté</div>
                <div className="text-xs text-fortnite-muted">
                  Clique sur le bouton pour autoriser l'accès à ton channel.
                </div>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="/auth/twitch">
                <Twitch className="w-4 h-4" />
                Connecter avec Twitch
              </a>
            </Button>
          </div>
        )}
      </SetupStep>

      {/* ─── ÉTAPE 3 : Bot & Channel Points ─── */}
      <SetupStep
        number={3}
        title="Activer les fonctionnalités"
        description="Configure le bot chat et les Channel Points Twitch"
        status={!step2Done ? 'locked' : 'current'}
        autoExpand={false}
      >
        {/* Toggles */}
        <div className="divide-y divide-fortnite-border/50">
          <div className="flex items-center justify-between pb-3">
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
              <div className="text-xs text-fortnite-muted">Active un défi aléatoire via rachat de points</div>
            </div>
            <Switch
              checked={settings['channel_points_enabled'] === 'true'}
              onCheckedChange={(v) => settingsMut.mutate({ channel_points_enabled: v ? 'true' : 'false' })}
              disabled={settingsMut.isPending}
            />
          </div>
        </div>

        {/* Commandes du bot */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-fortnite-muted uppercase tracking-wider">
            Commandes du bot
          </p>
          <div className="space-y-0.5">
            {[
              { key: 'defi',     cmd: '!defi',     who: 'Chat', desc: 'Défi en cours' },
              { key: 'score',    cmd: '!score',    who: 'Chat', desc: 'Compteurs de la session' },
              { key: 'prochains',cmd: '!prochains',who: 'Chat', desc: '3 prochains défis' },
              { key: 'vote',     cmd: '!vote <n>', who: 'Chat', desc: 'Voter pour le défi n°n' },
              { key: 'ok',       cmd: '!ok',       who: 'Toi',  desc: 'Valider le défi' },
              { key: 'fail',     cmd: '!fail',     who: 'Toi',  desc: 'Échouer le défi' },
              { key: 'skip',     cmd: '!skip',     who: 'Toi',  desc: 'Passer le défi' },
            ].map(({ key, cmd, who, desc }) => {
              const enabled = isCmdEnabled(key)
              return (
                <div key={cmd} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/3 transition-colors">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleCmd(key, v)}
                    disabled={settingsMut.isPending}
                  />
                  <code className={cn('text-sm shrink-0 w-24 transition-colors', enabled ? 'text-fortnite-yellow' : 'text-fortnite-muted/40 line-through')}>
                    {cmd}
                  </code>
                  <span className="text-fortnite-muted/60 text-xs shrink-0 w-10">{who}</span>
                  <span className={cn('text-sm transition-colors', enabled ? 'text-white/70' : 'text-fortnite-muted/40')}>
                    {desc}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </SetupStep>

      {/* ─── ÉTAPE 4 : Overlay OBS ─── */}
      <SetupStep
        number={4}
        title="Configurer l'overlay OBS"
        description="Ajoute l'overlay comme Browser Source dans OBS Studio"
        status={!step2Done ? 'locked' : 'current'}
        autoExpand={false}
      >
        <div className="flex items-start gap-3 p-3 rounded-lg bg-fortnite-darker border border-fortnite-border">
          <Monitor className="w-5 h-5 text-fortnite-muted shrink-0 mt-0.5" />
          <p className="text-sm text-fortnite-muted">
            Dans OBS Studio → <strong className="text-white">Sources</strong> → <strong className="text-white">+</strong> → <strong className="text-white">Browser Source</strong>. Colle une des URLs ci-dessous. L'overlay n'apparaît que quand un défi est actif.
          </p>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Haut droite (défaut)', url: overlayUrl() },
            { label: 'Haut gauche', url: overlayUrl('position=top-left') },
            { label: 'Bas droite', url: overlayUrl('position=bottom-right') },
            { label: 'Bas gauche', url: overlayUrl('position=bottom-left') },
          ].map(({ label, url }) => (
            <div key={url} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-fortnite-darker border border-fortnite-border group hover:border-fortnite-border/80 transition-colors">
              <div className="min-w-0">
                <div className="font-medium text-white text-sm">{label}</div>
                <code className="text-xs text-fortnite-yellow/70 truncate block">{url}</code>
              </div>
              <Button
                variant="ghost" size="icon"
                onClick={() => copyToClipboard(url)}
                title="Copier l'URL"
                className="shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-fortnite-muted/60">
          Paramètres supplémentaires :{' '}
          <code className="text-fortnite-yellow/50">?scale=1.5</code> pour zoomer,{' '}
          <code className="text-fortnite-yellow/50">?theme=light</code> pour le thème clair.
        </p>
      </SetupStep>

      {/* ─── Statut serveur (toujours visible) ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="w-4 h-4 text-fortnite-muted" />
            Statut du serveur
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-fortnite-border/50">
          <StatusRow icon={<Server className="w-4 h-4" />} label="Serveur"
            value={`Port ${status?.port ?? 3001}`} ok={true} />
          <StatusRow icon={<Twitch className="w-4 h-4" />} label="Config Twitch"
            value={status?.twitchConfigured ? 'Configuré' : 'Non configuré'}
            ok={status?.twitchConfigured ?? false} />
          <StatusRow icon={<Bot className="w-4 h-4" />} label="Bot Twitch"
            value={status?.botEnabled ? 'Actif' : 'Désactivé'}
            ok={status?.botEnabled ?? false} />
          <StatusRow icon={<Zap className="w-4 h-4" />} label="Channel Points"
            value={status?.channelPointsEnabled ? 'Actif' : 'Désactivé'}
            ok={status?.channelPointsEnabled ?? false} />
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================
// COMPOSANTS UTILITAIRES
// =============================================================

function StatusRow({ icon, label, value, ok }: {
  icon: React.ReactNode; label: string; value: string; ok: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        <span className="text-fortnite-muted/60 shrink-0">{icon}</span>
        <span className="text-sm text-fortnite-muted">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white">{value}</span>
        {ok
          ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
          : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
        }
      </div>
    </div>
  )
}
