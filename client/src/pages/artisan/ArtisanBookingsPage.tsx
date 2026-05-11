import { useState, useEffect } from 'react'
import {
  Calendar, Clock, MapPin, CheckCircle2, AlertCircle,
  Menu, Wrench, Bell, Loader2, Inbox, Phone
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import api from '../../utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type BookingStatus = 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
type TabFilter = 'all' | BookingStatus

interface Booking {
  id: number
  status: BookingStatus
  scheduled_date: string
  scheduled_time: string
  location: string
  total_amount: number
  payment_state: string
  created_at: string
  service_title: string
  customer_name: string
  customer_avatar: string
  customer_phone: string | null
  review_stars: number | null
  review_comment: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatXAF = (n: number) =>
  `XAF ${Number(n).toLocaleString()}`

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const formatTime = (t: string | null) => {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`
}

// ─── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<BookingStatus, { label: string; pill: string; dot: string }> = {
  confirmed:    { label: 'Confirmed',   pill: 'bg-blue-50 text-blue-700 border border-blue-200',     dot: 'bg-blue-400'   },
  'in-progress':{ label: 'In Progress', pill: 'bg-amber-50 text-amber-700 border border-amber-200',  dot: 'bg-amber-400'  },
  completed:    { label: 'Completed',   pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-400' },
  cancelled:    { label: 'Cancelled',   pill: 'bg-red-50 text-red-600 border border-red-200',        dot: 'bg-red-400'    },
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All',         value: 'all'         },
  { label: 'Confirmed',   value: 'confirmed'   },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed',   value: 'completed'   },
]

// ─── Star row ─────────────────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 16 16" className={`w-3.5 h-3.5 ${i <= n ? 'fill-amber-400' : 'fill-slate-200'}`}>
          <path d="M8 1l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11l-3.9 2.1.8-4.4L1.7 5.6l4.4-.6z" />
        </svg>
      ))}
    </span>
  )
}

// ─── Booking card ─────────────────────────────────────────────────────────────
function BookingCard({
  booking,
  onMarkComplete,
  completing,
}: {
  booking: Booking
  onMarkComplete: (id: number) => void
  completing: number | null
}) {
  const cfg    = statusConfig[booking.status]
  const isIP   = booking.status === 'in-progress'
  const isDone = booking.status === 'completed'
  const waPhone = booking.customer_phone
    ? `https://wa.me/${booking.customer_phone.replace(/\D/g, '').replace(/^0/, '237')}`
    : null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Coloured top strip */}
      <div className={`h-1 w-full ${cfg.dot}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Customer avatar */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-sm font-extrabold text-amber-700 shrink-0">
              {booking.customer_avatar}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-800 text-base leading-tight truncate">
                {booking.service_title}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Customer: <span className="font-semibold text-slate-700">{booking.customer_name}</span>
              </p>
            </div>
          </div>

          {/* Status pill + amount */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.pill}`}>
              {cfg.label}
            </span>
            <span className="text-base font-extrabold text-slate-800">
              {formatXAF(booking.total_amount)}
            </span>
          </div>
        </div>

        {/* Detail pills */}
        <div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
            <Calendar size={12} className="text-slate-400" />
            {formatDate(booking.scheduled_date)}
          </span>
          <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
            <Clock size={12} className="text-slate-400" />
            {formatTime(booking.scheduled_time)}
          </span>
          {booking.location && (
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg max-w-[220px] truncate">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{booking.location}</span>
            </span>
          )}
        </div>

        {/* Review (if completed and reviewed) */}
        {isDone && booking.review_stars && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Stars n={booking.review_stars} />
              <span className="text-xs font-semibold text-amber-700">
                {booking.review_stars}/5 from customer
              </span>
            </div>
            {booking.review_comment && (
              <p className="text-xs text-slate-600 italic">"{booking.review_comment}"</p>
            )}
          </div>
        )}

        {/* Awaiting review nudge */}
        {isDone && !booking.review_stars && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
            <p className="text-xs text-slate-400">Awaiting customer review</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-1">
          {/* Mark Complete — only for in-progress */}
          {isIP && (
            <button
              onClick={() => onMarkComplete(booking.id)}
              disabled={completing === booking.id}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-emerald-200"
            >
              {completing === booking.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {completing === booking.id ? 'Marking...' : 'Mark Complete'}
            </button>
          )}

          {/* WhatsApp — always shown if phone available */}
          {waPhone && (
            <a
              href={waPhone}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20b858] text-white text-sm font-bold rounded-xl transition-all"
            >
              <Phone size={14} />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filter }: { filter: TabFilter }) {
  const msgs: Record<TabFilter, string> = {
    all:          'No bookings yet. Once a customer accepts your quote, bookings will appear here.',
    confirmed:    'No confirmed bookings.',
    'in-progress':'No jobs currently in progress.',
    completed:    'No completed jobs yet. Keep going!',
    cancelled:    'No cancelled bookings.',
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <Inbox size={28} className="text-slate-400" />
      </div>
      <p className="text-slate-500 text-sm max-w-xs">{msgs[filter]}</p>
    </div>
  )
}

// ─── Mobile top bar ───────────────────────────────────────────────────────────
function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
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
      <div className="w-9" /> {/* spacer */}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ArtisanBookingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tab, setTab]                 = useState<TabFilter>('all')
  const [bookings, setBookings]       = useState<Booking[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [completing, setCompleting]   = useState<number | null>(null)
  const [toast, setToast]             = useState('')

  // Fetch bookings whenever tab changes
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true)
      setError('')
      try {
        const params = tab !== 'all' ? `?status=${tab}` : ''
        const res    = await api.get(`/artisans/artisan/bookings${params}`)
        setBookings(res.data.bookings)
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } } }
        setError(err.response?.data?.error || 'Failed to load bookings.')
      } finally {
        setLoading(false)
      }
    }
    fetchBookings()
  }, [tab])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const handleMarkComplete = async (bookingId: number) => {
    setCompleting(bookingId)
    try {
      await api.patch(`/artisans/artisan/bookings/${bookingId}/complete`)
      // Optimistically update the booking status in state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'completed' as BookingStatus } : b
        )
      )
      showToast('Booking marked as completed! The customer has been notified.')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showToast(err.response?.data?.error || 'Could not mark booking complete.')
    } finally {
      setCompleting(null)
    }
  }

  // Count per tab for badges
  const counts: Record<TabFilter, number> = {
    all:          bookings.length,
    confirmed:    bookings.filter((b) => b.status === 'confirmed').length,
    'in-progress':bookings.filter((b) => b.status === 'in-progress').length,
    completed:    bookings.filter((b) => b.status === 'completed').length,
    cancelled:    bookings.filter((b) => b.status === 'cancelled').length,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/artisan/bookings" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">My Bookings</h1>
            <p className="text-slate-500 text-sm mt-1">Track and manage your customer jobs</p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const count = counts[t.value]
              const active = tab === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  {t.label}
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-extrabold ${
                      active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Loading bookings...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={() => setTab(tab)}
                className="text-sm font-semibold text-amber-600 hover:text-amber-700"
              >
                Try again
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState filter={tab} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
              {bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onMarkComplete={handleMarkComplete}
                  completing={completing}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl animate-fade-in max-w-sm text-center">
          {toast}
        </div>
      )}
    </div>
  )
}