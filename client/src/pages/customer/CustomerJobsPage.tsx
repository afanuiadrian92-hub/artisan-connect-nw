// ─── CustomerJobsPage ─────────────────────────────────────────────────────────
// Customer sees all their job posts and the quotes each has received.
// Expanding a job shows its quotes. Accepting a quote (with schedule details)
// creates a booking → that booking then appears in /customer/bookings.
//
// API calls:
//   GET  /api/customer/jobs                              → job post list
//   GET  /api/customer/jobs/:id/quotes                  → quotes for one job
//   POST /api/customer/jobs/:id/quotes/:qId/accept      → create booking
//
// Route: /customer/jobs    Auth: customer only

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu, Wrench, FileText, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Inbox, Star, Shield,
  MapPin, Clock, CalendarDays, CheckCircle2, Plus, XCircle,
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import api from '../../utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type JobStatus = 'open' | 'quoted' | 'booked' | 'closed'

interface JobPost {
  id: number
  title: string
  description: string | null
  quarter: string
  budget_min: number | null
  budget_max: number | null
  status: JobStatus
  quote_count: number
  created_at: string
}

interface Quote {
  id: number
  price: number
  message: string | null
  estimated_hours: number | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  // artisan fields joined in
  artisan_name: string
  avatar_initials: string
  trust_score: number
  avg_rating: string
  artisan_quarter: string
}

// ─── Accept Quote Modal ────────────────────────────────────────────────────────
interface AcceptModalProps {
  quote: Quote
  jobId: number
  onConfirm: (scheduledDate: string, scheduledTime: string, location: string) => void
  onCancel: () => void
  submitting: boolean
}

function AcceptQuoteModal({ quote, onConfirm, onCancel, submitting }: AcceptModalProps) {
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [location,      setLocation]      = useState('')
  const [error,         setError]         = useState('')

  const handleConfirm = () => {
    if (!scheduledDate) { setError('Please pick a date.'); return }
    if (!scheduledTime) { setError('Please pick a time.'); return }
    if (!location.trim()) { setError('Please enter a location.'); return }
    setError('')
    onConfirm(scheduledDate, scheduledTime, location.trim())
  }

  // Minimum date = today
  const today = new Date().toISOString().split('T')[0]

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => { if (!submitting) onCancel() }}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <h2 className="font-extrabold text-slate-800 text-lg">Confirm Booking</h2>
          <p className="text-slate-500 text-sm mt-1">
            Accepting <span className="font-semibold text-slate-700">{quote.artisan_name}</span>'s quote for{' '}
            <span className="font-semibold text-amber-600">XAF {quote.price.toLocaleString()}</span>
          </p>
        </div>

        {/* Quote summary */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
            {quote.avatar_initials}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{quote.artisan_name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <Star size={11} className="text-amber-400" fill="currentColor" />
              <span>{parseFloat(quote.avg_rating || '0').toFixed(1)}</span>
              <span>·</span>
              <Shield size={11} className="text-emerald-500" />
              <span>{quote.trust_score}% trust</span>
            </div>
          </div>
          <div className="ml-auto text-right">
            <p className="font-extrabold text-slate-800">XAF {quote.price.toLocaleString()}</p>
            {quote.estimated_hours && (
              <p className="text-xs text-slate-400">~{quote.estimated_hours}h</p>
            )}
          </div>
        </div>

        {/* Schedule fields */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarDays size={14} className="text-slate-400" /> Scheduled Date
            </label>
            <input
              type="date"
              min={today}
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Clock size={14} className="text-slate-400" /> Scheduled Time
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin size={14} className="text-slate-400" /> Location / Address
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mile 4, behind the blue gate"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-200 flex items-center justify-center gap-2"
          >
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> Confirming...</>
              : <><CheckCircle2 size={14} /> Confirm Booking</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── QuoteCard ────────────────────────────────────────────────────────────────
interface QuoteCardProps {
  quote: Quote
  jobStatus: JobStatus
  onAccept: (quote: Quote) => void
  onReject: (quoteId: number) => void
}

function QuoteCard({ quote, jobStatus, onAccept, onReject }: QuoteCardProps) {
  const canAccept = jobStatus !== 'booked' && jobStatus !== 'closed' && quote.status === 'pending'

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
      quote.status === 'accepted'
        ? 'bg-emerald-50 border-emerald-200'
        : quote.status === 'rejected'
          ? 'bg-slate-50 border-slate-100 opacity-60'
          : 'bg-white border-slate-100'
    }`}>
      {/* Artisan info + price */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
            {quote.avatar_initials}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{quote.artisan_name}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-0.5">
                <Star size={11} className="text-amber-400" fill="currentColor" />
                {parseFloat(quote.avg_rating || '0').toFixed(1)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Shield size={11} className="text-emerald-500" />
                {quote.trust_score}% trust
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {quote.artisan_quarter}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-extrabold text-slate-800">XAF {quote.price.toLocaleString()}</p>
          {quote.estimated_hours && (
            <p className="text-xs text-slate-400">~{quote.estimated_hours}h</p>
          )}
        </div>
      </div>

      {/* Message */}
      {quote.message && (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2 leading-snug border border-slate-100">
          "{quote.message}"
        </p>
      )}

      {/* Status / action */}
      <div className="flex items-center gap-2 flex-wrap">
        {quote.status === 'accepted' && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={12} /> Accepted — booking created
          </span>
        )}
        {quote.status === 'rejected' && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={12} /> Declined - booking rejected
          </span>
        )}
        {canAccept && (
          <>
            <button
              onClick={() => onAccept(quote)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-amber-200"
            >
              <CheckCircle2 size={13} /> Accept
            </button>
            <button
              onClick={() => onReject(quote.id)}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors"
            >
              <XCircle size={13} /> Reject
            </button>
          </>
        )}
        {quote.status === 'pending' && !canAccept && (
          <span className="text-xs text-slate-400 font-semibold">Job already booked</span>
        )}
      </div>
    </div>
  )
}

// ─── JobCard ──────────────────────────────────────────────────────────────────
interface JobCardProps {
  job: JobPost
  onAcceptQuote: (quote: Quote, jobId: number) => void
  onRejectQuote: (quoteId: number, jobId: number) => void
}

const JOB_STATUS_STYLE: Record<JobStatus, string> = {
  open:   'bg-blue-50 text-blue-700 border-blue-200',
  quoted: 'bg-amber-50 text-amber-700 border-amber-200',
  booked: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
}

function JobCard({ job, onAcceptQuote, onRejectQuote }: JobCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [quotes,   setQuotes]   = useState<Quote[]>([])
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)
  const [error,    setError]    = useState('')

  const toggleExpand = async () => {
    if (!expanded && !loaded) {
      setLoading(true)
      setError('')
      try {
        const res = await api.get(`/customer/jobs/${job.id}/quotes`)
        setQuotes(res.data.quotes || [])
        setLoaded(true)
      } catch {
        setError('Could not load quotes.')
      } finally {
        setLoading(false)
      }
    }
    setExpanded((prev) => !prev)
  }

  // Refresh quotes after an accept action
  const refreshQuotes = async () => {
    try {
      const res = await api.get(`/customer/jobs/${job.id}/quotes`)
      setQuotes(res.data.quotes || [])
    } catch { /* silent */ }
  }

  const handleAcceptQuote = async (quote: Quote) => {
    onAcceptQuote(quote, job.id)
    // Parent handles the modal; refresh quotes after modal confirms
    // Parent will call refreshQuotes via callback — see CustomerJobsPage
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Job header — always visible */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{job.title}</h3>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${JOB_STATUS_STYLE[job.status]}`}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </span>
            </div>
            {job.description && (
              <p className="text-xs text-slate-500 leading-snug line-clamp-2 mb-2">{job.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><MapPin size={11} />{job.quarter}</span>
              {(job.budget_min || job.budget_max) && (
                <span>
                  Budget: XAF {job.budget_min?.toLocaleString() ?? '?'} – {job.budget_max?.toLocaleString() ?? '?'}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>

          {/* Expand toggle */}
          <button
            onClick={toggleExpand}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            {job.quote_count > 0
              ? <span className="text-amber-600">{job.quote_count} quote{job.quote_count !== 1 ? 's' : ''}</span>
              : <span>No quotes yet</span>
            }
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Quotes panel — collapsible */}
      {expanded && (
        <div className="border-t border-slate-50 bg-slate-50/50 px-5 py-4 flex flex-col gap-3">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-amber-500" />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {!loading && loaded && quotes.length === 0 && (
            <div className="text-center py-6">
              <Clock size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">No quotes yet — artisans will respond soon.</p>
            </div>
          )}
          {!loading && quotes.map((q) => (
            <QuoteCard
              key={q.id}
              quote={q}
              jobStatus={job.status}
              onAccept={(quote) => {
                handleAcceptQuote(quote)
                // expose refreshQuotes so parent can trigger it after accept
                ;(window as unknown as Record<string, () => void>)[`refreshJob_${job.id}`] = refreshQuotes
              }}
              onReject={(quoteId) => {
                ;(window as unknown as Record<string, () => void>)[`refreshJob_${job.id}`] = refreshQuotes
                onRejectQuote(quoteId, job.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-20">
      <button onClick={onMenuClick} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Open menu">
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
          <Wrench size={14} className="text-white" />
        </div>
        <span className="font-bold text-slate-800 text-sm">Trust<span className="text-amber-500">Link</span></span>
      </div>
      <div className="w-9" />
    </div>
  )
}

// ─── CustomerJobsPage ─────────────────────────────────────────────────────────
export default function CustomerJobsPage() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [jobs,    setJobs]    = useState<JobPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Accept modal state
  const [modalQuote,   setModalQuote]   = useState<Quote | null>(null)
  const [modalJobId,   setModalJobId]   = useState<number | null>(null)
  const [accepting,    setAccepting]    = useState(false)
  const [acceptError,  setAcceptError]  = useState('')

  // Toast
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/customer/jobs')
      setJobs(res.data.jobPosts || [])
    } catch {
      setError('Failed to load your job posts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  // Called by JobCard when customer clicks "Accept Quote"
  const handleAcceptQuote = (quote: Quote, jobId: number) => {
    setModalQuote(quote)
    setModalJobId(jobId)
    setAcceptError('')
  }

  // Called by JobCard when customer clicks "Reject Quote"
  const handleRejectQuote = async (quoteId: number, jobId: number) => {
    try {
      await api.patch(`/quotes/${quoteId}/reject`)
      // Refresh the quotes inside that job card
      const refreshFn = (window as unknown as Record<string, () => void>)[`refreshJob_${jobId}`]
      if (typeof refreshFn === 'function') refreshFn()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showToast(err.response?.data?.error || 'Could not reject quote.')
    }
  }

  // Called by modal on confirm
  const handleConfirmAccept = async (
    scheduledDate: string,
    scheduledTime: string,
    location: string,
  ) => {
    if (!modalQuote || !modalJobId) return
    setAccepting(true)
    try {
      await api.post(`/customer/jobs/${modalJobId}/quotes/${modalQuote.id}/accept`, {
        scheduledDate,
        scheduledTime,
        location,
      })
      showToast('Booking confirmed! Check your bookings page.')
      setModalQuote(null)
      setModalJobId(null)
      // Refresh job list so status updates to 'booked'
      await fetchJobs()
      // Also trigger quote refresh inside the expanded JobCard
      const refreshFn = (window as unknown as Record<string, () => void>)[`refreshJob_${modalJobId}`]
      if (typeof refreshFn === 'function') refreshFn()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setAcceptError(err.response?.data?.error || 'Could not confirm booking. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/customer/jobs" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between mb-7">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">My Jobs</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Review quotes from artisans and confirm bookings
                </p>
              </div>
              <button
                onClick={() => navigate('/customer/post-job')}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-200 shrink-0"
              >
                <Plus size={15} /> Post a Job
              </button>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">Loading your jobs...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <AlertCircle size={28} className="text-red-300" />
                <p className="text-red-500 text-sm">{error}</p>
                <button onClick={fetchJobs} className="text-sm font-semibold text-amber-600 hover:text-amber-700">Try again</button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <FileText size={28} className="text-slate-400" />
                </div>
                <p className="font-bold text-slate-700 mb-1">No job posts yet</p>
                <p className="text-slate-400 text-sm mb-4">Post a job request and artisans near you will send quotes.</p>
                <button
                  onClick={() => navigate('/customer/post-job')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-200"
                >
                  <Plus size={15} /> Post Your First Job
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onAcceptQuote={handleAcceptQuote}
                    onRejectQuote={handleRejectQuote}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Accept quote modal */}
      {modalQuote && modalJobId && (
        <AcceptQuoteModal
          quote={modalQuote}
          jobId={modalJobId}
          onConfirm={handleConfirmAccept}
          onCancel={() => { setModalQuote(null); setModalJobId(null) }}
          submitting={accepting}
        />
      )}

      {/* Accept error toast (shown if modal was dismissed but error exists) */}
      {acceptError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl max-w-sm text-center">
          {acceptError}
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl max-w-sm text-center">
          {toast}
        </div>
      )}
    </div>
  )
}