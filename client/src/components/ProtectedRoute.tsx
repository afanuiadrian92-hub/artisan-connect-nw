import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth, UserRole } from '../context/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]   // if omitted, any authenticated user can enter
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Wraps any route that requires authentication.
// Three possible outcomes:
//   1. Still loading session from localStorage → show spinner
//   2. Not logged in → redirect to /login
//   3. Wrong role (e.g. customer trying /admin) → redirect to their own dashboard
//   4. Correct role → render the page
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()

  // Case 1 — session check in progress
  // Without this, the page flashes a redirect before localStorage is read
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Case 2 — not authenticated at all
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
    // `replace` means the login page replaces this history entry
    // so pressing Back doesn't loop the user back to a protected page
  }

  // Case 3 — authenticated but wrong role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the correct dashboard for their actual role
    const roleRedirect: Record<UserRole, string> = {
      customer: '/customer',
      artisan:  '/artisan',
      admin:    '/admin',
    }
    return <Navigate to={roleRedirect[user.role]} replace />
  }

  // Case 4 — authenticated and correct role
  return <>{children}</>
}