import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Mail, Lock, Eye, EyeOff, Users, ShieldCheck, Clock } from 'lucide-react'
import { useAuth, UserRole, AuthUser } from '../../context/AuthContext'

type Role = UserRole

interface RightPanelStat {
  value: string
  label: string
  icon: React.ReactNode
}

const panelStats: RightPanelStat[] = [
  { value: '500+', label: 'Active Users',  icon: <Users size={18} className="text-amber-400" /> },
  { value: '98%',  label: 'Trust Score',   icon: <ShieldCheck size={18} className="text-amber-400" /> },
  { value: '24/7', label: 'Support',       icon: <Clock size={18} className="text-amber-400" /> },
]

const roleRoute: Record<UserRole, string> = {
  customer: '/customer',
  artisan:  '/artisan',
  admin:    '/admin',
}

function RoleTab({ role, label, active, onClick }: {
  role: Role; label: string; active: boolean; onClick: (r: Role) => void
}) {
  return (
    <button
      onClick={() => onClick(role)}
      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
        active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}

function LoginForm() {
  const { login }   = useAuth()
  const navigate    = useNavigate()

  const [role, setRole]                 = useState<Role>('customer')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const handleSubmit = async () => {
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      // ── Uncomment when backend is ready ──────────────────────────────────────
      // const res = await axios.post('/api/auth/login', { email, password, role })
      // login(res.data)
      // navigate(roleRoute[res.data.role])

      // ── Mock login — lets you test navigation right now ───────────────────────
      await new Promise((res) => setTimeout(res, 800))
      const mockUser: AuthUser = {
        id: 1,
        fullName: role === 'admin' ? 'Admin User' : role === 'artisan' ? 'John Artisan' : 'Jane Customer',
        email,
        role,
        division: 'Mezam',
        token: 'mock-jwt-token',
        avatarInitials: role === 'admin' ? 'AU' : role === 'artisan' ? 'JA' : 'JC',
      }
      login(mockUser)
      navigate(roleRoute[role])
    } catch {
      setError('Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-white w-full max-w-lg mx-auto">
      <a href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
          <Wrench size={20} className="text-white" />
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">
          Trust<span className="text-amber-500">Link</span>
        </span>
      </a>

      <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Welcome Back</h1>
      <p className="text-slate-500 text-sm mb-8">Sign in to continue to your account</p>

      <div className="w-full bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Login as</p>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <RoleTab role="customer" label="Customer" active={role === 'customer'} onClick={setRole} />
            <RoleTab role="artisan"  label="Artisan"  active={role === 'artisan'}  onClick={setRole} />
            <RoleTab role="admin"    label="Admin"    active={role === 'admin'}    onClick={setRole} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Email Address</label>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <Mail size={16} className="text-slate-400 shrink-0" />
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@example.com"
              className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <Lock size={16} className="text-slate-400 shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your password"
              className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
            />
            <button onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 accent-amber-500 rounded" />
            <span className="text-sm text-slate-600">Remember me</span>
          </label>
          <a href="/forgot-password" className="text-sm text-amber-500 hover:text-amber-600 font-medium">Forgot password?</a>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit} disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-200 transition-all hover:scale-[1.02]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <a href="/register" className="text-amber-500 hover:text-amber-600 font-semibold">Sign up</a>
        </p>
      </div>

      <a href="/" className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors">← Back to home</a>
    </div>
  )
}

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center bg-slate-800 px-12 py-16 text-white min-h-screen flex-1">
      <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mb-10 shadow-xl">
        <Wrench size={40} className="text-white" />
      </div>
      <h2 className="text-3xl font-extrabold text-center leading-tight mb-4">Connect with Trusted Artisans</h2>
      <p className="text-slate-400 text-center text-sm leading-relaxed max-w-xs mb-12">
        Join customers finding reliable local service providers or offer your expertise as a verified artisan across the North West Region.
      </p>
      <div className="flex gap-4 w-full max-w-sm">
        {panelStats.map((stat) => (
          <div key={stat.label} className="flex-1 bg-slate-700 rounded-xl px-3 py-4 flex flex-col items-center text-center">
            {stat.icon}
            <span className="text-xl font-extrabold text-white mt-1">{stat.value}</span>
            <span className="text-xs text-slate-400 mt-0.5">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex items-center justify-center">
        <LoginForm />
      </div>
      <BrandPanel />
    </div>
  )
}