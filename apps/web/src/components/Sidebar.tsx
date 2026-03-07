// =============================================================
// SIDEBAR — Navigation principale (desktop uniquement)
// =============================================================
// Cachée sur mobile : la navigation est gérée par BottomNav.tsx
// =============================================================

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  List,
  History,
  Settings,
  Wifi,
  WifiOff,
  Gamepad2,
  Twitch,
} from 'lucide-react'
import { cn } from '../lib/utils'

interface SidebarProps {
  connected: boolean
  hasActiveSession: boolean
  twitchConnected: boolean
  twitchChannel?: string
  twitchAvatar?: string | null
}

const mainNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/challenges', label: 'Défis', icon: List },
  { to: '/history', label: 'Historique', icon: History },
]

export function Sidebar({ connected, hasActiveSession, twitchConnected, twitchChannel, twitchAvatar }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-56 flex-col shrink-0 bg-gradient-to-b from-fortnite-card to-fortnite-darker border-r border-fortnite-border">

      {/* Logo */}
      <div className="p-4 border-b border-fortnite-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-fortnite-yellow/15 flex items-center justify-center shadow-inner ring-1 ring-fortnite-yellow/20">
            <Gamepad2 className="w-5 h-5 text-fortnite-yellow" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight tracking-tight">Challenge Hub</div>
            <div className="text-xs text-fortnite-muted">Fortnite Stream</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {/* Onglets principaux — visibles uniquement si Twitch connecté */}
        {twitchConnected ? (
          mainNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group',
                  isActive
                    ? 'bg-fortnite-yellow/10 text-fortnite-yellow font-semibold shadow-sm ring-1 ring-fortnite-yellow/15'
                    : 'text-fortnite-muted hover:text-white hover:bg-white/5',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0 transition-transform', isActive ? '' : 'group-hover:scale-110')} />
                  {label}
                </>
              )}
            </NavLink>
          ))
        ) : (
          /* Invitation à se connecter quand Twitch n'est pas lié */
          <div className="mx-1 mt-1 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
            <Twitch className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <p className="text-xs text-purple-300/80 leading-snug">
              Connecte ton compte Twitch pour accéder à toutes les fonctionnalités
            </p>
          </div>
        )}

        {/* Paramètres — toujours visible */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group',
              isActive
                ? 'bg-fortnite-yellow/10 text-fortnite-yellow font-semibold shadow-sm ring-1 ring-fortnite-yellow/15'
                : 'text-fortnite-muted hover:text-white hover:bg-white/5',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings className={cn('w-4 h-4 shrink-0 transition-transform', isActive ? '' : 'group-hover:scale-110')} />
              Paramètres
              {/* Point rouge si Twitch non connecté */}
              {!twitchConnected && (
                <div className="ml-auto w-2 h-2 rounded-full bg-red-400 shrink-0" />
              )}
            </>
          )}
        </NavLink>
      </nav>

      {/* Statuts */}
      <div className="p-3 border-t border-fortnite-border/60 space-y-1.5">
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
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-colors',
            twitchConnected
              ? 'bg-purple-500/10 border-purple-500/20'
              : 'bg-fortnite-darker border-fortnite-border',
          )}
        >
          {twitchConnected ? (
            twitchAvatar ? (
              <img src={twitchAvatar} alt={twitchChannel} className="w-5 h-5 rounded-full shrink-0 ring-1 ring-purple-500/30" />
            ) : (
              <Twitch className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            )
          ) : (
            <Twitch className="w-3.5 h-3.5 text-fortnite-muted/60 shrink-0" />
          )}
          <span className={cn('text-xs font-medium truncate', twitchConnected ? 'text-purple-300' : 'text-fortnite-muted/60')}>
            {twitchConnected ? `@${twitchChannel}` : 'Non connecté'}
          </span>
        </div>

        {/* Connexion serveur */}
        <div
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-colors',
            connected ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20',
          )}
        >
          {connected
            ? <Wifi className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            : <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
          }
          <span className={cn('text-xs font-medium', connected ? 'text-blue-400' : 'text-red-400')}>
            {connected ? 'Serveur connecté' : 'Déconnecté'}
          </span>
        </div>
      </div>
    </aside>
  )
}
