import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export type UserRole = 'customer' | 'artisan' | 'admin'

export interface AuthUser {
  id: number
  fullName: string
  email: string
  role: UserRole
  division: string
  token: string
  avatarInitials: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (userData: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const STORAGE_KEY = 'trustlink_user'

// ─── AuthProvider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on app start
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored)
        if (parsed.token && parsed.role && parsed.id) {
          setUser(parsed)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = (userData: AuthUser) => {
    const enriched: AuthUser = {
      ...userData,
      avatarInitials: getInitials(userData.fullName),
    }
    setUser(enriched)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched))
  }

  // logout only clears state and storage.
  // Navigation to /login is handled by the caller (AppSidebar)
  // using React Router's useNavigate — keeping navigation
  // inside components where the Router context is available.
  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: user !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── useAuth ──────────────────────────────────────────────────────────────────
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}