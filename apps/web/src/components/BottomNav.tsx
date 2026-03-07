// =============================================================
// NAVIGATION MOBILE — Barre de navigation en bas de l'écran
// =============================================================
// Visible uniquement sur mobile/tablette (md:hidden).
// Remplace la sidebar pour les petits écrans.
// =============================================================

import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, History, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

const allNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: true },
  { to: '/challenges', label: 'Défis', icon: List, requiresAuth: true },
  { to: '/history', label: 'Historique', icon: History, requiresAuth: true },
  { to: '/settings', label: 'Réglages', icon: Settings, requiresAuth: false },
]

interface BottomNavProps {
  hasActiveSession: boolean
  twitchConnected: boolean
}

export function BottomNav({ hasActiveSession, twitchConnected }: BottomNavProps) {
  const navItems = twitchConnected
    ? allNavItems
    : allNavItems.filter((item) => !item.requiresAuth)

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-fortnite-card/95 backdrop-blur border-t border-fortnite-border safe-area-pb">
      <div className="flex items-stretch">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors relative',
                isActive ? 'text-fortnite-yellow' : 'text-fortnite-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Indicateur actif */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-fortnite-yellow rounded-full" />
                )}

                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {/* Badge session active sur Dashboard */}
                  {to === '/' && hasActiveSession && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse border border-fortnite-card" />
                  )}
                  {/* Badge connexion requise sur Réglages */}
                  {to === '/settings' && !twitchConnected && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400 border border-fortnite-card" />
                  )}
                </div>

                <span className="font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
