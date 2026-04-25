import { useState } from 'react'
import AppSidebar from '../../components/AppSidebar'
import {
  Wrench, Home, User, CalendarDays, Settings,
  LogOut, Menu, X, Star, CheckCircle2,
  DollarSign, Clock, Bell, AlertCircle,
  Calendar, ChevronRight
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type AvailabilityStatus = 'available' | 'unavailable' | 'busy'

interface StatCard {
  icon: React.ReactNode
  value: string
  label: string
  delta: string           // e.g. "+12%" — comes from API comparison with last period
  deltaPositive: boolean
}

interface IncomingRequest {
  id: number
  customerName: string
  service: string
  division: string
  date: string
  time: string
  urgent: boolean
}

interface UpcomingJob {
  id: number
  customerName: string
  initials: string
  description: string
  date: string
  time: string
  color: string
}

interface PerformanceMetric {
  label: string
  value: string
  percent: number         // 0–100, drives the progress bar width
  color: string
}

interface WorkingHours {
  day: string
  hours: string
}

// ─── Placeholder data — every value here will come from the API later ─────────
// When the backend is ready, replace these with:
// const { data } = await axios.get('/api/artisan/dashboard')
// and destructure stats, requests, jobs, metrics from the response

const stats: StatCard[] = [
  {
    icon: <DollarSign size={24} className="text-emerald-500" />,
    value: 'XAF 124,500',    // stored in XAF (Central African Franc), not USD
    label: 'Total Earnings',
    delta: '+12%',
    deltaPositive: true,
  },
  {
    icon: <CheckCircle2 size={24} className="text-blue-500" />,
    value: '156',
    label: 'Completed Jobs',
    delta: '+8',
    deltaPositive: true,
  },
  {
    icon: <Star size={24} className="text-amber-400" />,
    value: '4.9',
    label: 'Average Rating',
    delta: '+0.2',
    deltaPositive: true,
  },
  {
    icon: <CalendarDays size={24} className="text-purple-500" />,
    value: '8',
    label: 'Active Bookings',
    delta: '+3',
    deltaPositive: true,
  },
]

const incomingRequests: IncomingRequest[] = [
  { id: 1, customerName: 'Alice Brown', service: 'Plumbing', division: 'Mezam',          date: '2026-04-26', time: '10:00 AM', urgent: true  },
  { id: 2, customerName: 'Bob Wilson',  service: 'Plumbing', division: 'Menchum',        date: '2026-04-27', time: '2:00 PM',  urgent: false },
  { id: 3, customerName: 'Carol Davis', service: 'Plumbing', division: 'Mezam',          date: '2026-04-28', time: '9:00 AM',  urgent: false },
]

const upcomingJobs: UpcomingJob[] = [
  { id: 1, customerName: 'John Doe',   initials: 'JD', description: 'Emergency pipe repair',  date: '2026-04-25', time: '10:00 AM', color: 'bg-slate-400'  },
  { id: 2, customerName: 'Jane Smith', initials: 'JS', description: 'Bathroom installation',  date: '2026-04-26', time: '2:00 PM',  color: 'bg-teal-400'   },
]

const performanceMetrics: PerformanceMetric[] = [
  { label: 'Response Rate',        value: '95%',   percent: 95, color: 'bg-amber-400'   },
  { label: 'Completion Rate',      value: '98%',   percent: 98, color: 'bg-emerald-500' },
  { label: 'Customer Satisfaction',value: '4.9/5', percent: 98, color: 'bg-blue-500'    },
]

const workingHours: WorkingHours[] = [
  { day: 'Monday – Friday', hours: '8AM – 6PM'  },
  { day: 'Saturday',        hours: '9AM – 4PM'  },
  { day: 'Sunday',          hours: 'Closed'     },
]

// ─── Availability config ──────────────────────────────────────────────────────
const availabilityConfig: Record<AvailabilityStatus, { label: string; color: string; dot: string }> = {
  available:   { label: 'Available',   color: 'bg-emerald-500 text-white', dot: 'bg-emerald-400' },
  unavailable: { label: 'Unavailable', color: 'bg-red-500 text-white',     dot: 'bg-red-400'     },
  busy:        { label: 'Busy',        color: 'bg-amber-500 text-white',   dot: 'bg-amber-400'   },
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
const navItems = [
  { icon: <Home size={18} />,         label: 'Dashboard',     href: '/artisan/dashboard', active: true  },
  { icon: <User size={18} />,         label: 'Profile & Docs',href: '/artisan/profile',   active: false },
  { icon: <CalendarDays size={18} />, label: 'Bookings',      href: '/artisan/bookings',  active: false },
  { icon: <Settings size={18} />,     label: 'Settings',      href: '/settings',          active: false },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

// ─── Mobile top bar ───────────────────────────────────────────────────────────
function TopBar({ onMenuClick, requestCount }: { onMenuClick: () => void; requestCount: number }) {
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
      <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative">
        <Bell size={20} />
        {requestCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {requestCount}
          </span>
        )}
      </button>
    </div>
  )
}

// ─── Trust Score badge ────────────────────────────────────────────────────────
// This score is calculated server-side using the formula:
// (verification_level × 30) + (avg_rating × 40) + (jobs_completed_score × 20) + (response_rate × 10)
// Displayed here as a read-only indicator — no manual editing allowed
function TrustScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-xs text-slate-500 font-medium">Trust Score</p>
        <p className="text-2xl font-extrabold text-emerald-500">{score}%</p>
      </div>
      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
        <CheckCircle2 size={26} className="text-white" />
      </div>
    </div>
  )
}

// ─── Stats row ────────────────────────────────────────────────────────────────
function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            {stat.icon}
            <span className={`text-xs font-bold ${stat.deltaPositive ? 'text-emerald-500' : 'text-red-400'}`}>
              {stat.delta}
            </span>
          </div>
          <p className="text-xl font-extrabold text-slate-800">{stat.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Incoming Requests ────────────────────────────────────────────────────────
function IncomingRequests({ requests }: { requests: IncomingRequest[] }) {
  // declined/accepted IDs are tracked locally until backend is connected
  const [dismissed, setDismissed] = useState<number[]>([])

  const visible = requests.filter((r) => !dismissed.includes(r.id))

  const handleAccept = (id: number) => {
    setDismissed((prev) => [...prev, id])
    // TODO: POST /api/bookings/accept { requestId: id }
  }

  const handleDecline = (id: number) => {
    setDismissed((prev) => [...prev, id])
    // TODO: POST /api/bookings/decline { requestId: id }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <AlertCircle size={20} className="text-amber-500" />
        <h2 className="font-extrabold text-slate-800 text-lg">Incoming Requests</h2>
        {visible.length > 0 && (
          <span className="w-6 h-6 bg-amber-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
            {visible.length}
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No pending requests</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {visible.map((req) => (
            <div key={req.id} className="py-4 first:pt-0 last:pb-0">
              {/* Customer + urgent tag */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-bold text-slate-800 text-sm">{req.customerName}</p>
                {req.urgent && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-red-100 text-red-600 rounded-full uppercase tracking-wide">
                    Urgent
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">{req.service}</p>

              {/* Division + date/time + actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-400">{req.division} Division</span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-600">{req.date}</p>
                    <p className="text-xs text-slate-400">{req.time}</p>
                  </div>
                  <button
                    onClick={() => handleDecline(req.id)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-200"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-md shadow-amber-200"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Upcoming Jobs ────────────────────────────────────────────────────────────
function UpcomingJobs() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Upcoming Jobs</h2>
      <div className="flex flex-col gap-3">
        {upcomingJobs.map((job) => (
          <div key={job.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors">
            {/* Avatar */}
            <div className={`w-10 h-10 ${job.color} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {job.initials}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{job.customerName}</p>
              <p className="text-xs text-slate-400 truncate">{job.description}</p>
            </div>
            {/* Date + time */}
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-xs text-slate-500 justify-end">
                <Calendar size={11} />
                {job.date}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 justify-end mt-0.5">
                <Clock size={11} />
                {job.time}
              </div>
            </div>
            {/* View details */}
            <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0">
              View
              <ChevronRight size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Availability Panel ───────────────────────────────────────────────────────
// Status is persisted to the DB on change so customers see it in real time
function AvailabilityPanel() {
  const [status, setStatus] = useState<AvailabilityStatus>('available')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const cfg = availabilityConfig[status]

  const handleChange = (newStatus: AvailabilityStatus) => {
    setStatus(newStatus)
    setDropdownOpen(false)
    // TODO: PATCH /api/artisan/availability { status: newStatus }
    // This updates the DB so the search page reflects the change immediately
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-4">Availability</h2>

      {/* Current status row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-600 font-medium">Status</span>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Status picker */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full py-2.5 border border-slate-200 hover:border-amber-400 rounded-xl text-sm font-semibold text-slate-700 transition-colors"
        >
          Change Status
        </button>
        {dropdownOpen && (
          <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
            {(Object.keys(availabilityConfig) as AvailabilityStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleChange(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left hover:bg-slate-50 transition-colors ${
                  s === status ? 'text-amber-600' : 'text-slate-700'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${availabilityConfig[s].dot}`} />
                {availabilityConfig[s].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Working hours */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Working Hours
        </p>
        <div className="flex flex-col gap-2">
          {workingHours.map((wh) => (
            <div key={wh.day} className="flex justify-between text-sm">
              <span className="text-slate-500">{wh.day}</span>
              <span className={`font-semibold ${wh.hours === 'Closed' ? 'text-red-400' : 'text-slate-700'}`}>
                {wh.hours}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Performance Insights ─────────────────────────────────────────────────────
function PerformanceInsights() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Performance Insights</h2>
      <div className="flex flex-col gap-4">
        {performanceMetrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-slate-600">{metric.label}</span>
              <span className="text-sm font-bold text-slate-800">{metric.value}</span>
            </div>
            {/* Progress bar track */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              {/* Progress bar fill — width driven by percent value from data */}
              <div
                className={`h-full rounded-full ${metric.color} transition-all duration-700`}
                style={{ width: `${metric.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────
function MainContent() {
  // TODO: replace 98 with real trust score from GET /api/artisan/dashboard
  const trustScore = 98

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Artisan Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your bookings and track your performance</p>
        </div>
        <TrustScoreBadge score={trustScore} />
      </div>

      {/* Stats */}
      <div className="mb-6">
        <StatsRow />
      </div>

      {/* Main grid — left column wider, right column fixed */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Left — requests + upcoming jobs */}
        <div className="flex-1 flex flex-col gap-5">
          <IncomingRequests requests={incomingRequests} />
          <UpcomingJobs />
        </div>

        {/* Right — availability + performance */}
        <div className="flex flex-col gap-5 w-full lg:w-72 xl:w-80 shrink-0">
          <AvailabilityPanel />
          <PerformanceInsights />
        </div>

      </div>
    </main>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ArtisanDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              activeHref="/artisan"
            />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          requestCount={incomingRequests.length}
        />
        <MainContent />
      </div>
    </div>
  )
}