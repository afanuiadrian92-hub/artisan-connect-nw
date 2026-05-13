import { useState, useEffect } from 'react'
import {
  CalendarDays, Clock, MapPin, Star,
  MessageCircle, XCircle, Menu, Bell, 
  Wrench, CheckCircle2, Banknote
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import api from '../../utils/api'

type BookingStatus = 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
type FilterTab     = 'all' | BookingStatus

interface Booking {
  id: number
  status: BookingStatus
  scheduled_date: string
  scheduled_time: string
  location: string
  total_amount: number
  service_title: string
  service_description: string
  artisan_name: string
  avatar_initials: string
  artisan_phone: string
  payment_status: string
  review_stars: number | null
  review_comment: string | null
}

const formatXAF = (n: number) => `XAF ${n.toLocaleString()}`
const statusStyle: Record<BookingStatus, string> = {
  confirmed:     'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed:     'bg-emerald-100 text-emerald-700',
  cancelled:     'bg-red-100 text-red-500',
}
const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'All Bookings' },
  { key: 'confirmed',   label: 'Scheduled'    },
  { key: 'in-progress', label: 'In Progress'  },
  { key: 'completed',   label: 'Completed'    },
]

function ReviewModal({ booking, onClose, onSubmitted }: {
  booking: Booking; onClose: () => void; onSubmitted: () => void
}) {
  const [stars, setStars]     = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async () => {
    if (!stars) { setError('Please select a star rating.'); return }
    setLoading(true)
    try {
      await api.post('/customer/reviews', { bookingId: booking.id, stars, comment })
      onSubmitted(); onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Failed to submit review.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>
        <div>
          <h2 className="font-extrabold text-slate-800 text-lg mb-1">Leave a Review</h2>
          <p className="text-slate-500 text-sm">How was your experience with <span className="font-semibold">{booking.artisan_name}</span>?</p>
        </div>
        <div className="flex gap-2 justify-center">
          {[1,2,3,4,5].map(s => (
            <button key={s} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} onClick={() => setStars(s)} className="transition-transform hover:scale-110">
              <Star size={32} fill={(hovered||stars)>=s?'currentColor':'none'} className={(hovered||stars)>=s?'text-amber-400':'text-slate-300'} />
            </button>
          ))}
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share details (optional)" rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400 resize-none" />
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl">Cancel</button>
          <button onClick={handleSubmit} disabled={loading||!stars} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-200">
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────
function PaymentModal({ booking, onClose, onSuccess }: {
  booking: Booking; onClose: () => void; onSuccess: () => void
}) {
  const [phone,    setPhone]    = useState('')
  const [stage,    setStage]    = useState<'input' | 'polling' | 'done' | 'failed'>('input')
  const [error,    setError]    = useState('')
  const [ussdCode, setUssdCode] = useState('')

  const handlePay = async () => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 9) { setError('Enter a valid phone number.'); return }
    // CamPay expects 237XXXXXXXXX format
    const formatted = cleaned.startsWith('237') ? cleaned : `237${cleaned}`
    setError('')
    setStage('polling')
    try {
      await api.post('/payments/initiate', { bookingId: booking.id, payerPhone: formatted })
      // Poll every 3 seconds for up to 2 minutes (40 attempts)
      let attempts = 0
      const interval = setInterval(async () => {
        attempts++
        try {
          const res = await api.get(`/payments/status/${booking.id}`)
          const s = res.data.status
          if (s === 'completed') {
            clearInterval(interval)
            setUssdCode(res.data.ussdCode || '')
            setStage('done')
            onSuccess()
          } else if (s === 'failed') {
            clearInterval(interval)
            setStage('failed')
          }
        } catch { /* keep polling */ }
        if (attempts >= 40) {
          clearInterval(interval)
          setStage('failed')
          setError('Payment timed out. Please try again.')
        }
      }, 3000)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Could not initiate payment.')
      setStage('input')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => { if (stage !== 'polling') onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>

        {stage === 'input' && (
          <>
            <div>
              <h2 className="font-extrabold text-slate-800 text-lg mb-1">Pay via Mobile Money</h2>
              <p className="text-slate-500 text-sm">
                You will receive a push notification on your phone to confirm{' '}
                <span className="font-bold text-slate-700">{formatXAF(booking.total_amount)}</span>.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
              <span className="font-extrabold">Booking:</span> {booking.service_title} with {booking.artisan_name}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-slate-700">MTN MoMo / Orange Money Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 677000000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-700"
              />
              <p className="text-xs text-slate-400">Enter digits only — country code added automatically</p>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl">Cancel</button>
              <button onClick={handlePay} disabled={!phone.trim()} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-200">
                Pay Now
              </button>
            </div>
          </>
        )}

        {stage === 'polling' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="font-extrabold text-slate-800">Waiting for payment...</p>
              <p className="text-slate-500 text-sm mt-1">Check your phone and approve the MoMo request. This page will update automatically.</p>
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-lg">Payment Confirmed!</p>
              <p className="text-slate-500 text-sm mt-1">The booking is now in progress. The artisan has been notified.</p>
            </div>
            <button onClick={onClose} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl">Done</button>
          </div>
        )}

        {stage === 'failed' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
              <XCircle size={32} className="text-red-400" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800">Payment Failed</p>
              <p className="text-slate-500 text-sm mt-1">{error || 'The payment was not completed. You can try again.'}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl">Close</button>
              <button onClick={() => setStage('input')} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl">Try Again</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function BookingCard({ booking, onLeaveReview, onCancel, onPay }: {
  booking: Booking; onLeaveReview: (b: Booking) => void; onCancel: (id: number) => void; onPay: (b: Booking) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
            {booking.avatar_initials}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-extrabold text-slate-800">{booking.service_title}</p>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusStyle[booking.status]}`}>
                {booking.status === 'in-progress' ? 'In Progress' : booking.status.charAt(0).toUpperCase()+booking.status.slice(1)}
              </span>
            </div>
            <p className="text-amber-500 text-sm font-semibold">by {booking.artisan_name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-extrabold text-slate-800 text-lg">{formatXAF(booking.total_amount)}</p>
          {booking.payment_status && (
            <p className={`text-xs font-semibold ${booking.payment_status==='completed'?'text-emerald-600':'text-amber-500'}`}>
              Payment: {booking.payment_status}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 text-xs text-slate-500">
        {booking.scheduled_date && <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-slate-400" />{booking.scheduled_date}</div>}
        {booking.scheduled_time && <div className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" />{booking.scheduled_time}</div>}
        {booking.location && <div className="flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" />{booking.location}</div>}
      </div>

      {booking.service_description && (
        <div className="bg-slate-50 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 mb-1">Description:</p>
          <p className="text-sm text-slate-700">{booking.service_description}</p>
        </div>
      )}

      {booking.review_stars && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1 mb-1">
            {Array.from({length: booking.review_stars}).map((_,i) => (
              <Star key={i} size={14} className="text-amber-400" fill="currentColor" />
            ))}
            <span className="text-xs font-bold text-amber-600 ml-1">Your Review</span>
          </div>
          {booking.review_comment && <p className="text-sm text-slate-600 italic">"{booking.review_comment}"</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        {booking.artisan_phone && (
          <a href={`https://wa.me/${booking.artisan_phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors">
            <MessageCircle size={15} /> Contact Artisan
          </a>
        )}
        {booking.status === 'confirmed' && (
          <>
            <button
              onClick={() => onPay(booking)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-amber-200"
            >
              <Banknote size={15} /> Pay Now
            </button>
            <button
              onClick={() => onCancel(booking.id)}
              className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold rounded-xl transition-colors"
            >
              <XCircle size={15} /> Cancel Booking
            </button>
          </>
        )}
        {booking.status === 'completed' && !booking.review_stars && (
          <button onClick={() => onLeaveReview(booking)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-amber-200">
            <Star size={15} /> Leave Review
          </button>
        )}
        {booking.status === 'completed' && booking.review_stars && (
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
            <CheckCircle2 size={16} /> Review submitted
          </div>
        )}
      </div>
    </div>
  )
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-20">
      <button onClick={onMenuClick} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"><Menu size={20} /></button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center"><Wrench size={14} className="text-white" /></div>
        <span className="font-bold text-slate-800 text-sm">Trust<span className="text-amber-500">Link</span></span>
      </div>
      <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"><Bell size={20} /></button>
    </div>
  )
}

export default function MyBookingsPage() {
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [loading, setLoading]           = useState(true)
  const [activeTab, setActiveTab]       = useState<FilterTab>('all')
  const [reviewTarget, setReviewTarget] = useState<Booking | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<Booking | null>(null)

  const fetchBookings = async (status = 'all') => {
    setLoading(true)
    try {
      const params: Record<string,string> = {}
      if (status !== 'all') params.status = status
      const res = await api.get('/customer/bookings', { params })
      setBookings(res.data.bookings || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchBookings() }, [])

  const handleTabChange = (tab: FilterTab) => { setActiveTab(tab); fetchBookings(tab) }
  const handleCancel = async (id: number) => {
    try {
      await api.post(`/customer/bookings/${id}/cancel`)
      fetchBookings(activeTab)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'Could not cancel.')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/customer/bookings" />
      {reviewTarget && (
        <ReviewModal booking={reviewTarget} onClose={() => setReviewTarget(null)} onSubmitted={() => fetchBookings(activeTab)} />
      )}
      {paymentTarget && (
      <PaymentModal
        booking={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSuccess={() => { setPaymentTarget(null); fetchBookings(activeTab) }}/>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">My Bookings</h1>
            <p className="text-slate-500 text-sm mt-1">Track and manage your service appointments</p>
          </div>
          <div className="flex gap-2 flex-wrap mb-6">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab===tab.key?'bg-amber-500 text-white shadow-md shadow-amber-200':'bg-white border border-slate-200 text-slate-600 hover:border-amber-300'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bookings.length > 0 ? (
            <div className="flex flex-col gap-4">
              {bookings.map(b => <BookingCard key={b.id} booking={b} onLeaveReview={setReviewTarget} onCancel={handleCancel} onPay={setPaymentTarget} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <CalendarDays size={28} className="text-slate-400" />
              </div>
              <p className="font-bold text-slate-700 mb-1">No bookings found</p>
              <a href="/search" className="mt-3 px-5 py-2.5 bg-amber-500 text-white font-bold text-sm rounded-xl">Find an Artisan</a>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}