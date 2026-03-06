// =============================================================
// SIDEBAR — Navigation principale + statuts de connexion
// =============================================================
// Affiche la navigation, le statut du serveur WebSocket ET
// le statut de la connexion Twitch du streameur.
// =============================================================

import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  List,
  History,
  Settings,
  Wifi,
  WifiOff,
  Gamepad2,
  Twitch,
  AlertCircle,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { api } from '../lib/api'

interface SidebarProps {
  connected: boolean
  hasActiveSession: boolean
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/challenges', label: 'Défis', icon: List },
  { to: '/history', label: 'Historique', icon: History },
  { to: '/settings', label: 'Paramètres', icon: Settings },
]

export function Sidebar({ connected, hasActiveSession }: SidebarProps) {
  // Statut de connexion Twitch — rafraîchi toutes les 30s
  const { data: authStatus } = useQuery({
    queryKey: ['auth-status'],
    queryFn: api.auth.status,
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const twitchConnected = authStatus?.connected ?? false
  const twitchChannel = authStatus?.channel

  return (
    <aside className="w-56 bg-fortnite-card border-r border-fortnite-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-fortnite-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-fortnite-yellow/10 flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-fortnite-yellow" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight">Challenge Hub</div>
            <div className="text-xs text-fortnite-muted">Fortnite Stream</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-fortnite-yellow/10 text-fortnite-yellow font-medium'
                  : 'text-fortnite-muted hover:text-white hover:bg-white/5',
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Statuts en bas */}
      <div className="p-3 border-t border-fortnite-border space-y-1.5">
        {/* Session active */}
        {hasActiveSession && (
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-xs text-green-400 font-medium">Session active</span>
          </div>
        )}

        {/* Connexion Twitch */}
        <div
          className={cn(
            'flex items-center gap-2 px-2.5 py-2 rounded-lg border',
            twitchConnected
              ? 'bg-purple-500/10 border-purple-500/20'
              : 'bg-fortnite-darker border-fortnite-border',
          )}
          title={twitchConnected ? `Connecté en tant que @${twitchChannel}` : 'Twitch non connecté — va dans Paramètres'}
        >
          {twitchConnected ? (
            <Twitch className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-fortnite-muted shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className={cn('text-xs font-medium truncate', twitchConnected ? 'text-purple-300' : 'text-fortnite-muted')}>
              {twitchConnected ? `@${twitchChannel}` : 'Twitch non connecté'}
            </div>
          </div>
        </div>

        {/* Connexion serveur WebSocket */}
        <div
          className={cn(
            'flex items-center gap-2 px-2.5 py-2 rounded-lg border',
            connected
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-red-500/10 border-red-500/20',
          )}
        >
          {connected ? (
            <Wifi className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
          )}
          <span className={cn('text-xs font-medium', connected ? 'text-blue-400' : 'text-red-400')}>
            {connected ? 'Serveur connecté' : 'Déconnecté'}
          </span>
        </div>
      </div>
    </aside>
  )
}
