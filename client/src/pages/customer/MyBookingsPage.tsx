import { useState } from 'react'
import {
  CalendarDays, Clock, MapPin, Star,
  MessageCircle, XCircle, Menu, Bell, Wrench, CheckCircle2
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────
type BookingStatus = 'scheduled' | 'in-progress' | 'completed'
type FilterTab = 'all' | BookingStatus

interface Review {
  stars: number
  comment: string
}

interface Booking {
  id: number
  initials: string
  avatarColor: string
  service: string
  artisanName: string
  status: BookingStatus
  date: string
  time: string
  location: string
  description: string
  ratePerHour: number    // XAF
  hours: number
  review?: Review        // only exists if customer already left one
}

// ─── Data — replace with GET /api/bookings?customerId= ───────────────────────
const allBookings: Booking[] = [
  {
    id: 1,
    initials: 'JS', avatarColor: 'bg-slate-500',
    service: 'Plumbing', artisanName: 'John Smith',
    status: 'scheduled',
    date: '2026-04-25', time: '10:00 AM',
    location: '123 Main St, Mezam Division',
    description: 'Fix leaking kitchen sink',
    ratePerHour: 4500, hours: 2,
  },
  {
    id: 2,
    initials: 'SJ', avatarColor: 'bg-teal-500',
    service: 'Electrical', artisanName: 'Sarah Johnson',
    status: 'in-progress',
    date: '2026-04-22', time: '2:00 PM',
    location: '456 Oak Ave, Menchum Division',
    description: 'Install ceiling fan and replace outlets',
    ratePerHour: 5500, hours: 3,
  },
  {
    id: 3,
    initials: 'MB', avatarColor: 'bg-purple-500',
    service: 'Solar Maintenance', artisanName: 'Mike Brown',
    status: 'completed',
    date: '2026-04-20', time: '9:00 AM',
    location: '789 Pine Rd, Bui Division',
    description: 'Solar panel cleaning and inspection',
    ratePerHour: 6500, hours: 4,
    review: { stars: 5, comment: 'Excellent work! Very professional and thorough.' },
  },
  {
    id: 4,
    initials: 'DL', avatarColor: 'bg-blue-500',
    service: 'Mechanic', artisanName: 'David Lee',
    status: 'completed',
    date: '2026-04-18', time: '11:00 AM',
    location: '321 Elm St, Mezam Division',
    description: 'Oil change and brake inspection',
    ratePerHour: 5000, hours: 2,
    // no review yet — customer will see Leave Review button
  },
]

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'All Bookings' },
  { key: 'scheduled',   label: 'Scheduled'    },
  { key: 'in-progress', label: 'In Progress'  },
  { key: 'completed',   label: 'Completed'    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatXAF = (amount: number) => `XAF ${amount.toLocaleString()}`

const statusStyle: Record<BookingStatus, string> = {
  scheduled:    'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed:    'bg-emerald-100 text-emerald-700',
}

const statusLabel: Record<BookingStatus, string> = {
  scheduled:    'Scheduled',
  'in-progress': 'In Progress',
  completed:    'Completed',
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({
  booking,
  onClose,
  onSubmit,
}: {
  booking: Booking
  onClose: () => void
  onSubmit: (bookingId: number, stars: number, comment: string) => void
}) {
  const [stars, setStars]     = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')

  const handleSubmit = () => {
    if (stars === 0) return
    onSubmit(booking.id, stars, comment)
    // TODO: POST /api/reviews { bookingId, stars, comment }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="font-extrabold text-slate-800 text-lg mb-1">Leave a Review</h2>
          <p className="text-slate-500 text-sm">
            How was your experience with <span className="font-semibold">{booking.artisanName}</span>?
          </p>
        </div>

        {/* Star picker */}
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setStars(s)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={32}
                fill={(hovered || stars) >= s ? 'currentColor' : 'none'}
                className={(hovered || stars) >= s ? 'text-amber-400' : 'text-slate-300'}
              />
            </button>
          ))}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share details about your experience (optional)"
          rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 resize-none transition-all"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:border-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={stars === 0}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-200"
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({
  booking,
  onLeaveReview,
  onCancel,
}: {
  booking: Booking
  onLeaveReview: (b: Booking) => void
  onCancel: (id: number) => void
}) {
  const total = booking.ratePerHour * booking.hours

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">

      {/* Header — avatar, service, status, total */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${booking.avatarColor} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {booking.initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-extrabold text-slate-800">{booking.service}</p>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyle[booking.status]}`}>
                {statusLabel[booking.status]}
              </span>
            </div>
            <p className="text-amber-500 text-sm font-semibold">by {booking.artisanName}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-extrabold text-slate-800 text-lg">{formatXAF(total)}</p>
          <p className="text-xs text-slate-400">
            {formatXAF(booking.ratePerHour)}/hr × {booking.hours}h
          </p>
        </div>
      </div>

      {/* Date / Time / Location */}
      <div className="flex flex-col sm:flex-row gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={13} className="text-slate-400" />
          {booking.date}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-slate-400" />
          {booking.time}
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-slate-400" />
          {booking.location}
        </div>
      </div>

      {/* Description */}
      <div className="bg-slate-50 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 mb-1">Description:</p>
        <p className="text-sm text-slate-700">{booking.description}</p>
      </div>

      {/* Existing review */}
      {booking.review && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1 mb-1">
            {Array.from({ length: booking.review.stars }).map((_, i) => (
              <Star key={i} size={14} className="text-amber-400" fill="currentColor" />
            ))}
            <span className="text-xs font-bold text-amber-600 ml-1">Your Review</span>
          </div>
          <p className="text-sm text-slate-600 italic">"{booking.review.comment}"</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">

        {/* Contact Artisan — always shown */}
        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors">
          <MessageCircle size={15} />
          Contact Artisan
          {/* TODO: open WhatsApp link: https://wa.me/+237XXXXXXXXX */}
        </button>

        {/* Cancel — scheduled only */}
        {booking.status === 'scheduled' && (
          <button
            onClick={() => onCancel(booking.id)}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold rounded-xl transition-colors"
          >
            <XCircle size={15} />
            Cancel Booking
          </button>
        )}

        {/* Leave Review — completed without review */}
        {booking.status === 'completed' && !booking.review && (
          <button
            onClick={() => onLeaveReview(booking)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-amber-200"
          >
            <Star size={15} />
            Leave Review
          </button>
        )}

        {/* Completed + reviewed → confirmation pill */}
        {booking.status === 'completed' && booking.review && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
            <CheckCircle2 size={16} />
            Review submitted
          </div>
        )}
      </div>
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
      <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">
        <Bell size={20} />
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [activeTab, setActiveTab]       = useState<FilterTab>('all')
  const [bookings, setBookings]         = useState<Booking[]>(allBookings)
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null)

  const filtered = activeTab === 'all'
    ? bookings
    : bookings.filter((b) => b.status === activeTab)

  const handleCancel = (id: number) => {
    setBookings((prev) => prev.filter((b) => b.id !== id))
    // TODO: DELETE /api/bookings/:id
  }

  const handleReviewSubmit = (bookingId: number, stars: number, comment: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, review: { stars, comment } } : b
      )
    )
    setReviewTarget(null)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/customer/bookings" />

      {/* Review modal */}
      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleReviewSubmit}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">My Bookings</h1>
            <p className="text-slate-500 text-sm mt-1">Track and manage your service appointments</p>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {tabs.map((tab) => {
              const count = tab.key === 'all'
                ? bookings.length
                : bookings.filter((b) => b.status === tab.key).length
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                    activeTab === tab.key
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-amber-100' : 'text-slate-400'}`}>
                    ({count})
                  </span>
                </button>
              )
            })}
          </div>

          {/* Booking cards */}
          {filtered.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filtered.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onLeaveReview={setReviewTarget}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <CalendarDays size={28} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-700 mb-1">No bookings found</p>
              <p className="text-slate-400 text-sm mb-4">
                {activeTab === 'all'
                  ? "You haven't made any bookings yet."
                  : `No ${activeTab} bookings at the moment.`}
              </p>
              <a
                href="/search"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-200"
              >
                Find an Artisan
              </a>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}