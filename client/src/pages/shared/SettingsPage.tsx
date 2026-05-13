// ─── SettingsPage ─────────────────────────────────────────────────────────────
// Shared across all three roles. Role from AuthContext drives what shows.
// Route: /settings   Auth: any authenticated user
//
// Tab wiring summary:
//   Profile tab       → PATCH /api/artisans/artisan/profile (artisan)
//                     → PATCH /api/auth/update-profile (customer/admin) — see TODO
//   Notifications tab → localStorage only (no backend endpoint)
//   Privacy tab       → localStorage only (no backend endpoint)
//   Security tab      → PATCH /api/auth/change-password { currentPassword, newPassword }
//                       NOTE: backend endpoint must be added to authController.js + routes
//   Delete Account    → confirmation dialog only (no actual deletion — thesis scope)

import { useState, useEffect } from 'react'
import {
  User, Mail, Phone, MapPin, Lock, Bell,
  Shield, Eye, EyeOff, Save, Menu, Wrench,
  ChevronRight, CheckCircle2, AlertTriangle,
  Loader2, X,
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import NotificationBell, { NotificationItem } from '../../components/NotificationBell'
import { useAuth } from '../../context/AuthContext'
import { quarterNames } from '../../data/nwRegionData'
import api from '../../utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'security'

// Shape of what we persist to localStorage
interface StoredSettings {
  // Notifications tab
  bookingUpdates:     boolean
  newMessages:        boolean
  reviewReminders:    boolean
  promotions:         boolean
  verificationAlerts: boolean
  paymentReceipts:    boolean
  emailNotifications: boolean
  smsNotifications:   boolean
  // Privacy tab
  profileVisible:     boolean
  showQuarter:        boolean
  showPhone:          boolean
  showRating:         boolean
  dataCollection:     boolean
}

const SETTINGS_KEY = 'trustlink_settings'

const DEFAULT_SETTINGS: StoredSettings = {
  bookingUpdates:     true,
  newMessages:        true,
  reviewReminders:    true,
  promotions:         false,
  verificationAlerts: true,
  paymentReceipts:    true,
  emailNotifications: true,
  smsNotifications:   false,
  profileVisible:     true,
  showQuarter:        true,
  showPhone:          false,
  showRating:         true,
  dataCollection:     true,
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* corrupted — fall through to defaults */ }
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch { /* storage full — ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diffMs   = Date.now() - new Date(iso).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1)  return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  const hours = Math.floor(diffMins / 60)
  if (hours < 24)    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

// ─── Reusable Toggle ──────────────────────────────────────────────────────────
interface ToggleProps {
  enabled: boolean
  onChange: (val: boolean) => void
  label: string
  description: string
}

function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
          enabled ? 'bg-amber-500' : 'bg-slate-200'
        }`}
        aria-checked={enabled}
        role="switch"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-1">
      <h3 className="font-extrabold text-slate-800 text-base mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ─── Input field ──────────────────────────────────────────────────────────────
function SettingsInput({
  label, value, onChange, type = 'text', icon, placeholder, disabled,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  icon: React.ReactNode
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className={`flex items-center gap-3 bg-slate-50 border rounded-xl px-4 py-3 transition-all ${
        disabled
          ? 'opacity-60 cursor-not-allowed border-slate-100'
          : 'border-slate-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100'
      }`}>
        <span className="text-slate-400 shrink-0">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none disabled:cursor-not-allowed"
        />
      </div>
    </div>
  )
}

// ─── Delete Account Confirmation Dialog ───────────────────────────────────────
function DeleteAccountDialog({ onCancel }: { onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg leading-tight">Delete Account</h2>
            <p className="text-slate-500 text-sm">This action cannot be undone</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
          <p className="text-sm text-red-700 leading-relaxed">
            Deleting your account will permanently remove your profile, bookings, reviews,
            and all associated data from TrustLink. This cannot be reversed.
          </p>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          To request account deletion, please contact us at{' '}
          <span className="font-semibold text-amber-600">support@trustlinknw.cm</span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-100 text-slate-400 font-bold rounded-xl text-sm cursor-not-allowed"
            disabled
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({
  role,
  showToast,
  showDeleteDialog,
}: {
  role: string
  showToast: (msg: string, type?: 'success' | 'error') => void
  showDeleteDialog: () => void
}) {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email]                 = useState(user?.email ?? '')   // not editable
  const [phone, setPhone]       = useState('')
  const [quarter, setQuarter]   = useState('')
  const [bio, setBio]           = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  // Fetch current profile data on mount so fields are pre-filled with real values
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me')
        const u   = res.data.user
        if (u.phone)   setPhone(u.phone)
        if (u.quarter) setQuarter(u.quarter)
        // Artisan bio — fetch from artisan profile endpoint
        if (role === 'artisan') {
          try {
            const artRes = await api.get('/artisans/artisan/dashboard')
            // bio lives on the artisan profile; dashboard doesn't return it directly
            // so we fetch profile separately if needed
          } catch { /* silent */ }
        }
      } catch { /* silent — fields stay at defaults */ }
    }
    fetchProfile()
  }, [role])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (role === 'artisan') {
        // Artisan profile endpoint supports fullName, phone, quarter, bio
        await api.patch('/artisans/artisan/profile', {
          fullName: fullName.trim(),
          phone:    phone.trim(),
          quarter:  quarter,
          bio:      bio.trim(),
        })
      } else {
        // Customer and admin: only name, phone, quarter are editable
        // NOTE: PATCH /api/auth/update-profile needs to be added to authController.js
        // Body: { fullName, phone, quarter }
        await api.patch('/auth/update-profile', {
          fullName: fullName.trim(),
          phone:    phone.trim(),
          quarter:  quarter,
        })
      }
      setSaved(true)
      showToast('Profile saved successfully.')
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showToast(err.response?.data?.error || 'Failed to save profile. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingsInput
            label="Full Name" value={fullName} onChange={setFullName}
            icon={<User size={16} />} placeholder="Your full name"
          />
          <SettingsInput
            label="Email Address" value={email}
            icon={<Mail size={16} />} disabled
          />
          <SettingsInput
            label="Phone Number" value={phone} onChange={setPhone}
            icon={<Phone size={16} />} placeholder="+237 6XX XXX XXX"
          />
          {/* Quarter selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quarter</label>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
              <MapPin size={16} className="text-slate-400 shrink-0" />
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="bg-transparent flex-1 text-sm text-slate-700 outline-none cursor-pointer"
              >
                <option value="">Select your quarter</option>
                {quarterNames.map((q: string) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Section>

      {/* Artisan-only: bio */}
      {role === 'artisan' && (
        <Section title="Service Profile">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your skills and experience..."
                rows={3}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 resize-none transition-all"
              />
            </div>
            <p className="text-xs text-slate-400">
              To manage your services and rates, visit the{' '}
              <a href="/artisan/profile" className="text-amber-600 font-semibold hover:underline">
                Profile &amp; Docs
              </a>{' '}
              page.
            </p>
          </div>
        </Section>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 w-full sm:w-auto sm:self-start px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-200 hover:scale-[1.02]"
      >
        {saving ? (
          <><Loader2 size={16} className="animate-spin" /> Saving...</>
        ) : saved ? (
          <><CheckCircle2 size={16} /> Saved!</>
        ) : (
          <><Save size={16} /> Save Changes</>
        )}
      </button>

      {/* Danger zone */}
      <Section title="Account">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-red-500">Delete Account</p>
            <p className="text-xs text-slate-400 mt-0.5">Permanently remove your account and all data</p>
          </div>
          <button
            onClick={showDeleteDialog}
            className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold rounded-xl transition-colors"
          >
            Delete
          </button>
        </div>
      </Section>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
// All toggles persist to localStorage — no backend endpoint.
function NotificationsTab({ settings, onToggle }: {
  settings: StoredSettings
  onToggle: (key: keyof StoredSettings) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <Section title="In-App Notifications">
        <Toggle enabled={settings.bookingUpdates}    onChange={() => onToggle('bookingUpdates')}
          label="Booking Updates"           description="Get notified when a booking is accepted, declined, or completed" />
        <Toggle enabled={settings.newMessages}       onChange={() => onToggle('newMessages')}
          label="New Messages"              description="Alerts when an artisan or customer contacts you" />
        <Toggle enabled={settings.reviewReminders}   onChange={() => onToggle('reviewReminders')}
          label="Review Reminders"          description="Reminders to leave a review after a completed service" />
        <Toggle enabled={settings.verificationAlerts} onChange={() => onToggle('verificationAlerts')}
          label="Verification Alerts"       description="Updates on your document verification status" />
        <Toggle enabled={settings.paymentReceipts}   onChange={() => onToggle('paymentReceipts')}
          label="Payment Receipts"          description="Confirmation when a payment is processed via MTN MoMo" />
        <Toggle enabled={settings.promotions}        onChange={() => onToggle('promotions')}
          label="Platform Announcements"    description="Occasional updates about new features and local events" />
      </Section>

      <Section title="External Notifications">
        <Toggle enabled={settings.emailNotifications} onChange={() => onToggle('emailNotifications')}
          label="Email Notifications"       description="Receive booking confirmations and alerts to your email" />
        <Toggle enabled={settings.smsNotifications}   onChange={() => onToggle('smsNotifications')}
          label="SMS Notifications"         description="Receive critical alerts via SMS (standard rates may apply)" />
      </Section>

      <p className="text-xs text-slate-400 italic px-1">
        Notification preferences are saved automatically to your device.
      </p>
    </div>
  )
}

// ─── Privacy Tab ──────────────────────────────────────────────────────────────
// All toggles persist to localStorage — no backend endpoint.
function PrivacyTab({ settings, onToggle }: {
  settings: StoredSettings
  onToggle: (key: keyof StoredSettings) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <Section title="Profile Visibility">
        <Toggle enabled={settings.profileVisible} onChange={() => onToggle('profileVisible')}
          label="Public Profile"          description="Allow customers to find and view your profile in search results" />
        <Toggle enabled={settings.showQuarter}    onChange={() => onToggle('showQuarter')}
          label="Show Quarter"           description="Display your quarter on your public profile" />
        <Toggle enabled={settings.showPhone}      onChange={() => onToggle('showPhone')}
          label="Show Phone Number"      description="Allow customers to see your phone number on your profile" />
        <Toggle enabled={settings.showRating}     onChange={() => onToggle('showRating')}
          label="Show Rating & Reviews"  description="Display your rating and customer reviews publicly" />
      </Section>

      <Section title="Data & Analytics">
        <Toggle enabled={settings.dataCollection} onChange={() => onToggle('dataCollection')}
          label="Usage Analytics"        description="Allow TrustLink to collect anonymised usage data to improve the platform" />
      </Section>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
        <Shield size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          TrustLink does not sell your personal data to third parties.
          Your information is used solely to operate the platform and improve your experience.
        </p>
      </div>

      <p className="text-xs text-slate-400 italic px-1">
        Privacy preferences are saved automatically to your device.
      </p>
    </div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
// Change Password calls PATCH /api/auth/change-password.
// BACKEND TODO: Add to authController.js + auth.js routes:
//   PATCH /api/auth/change-password
//   Body: { currentPassword, newPassword }
//   Verifies currentPassword with bcrypt.compare, then hashes + saves newPassword.
//   Auth: JWT (any role)
function SecurityTab({ showToast }: {
  showToast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [currentPassword,  setCurrentPassword]  = useState('')
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [showCurrent,      setShowCurrent]      = useState(false)
  const [showNew,          setShowNew]          = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [saved,            setSaved]            = useState(false)
  const [error,            setError]            = useState('')

  const handleChangePassword = async () => {
    setError('')
    if (!currentPassword)               { setError('Enter your current password.');            return }
    if (newPassword.length < 8)         { setError('New password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.');                 return }

    setSaving(true)
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword })
      setSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Password updated successfully.')
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Failed to update password. Check your current password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="Change Password">
        <div className="flex flex-col gap-4">
          {/* Current password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Password</label>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
              <Lock size={16} className="text-slate-400 shrink-0" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
              />
              <button onClick={() => setShowCurrent(!showCurrent)} className="text-slate-400 hover:text-slate-600">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">New Password</label>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
              <Lock size={16} className="text-slate-400 shrink-0" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
              />
              <button onClick={() => setShowNew(!showNew)} className="text-slate-400 hover:text-slate-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword.length > 0 && (
              <p className={`text-xs ${newPassword.length >= 8 ? 'text-emerald-500' : 'text-red-400'}`}>
                {newPassword.length >= 8 ? '✓ Strong enough' : `${8 - newPassword.length} more characters needed`}
              </p>
            )}
          </div>

          {/* Confirm */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Confirm New Password</label>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
              <Lock size={16} className="text-slate-400 shrink-0" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
              />
            </div>
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full sm:w-auto sm:self-start px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-200"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Updating...</>
            ) : saved ? (
              <><CheckCircle2 size={16} /> Password Updated!</>
            ) : (
              <><Lock size={16} /> Update Password</>
            )}
          </button>
        </div>
      </Section>

      {/* 2FA — cosmetic only, no backend */}
      <Section title="Two-Factor Authentication">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-slate-700">Two-Factor Authentication</p>
            <p className="text-xs text-slate-400 mt-0.5">Add an extra layer of security to your account</p>
          </div>
          <span className="px-3 py-1 bg-slate-100 text-slate-400 text-xs font-bold rounded-full">
            Coming Soon
          </span>
        </div>
      </Section>
    </div>
  )
}

// ─── Tab nav config ───────────────────────────────────────────────────────────
const settingsTabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'profile',       label: 'Profile',       icon: <User size={16} />   },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={16} />   },
  { key: 'privacy',       label: 'Privacy',       icon: <Eye size={16} />    },
  { key: 'security',      label: 'Security',      icon: <Shield size={16} /> },
]

// ─── Mobile top bar ───────────────────────────────────────────────────────────
interface TopBarProps {
  onMenuClick: () => void
  notifications: NotificationItem[]
  onMarkAllRead: () => void
}

function TopBar({ onMenuClick, notifications, onMarkAllRead }: TopBarProps) {
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-20">
      <button onClick={onMenuClick} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
          <Wrench size={14} className="text-white" />
        </div>
        <span className="font-bold text-slate-800 text-sm">
          Trust<span className="text-amber-500">Link</span>
        </span>
      </div>
      <NotificationBell notifications={notifications} onMarkAllRead={onMarkAllRead} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user }  = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab]     = useState<SettingsTab>('profile')

  // ── Notifications bell (real API) ────────────────────────────────────────────
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/customer/notifications')
        const mapped: NotificationItem[] = (res.data.notifications ?? []).map(
          (n: { id: number; type: NotificationItem['type']; message: string; is_read: boolean; created_at: string }) => ({
            id:     n.id,
            text:   n.message,
            time:   formatRelativeTime(n.created_at),
            unread: !n.is_read,
            type:   n.type,
          })
        )
        setNotifications(mapped)
      } catch { /* silent */ }
    }
    fetchNotifs()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/customer/notifications/read')
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch { /* silent */ }
  }

  // ── localStorage settings (Notifications + Privacy tabs) ─────────────────────
  const [settings, setSettings] = useState<StoredSettings>(loadSettings)

  const handleToggle = (key: keyof StoredSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      saveSettings(updated)
      return updated
    })
  }

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [toast, setToast]     = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg)
    setToastType(type)
    setTimeout(() => setToast(''), 3500)
  }

  // ── Delete account dialog ─────────────────────────────────────────────────────
  const [showDelete, setShowDelete] = useState(false)

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/settings" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Settings</h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage your account preferences — logged in as{' '}
                <span className="font-semibold capitalize text-amber-600">{user.role}</span>
              </p>
            </div>
            <div className="hidden lg:block">
              <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllRead} />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Left — tab nav */}
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible lg:w-48 shrink-0">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap w-full text-left ${
                    activeTab === tab.key
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                      : 'bg-white border border-slate-100 text-slate-600 hover:border-amber-200 hover:text-amber-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab !== tab.key && (
                    <ChevronRight size={14} className="ml-auto text-slate-300" />
                  )}
                </button>
              ))}
            </div>

            {/* Right — active tab content */}
            <div className="flex-1 min-w-0">
              {activeTab === 'profile' && (
                <ProfileTab
                  role={user.role}
                  showToast={showToast}
                  showDeleteDialog={() => setShowDelete(true)}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationsTab settings={settings} onToggle={handleToggle} />
              )}
              {activeTab === 'privacy' && (
                <PrivacyTab settings={settings} onToggle={handleToggle} />
              )}
              {activeTab === 'security' && (
                <SecurityTab showToast={showToast} />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Delete account dialog */}
      {showDelete && (
        <DeleteAccountDialog onCancel={() => setShowDelete(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl max-w-sm text-center ${
          toastType === 'error' ? 'bg-red-500' : 'bg-slate-800'
        }`}>
          {toast}
        </div>
      )}
    </div>
  )
}