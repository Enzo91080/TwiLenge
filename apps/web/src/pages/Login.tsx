import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Twitch, XCircle, Gamepad2 } from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

export function Login({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [searchParams] = useSearchParams()
  const authResult = searchParams.get('auth')
  const authReason = searchParams.get('reason')

  const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.status.get })

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
            <p className="text-fortnite-muted text-sm mt-1">Dashboard pour streamers</p>
          </div>
        </div>

        {/* Erreur OAuth */}
        {authResult === 'error' && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              {authReason === 'no_credentials' && "L'application n'est pas configurée (TWITCH_CLIENT_ID manquant)."}
              {authReason === 'token_exchange' && "Erreur lors de l'échange de token. Contacte l'administrateur."}
              {!['no_credentials', 'token_exchange'].includes(authReason ?? '') && 'Erreur de connexion. Réessaie.'}
            </div>
          </div>
        )}

        {/* Connexion */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto">
                <Twitch className="w-7 h-7 text-purple-400" />
              </div>
              <p className="text-white font-semibold">Connecte-toi avec Twitch</p>
              <p className="text-fortnite-muted text-sm">
                Accède à ton dashboard et configure ton bot depuis les Paramètres.
              </p>
            </div>

            {status && !status.appConfigured && (
              <p className="text-amber-400 text-xs text-center">
                ⚠️ TWITCH_CLIENT_ID non configuré dans le .env du serveur.
              </p>
            )}

            <Button className="w-full" asChild>
              <a href="/auth/dashboard">
                <Twitch className="w-4 h-4" />
                Se connecter avec Twitch
              </a>
            </Button>

            <p className="text-xs text-fortnite-muted/60 text-center">
              URL de callback :{' '}
              <code className="text-fortnite-yellow">{status?.authCallbackUrl ?? 'http://localhost:3001/auth/callback'}</code>
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
