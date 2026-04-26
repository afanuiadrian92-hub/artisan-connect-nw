import { useState } from 'react'
import {
  User, Mail, Phone, MapPin, Lock, Bell,
  Shield, Eye, EyeOff, Save, Menu, Wrench,
  ChevronRight, CheckCircle2, Palette
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import NotificationBell, { NotificationItem } from '../../components/NotificationBell'
import { useAuth } from '../../context/AuthContext'
import { quarterNames } from '../../data/nwRegionData'

// ─── Types ────────────────────────────────────────────────────────────────────
type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'security'

interface ToggleProps {
  enabled: boolean
  onChange: (val: boolean) => void
  label: string
  description: string
}

// ─── Reusable Toggle ──────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>
      </div>
      {/* Toggle switch */}
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
  label, value, onChange, type = 'text', icon, placeholder, disabled
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

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ role }: { role: string }) {
  const { user } = useAuth()
  const [fullName, setFullName]   = useState(user?.fullName ?? '')
  const [email]                   = useState(user?.email ?? '')   // email not editable
  const [phone, setPhone]         = useState('+237 6XX XXX XXX')
  const [quarter, setQuarter]     = useState(user?.division ?? '')
  const [saved, setSaved]         = useState(false)

  // Artisan-only fields
  const [bio, setBio]             = useState('')
  const [services, setServices]   = useState('')
  const [ratePerHour, setRatePerHour] = useState('')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    // TODO: PATCH /api/users/profile { fullName, phone, quarter, bio, services, ratePerHour }
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
                {quarterNames.map((q: string) => ( // Added ": string"
                    <option key={q} value={q}>{q}</option>
                    ))}
              </select>
            </div>
          </div>
        </div>
      </Section>

      {/* Artisan-only: service profile */}
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
            <SettingsInput
              label="Services Offered" value={services} onChange={setServices}
              icon={<Wrench size={16} />} placeholder="e.g. Plumbing, Pipe Fitting"
            />
            <SettingsInput
              label="Rate per Hour (XAF)" value={ratePerHour} onChange={setRatePerHour}
              icon={<span className="text-xs font-bold text-slate-400">XAF</span>}
              placeholder="e.g. 4500"
            />
          </div>
        </Section>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        className="flex items-center justify-center gap-2 w-full sm:w-auto sm:self-start px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-200 hover:scale-[1.02]"
      >
        {saved ? (
          <><CheckCircle2 size={16} /> Saved!</>
        ) : (
          <><Save size={16} /> Save Changes</>
        )}
      </button>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
// Each toggle will map to a column in the user_notification_preferences table
function NotificationsTab() {
  const [bookingUpdates,    setBookingUpdates]    = useState(true)
  const [newMessages,       setNewMessages]       = useState(true)
  const [reviewReminders,   setReviewReminders]   = useState(true)
  const [promotions,        setPromotions]        = useState(false)
  const [verificationAlerts,setVerificationAlerts]= useState(true)
  const [paymentReceipts,   setPaymentReceipts]   = useState(true)
  const [emailNotifications,setEmailNotifications]= useState(true)
  const [smsNotifications,  setSmsNotifications]  = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <Section title="In-App Notifications">
        <Toggle enabled={bookingUpdates}    onChange={setBookingUpdates}
          label="Booking Updates"           description="Get notified when a booking is accepted, declined, or completed" />
        <Toggle enabled={newMessages}       onChange={setNewMessages}
          label="New Messages"              description="Alerts when an artisan or customer contacts you" />
        <Toggle enabled={reviewReminders}   onChange={setReviewReminders}
          label="Review Reminders"          description="Reminders to leave a review after a completed service" />
        <Toggle enabled={verificationAlerts}onChange={setVerificationAlerts}
          label="Verification Alerts"       description="Updates on your document verification status" />
        <Toggle enabled={paymentReceipts}   onChange={setPaymentReceipts}
          label="Payment Receipts"          description="Confirmation when a payment is processed via MTN MoMo" />
        <Toggle enabled={promotions}        onChange={setPromotions}
          label="Platform Announcements"    description="Occasional updates about new features and local events" />
      </Section>

      <Section title="External Notifications">
        <Toggle enabled={emailNotifications} onChange={setEmailNotifications}
          label="Email Notifications"       description="Receive booking confirmations and alerts to your email" />
        <Toggle enabled={smsNotifications}   onChange={setSmsNotifications}
          label="SMS Notifications"         description="Receive critical alerts via SMS (standard rates may apply)" />
      </Section>

      <p className="text-xs text-slate-400 italic px-1">
        Notification preferences are saved automatically.
        {/* TODO: PATCH /api/users/notification-preferences on each toggle change */}
      </p>
    </div>
  )
}

// ─── Privacy Tab ──────────────────────────────────────────────────────────────
function PrivacyTab() {
  const [profileVisible,    setProfileVisible]    = useState(true)
  const [showQuarter,       setShowQuarter]       = useState(true)
  const [showPhone,         setShowPhone]         = useState(false)
  const [showRating,        setShowRating]        = useState(true)
  const [dataCollection,    setDataCollection]    = useState(true)

  return (
    <div className="flex flex-col gap-5">
      <Section title="Profile Visibility">
        <Toggle enabled={profileVisible} onChange={setProfileVisible}
          label="Public Profile"          description="Allow customers to find and view your profile in search results" />
        <Toggle enabled={showQuarter}    onChange={setShowQuarter}
          label="Show Quarter"           description="Display your quarter on your public profile" />
        <Toggle enabled={showPhone}      onChange={setShowPhone}
          label="Show Phone Number"      description="Allow customers to see your phone number on your profile" />
        <Toggle enabled={showRating}     onChange={setShowRating}
          label="Show Rating & Reviews"  description="Display your rating and customer reviews publicly" />
      </Section>

      <Section title="Data & Analytics">
        <Toggle enabled={dataCollection} onChange={setDataCollection}
          label="Usage Analytics"        description="Allow TrustLink to collect anonymised usage data to improve the platform" />
      </Section>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3">
        <Shield size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          TrustLink does not sell your personal data to third parties.
          Your information is used solely to operate the platform and improve your experience.
        </p>
      </div>
    </div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const [currentPassword, setCurrentPassword]     = useState('')
  const [newPassword, setNewPassword]             = useState('')
  const [confirmPassword, setConfirmPassword]     = useState('')
  const [showCurrent, setShowCurrent]             = useState(false)
  const [showNew, setShowNew]                     = useState(false)
  const [saved, setSaved]                         = useState(false)
  const [error, setError]                         = useState('')

  const handleChangePassword = () => {
    setError('')
    if (!currentPassword)         { setError('Enter your current password.'); return }
    if (newPassword.length < 8)   { setError('New password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    // TODO: PATCH /api/auth/change-password { currentPassword, newPassword }
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
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            onClick={handleChangePassword}
            className="flex items-center justify-center gap-2 w-full sm:w-auto sm:self-start px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-200"
          >
            {saved ? <><CheckCircle2 size={16} /> Password Updated!</> : <><Lock size={16} /> Update Password</>}
          </button>
        </div>
      </Section>

      <Section title="Account">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-red-500">Delete Account</p>
            <p className="text-xs text-slate-400 mt-0.5">Permanently remove your account and all data</p>
          </div>
          <button className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold rounded-xl transition-colors">
            Delete
          </button>
        </div>
      </Section>
    </div>
  )
}

// ─── Tab nav ──────────────────────────────────────────────────────────────────
const settingsTabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'profile',       label: 'Profile',       icon: <User size={16} />    },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={16} />    },
  { key: 'privacy',       label: 'Privacy',       icon: <Eye size={16} />     },
  { key: 'security',      label: 'Security',      icon: <Shield size={16} />  },
]

// ─── Placeholder notifications for the bell (will come from API) ──────────────
const mockNotifications: NotificationItem[] = [
  { id: 1, text: 'Your booking with John Smith has been confirmed', time: '5 mins ago',  unread: true,  type: 'booking'  },
  { id: 2, text: 'Leave a review for your Solar Maintenance service', time: '2 hours ago', unread: true,  type: 'review'   },
  { id: 3, text: 'Payment of XAF 9,000 processed successfully',    time: '1 day ago',   unread: false, type: 'payment'  },
]

// ─── Mobile top bar ───────────────────────────────────────────────────────────
function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const [notifications, setNotifications] = useState(mockNotifications)

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
      <NotificationBell
        notifications={notifications}
        onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user }  = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab]     = useState<SettingsTab>('profile')
  const [notifications, setNotifications] = useState(mockNotifications)

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/settings" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

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
            {/* Desktop notification bell */}
            <div className="hidden lg:block">
              <NotificationBell
                notifications={notifications}
                onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5">

            {/* Left — tab nav (horizontal on mobile, vertical on desktop) */}
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
                  {activeTab !== tab.key && <ChevronRight size={14} className="ml-auto text-slate-300" />}
                </button>
              ))}
            </div>

            {/* Right — active tab content */}
            <div className="flex-1 min-w-0">
              {activeTab === 'profile'       && <ProfileTab role={user.role} />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'privacy'       && <PrivacyTab />}
              {activeTab === 'security'      && <SecurityTab />}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}