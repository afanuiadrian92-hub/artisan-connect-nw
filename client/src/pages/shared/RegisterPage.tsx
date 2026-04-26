import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wrench, User, Mail, Phone, MapPin,
  Lock, Eye, EyeOff, CheckCircle2
} from 'lucide-react'
import { useAuth, UserRole, AuthUser } from '../../context/AuthContext'
import { quarterNames } from '../../data/nwRegionData'

type Intent = 'customer' | 'artisan'

interface Step { number: number; label: string }

const steps: Step[] = [
  { number: 1, label: 'Search for services in your area' },
  { number: 2, label: 'Book verified artisans instantly'  },
  { number: 3, label: 'Rate your experience'             },
]

const roleRoute: Record<UserRole, string> = {
  customer: '/customer',
  artisan:  '/artisan',
  admin:    '/admin',
}

function InputField({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
      <span className="text-slate-400 shrink-0">{icon}</span>
      {children}
    </div>
  )
}

function RegisterForm() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [intent, setIntent]                   = useState<Intent>('customer')
  const [fullName, setFullName]               = useState('')
  const [email, setEmail]                     = useState('')
  const [phone, setPhone]                     = useState('')
  const [quarter, setQuarter]                 = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)
  const [agreed, setAgreed]                   = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')

  const validate = (): string => {
    if (!fullName.trim())             return 'Full name is required.'
    if (!email.includes('@'))         return 'Enter a valid email address.'
    if (!phone.trim())                return 'Phone number is required.'
    if (!quarter)                     return 'Please select your quarter.'
    if (password.length < 8)          return 'Password must be at least 8 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    if (!agreed)                      return 'You must agree to the Terms of Service.'
    return ''
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    try {
      await new Promise((res) => setTimeout(res, 800))
      // TODO: replace with real API call
      // const res = await axios.post('/api/auth/register', {
      //   fullName, email, phone, quarter, password, role: intent
      // })
      const role: UserRole = intent === 'artisan' ? 'artisan' : 'customer'
      const mockUser: AuthUser = {
        id: Date.now(),
        fullName,
        email,
        role,
        division: quarter,
        token: 'mock-jwt-token',
        avatarInitials: (fullName.split(' ').map(p => p[0]).join('')).toUpperCase().slice(0, 2),
      }
      login(mockUser)
      navigate(roleRoute[role])
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-white w-full max-w-lg mx-auto">
      <a href="/" className="flex items-center gap-2 mb-6">
        <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
          <Wrench size={20} className="text-white" />
        </div>
        <span className="font-bold text-xl text-slate-800 tracking-tight">
          Trust<span className="text-amber-500">Link</span>
        </span>
      </a>

      <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Create Account</h1>
      <p className="text-slate-500 text-sm mb-6">Join our community of trusted service providers</p>

      <div className="w-full bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
        {/* Intent toggle */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">I want to</p>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['customer', 'artisan'] as Intent[]).map((i) => (
              <button
                key={i}
                onClick={() => setIntent(i)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  intent === i ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {i === 'customer' ? 'Find Services' : 'Offer Services'}
              </button>
            ))}
          </div>
        </div>

        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Full Name</label>
          <InputField icon={<User size={16} />}>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none" />
          </InputField>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Email Address</label>
          <InputField icon={<Mail size={16} />}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none" />
          </InputField>
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Phone Number</label>
          <InputField icon={<Phone size={16} />}>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none" />
          </InputField>
        </div>

        {/* Quarter — uses real NW Region data */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Quarter</label>
          <InputField icon={<MapPin size={16} />}>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)}
              className="bg-transparent flex-1 text-sm text-slate-700 outline-none cursor-pointer">
              <option value="" disabled>Select your quarter</option>
              {quarterNames.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </InputField>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <InputField icon={<Lock size={16} />}>
            <input type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password"
              className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none" />
            <button onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </InputField>
          {password.length > 0 && (
            <p className={`text-xs mt-0.5 ${password.length >= 8 ? 'text-emerald-500' : 'text-red-400'}`}>
              {password.length >= 8 ? '✓ Strong enough' : `${8 - password.length} more characters needed`}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
          <InputField icon={<Lock size={16} />}>
            <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password"
              className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none" />
            <button onClick={() => setShowConfirm(!showConfirm)} className="text-slate-400 hover:text-slate-600">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </InputField>
          {confirmPassword.length > 0 && (
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${password === confirmPassword ? 'text-emerald-500' : 'text-red-400'}`}>
              {password === confirmPassword
                ? <><CheckCircle2 size={12} /> Passwords match</>
                : '✗ Passwords do not match'}
            </p>
          )}
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-amber-500 rounded shrink-0" />
          <span className="text-sm text-slate-600 leading-snug">
            I agree to the{' '}
            <a href="/terms" className="text-amber-500 hover:text-amber-600 font-medium">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-amber-500 hover:text-amber-600 font-medium">Privacy Policy</a>
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
        )}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-md shadow-amber-200 transition-all hover:scale-[1.02]">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating account...
            </span>
          ) : 'Create Account'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="text-amber-500 hover:text-amber-600 font-semibold">Sign In</a>
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
      <h2 className="text-3xl font-extrabold text-center leading-tight mb-4">Start Your Journey Today</h2>
      <p className="text-slate-400 text-center text-sm leading-relaxed max-w-xs mb-12">
        Find verified local artisans for all your service needs across the North West Region.
      </p>
      <div className="flex flex-col gap-5 w-full max-w-xs">
        {steps.map((step) => (
          <div key={step.number} className="flex items-center gap-4">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-extrabold text-sm">{step.number}</span>
            </div>
            <span className="text-slate-200 text-sm leading-snug">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <RegisterForm />
      </div>
      <BrandPanel />
    </div>
  )
}