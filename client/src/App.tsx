import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SearchPage     from './pages/customer/SearchPage'
import MyBookingsPage from './pages/customer/MyBookingsPage'

// Pages
import LandingPage          from './pages/shared/LandingPage'
import LoginPage            from './pages/shared/LoginPage'
import RegisterPage         from './pages/shared/RegisterPage'
import CustomerDashboard    from './pages/customer/CustomerDashboard'
import CustomerJobsPage from './pages/customer/CustomerJobsPage'
import PostJobPage          from './pages/customer/PostJobPage'
import ArtisanDashboard     from './pages/artisan/ArtisanDashboard'
import ArtisanProfilePage    from './pages/artisan/ArtisanProfilePage'
import ArtisanBookingsPage   from './pages/artisan/ArtisanBookingsPage'
import PublicArtisanProfile  from './pages/shared/PublicArtisanProfile'
import AdminDashboard        from './pages/admin/AdminDashboard'
import VerificationQueuePage from './pages/admin/VerificationQueuePage'
import AdminDisputesPage         from './pages/admin/AdminDisputesPage'
import UserManagementPage      from './pages/admin/UserManagementPage'
import SettingsPage          from './pages/shared/SettingsPage'


// ─── Smart redirect for already-logged-in users ───────────────────────────────
// If a logged-in user visits /login, send them to their dashboard
// instead of showing the login form again
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) return null  // wait for localStorage check to complete

  if (isAuthenticated && user) {
    const roleRoute: Record<string, string> = {
      customer: '/customer',
      artisan:  '/artisan',
      admin:    '/admin',
    }
    return <Navigate to={roleRoute[user.role]} replace />
  }

  return <>{children}</>
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes — anyone can visit */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth routes — redirect to dashboard if already logged in */}
      <Route path="/login"    element={<AuthRedirect><LoginPage /></AuthRedirect>} />
      <Route path="/register" element={<AuthRedirect><RegisterPage /></AuthRedirect>} />

      {/* Customer routes */}
      <Route path="/customer"          element={<ProtectedRoute allowedRoles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/customer/bookings" element={<ProtectedRoute allowedRoles={['customer']}><MyBookingsPage /></ProtectedRoute>} />
      <Route path="/search"            element={<ProtectedRoute allowedRoles={['customer']}><SearchPage /></ProtectedRoute>} />
      <Route path="/customer/jobs"     element={<ProtectedRoute allowedRoles={['customer']}><CustomerJobsPage /></ProtectedRoute>} />
      <Route path="/customer/post-job" element={<ProtectedRoute allowedRoles={['customer']}><PostJobPage /></ProtectedRoute>} />
      {/* Public artisan profile — customer views this when clicking "View Profile".
          IMPORTANT: This route /artisan/:id must stay ABOVE the /artisan exact
          route so React Router doesn't try to match "123" as a sub-path of /artisan.
          React Router v6 uses best-match scoring so order doesn't actually matter
          here, but keeping them adjacent makes the intent clear. */}
      <Route
        path="/artisan/:id"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <PublicArtisanProfile />
          </ProtectedRoute>
        }
      />

      {/* Artisan routes */}
      <Route path="/artisan"          element={<ProtectedRoute allowedRoles={['artisan']}><ArtisanDashboard /></ProtectedRoute>} />
      <Route path="/artisan/profile"  element={<ProtectedRoute allowedRoles={['artisan']}><ArtisanProfilePage /></ProtectedRoute>} />
      <Route path="/artisan/bookings" element={<ProtectedRoute allowedRoles={['artisan']}><ArtisanBookingsPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin"              element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/verification" element={<ProtectedRoute allowedRoles={['admin']}><VerificationQueuePage /></ProtectedRoute>} />
      <Route path="/admin/users"        element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
      <Route path="/admin/disputes"     element={<ProtectedRoute allowedRoles={['admin']}><AdminDisputesPage /></ProtectedRoute>} />
      {/* Shared routes — any authenticated role */}
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* Catch-all — any unknown URL goes to landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// AuthProvider wraps everything so useAuth() works in every component
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}