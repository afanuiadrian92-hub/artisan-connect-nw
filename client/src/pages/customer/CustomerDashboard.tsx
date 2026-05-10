import AppSidebar from '../../components/AppSidebar'
import { useEffect, useState } from 'react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import {
  Wrench, Home, Search, CalendarDays, Settings,
  LogOut, Menu, X, Star, TrendingUp, Clock,
  ChevronRight, Bell, ArrowUpRight
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type BookingStatus = 'completed' | 'in-progress' | 'scheduled'

interface StatCard {
  icon: React.ReactNode
  value: string | number
  label: string
  color: string
}

interface Booking {
  id: number
  service: string
  provider: string
  date: string
  status: BookingStatus
  rating?: number        // only exists if completed
}

interface RecommendedArtisan {
  id: number
  initials: string
  name: string
  specialty: string
  rating: number
  reviews: number
  distance: string
  color: string          // background colour for avatar
}

// ─── Placeholder data (replace with API calls later) ─────────────────────────
const stats: StatCard[] = [
  {
    icon: <CalendarDays size={24} className="text-orange-400" />,
    value: 12,
    label: 'Total Bookings',
    color: 'text-orange-400',
  },
  {
    icon: <TrendingUp size={24} className="text-emerald-500" />,
    value: 8,
    label: 'Completed',
    color: 'text-emerald-500',
  },
  {
    icon: <Clock size={24} className="text-blue-500" />,
    value: 2,
    label: 'In Progress',
    color: 'text-blue-500',
  },
  {
    icon: <Star size={24} className="text-amber-400" />,
    value: '4.6',
    label: 'Avg Rating Given',
    color: 'text-amber-400',
  },
]

const bookings: Booking[] = [
  { id: 1, service: 'Plumbing',          provider: 'John Smith',   date: '2026-04-20', status: 'completed',  rating: 5 },
  { id: 2, service: 'Electrical',        provider: 'Sarah Johnson', date: '2026-04-22', status: 'in-progress' },
  { id: 3, service: 'Solar Maintenance', provider: 'Mike Brown',   date: '2026-04-25', status: 'scheduled'   },
]

const recommendedArtisans: RecommendedArtisan[] = [
  { id: 1, initials: 'DL', name: 'David Lee',    specialty: 'Mechanic', rating: 4.9, reviews: 156, distance: '2.3 km', color: 'bg-slate-400' },
  { id: 2, initials: 'EW', name: 'Emma Wilson',  specialty: 'Laundry',  rating: 4.8, reviews: 203, distance: '1.8 km', color: 'bg-teal-400'  },
  { id: 3, initials: 'RC', name: 'Robert Chen',  specialty: 'HVAC',     rating: 4.7, reviews: 142, distance: '3.1 km', color: 'bg-purple-400' },
]

// ─── Status badge ─────────────────────────────────────────────────────────────
// Each status gets a distinct colour so users can scan the list at a glance
function StatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, string> = {
    completed:   'bg-emerald-100 text-emerald-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    scheduled:   'bg-amber-100 text-amber-700',
  }
  const label: Record<BookingStatus, string> = {
    completed:   'Completed',
    'in-progress': 'In Progress',
    scheduled:   'Scheduled',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status]}`}>
      {label[status]}
    </span>
  )
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const navItems = [
  { icon: <Home size={18} />,         label: 'Dashboard',    href: '/dashboard',         active: true  },
  { icon: <Search size={18} />,       label: 'Find Services',href: '/search',            active: false },
  { icon: <CalendarDays size={18} />, label: 'My Bookings',  href: '/bookings',          active: false },
  { icon: <Settings size={18} />,     label: 'Settings',     href: '/settings',          active: false },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
// sidebarOpen controls whether it's visible on mobile
// On desktop it's always visible (handled by CSS, not state)


// ─── Top bar (mobile only) ────────────────────────────────────────────────────
function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-20">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label="Open menu"
      >
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
        {/* Notification dot */}
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
      </button>
    </div>
  )
}

// ─── Stats row ────────────────────────────────────────────────────────────────
function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow"
        >
          {stat.icon}
          <span className="text-2xl font-extrabold text-slate-800">{stat.value}</span>
          <span className="text-xs text-slate-500">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Recent Bookings ──────────────────────────────────────────────────────────
function RecentBookings() {
  const [ratingTarget, setRatingTarget] = useState<number | null>(null)
  const [ratings, setRatings] = useState<Record<number, number>>({})

  const submitRating = (bookingId: number, stars: number) => {
    setRatings((prev) => ({ ...prev, [bookingId]: stars }))
    setRatingTarget(null)
    // TODO: POST /api/reviews { bookingId, stars }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex-1">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-extrabold text-slate-800 text-lg">Recent Bookings</h2>
        <a
          href="/bookings"
          className="text-amber-500 hover:text-amber-600 text-sm font-semibold flex items-center gap-1 transition-colors"
        >
          View All <ArrowUpRight size={14} />
        </a>
      </div>

      {/* Booking rows */}
      <div className="flex flex-col gap-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
          >
            {/* Service info */}
            <div>
              <p className="font-bold text-slate-800 text-sm">{booking.service}</p>
              <p className="text-xs text-slate-400 mt-0.5">by {booking.provider}</p>
            </div>

            {/* Date + status + action */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs text-slate-400">{booking.date}</span>
              <StatusBadge status={booking.status} />

              {/* Completed + already rated → show stars */}
              {booking.status === 'completed' && ratings[booking.id] && (
                <div className="flex items-center gap-1 text-amber-400">
                  <Star size={14} fill="currentColor" />
                  <span className="text-xs font-semibold text-slate-600">{ratings[booking.id]}</span>
                </div>
              )}

              {/* Completed + not yet rated → Rate button */}
              {booking.status === 'completed' && !ratings[booking.id] && (
                <div className="relative">
                  <button
                    onClick={() => setRatingTarget(ratingTarget === booking.id ? null : booking.id)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Rate
                  </button>
                  {/* Star picker popover */}
                  {ratingTarget === booking.id && (
                    <div className="absolute right-0 top-9 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-10 flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => submitRating(booking.id, star)}
                          className="text-slate-300 hover:text-amber-400 transition-colors"
                        >
                          <Star size={22} fill="currentColor" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* In-progress or scheduled → Rate button greyed out */}
              {booking.status !== 'completed' && (
                <button
                  disabled
                  className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed"
                >
                  Rate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Recommended Artisans ─────────────────────────────────────────────────────
function RecommendedArtisans() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm w-full lg:w-72 xl:w-80 shrink-0">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Recommended Artisans</h2>

      <div className="flex flex-col gap-4">
        {recommendedArtisans.map((artisan) => (
          <div
            key={artisan.id}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => {/* TODO: navigate(`/artisan/${artisan.id}`) */}}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 ${artisan.color} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {artisan.initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors truncate">
                {artisan.name}
              </p>
              <p className="text-xs text-slate-400">{artisan.specialty}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={11} className="text-amber-400" fill="currentColor" />
                <span className="text-xs font-semibold text-slate-700">{artisan.rating}</span>
                <span className="text-xs text-slate-400">({artisan.reviews})</span>
              </div>
            </div>

            {/* Distance */}
            <span className="text-xs text-slate-400 shrink-0">{artisan.distance}</span>
          </div>
        ))}
      </div>

      <a
        href="/search"
        className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] shadow-md shadow-amber-200"
      >
        Find More Artisans
        <ChevronRight size={16} />
      </a>
    </div>
  )
}

// ─── Main content area ────────────────────────────────────────────────────────

  function MainContent() {
    const { user } = useAuth()
    const [dashData, setDashData] = useState<{
      totalBookings: number
      completed: number
      inProgress: number
      scheduled: number
      avgRatingGiven: string
      recentBookings: Array<{
        id: number
        status: string
        scheduled_date: string
        total_amount: number
        service_title: string
        artisan_name: string
        avatar_initials: string
        has_review: boolean
      }>
    } | null>(null)

    const [recommended, setRecommended] = useState<Array<{
      id: number
      full_name: string
      quarter: string
      avatar_initials: string
      trust_score: number
      avg_rating: string
      primary_service: string
      rate_per_hour: number
      is_new_artisan: boolean
    }>>([])

    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const fetchAll = async () => {
        try {
          const [dashRes, topRes] = await Promise.all([
            api.get('/customer/dashboard'),
            api.get('/artisans/top'),
          ])
          setDashData(dashRes.data)
          setRecommended(topRes.data.artisans)
        } catch (err) {
          console.error('Dashboard fetch error:', err)
        } finally {
          setLoading(false)
        }
      }
      fetchAll()
    }, [])

    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Loading dashboard...</p>
          </div>
        </div>
      )
    }

    // Build stats from real data
    const stats = [
      {
        icon: <CalendarDays size={24} className="text-orange-400" />,
        value: dashData?.totalBookings ?? 0,
        label: 'Total Bookings',
      },
      {
        icon: <TrendingUp size={24} className="text-emerald-500" />,
        value: dashData?.completed ?? 0,
        label: 'Completed',
      },
      {
        icon: <Clock size={24} className="text-blue-500" />,
        value: dashData?.inProgress ?? 0,
        label: 'In Progress',
      },
      {
        icon: <Star size={24} className="text-amber-400" />,
        value: dashData?.avgRatingGiven ?? '0.0',
        label: 'Avg Rating Given',
      },
    ]

    return (
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
            Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your bookings and find trusted service providers
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
              {stat.icon}
              <span className="text-2xl font-extrabold text-slate-800">{stat.value}</span>
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Recent bookings */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-slate-800 text-lg">Recent Bookings</h2>
              <a href="/customer/bookings" className="text-amber-500 hover:text-amber-600 text-sm font-semibold transition-colors">
                View All →
              </a>
            </div>

            {dashData?.recentBookings.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm">No bookings yet.</p>
                <a href="/search" className="mt-3 inline-block text-amber-500 text-sm font-semibold hover:text-amber-600">
                  Find an artisan →
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {dashData?.recentBookings.map((booking) => (
                  <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{booking.service_title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">by {booking.artisan_name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400">{booking.scheduled_date}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        booking.status === 'completed'   ? 'bg-emerald-100 text-emerald-700' :
                        booking.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                                          'bg-amber-100 text-amber-700'
                      }`}>
                        {booking.status}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        XAF {booking.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended artisans */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm w-full lg:w-72 xl:w-80 shrink-0">
            <h2 className="font-extrabold text-slate-800 text-lg mb-1">Top Artisans This Week</h2>
            <p className="text-xs text-slate-400 mb-4">Ranked by trust score and recent activity</p>

            {recommended.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No artisans available yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {recommended.map((artisan) => (
                  <div key={artisan.id} className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => window.location.href = `/artisan/${artisan.id}`}>
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {artisan.avatar_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm group-hover:text-amber-600 transition-colors truncate">
                        {artisan.full_name}
                      </p>
                      <p className="text-xs text-slate-400">{artisan.primary_service} · {artisan.quarter}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={11} className="text-amber-400" fill="currentColor" />
                        <span className="text-xs font-semibold text-slate-700">{parseFloat(artisan.avg_rating || '0').toFixed(1)}</span>
                        <span className="text-xs text-emerald-600 font-semibold ml-1">{artisan.trust_score}% trust</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <a href="/search"
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] shadow-md shadow-amber-200">
              Find More Artisans
            </a>
          </div>
        </div>
      </main>
    )
  }

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Sidebar — always visible on desktop, drawer on mobile */}
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeHref="/customer"
      />

      {/* Right side — top bar (mobile) + scrollable content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <MainContent />
      </div>

    </div>
  )
}