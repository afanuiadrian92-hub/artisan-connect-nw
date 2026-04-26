import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SearchPage     from './pages/customer/SearchPage'
import MyBookingsPage from './pages/customer/MyBookingsPage'

// Pages
import LandingPage       from './pages/shared/LandingPage'
import LoginPage         from './pages/shared/LoginPage'
import RegisterPage      from './pages/shared/RegisterPage'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import ArtisanDashboard  from './pages/artisan/ArtisanDashboard'
import ArtisanProfilePage from './pages/artisan/ArtisanProfilePage'
import AdminDashboard    from './pages/admin/AdminDashboard'
import SettingsPage from './pages/shared/SettingsPage'


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
      <Route path="/search"            element={<ProtectedRoute allowedRoles={['customer']}><SearchPage /></ProtectedRoute>} />
      <Route path="/customer/bookings" element={<ProtectedRoute allowedRoles={['customer']}><MyBookingsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/artisan/profile" element={<ProtectedRoute allowedRoles={['artisan']}><ArtisanProfilePage /></ProtectedRoute>}
/>

      {/* Protected routes — role-locked */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/artisan"
        element={
          <ProtectedRoute allowedRoles={['artisan']}>
            <ArtisanDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

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