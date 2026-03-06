import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, History, Settings, Wifi, WifiOff, Gamepad2 } from 'lucide-react'
import { cn } from '../lib/utils'

interface SidebarProps {
  connected: boolean
  hasActiveSession: boolean
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/challenges', label: 'Defis', icon: List },
  { to: '/history', label: 'Historique', icon: History },
  { to: '/settings', label: 'Parametres', icon: Settings },
]

export function Sidebar({ connected, hasActiveSession }: SidebarProps) {
  return (
    <aside className="w-56 bg-fortnite-card border-r border-fortnite-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-fortnite-border">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-fortnite-yellow" />
          <div>
            <div className="font-bold text-sm text-white leading-tight">Challenge Hub</div>
            <div className="text-xs text-fortnite-muted">Fortnite Stream</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
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

      {/* Statut en bas */}
      <div className="p-3 border-t border-fortnite-border space-y-2">
        {/* Session active */}
        {hasActiveSession && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-green-500/10">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Session active</span>
          </div>
        )}

        {/* Connexion serveur */}
        <div className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg',
          connected ? 'bg-blue-500/10' : 'bg-red-500/10',
        )}>
          {connected
            ? <Wifi className="w-3.5 h-3.5 text-blue-400" />
            : <WifiOff className="w-3.5 h-3.5 text-red-400" />
          }
          <span className={cn('text-xs font-medium', connected ? 'text-blue-400' : 'text-red-400')}>
            {connected ? 'Serveur connecte' : 'Deconnecte'}
          </span>
        </div>
      </div>
    </aside>
  )
}
