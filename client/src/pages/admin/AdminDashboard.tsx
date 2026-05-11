// ─── AdminDashboard ───────────────────────────────────────────────────────────
// Connected to GET /api/admin/dashboard and GET /api/customer/notifications.
// All mock data arrays removed. Sub-components receive real data as props.

import { useEffect, useState } from 'react'
import AppSidebar from '../../components/AppSidebar'
import NotificationBell, { NotificationItem } from '../../components/NotificationBell'
import api from '../../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { Wrench, Menu, Users, Briefcase, CheckCircle2, DollarSign, Clock } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
// These mirror exactly what adminController.getAdminDashboard returns.

interface AdminTotals {
  users: number
  customers: number
  artisans: number
  bookings: number
  completedBookings: number
  revenue: number
}

interface DivisionBooking {
  division: string
  bookings: number | string   // pg COUNT returns string — coerced with Number() in chart
}

interface TopService {
  service: string
  count: number | string      // pg COUNT returns string — converted to % for PieChart
}

interface GrowthPoint {
  month: string
  customers: number | string
  artisans: number | string
}

interface ActivityItem {
  // type matches the notification.type values stored in the DB
  message: string
  type: 'booking' | 'review' | 'verification' | 'dispute' | 'system' | 'payment'
  created_at: string
}

interface AdminDashboardData {
  totals: AdminTotals
  bookingsByDivision: DivisionBooking[]
  topServices: TopService[]
  userGrowth: GrowthPoint[]
  recentActivity: ActivityItem[]
  pendingVerifications: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
// Colours assigned to pie slices by index — matches the 8 service categories max
const PIE_COLORS = ['#1e293b', '#f59e0b', '#3b82f6', '#f97316', '#64748b', '#94a3b8', '#10b981', '#8b5cf6']

// Colour dot per activity type — maps backend notification.type values
const activityColor: Record<ActivityItem['type'], string> = {
  booking:      'bg-blue-500',
  review:       'bg-purple-500',
  verification: 'bg-amber-500',
  dispute:      'bg-red-500',
  system:       'bg-slate-400',
  payment:      'bg-emerald-500',
}

// ─── Utilities ────────────────────────────────────────────────────────────────
// Converts XAF integer to readable label e.g. 4520000 → "XAF 4.52M"
function formatXAF(amount: number): string {
  if (amount >= 1_000_000) return `XAF ${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000)     return `XAF ${(amount / 1_000).toFixed(1)}K`
  return `XAF ${amount.toLocaleString()}`
}

// Converts ISO timestamp to relative label e.g. "5 mins ago"
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

// ─── TopBar (mobile only) ─────────────────────────────────────────────────────
// Shows hamburger + logo + notification bell on small screens.
// Bell uses the real NotificationItem array fetched from the backend.
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
      {/* Real NotificationBell — same component used on all dashboards */}
      <NotificationBell notifications={notifications} onMarkAllRead={onMarkAllRead} />
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
// Desktop header row. Shows title, subtitle, and notification bell on the right.
// pendingVerifications drives the badge text beside the bell.
interface PageHeaderProps {
  notifications: NotificationItem[]
  onMarkAllRead: () => void
  pendingVerifications: number
}

function PageHeader({ notifications, onMarkAllRead, pendingVerifications }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor platform activity and manage operations</p>
      </div>

      {/* Desktop bell — hidden on mobile (TopBar handles it there) */}
      <div className="hidden lg:flex items-center gap-3">
        {pendingVerifications > 0 && (
          <a
            href="/admin/verification"
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            {pendingVerifications} pending verification{pendingVerifications > 1 ? 's' : ''}
          </a>
        )}
        <NotificationBell notifications={notifications} onMarkAllRead={onMarkAllRead} />
      </div>
    </div>
  )
}

// ─── StatsRow ─────────────────────────────────────────────────────────────────
// 4 stat cards built from real totals. No hardcoded deltas — we don't have
// previous-period data from the API so we keep the design clean.
function StatsRow({ totals }: { totals: AdminTotals }) {
  const cards = [
    {
      icon:  <Users size={24} className="text-blue-500" />,
      value: totals.users.toLocaleString(),
      label: 'Total Users',
    },
    {
      icon:  <Briefcase size={24} className="text-amber-500" />,
      value: totals.artisans.toLocaleString(),
      label: 'Active Artisans',
    },
    {
      icon:  <CheckCircle2 size={24} className="text-emerald-500" />,
      value: totals.bookings.toLocaleString(),
      label: 'Total Bookings',
    },
    {
      icon:  <DollarSign size={24} className="text-purple-500" />,
      value: formatXAF(totals.revenue),
      label: 'Platform Revenue',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow"
        >
          {card.icon}
          <p className="text-xl font-extrabold text-slate-800">{card.value}</p>
          <p className="text-xs text-slate-500">{card.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── BookingsByDivision (Bar Chart) ───────────────────────────────────────────
// dataKey="bookings" matches the field name returned by adminController SQL query.
// Recharts is fine with string numbers from pg — it coerces internally.
function BookingsByDivision({ data }: { data: DivisionBooking[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Bookings by Division</h2>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          No booking data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="division"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              cursor={{ fill: '#fef3c7' }}
            />
            <Bar dataKey="bookings" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── TopServicesChart (Pie Chart) ─────────────────────────────────────────────
// Backend returns { service, count }. We convert count → percentage for display.
// Pie's dataKey="value" reads the computed percentage field we add below.
function TopServicesChart({ data }: { data: TopService[] }) {
  // Compute percentages so the pie shows proportional slices
  const total = data.reduce((sum, s) => sum + Number(s.count), 0)
  const pieData = data.map((s, i) => ({
    name:  s.service,
    value: total > 0 ? Math.round((Number(s.count) / total) * 100) : 0,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Top Services</h2>
      {pieData.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          No service data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              formatter={(value) => (
                <span style={{ fontSize: '11px', color: '#64748b' }}>{value}</span>
              )}
            />
            <Tooltip
              // value here is the percentage we computed
              formatter={(value) => [`${value}%`, 'Share']}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── UserGrowthChart (Line Chart) ─────────────────────────────────────────────
// Backend returns last 6 months: { month, customers, artisans }.
// Fields match Recharts dataKey names exactly — no remapping needed.
function UserGrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">User Growth</h2>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          No growth data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Legend
              formatter={(value) => (
                <span style={{ fontSize: '11px', color: '#64748b' }}>{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="customers"
              stroke="#1e293b"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#1e293b' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="artisans"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#f59e0b' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── RecentActivityFeed ───────────────────────────────────────────────────────
// Backend returns up to 10 admin notifications ordered by newest first.
// We format created_at → relative time string here on the frontend.
// Note: recentActivity items have no `id` field — we use array index as key.
function RecentActivityFeed({ data }: { data: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Clock size={18} className="text-amber-500" />
        <h2 className="font-extrabold text-slate-800 text-lg">Recent Activity</h2>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">No recent activity yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0"
            >
              {/* Coloured bar = activity type indicator */}
              <div
                className={`w-1 min-h-[36px] rounded-full shrink-0 ${
                  activityColor[item.type] ?? 'bg-slate-300'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-snug">{item.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatRelativeTime(item.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <a
        href="/admin/activity"
        className="mt-4 w-full flex items-center justify-center py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl transition-all"
      >
        View All Activity
      </a>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
// Outer shell: sidebar toggle state lives here.
// AdminShell (below) owns all data-fetching state and renders TopBar + content.
// They are separate so the mobile TopBar bell shares the same notification state
// as the desktop PageHeader bell — without prop-drilling through AdminDashboard.
export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeHref="/admin"
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminShell sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} />
      </div>
    </div>
  )
}

// ─── AdminShell ───────────────────────────────────────────────────────────────
// Wrapper that co-locates the mobile TopBar and MainContent so notification
// state can be shared between them without prop-drilling through AdminDashboard.
// Pattern: state lives here, passed down to both TopBar and MainContent.
function AdminShell({ onMenuClick }: { sidebarOpen: boolean; onMenuClick: () => void }) {
  const [dashData, setDashData]             = useState<AdminDashboardData | null>(null)
  const [notifications, setNotifications]   = useState<NotificationItem[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, notifRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/customer/notifications'),
        ])

        setDashData(dashRes.data)

        const mapped: NotificationItem[] = (notifRes.data.notifications ?? []).map(
          (n: { id: number; type: NotificationItem['type']; message: string; is_read: boolean; created_at: string }) => ({
            id:     n.id,
            text:   n.message,
            time:   formatRelativeTime(n.created_at),
            unread: !n.is_read,
            type:   n.type,
          })
        )
        setNotifications(mapped)
      } catch (err) {
        console.error('Admin dashboard fetch error:', err)
        setError('Failed to load dashboard data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/customer/notifications/read')
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    } catch (err) {
      console.error('Mark all read error:', err)
    }
  }

  return (
    <>
      {/* Mobile top bar — gets live notifications so the bell badge is accurate */}
      <TopBar
        onMenuClick={onMenuClick}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Main scrollable area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Loading dashboard...</p>
          </div>
        </div>
      ) : error || !dashData ? (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <p className="text-red-500 font-semibold">{error ?? 'Something went wrong.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-amber-500 underline hover:text-amber-600"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50">
          <PageHeader
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            pendingVerifications={dashData.pendingVerifications}
          />

          <StatsRow totals={dashData.totals} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <BookingsByDivision data={dashData.bookingsByDivision} />
            <TopServicesChart   data={dashData.topServices} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <UserGrowthChart    data={dashData.userGrowth} />
            <RecentActivityFeed data={dashData.recentActivity} />
          </div>
        </main>
      )}
    </>
  )
}