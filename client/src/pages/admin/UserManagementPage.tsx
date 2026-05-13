// ─── UserManagementPage ───────────────────────────────────────────────────────
// Admin views and manages all platform users (customers + artisans).
// Supports: search by name/email, role filter, pagination.
// Actions: Suspend / Reactivate per user (PATCH /api/admin/users/:id/suspend).
// Route: /admin/users   Auth: admin only

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Users, Menu, Wrench, Loader2, AlertCircle,
  Inbox, ShieldOff, ShieldCheck, ChevronLeft, ChevronRight,
  Star, Briefcase, UserCheck, UserX, MapPin, Mail, Calendar,
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import NotificationBell, { NotificationItem } from '../../components/NotificationBell'
import api from '../../utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────
// Mirrors exactly what GET /api/admin/users returns per row
type RoleFilter = 'all' | 'customer' | 'artisan'

interface AdminUser {
  id: number
  full_name: string
  email: string
  role: 'customer' | 'artisan'
  phone: string | null
  quarter: string | null
  division: string | null
  avatar_initials: string
  is_suspended: boolean
  created_at: string
  // Artisan-only fields — null for customers
  trust_score: number | null
  avg_rating: number | null
  total_jobs: number | null
  availability_status: string | null
}

interface UsersResponse {
  users: AdminUser[]
  total: number
  page: number
  totalPages: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
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

// ─── Suspend Confirmation Modal ───────────────────────────────────────────────
interface SuspendModalProps {
  user: AdminUser
  action: 'suspend' | 'reactivate'
  onConfirm: () => void
  onCancel: () => void
  submitting: boolean
}

function SuspendModal({ user, action, onConfirm, onCancel, submitting }: SuspendModalProps) {
  const isSuspend = action === 'suspend'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => { if (!submitting) onCancel() }}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isSuspend ? 'bg-red-50' : 'bg-emerald-50'
          }`}>
            {isSuspend
              ? <ShieldOff size={20} className="text-red-500" />
              : <ShieldCheck size={20} className="text-emerald-500" />
            }
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg leading-tight">
              {isSuspend ? 'Suspend User' : 'Reactivate User'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isSuspend ? 'This will block their access immediately.' : 'This will restore full access.'}
            </p>
          </div>
        </div>

        {/* User mini card */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-5 border border-slate-100">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-sm font-extrabold text-amber-700 shrink-0">
            {user.avatar_initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-700 truncate">{user.full_name}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role} · {user.email}</p>
          </div>
        </div>

        {isSuspend && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-5">
            <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600">
              The user will be immediately signed out and will not be able to log in until reactivated.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className={`flex-1 py-2.5 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
              isSuspend
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {submitting
              ? <Loader2 size={14} className="animate-spin" />
              : isSuspend ? <ShieldOff size={14} /> : <ShieldCheck size={14} />
            }
            {submitting
              ? (isSuspend ? 'Suspending...' : 'Reactivating...')
              : (isSuspend ? 'Suspend'       : 'Reactivate')
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── User Row Card ────────────────────────────────────────────────────────────
interface UserCardProps {
  user: AdminUser
  onAction: (user: AdminUser, action: 'suspend' | 'reactivate') => void
  actioning: number | null
}

function UserCard({ user, onAction, actioning }: UserCardProps) {
  const isActioning = actioning === user.id
  const isArtisan   = user.role === 'artisan'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
      user.is_suspended ? 'border-red-100' : 'border-slate-100'
    }`}>
      {/* Status accent strip */}
      <div className={`h-1 w-full ${user.is_suspended ? 'bg-red-400' : isArtisan ? 'bg-amber-400' : 'bg-blue-400'}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">

          {/* Left: Avatar + info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${
              user.is_suspended
                ? 'bg-red-100 text-red-600'
                : isArtisan
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
            }`}>
              {user.avatar_initials}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + role pill + suspended badge */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-extrabold text-slate-800 text-sm leading-tight">{user.full_name}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isArtisan
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {isArtisan ? 'Artisan' : 'Customer'}
                </span>
                {user.is_suspended && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                    Suspended
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <Mail size={11} />
                <span className="truncate">{user.email}</span>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-2">
                {user.quarter && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                    <MapPin size={10} />
                    {user.quarter}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                  <Calendar size={10} />
                  Joined {formatDate(user.created_at)}
                </span>

                {/* Artisan-specific stats */}
                {isArtisan && user.total_jobs !== null && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                    <Briefcase size={10} />
                    {user.total_jobs} job{user.total_jobs !== 1 ? 's' : ''}
                  </span>
                )}
                {isArtisan && user.avg_rating !== null && Number(user.avg_rating) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    {Number(user.avg_rating).toFixed(1)}
                  </span>
                )}
                {isArtisan && user.trust_score !== null && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                    <ShieldCheck size={10} />
                    Trust {user.trust_score}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action button */}
          <div className="shrink-0">
            {user.is_suspended ? (
              <button
                onClick={() => onAction(user, 'reactivate')}
                disabled={isActioning}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors"
              >
                {isActioning
                  ? <Loader2 size={13} className="animate-spin" />
                  : <UserCheck size={13} />
                }
                {isActioning ? '...' : 'Reactivate'}
              </button>
            ) : (
              <button
                onClick={() => onAction(user, 'suspend')}
                disabled={isActioning}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-60 text-xs font-bold rounded-xl transition-colors"
              >
                {isActioning
                  ? <Loader2 size={13} className="animate-spin" />
                  : <UserX size={13} />
                }
                {isActioning ? '...' : 'Suspend'}
              </button>
            )}
          </div>
        </div>
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

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onPrev: () => void
  onNext: () => void
}

function Pagination({ page, totalPages, total, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
      <p className="text-xs text-slate-500">
        Page <span className="font-bold text-slate-700">{page}</span> of{' '}
        <span className="font-bold text-slate-700">{totalPages}</span>
        <span className="ml-2 text-slate-400">({total} users)</span>
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Data state ──────────────────────────────────────────────────────────────
  const [users, setUsers]             = useState<AdminUser[]>([])
  const [total, setTotal]             = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter]   = useState<RoleFilter>('all')
  const [page, setPage]               = useState(1)
  const LIMIT = 20

  // ── Action state ────────────────────────────────────────────────────────────
  const [modalTarget, setModalTarget]     = useState<AdminUser | null>(null)
  const [modalAction, setModalAction]     = useState<'suspend' | 'reactivate' | null>(null)
  const [actioning, setActioning]         = useState<number | null>(null)

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // ── Fetch users ─────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (roleFilter !== 'all') params.set('role', roleFilter)
      if (searchQuery.trim())   params.set('q', searchQuery.trim())
      params.set('page',  String(page))
      params.set('limit', String(LIMIT))

      const res = await api.get<UsersResponse>(`/admin/users?${params.toString()}`)
      setUsers(res.data.users)
      setTotal(res.data.total)
      setTotalPages(res.data.totalPages)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, roleFilter, page])

  // Re-fetch when filters or page change
  useEffect(() => {
    // Debounce search input — wait 400ms after last keystroke
    const timer = setTimeout(() => { fetchUsers() }, searchQuery ? 400 : 0)
    return () => clearTimeout(timer)
  }, [fetchUsers, searchQuery])

  // Fetch notifications (bell)
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
      } catch { /* bell failing silently is acceptable */ }
    }
    fetchNotifs()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/customer/notifications/read')
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch { /* silent */ }
  }

  // ── Open modal ───────────────────────────────────────────────────────────────
  const openModal = (user: AdminUser, action: 'suspend' | 'reactivate') => {
    setModalTarget(user)
    setModalAction(action)
  }

  const closeModal = () => {
    setModalTarget(null)
    setModalAction(null)
  }

  // ── Confirm suspend / reactivate ─────────────────────────────────────────────
  const handleConfirmAction = async () => {
    if (!modalTarget || !modalAction) return
    setActioning(modalTarget.id)
    try {
      await api.patch(`/admin/users/${modalTarget.id}/suspend`, { action: modalAction })
      showToast(
        modalAction === 'suspend'
          ? `${modalTarget.full_name} has been suspended.`
          : `${modalTarget.full_name} has been reactivated.`
      )
      closeModal()
      await fetchUsers()   // refresh list so is_suspended reflects new state
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showToast(err.response?.data?.error || 'Action failed. Please try again.')
      closeModal()
    } finally {
      setActioning(null)
    }
  }

  // Reset to page 1 when filters change
  const handleRoleChange = (r: RoleFilter) => {
    setRoleFilter(r)
    setPage(1)
  }

  const handleSearchChange = (q: string) => {
    setSearchQuery(q)
    setPage(1)
  }

  // Summary counts from current result
  const suspendedCount = users.filter((u) => u.is_suspended).length

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeHref="/admin/users"
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
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">User Management</h1>
              <p className="text-slate-500 text-sm mt-1">
                Search, filter, and moderate all platform users
              </p>
            </div>
            <div className="hidden lg:block">
              <NotificationBell notifications={notifications} onMarkAllRead={handleMarkAllRead} />
            </div>
          </div>

          {/* Suspended alert banner — only when there are suspended users on this page */}
          {!loading && suspendedCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">
              <AlertCircle size={18} className="text-red-400 shrink-0" />
              <p className="text-sm font-semibold text-red-700">
                {suspendedCount} suspended user{suspendedCount > 1 ? 's' : ''} visible on this page
              </p>
            </div>
          )}

          {/* Search + Filter bar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-slate-400 text-slate-700"
                />
              </div>

              {/* Role filter */}
              <div className="flex gap-2">
                {(['all', 'customer', 'artisan'] as RoleFilter[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                      roleFilter === r
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
                    }`}
                  >
                    {r === 'all'      && <Users size={13} />}
                    {r === 'customer' && <UserCheck size={13} />}
                    {r === 'artisan'  && <Briefcase size={13} />}
                    {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          {!loading && !error && (
            <p className="text-xs text-slate-400 mb-4 font-medium">
              {total === 0
                ? 'No users found'
                : `${total} user${total !== 1 ? 's' : ''} found`
              }
              {searchQuery && <span className="ml-1">for "{searchQuery}"</span>}
            </p>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Loading users...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchUsers}
                className="text-sm font-semibold text-amber-600 hover:text-amber-700"
              >
                Try again
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Inbox size={28} className="text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">
                {searchQuery
                  ? `No users match "${searchQuery}"`
                  : roleFilter !== 'all'
                    ? `No ${roleFilter}s found`
                    : 'No users on the platform yet'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                {users.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onAction={openModal}
                    actioning={actioning}
                  />
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </>
          )}
        </main>
      </div>

      {/* Suspend / Reactivate confirmation modal */}
      {modalTarget && modalAction && (
        <SuspendModal
          user={modalTarget}
          action={modalAction}
          onConfirm={handleConfirmAction}
          onCancel={closeModal}
          submitting={actioning === modalTarget.id}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl max-w-sm text-center animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  )
}