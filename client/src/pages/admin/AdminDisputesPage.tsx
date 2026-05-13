// ─── AdminDisputesPage ────────────────────────────────────────────────────────
// Admin views and manages customer-artisan disputes.
// Route: /admin/disputes   Auth: admin only
//
// THESIS NOTE: No disputes table exists in the DB — this page uses hardcoded
// mock data for demonstration purposes. Dispute status transitions are managed
// in local component state only (no API calls). This is intentional and
// documented in 06_PENDING_WORK.md.
//
// Actions supported (local state only):
//   open → investigating  ("Start Investigation" button)
//   investigating → resolved  ("Mark Resolved" modal with resolution text)
//   open | investigating → closed  ("Close Without Action")

import { useState, useEffect } from 'react'
import {
  AlertCircle, CheckCircle2, XCircle, Clock, MessageCircle,
  Menu, Wrench, ShieldAlert, Inbox, ChevronDown, ChevronUp,
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import NotificationBell, { NotificationItem } from '../../components/NotificationBell'
import api from '../../utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'closed'
type TabFilter     = 'all' | DisputeStatus
type Priority      = 'high' | 'medium' | 'low'

interface Dispute {
  id: number
  bookingId: string
  service: string
  issue: string
  description: string
  priority: Priority
  status: DisputeStatus
  openedDate: string
  resolvedDate?: string
  resolution?: string
  customer: { name: string; initials: string; quarter: string }
  artisan:  { name: string; initials: string; service: string }
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// Three realistic Bamenda-context disputes for thesis demo.
const INITIAL_DISPUTES: Dispute[] = [
  {
    id: 1,
    bookingId: 'TL-1042',
    service: 'Plumbing',
    issue: 'Job left incomplete',
    description:
      'Artisan was hired to fix a burst pipe and install two taps in the kitchen. He completed the pipe repair but left without installing the taps, claiming he needed to buy parts. He has not returned in three days and is no longer responding on WhatsApp.',
    priority: 'high',
    status: 'open',
    openedDate: '2026-05-08',
    customer: { name: 'Alice Fomunyam', initials: 'AF', quarter: 'Mile 4' },
    artisan:  { name: 'Emmanuel Tabi',  initials: 'ET', service: 'Plumber' },
  },
  {
    id: 2,
    bookingId: 'TL-0987',
    service: 'Electrical',
    issue: 'Billing discrepancy',
    description:
      'Customer was quoted 15,000 XAF for wiring two rooms. After the job, the artisan invoiced 28,000 XAF citing additional materials not discussed upfront. Customer disputes the extra charge and has evidence of the original quote via WhatsApp screenshot.',
    priority: 'medium',
    status: 'investigating',
    openedDate: '2026-05-06',
    customer: { name: 'Boris Nkengafac', initials: 'BN', quarter: 'Nkwen' },
    artisan:  { name: 'George Mbah',     initials: 'GM', service: 'Electrician' },
  },
  {
    id: 3,
    bookingId: 'TL-0891',
    service: 'Tailoring',
    issue: 'Late delivery of work',
    description:
      'Customer provided fabric and measurements for a traditional outfit needed for a graduation ceremony on April 30. Artisan delivered two weeks late, missing the event entirely. Customer is requesting a partial refund.',
    priority: 'low',
    status: 'resolved',
    openedDate: '2026-04-28',
    resolvedDate: '2026-05-04',
    resolution:
      'After reviewing both accounts, artisan agreed to a 30% refund (6,000 XAF) credited against a future booking. Customer accepted. Artisan warned that repeat lateness will affect trust score.',
    customer: { name: 'Cynthia Achu',  initials: 'CA', quarter: 'Commercial Avenue' },
    artisan:  { name: 'Rose Yengo',    initials: 'RY', service: 'Tailor' },
  },
]

// ─── Config maps ──────────────────────────────────────────────────────────────
const statusCfg: Record<DisputeStatus, { pill: string; label: string; dot: string }> = {
  open:          { pill: 'bg-red-50 text-red-600 border border-red-200',       label: 'Open',          dot: 'bg-red-400'    },
  investigating: { pill: 'bg-blue-50 text-blue-700 border border-blue-200',    label: 'Investigating', dot: 'bg-blue-400'   },
  resolved:      { pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Resolved', dot: 'bg-emerald-400' },
  closed:        { pill: 'bg-slate-100 text-slate-500 border border-slate-200', label: 'Closed',        dot: 'bg-slate-400'  },
}

const priorityCfg: Record<Priority, { pill: string; label: string; strip: string }> = {
  high:   { pill: 'bg-red-50 text-red-600 border border-red-200',       label: 'High',   strip: 'bg-red-400'    },
  medium: { pill: 'bg-amber-50 text-amber-700 border border-amber-200', label: 'Medium', strip: 'bg-amber-400'  },
  low:    { pill: 'bg-slate-100 text-slate-500 border border-slate-200', label: 'Low',   strip: 'bg-slate-300'  },
}

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All',           value: 'all'          },
  { label: 'Open',          value: 'open'         },
  { label: 'Investigating', value: 'investigating' },
  { label: 'Resolved',      value: 'resolved'     },
  { label: 'Closed',        value: 'closed'       },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

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

// ─── Resolve Modal ────────────────────────────────────────────────────────────
interface ResolveModalProps {
  dispute: Dispute
  onConfirm: (resolution: string) => void
  onCancel: () => void
}

function ResolveModal({ dispute, onConfirm, onCancel }: ResolveModalProps) {
  const [text, setText] = useState('')

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg leading-tight">Mark as Resolved</h2>
            <p className="text-slate-500 text-sm">Booking {dispute.bookingId}</p>
          </div>
        </div>

        {/* Parties mini-card */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-extrabold text-blue-700 shrink-0">
              {dispute.customer.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{dispute.customer.name}</p>
              <p className="text-xs text-slate-400">Customer</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-xs font-extrabold text-amber-700 shrink-0">
              {dispute.artisan.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{dispute.artisan.name}</p>
              <p className="text-xs text-slate-400">Artisan</p>
            </div>
          </div>
        </div>

        <label className="block text-sm font-bold text-slate-700 mb-2">
          Resolution Details <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe how this dispute was resolved — both parties will see this..."
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-400"
        />

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (text.trim()) onConfirm(text.trim()) }}
            disabled={!text.trim()}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={14} />
            Confirm Resolution
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dispute Card ─────────────────────────────────────────────────────────────
interface DisputeCardProps {
  dispute: Dispute
  onInvestigate: (id: number) => void
  onResolve:     (dispute: Dispute) => void
  onClose:       (id: number) => void
}

function DisputeCard({ dispute, onInvestigate, onResolve, onClose }: DisputeCardProps) {
  const [expanded, setExpanded] = useState(false)
  const sCfg = statusCfg[dispute.status]
  const pCfg = priorityCfg[dispute.priority]

  const canAct = dispute.status === 'open' || dispute.status === 'investigating'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Priority accent strip */}
      <div className={`h-1 w-full ${pCfg.strip}`} />

      <div className="p-5">
        {/* Top row: issue title + badges */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sCfg.pill}`}>
                {sCfg.label}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pCfg.pill}`}>
                {pCfg.label} priority
              </span>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base leading-tight mt-2">
              {dispute.issue}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Booking <span className="font-bold text-slate-600">{dispute.bookingId}</span>
              {' · '}{dispute.service}
              {' · '}Opened {formatDate(dispute.openedDate)}
            </p>
          </div>

          {/* Priority icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            dispute.priority === 'high'   ? 'bg-red-50'    :
            dispute.priority === 'medium' ? 'bg-amber-50'  : 'bg-slate-100'
          }`}>
            <ShieldAlert size={18} className={
              dispute.priority === 'high'   ? 'text-red-500'   :
              dispute.priority === 'medium' ? 'text-amber-500' : 'text-slate-400'
            } />
          </div>
        </div>

        {/* Parties row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-xs font-extrabold text-blue-700 shrink-0">
              {dispute.customer.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Customer</p>
              <p className="text-sm font-bold text-slate-700 truncate">{dispute.customer.name}</p>
              <p className="text-xs text-slate-400 truncate">{dispute.customer.quarter}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-xs font-extrabold text-amber-700 shrink-0">
              {dispute.artisan.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Artisan</p>
              <p className="text-sm font-bold text-slate-700 truncate">{dispute.artisan.name}</p>
              <p className="text-xs text-slate-400 truncate">{dispute.artisan.service}</p>
            </div>
          </div>
        </div>

        {/* Expandable description */}
        <div className="mb-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors mb-2"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide description' : 'View description'}
          </button>
          {expanded && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-sm text-slate-600 leading-relaxed">{dispute.description}</p>
            </div>
          )}
        </div>

        {/* Resolution panel — resolved disputes only */}
        {dispute.status === 'resolved' && dispute.resolution && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-emerald-700">
                Resolved {dispute.resolvedDate ? `on ${formatDate(dispute.resolvedDate)}` : ''}
              </span>
            </div>
            <p className="text-sm text-emerald-700 leading-relaxed">{dispute.resolution}</p>
          </div>
        )}

        {/* Closed panel */}
        {dispute.status === 'closed' && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-slate-500 font-semibold">Closed without action</p>
          </div>
        )}

        {/* Action buttons */}
        {canAct && (
          <div className="flex flex-wrap gap-2">
            {/* Contact — cosmetic, opens WhatsApp as platform communication channel */}
            <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors">
              <MessageCircle size={13} />
              Contact Parties
            </button>

            {/* Open → Investigating */}
            {dispute.status === 'open' && (
              <button
                onClick={() => onInvestigate(dispute.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors"
              >
                <Clock size={13} />
                Start Investigation
              </button>
            )}

            {/* → Resolved */}
            <button
              onClick={() => onResolve(dispute)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <CheckCircle2 size={13} />
              Mark Resolved
            </button>

            {/* → Closed */}
            <button
              onClick={() => onClose(dispute.id)}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold rounded-xl transition-colors"
            >
              <XCircle size={13} />
              Close Without Action
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TopBar (mobile) ──────────────────────────────────────────────────────────
interface TopBarProps {
  onMenuClick: () => void
  notifications: NotificationItem[]
  onMarkAllRead: () => void
}

function TopBar({ onMenuClick, notifications, onMarkAllRead }: TopBarProps) {
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
      <NotificationBell notifications={notifications} onMarkAllRead={onMarkAllRead} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDisputesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // All dispute state lives here — no backend, purely local
  const [disputes, setDisputes]         = useState<Dispute[]>(INITIAL_DISPUTES)
  const [tab, setTab]                   = useState<TabFilter>('all')
  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null)

  // Notifications (bell only — fetched from real API)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // Toast
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // Fetch notifications for bell (real API — admin uses same endpoint as other roles)
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
      } catch { /* silent — bell failure does not block the page */ }
    }
    fetchNotifs()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/customer/notifications/read')
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch { /* silent */ }
  }

  // ── Local state transitions ──────────────────────────────────────────────────

  const handleInvestigate = (id: number) => {
    setDisputes((prev) =>
      prev.map((d) => d.id === id ? { ...d, status: 'investigating' } : d)
    )
    showToast('Investigation started. Both parties have been noted.')
  }

  const handleResolveConfirm = (resolution: string) => {
    if (!resolveTarget) return
    const today = new Date().toISOString().split('T')[0]
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === resolveTarget.id
          ? { ...d, status: 'resolved', resolution, resolvedDate: today }
          : d
      )
    )
    showToast(`Dispute #${resolveTarget.bookingId} marked as resolved.`)
    setResolveTarget(null)
  }

  const handleClose = (id: number) => {
    setDisputes((prev) =>
      prev.map((d) => d.id === id ? { ...d, status: 'closed' } : d)
    )
    showToast('Dispute closed without action.')
  }

  // ── Filtered view ────────────────────────────────────────────────────────────
  const filtered = tab === 'all' ? disputes : disputes.filter((d) => d.status === tab)

  // Badge counts for tabs
  const counts: Record<TabFilter, number> = {
    all:          disputes.length,
    open:         disputes.filter((d) => d.status === 'open').length,
    investigating: disputes.filter((d) => d.status === 'investigating').length,
    resolved:     disputes.filter((d) => d.status === 'resolved').length,
    closed:       disputes.filter((d) => d.status === 'closed').length,
  }

  const openCount = counts.open

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeHref="/admin/disputes"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">

          {/* Page header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Dispute Management</h1>
              <p className="text-slate-500 text-sm mt-1">
                Review and resolve customer-artisan disputes
              </p>
            </div>
            <div className="hidden lg:block">
              <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllRead} />
            </div>
          </div>

          {/* Open disputes alert banner */}
          {openCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <p className="text-sm font-semibold text-red-700">
                {openCount} open dispute{openCount > 1 ? 's' : ''} requiring attention
              </p>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const active = tab === t.value
              const count  = counts[t.value]
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
                      active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Content */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Inbox size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">
                {tab === 'all'
                  ? 'No disputes on the platform yet.'
                  : `No ${tab} disputes.`
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {filtered.map((dispute) => (
                <DisputeCard
                  key={dispute.id}
                  dispute={dispute}
                  onInvestigate={handleInvestigate}
                  onResolve={(d) => setResolveTarget(d)}
                  onClose={handleClose}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Resolve modal */}
      {resolveTarget && (
        <ResolveModal
          dispute={resolveTarget}
          onConfirm={handleResolveConfirm}
          onCancel={() => setResolveTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl max-w-sm text-center">
          {toast}
        </div>
      )}
    </div>
  )
}