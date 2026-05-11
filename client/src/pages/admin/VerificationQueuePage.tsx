// ─── VerificationQueuePage ────────────────────────────────────────────────────
// Admin reviews artisan verification documents one document at a time.
// Each document card has: View (opens file_url), Approve, Reject (with reason modal).
// After any action the list refetches so counts stay accurate.
// Route: /admin/verification   Auth: admin only

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, XCircle, ExternalLink, FileText,
  AlertCircle, Inbox, Menu, Wrench, Loader2, ShieldCheck
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import NotificationBell, { NotificationItem } from '../../components/NotificationBell'
import api from '../../utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────
// Mirrors exactly what getVerificationQueue returns from adminController.js
type DocStatus = 'pending' | 'verified' | 'rejected'
type TabFilter  = DocStatus

interface VerificationDoc {
  id: number
  doc_name: string
  file_url: string
  status: DocStatus
  rejection_reason: string | null
  expiry_date: string | null
  uploaded_at: string
  artisan_profile_id: number
  trust_score: number
  user_id: number
  full_name: string
  email: string
  quarter: string
  avatar_initials: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string) {
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

// ─── Status config ────────────────────────────────────────────────────────────
const statusCfg: Record<DocStatus, { pill: string; label: string }> = {
  pending:  { pill: 'bg-amber-50 text-amber-700 border border-amber-200',     label: 'Pending'  },
  verified: { pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Verified' },
  rejected: { pill: 'bg-red-50 text-red-600 border border-red-200',            label: 'Rejected' },
}

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'Pending',  value: 'pending'  },
  { label: 'Verified', value: 'verified' },
  { label: 'Rejected', value: 'rejected' },
]

// ─── Reject Modal ─────────────────────────────────────────────────────────────
interface RejectModalProps {
  doc: VerificationDoc
  onConfirm: (reason: string) => void
  onCancel: () => void
  submitting: boolean
}

function RejectModal({ doc, onConfirm, onCancel, submitting }: RejectModalProps) {
  const [reason, setReason] = useState('')

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
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <XCircle size={20} className="text-red-500" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg leading-tight">Reject Document</h2>
            <p className="text-slate-500 text-sm">{doc.doc_name}</p>
          </div>
        </div>

        {/* Artisan mini-card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-5 border border-slate-100">
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center text-sm font-extrabold text-amber-700">
            {doc.avatar_initials}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">{doc.full_name}</p>
            <p className="text-xs text-slate-400">{doc.quarter}</p>
          </div>
        </div>

        <label className="block text-sm font-bold text-slate-700 mb-2">
          Rejection Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Provide a clear reason — the artisan will see this..."
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-400"
        />

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || submitting}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            {submitting ? 'Rejecting...' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Document Card ────────────────────────────────────────────────────────────
interface DocCardProps {
  doc: VerificationDoc
  onApprove: (doc: VerificationDoc) => void
  onReject:  (doc: VerificationDoc) => void
  actioning: number | null   // doc.id being processed right now
}

function DocCard({ doc, onApprove, onReject, actioning }: DocCardProps) {
  const cfg       = statusCfg[doc.status]
  const isPending = doc.status === 'pending'
  const isActioning = actioning === doc.id

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top accent strip — colour matches status */}
      <div className={`h-1 w-full ${
        doc.status === 'pending'  ? 'bg-amber-400'   :
        doc.status === 'verified' ? 'bg-emerald-400' : 'bg-red-400'
      }`} />

      <div className="p-5">
        {/* Header: artisan identity + status pill */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center text-sm font-extrabold text-amber-700 shrink-0">
              {doc.avatar_initials}
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm leading-tight">{doc.full_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{doc.quarter} · {doc.email}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${cfg.pill}`}>
            {cfg.label}
          </span>
        </div>

        {/* Document name row */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-4">
          <div className="w-9 h-9 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={16} className="text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-700 truncate">{doc.doc_name}</p>
            <p className="text-xs text-slate-400">Uploaded {formatRelativeTime(doc.uploaded_at)}</p>
          </div>
        </div>

        {/* Meta row: expiry + trust score */}
        <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
          {doc.expiry_date && (
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
              Expires {formatDate(doc.expiry_date)}
            </span>
          )}
          <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
            <ShieldCheck size={11} className="text-emerald-500" />
            Trust: {doc.trust_score}%
          </span>
        </div>

        {/* Rejection reason (shown on rejected tab) */}
        {doc.status === 'rejected' && doc.rejection_reason && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
            <p className="text-xs font-bold text-red-600 mb-0.5">Rejection reason</p>
            <p className="text-xs text-red-500">{doc.rejection_reason}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* View — always shown */}
          <a
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            <ExternalLink size={13} />
            View Doc
          </a>

          {/* Approve + Reject — only on pending */}
          {isPending && (
            <>
              <button
                onClick={() => onReject(doc)}
                disabled={isActioning}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-xl transition-colors"
              >
                {isActioning ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Reject
              </button>
              <button
                onClick={() => onApprove(doc)}
                disabled={isActioning}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors"
              >
                {isActioning ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile TopBar ────────────────────────────────────────────────────────────
function TopBar({
  onMenuClick,
  notifications,
  onMarkAllRead,
}: {
  onMenuClick: () => void
  notifications: NotificationItem[]
  onMarkAllRead: () => void
}) {
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
export default function VerificationQueuePage() {
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [tab, setTab]                   = useState<TabFilter>('pending')
  const [docs, setDocs]                 = useState<VerificationDoc[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [actioning, setActioning]       = useState<number | null>(null)   // doc.id being actioned
  const [rejectTarget, setRejectTarget] = useState<VerificationDoc | null>(null)
  const [toast, setToast]               = useState('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // ── Fetch documents ─────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/admin/verification?status=${tab}`)
      setDocs(res.data.documents)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }, [tab])

  // ── Fetch notifications for bell ────────────────────────────────────────────
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
      } catch {
        // bell failing silently is acceptable
      }
    }
    fetchNotifs()
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/customer/notifications/read')
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch { /* silent */ }
  }

  // ── Approve ─────────────────────────────────────────────────────────────────
  const handleApprove = async (doc: VerificationDoc) => {
    setActioning(doc.id)
    try {
      const res = await api.patch(`/admin/verification/${doc.id}`, { action: 'approve' })
      showToast(`✓ "${doc.doc_name}" approved. New trust score: ${res.data.newTrustScore}%`)
      await fetchDocs()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showToast(err.response?.data?.error || 'Approval failed.')
    } finally {
      setActioning(null)
    }
  }

  // ── Reject ──────────────────────────────────────────────────────────────────
  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return
    setActioning(rejectTarget.id)
    try {
      await api.patch(`/admin/verification/${rejectTarget.id}`, {
        action: 'reject',
        rejectionReason: reason,
      })
      showToast(`"${rejectTarget.doc_name}" rejected. Artisan has been notified.`)
      setRejectTarget(null)
      await fetchDocs()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showToast(err.response?.data?.error || 'Rejection failed.')
    } finally {
      setActioning(null)
    }
  }

  // Pending count drives the header alert banner
  const pendingCount = tab === 'pending' ? docs.length : null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeHref="/admin/verification"
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
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Verification Queue</h1>
              <p className="text-slate-500 text-sm mt-1">Review artisan documents and update trust scores</p>
            </div>
            {/* Desktop bell */}
            <div className="hidden lg:block">
              <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllRead} />
            </div>
          </div>

          {/* Pending alert banner — only shows on the pending tab when there are items */}
          {pendingCount !== null && pendingCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6">
              <AlertCircle size={18} className="text-amber-500 shrink-0" />
              <p className="text-sm font-semibold text-amber-700">
                {pendingCount} document{pendingCount > 1 ? 's' : ''} waiting for your review
              </p>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const active = tab === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Loading documents...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchDocs}
                className="text-sm font-semibold text-amber-600 hover:text-amber-700"
              >
                Try again
              </button>
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Inbox size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">
                {tab === 'pending'  && 'No pending documents — queue is clear.'}
                {tab === 'verified' && 'No verified documents yet.'}
                {tab === 'rejected' && 'No rejected documents.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {docs.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  onApprove={handleApprove}
                  onReject={(d) => setRejectTarget(d)}
                  actioning={actioning}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          doc={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => { if (!actioning) setRejectTarget(null) }}
          submitting={actioning === rejectTarget.id}
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