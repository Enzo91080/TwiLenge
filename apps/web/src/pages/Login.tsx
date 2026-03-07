import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Twitch, XCircle, Gamepad2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function Login({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [searchParams] = useSearchParams()
  const authResult = searchParams.get('auth')
  const authReason = searchParams.get('reason')

  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.status.get })
  const twitchConfigured = status?.twitchConfigured ?? false

  const [form, setForm] = useState({ clientId: '', clientSecret: '' })
  const [showSecret, setShowSecret] = useState(false)

  const setupMut = useMutation({
    mutationFn: api.auth.setup,
    onSuccess: () => {
      window.location.href = '/auth/dashboard'
    },
  })

  return (
    <div className="min-h-screen bg-fortnite-darker flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-fortnite-yellow/15 flex items-center justify-center mx-auto">
            <Gamepad2 className="w-8 h-8 text-fortnite-yellow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Challenge Hub</h1>
            <p className="text-fortnite-muted text-sm mt-1">Dashboard Fortnite pour streamers</p>
          </div>
        </div>

        {/* Erreur OAuth */}
        {authResult === 'error' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              {authReason === 'wrong_account' && 'Ce compte Twitch ne correspond pas au channel configuré.'}
              {authReason === 'no_credentials' && 'Client ID ou Secret manquants.'}
              {authReason === 'token_exchange' && "Erreur lors de l'échange de token. Vérifie ton Client Secret."}
              {!['wrong_account', 'no_credentials', 'token_exchange'].includes(authReason ?? '') && 'Erreur de connexion. Réessaie.'}
            </div>
          </div>
        )}

        {/* Cas 1 : pas encore configuré → formulaire initial */}
        {!twitchConfigured ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Twitch className="w-5 h-5 text-purple-400" />
                Configuration initiale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-fortnite-muted">
                Crée une application sur{' '}
                <a href="https://dev.twitch.tv/console" target="_blank" rel="noopener noreferrer"
                  className="text-purple-400 underline underline-offset-2 inline-flex items-center gap-1">
                  dev.twitch.tv/console <ExternalLink className="w-3 h-3" />
                </a>{' '}
                puis entre tes identifiants ci-dessous. Tu pourras tout configurer dans les Paramètres après connexion.
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Client ID</Label>
                  <Input
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={form.clientSecret}
                      onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fortnite-muted hover:text-white">
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {setupMut.isError && (
                <p className="text-red-400 text-sm">{(setupMut.error as Error).message}</p>
              )}

              <Button
                className="w-full"
                onClick={() => setupMut.mutate(form)}
                disabled={setupMut.isPending || !form.clientId || !form.clientSecret}
              >
                <Twitch className="w-4 h-4" />
                {setupMut.isPending ? 'Connexion...' : 'Configurer et se connecter'}
              </Button>

              <p className="text-xs text-fortnite-muted/60 text-center">
                URL de callback à enregistrer sur Twitch :{' '}
                <code className="text-fortnite-yellow">{status?.authCallbackUrl ?? 'http://localhost:3001/auth/callback'}</code>
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Cas 2 : déjà configuré → juste le bouton */
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
                  <Twitch className="w-7 h-7 text-purple-400" />
                </div>
                <p className="text-white font-semibold">Connecte-toi avec Twitch</p>
                <p className="text-fortnite-muted text-sm">
                  Accède au dashboard et configure ton bot depuis les Paramètres.
                </p>
              </div>

              <Button className="w-full" asChild>
                <a href="/auth/dashboard">
                  <Twitch className="w-4 h-4" />
                  Se connecter avec Twitch
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
