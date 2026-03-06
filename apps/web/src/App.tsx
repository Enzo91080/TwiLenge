import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Gamepad2, Wifi, WifiOff, Twitch } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { BottomNav } from './components/BottomNav'
import { Dashboard } from './pages/Dashboard'
import { Challenges } from './pages/Challenges'
import { History } from './pages/History'
import { Settings } from './pages/Settings'
import { useWebSocket } from './hooks/useWebSocket'
import { Toaster } from './components/ui/Toaster'
import { WSContext } from './lib/context'
import { api } from './lib/api'
import { cn } from './lib/utils'

export default function App() {
  const ws = useWebSocket()

  return (
    <WSContext.Provider value={ws}>
      <div className="flex h-full flex-col md:flex-row">

        {/* Sidebar — desktop uniquement */}
        <Sidebar connected={ws.connected} hasActiveSession={!!ws.appState.session} />

        {/* Zone principale */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Header mobile — caché sur desktop */}
          <MobileHeader
            connected={ws.connected}
            hasActiveSession={!!ws.appState.session}
          />

          {/* Contenu des pages */}
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Navigation bas — mobile uniquement */}
        <BottomNav hasActiveSession={!!ws.appState.session} />
      </div>

      <Toaster />
    </WSContext.Provider>
  )
}

// --- Header affiché uniquement sur mobile ---
function MobileHeader({
  connected,
  hasActiveSession,
}: {
  connected: boolean
  hasActiveSession: boolean
}) {
  const { data: authStatus } = useQuery({
    queryKey: ['auth-status'],
    queryFn: api.auth.status,
    staleTime: 20_000,
  })

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-fortnite-card border-b border-fortnite-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-fortnite-yellow/15 flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-fortnite-yellow" />
        </div>
        <span className="font-bold text-white text-sm">Challenge Hub</span>
        {hasActiveSession && (
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        )}
      </div>

      {/* Statuts */}
      <div className="flex items-center gap-2.5">
        {/* Twitch avatar ou icône */}
        {authStatus?.connected ? (
          authStatus.profileImageUrl ? (
            <img
              src={authStatus.profileImageUrl}
              alt={authStatus.channel}
              className="w-6 h-6 rounded-full border border-purple-500/40"
            />
          ) : (
            <Twitch className="w-4 h-4 text-purple-400" />
          )
        ) : (
          <Twitch className="w-4 h-4 text-fortnite-muted/50" />
        )}

        {/* Point serveur */}
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-blue-400' : 'bg-red-400 animate-pulse',
          )}
        />
      </div>
    </header>
  )
}
