// AdminLayout — shell for all /admin/* routes.
// Redirects to /login if unauthenticated. Each page handles its own 403 check.

import { NavLink, Outlet, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Users2,
  Mail, Flag, Settings, ArrowLeft, Palette,
} from 'lucide-react'

const NAV = [
  { to: '/admin',            label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/admin/users',      label: 'Users',        icon: Users },
  { to: '/admin/posts',      label: 'Posts',        icon: FileText },
  { to: '/admin/groups',     label: 'Groups',       icon: Users2 },
  { to: '/admin/invites',    label: 'Invites',      icon: Mail },
  { to: '/admin/moderation', label: 'Moderation',   icon: Flag },
  { to: '/admin/themes',     label: 'Themes',       icon: Palette },
  { to: '/admin/settings',   label: 'Settings',     icon: Settings },
]

export default function AdminLayout() {
  const { user, sessionChecked } = useSelector((s) => s.auth)

  if (!sessionChecked) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-secondary text-secondary-content flex flex-col overflow-y-auto">
        <div className="px-5 pt-6 pb-4 border-b border-secondary-content/20">
          <p className="font-display text-3xl tracking-widest leading-none">ADMIN</p>
          <p className="font-ui text-xs uppercase tracking-widest opacity-50 mt-1">Control Panel</p>
        </div>

        <nav className="flex flex-col py-4 flex-1" aria-label="Admin navigation">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 font-ui text-xs uppercase tracking-widest transition-colors ${
                  isActive
                    ? 'bg-secondary-content/15 border-l-2 border-primary text-secondary-content'
                    : 'text-secondary-content/60 hover:text-secondary-content hover:bg-secondary-content/10 border-l-2 border-transparent'
                }`
              }
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-secondary-content/20">
          <Link
            to="/"
            className="flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-secondary-content/50 hover:text-secondary-content transition-colors"
          >
            <ArrowLeft size={12} />
            Back to Site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-base-100">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
