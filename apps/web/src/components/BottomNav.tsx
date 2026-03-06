// =============================================================
// NAVIGATION MOBILE — Barre de navigation en bas de l'écran
// =============================================================
// Visible uniquement sur mobile/tablette (md:hidden).
// Remplace la sidebar pour les petits écrans.
// =============================================================

import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, List, History, Settings } from 'lucide-react'
import { cn } from '../lib/utils'
import { api } from '../lib/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/challenges', label: 'Défis', icon: List },
  { to: '/history', label: 'Historique', icon: History },
  { to: '/settings', label: 'Réglages', icon: Settings },
]

interface BottomNavProps {
  hasActiveSession: boolean
}

export function BottomNav({ hasActiveSession }: BottomNavProps) {
  const { data: authStatus } = useQuery({
    queryKey: ['auth-status'],
    queryFn: api.auth.status,
    staleTime: 20_000,
  })

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
                isActive
                  ? 'text-fortnite-yellow'
                  : 'text-fortnite-muted',
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
                  {/* Badge Twitch non connecté sur Réglages */}
                  {to === '/settings' && !authStatus?.connected && (
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
