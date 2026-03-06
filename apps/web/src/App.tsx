import { Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Challenges } from './pages/Challenges'
import { History } from './pages/History'
import { Settings } from './pages/Settings'
import { useWebSocket } from './hooks/useWebSocket'
import { Toaster } from './components/ui/Toaster'
import { WSContext } from './lib/context'

export default function App() {
  const ws = useWebSocket()

  return (
    // On partage l'etat WebSocket via Context pour eviter le prop drilling
    <WSContext.Provider value={ws}>
      <div className="flex h-full">
        <Sidebar connected={ws.connected} hasActiveSession={!!ws.appState.session} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      {/* Notifications toast pour les evenements importants */}
      <Toaster />
    </WSContext.Provider>
  )
}
