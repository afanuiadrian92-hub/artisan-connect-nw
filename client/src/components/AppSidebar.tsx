// ─── AppSidebar ───────────────────────────────────────────────────────────────
// Single shared sidebar component used by CustomerDashboard,
// ArtisanDashboard, and AdminDashboard.
//
// Each role gets its own nav items — everything else is shared.
// This replaces the duplicated Sidebar function inside each dashboard file.

import { useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wrench, Home, Search, CalendarDays, Settings, LogOut, X,
  User, LayoutDashboard, ClipboardCheck, AlertTriangle, Users,
} from 'lucide-react'
import { useAuth, UserRole } from '../context/AuthContext'
import LogoutDialog from './LogoutDialog'

// ─── Types ────────────────────────────────────────────────────────────────────
interface NavItem {
  icon: ReactNode
  label: string
  href: string
}

interface AppSidebarProps {
  open: boolean
  onClose: () => void
  activeHref: string   // the current page's href so the active style applies
}

// ─── Nav items per role ───────────────────────────────────────────────────────
const navByRole: Record<UserRole, NavItem[]> = {
  customer: [
    { icon: <Home size={18} />,         label: 'Dashboard',     href: '/customer'          },
    { icon: <Search size={18} />,       label: 'Find Services', href: '/search'            },
    { icon: <CalendarDays size={18} />, label: 'My Bookings',   href: '/customer/bookings' },
    { icon: <Settings size={18} />,     label: 'Settings',      href: '/settings'          },
  ],
  artisan: [
    { icon: <Home size={18} />,         label: 'Dashboard',      href: '/artisan'          },
    { icon: <User size={18} />,         label: 'Profile & Docs', href: '/artisan/profile'  },
    { icon: <CalendarDays size={18} />, label: 'Bookings',       href: '/artisan/bookings' },
    { icon: <Settings size={18} />,     label: 'Settings',       href: '/settings'         },
  ],
  admin: [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard',          href: '/admin'             },
    { icon: <ClipboardCheck size={18} />, label: 'Verification Queue',  href: '/admin/verification'},
    { icon: <AlertTriangle size={18} />,  label: 'Disputes',            href: '/admin/disputes'    },
    { icon: <Users size={18} />,          label: 'User Management',     href: '/admin/users'       },
    { icon: <Settings size={18} />,       label: 'Settings',            href: '/settings'          },
  ],
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────
export default function AppSidebar({ open, onClose, activeHref }: AppSidebarProps) {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const [showLogout, setShowLogout] = useState(false)

  // If somehow rendered without a user, show nothing
  if (!user) return null

  const navItems = navByRole[user.role]

  const handleLogoutConfirm = () => {
    logout()                // clears user from context + localStorage
    navigate('/login')      // redirect to sign in page
  }

  return (
    <>
      {/* Confirmation dialog — renders above everything */}
      <LogoutDialog
        open={showLogout}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogout(false)}
      />

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-slate-900 z-40 flex flex-col
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Wrench size={17} className="text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">
            Trust<span className="text-amber-400">Link</span>
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = item.href === activeHref
            return (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-900/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </a>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-slate-700 flex flex-col gap-2">
          {/* User avatar + name pulled from real AuthContext */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold leading-none truncate">
                {user.fullName}
              </p>
              <p className="text-slate-400 text-xs mt-0.5 capitalize">{user.role}</p>
            </div>
          </div>

          {/* Sign out — opens confirmation dialog */}
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 text-sm font-medium transition-all w-full"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}