import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
} from 'lucide-react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'

import { createClient } from '../lib/supabase/client'

const navigation = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard },
  { to: '/opportunities', label: 'Opportunities', icon: BriefcaseBusiness },
  { to: '/resumes', label: 'Resumes', icon: FileText },
  { to: '/profile', label: 'Profile', icon: UserRound },
] as const

export function AppShell({
  children,
  email,
}: {
  children: ReactNode
  email: string | null
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  async function signOut() {
    setSigningOut(true)
    setSignOutError(null)
    try {
      const { error } = await createClient().auth.signOut()
      if (error) throw error
      await router.invalidate()
      await navigate({ to: '/login' })
    } catch {
      setSignOutError('Unable to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        <Link to="/app" className="workspace-brand">
          <span className="workspace-brand-mark" aria-hidden="true">
            C
          </span>
          <span>
            Career<span className="font-normal">OS</span>
          </span>
        </Link>
        <div className="workspace-sidebar-section">WORKSPACE</div>
        <nav aria-label="Main navigation" className="workspace-nav">
          {navigation.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === '/app' }}
              className="workspace-nav-link"
              activeProps={{ className: 'workspace-nav-link is-active' }}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="workspace-sidebar-bottom">
          <div className="workspace-account">
            <span className="workspace-avatar" aria-hidden="true">
              {email?.charAt(0).toUpperCase() || 'C'}
            </span>
            <span className="min-w-0">
              <strong>Your workspace</strong>
              <small title={email ?? undefined}>{email}</small>
            </span>
          </div>
          <button
            type="button"
            className="workspace-signout"
            onClick={signOut}
            disabled={signingOut}
          >
            <LogOut size={16} aria-hidden="true" />{' '}
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
          {signOutError && (
            <p role="alert" className="workspace-signout-error">
              {signOutError}
            </p>
          )}
        </div>
      </aside>

      <div className="workspace-main-area">
        <header className="workspace-mobile-header">
          <Link to="/app" className="workspace-mobile-brand">
            Career<span>OS</span>
          </Link>
          <button
            type="button"
            className="workspace-menu-button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>
        {menuOpen && (
          <nav aria-label="Mobile navigation" className="workspace-mobile-nav">
            {navigation.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="workspace-mobile-link"
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="workspace-mobile-link"
            >
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </nav>
        )}
        {children}
      </div>
    </div>
  )
}
