import { useState, useEffect } from 'react'
import {
  Wrench, Home, User, CalendarDays, Settings,
  LogOut, Menu, X, Star, CheckCircle2,
  DollarSign, Clock, Bell, AlertCircle,
  Calendar, ChevronRight
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type AvailabilityStatus = 'available' | 'unavailable' | 'busy'

interface DashboardData {
  trustScore: number
  avgRating: number
  totalJobs: number
  responseRate: number
  availability: AvailabilityStatus
  totalEarnings: number
  activeBookings: number
  incomingRequests: IncomingRequest[]
  upcomingJobs: UpcomingJob[]
}

interface IncomingRequest {
  id: number
  title: string
  description: string
  quarter: string
  division: string
  budget_min: number | null
  budget_max: number | null
  created_at: string
  customer_name: string
  avatar_initials: string
  category: string
}

interface UpcomingJob {
  id: number
  customer_name: string
  avatar_initials: string
  service_title: string
  scheduled_date: string
  scheduled_time: string
  location: string
  total_amount: number
  status: string
}

// ─── Availability config ──────────────────────────────────────────────────────
const availabilityConfig: Record<AvailabilityStatus, { label: string; color: string; dot: string }> = {
  available:   { label: 'Available',   color: 'bg-emerald-500 text-white', dot: 'bg-emerald-400' },
  unavailable: { label: 'Unavailable', color: 'bg-red-500 text-white',     dot: 'bg-red-400'     },
  busy:        { label: 'Busy',        color: 'bg-amber-500 text-white',   dot: 'bg-amber-400'   },
}

const formatXAF = (n: number) => `XAF ${n.toLocaleString()}`

// ─── Trust Score Badge ────────────────────────────────────────────────────────
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

// ─── Stats Row ────────────────────────────────────────────────────────────────
function StatsRow({ data }: { data: DashboardData }) {
  const stats = [
    {
      icon: <DollarSign size={24} className="text-emerald-500" />,
      value: formatXAF(data.totalEarnings),
      label: 'Total Earnings',
      delta: null,
    },
    {
      icon: <CheckCircle2 size={24} className="text-blue-500" />,
      value: data.totalJobs.toString(),
      label: 'Completed Jobs',
      delta: null,
    },
    {
      icon: <Star size={24} className="text-amber-400" />,
      value: data.avgRating.toFixed(1),
      label: 'Average Rating',
      delta: null,
    },
    {
      icon: <CalendarDays size={24} className="text-purple-500" />,
      value: data.activeBookings.toString(),
      label: 'Active Bookings',
      delta: null,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label}
          className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-3">{stat.icon}</div>
          <p className="text-xl font-extrabold text-slate-800">{stat.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Incoming Requests ────────────────────────────────────────────────────────
function IncomingRequests({ requests }: { requests: IncomingRequest[] }) {
  const [dismissed, setDismissed] = useState<number[]>([])
  const visible = requests.filter((r) => !dismissed.includes(r.id))

  const handleAccept = async (jobId: number) => {
    try {
      await api.post('/quotes', {
        jobId,
        price: 5000,      // TODO: open a quote modal for the artisan to enter their price
        message: 'I am available and can handle this job.',
        estimatedHours: 2,
      })
      setDismissed((prev) => [...prev, jobId])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'Could not submit quote.')
    }
  }

  const handleDecline = (id: number) => {
    setDismissed((prev) => [...prev, id])
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
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
        <p className="text-slate-400 text-sm text-center py-6">No pending requests in your area</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {visible.map((req) => (
            <div key={req.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-bold text-slate-800 text-sm">{req.customer_name}</p>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {req.category}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-1">{req.title}</p>
              <p className="text-xs text-slate-400 mb-3">{req.quarter}</p>

              {(req.budget_min || req.budget_max) && (
                <p className="text-xs text-emerald-600 font-semibold mb-2">
                  Budget: {req.budget_min ? formatXAF(req.budget_min) : '?'}
                  {req.budget_max ? ` – ${formatXAF(req.budget_max)}` : '+'}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button onClick={() => handleDecline(req.id)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-200">
                  Decline
                </button>
                <button onClick={() => handleAccept(req.id)}
                  className="px-4 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-md shadow-amber-200">
                  Accept & Quote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Upcoming Jobs ────────────────────────────────────────────────────────────
function UpcomingJobs({ jobs }: { jobs: UpcomingJob[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Upcoming Jobs</h2>
      {jobs.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No upcoming jobs scheduled</p>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <div key={job.id}
              className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                {job.avatar_initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{job.customer_name}</p>
                <p className="text-xs text-slate-400 truncate">{job.service_title}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs text-slate-500 justify-end">
                  <Calendar size={11} />{job.scheduled_date}
                </div>
                {job.scheduled_time && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 justify-end mt-0.5">
                    <Clock size={11} />{job.scheduled_time}
                  </div>
                )}
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0">
                View <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Availability Panel ───────────────────────────────────────────────────────
function AvailabilityPanel({ initial }: { initial: AvailabilityStatus }) {
  const [status, setStatus]       = useState<AvailabilityStatus>(initial)
  const [dropdownOpen, setDropdown] = useState(false)
  const [saving, setSaving]       = useState(false)
  const cfg = availabilityConfig[status]

  const handleChange = async (newStatus: AvailabilityStatus) => {
    setDropdown(false)
    setSaving(true)
    try {
      await api.patch('/artisans/artisan/availability', { status: newStatus })
      setStatus(newStatus)
    } catch {
      alert('Could not update availability. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-4">Availability</h2>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-600 font-medium">Status</span>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>
          {saving ? 'Saving...' : cfg.label}
        </span>
      </div>

      <div className="relative">
        <button
          onClick={() => setDropdown(!dropdownOpen)}
          className="w-full py-2.5 border border-slate-200 hover:border-amber-400 rounded-xl text-sm font-semibold text-slate-700 transition-colors"
        >
          Change Status
        </button>
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdown(false)} />
            <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
              {(Object.keys(availabilityConfig) as AvailabilityStatus[]).map((s) => (
                <button key={s} onClick={() => handleChange(s)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left hover:bg-slate-50 transition-colors ${s === status ? 'text-amber-600' : 'text-slate-700'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${availabilityConfig[s].dot}`} />
                  {availabilityConfig[s].label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Performance Insights ─────────────────────────────────────────────────────
function PerformanceInsights({ avgRating, responseRate, totalJobs }: {
  avgRating: number; responseRate: number; totalJobs: number
}) {
  const metrics = [
    { label: 'Response Rate',        value: `${responseRate}%`,      percent: responseRate, color: 'bg-amber-400'   },
    { label: 'Customer Satisfaction',value: `${avgRating.toFixed(1)}/5`, percent: (avgRating/5)*100, color: 'bg-emerald-500' },
    { label: 'Jobs Milestone',       value: `${totalJobs}/50`,       percent: Math.min((totalJobs/50)*100,100), color: 'bg-blue-500' },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Performance Insights</h2>
      <div className="flex flex-col gap-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm text-slate-600">{m.label}</span>
              <span className="text-sm font-bold text-slate-800">{m.value}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${m.color} transition-all duration-700`}
                style={{ width: `${Math.min(m.percent, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ArtisanDashboard() {
  const { user }  = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData]               = useState<DashboardData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/artisans/artisan/dashboard')
        setData(res.data)
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } }
        setError(err.response?.data?.error || 'Failed to load dashboard.')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-red-500 text-sm">{error || 'No data available.'}</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/artisan" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          requestCount={data.incomingRequests.length}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                Welcome{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage your bookings and track your performance
              </p>
            </div>
            <TrustScoreBadge score={data.trustScore} />
          </div>

          {/* Stats */}
          <div className="mb-6">
            <StatsRow data={data} />
          </div>

          {/* Main grid */}
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Left column */}
            <div className="flex-1 flex flex-col gap-5">
              <IncomingRequests requests={data.incomingRequests} />
              <UpcomingJobs jobs={data.upcomingJobs} />
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-5 w-full lg:w-72 xl:w-80 shrink-0">
              <AvailabilityPanel initial={data.availability} />
              <PerformanceInsights
                avgRating={data.avgRating}
                responseRate={data.responseRate}
                totalJobs={data.totalJobs}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}