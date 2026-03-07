import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Gamepad2, Twitch } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { BottomNav } from './components/BottomNav'
import { Dashboard } from './pages/Dashboard'
import { Challenges } from './pages/Challenges'
import { History } from './pages/History'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { useWebSocket } from './hooks/useWebSocket'
import { Toaster } from './components/ui/Toaster'
import { WSContext } from './lib/context'
import { api } from './lib/api'
import { cn } from './lib/utils'

export default function App() {
  const ws = useWebSocket()

  const { data: sessionData, isLoading: isSessionLoading, refetch: refetchSession } = useQuery({
    queryKey: ['session-status'],
    queryFn: api.auth.session,
    staleTime: 60_000,
    retry: false,
  })

  const { data: authStatus, isLoading: isAuthStatusLoading } = useQuery({
    queryKey: ['auth-status'],
    queryFn: api.auth.status,
    enabled: sessionData?.authenticated === true,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const isAuthenticated = sessionData?.authenticated === true
  const twitchConnected = authStatus?.connected ?? false
  // On attend que le statut Twitch soit chargé avant de restreindre les routes
  const twitchStatusReady = !isAuthenticated || !isAuthStatusLoading

  if (isSessionLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-fortnite-darker">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-fortnite-yellow/15 flex items-center justify-center animate-pulse">
            <Gamepad2 className="w-6 h-6 text-fortnite-yellow" />
          </div>
          <div className="text-fortnite-muted text-sm">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login onAuthenticated={() => refetchSession()} />
  }

  return (
    <WSContext.Provider value={ws}>
      <div className="flex h-full flex-col md:flex-row">

        <Sidebar
          connected={ws.connected}
          hasActiveSession={twitchConnected && !!ws.appState.session}
          twitchConnected={twitchConnected}
          twitchChannel={authStatus?.channel}
          twitchAvatar={authStatus?.profileImageUrl}
        />

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <MobileHeader
            connected={ws.connected}
            hasActiveSession={twitchConnected && !!ws.appState.session}
            twitchConnected={twitchConnected}
            twitchAvatar={authStatus?.profileImageUrl}
            twitchChannel={authStatus?.channel}
          />

          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            <Routes>
              {twitchStatusReady && !twitchConnected ? (
                // Twitch non connecté : seuls les Paramètres sont accessibles
                <>
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/settings" replace />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/challenges" element={<Challenges />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </main>
        </div>

        <BottomNav
          hasActiveSession={twitchConnected && !!ws.appState.session}
          twitchConnected={twitchConnected}
        />
      </div>

      <Toaster />
    </WSContext.Provider>
  )
}

function MobileHeader({
  connected,
  hasActiveSession,
  twitchConnected,
  twitchAvatar,
  twitchChannel,
}: {
  connected: boolean
  hasActiveSession: boolean
  twitchConnected: boolean
  twitchAvatar?: string | null
  twitchChannel?: string
}) {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-fortnite-card border-b border-fortnite-border shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-fortnite-yellow/15 flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-fortnite-yellow" />
        </div>
        <span className="font-bold text-white text-sm">Challenge Hub</span>
        {hasActiveSession && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
      </div>

      <div className="flex items-center gap-2.5">
        {twitchConnected ? (
          twitchAvatar ? (
            <img src={twitchAvatar} alt={twitchChannel} className="w-6 h-6 rounded-full border border-purple-500/40" />
          ) : (
            <Twitch className="w-4 h-4 text-purple-400" />
          )
        ) : (
          <Twitch className="w-4 h-4 text-fortnite-muted/50" />
        )}
        <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-blue-400' : 'bg-red-400 animate-pulse')} />
      </div>
    </header>
  )
}
