import AppSidebar from '../../components/AppSidebar'
import { useState } from 'react'
import {
  Wrench, LayoutDashboard, ClipboardCheck, AlertTriangle,
  Users, Settings, LogOut, Menu, X, Bell,
  TrendingUp, Briefcase, CheckCircle2, DollarSign, Clock
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatCard {
  icon: React.ReactNode
  value: string
  label: string
  delta: string
  deltaPositive: boolean
}

interface ActivityItem {
  id: number
  message: string
  time: string
  type: 'booking' | 'artisan' | 'document' | 'dispute' | 'review'
}

// ─── Chart data — replace with GET /api/admin/analytics later ─────────────────
// NW Region actual divisions used here — not generic "Central/Eastern"
const bookingsByDivision = [
  { division: 'Mezam',         bookings: 258 },
  { division: 'Momo',          bookings: 192 },
  { division: 'Bui',           bookings: 141 },
  { division: 'Menchum',       bookings: 128 },
  { division: 'Donga-M.',      bookings: 134 },
  { division: 'Boyo',          bookings: 89  },
  { division: 'Ngo-Ket.',      bookings: 72  },
]

const topServices = [
  { name: 'Plumbing',   value: 25, color: '#1e293b' },
  { name: 'Electrical', value: 22, color: '#f59e0b' },
  { name: 'HVAC',       value: 17, color: '#3b82f6' },
  { name: 'Mechanic',   value: 14, color: '#f97316' },
  { name: 'Solar',      value: 12, color: '#64748b' },
  { name: 'Laundry',    value: 10, color: '#94a3b8' },
]

const userGrowth = [
  { month: 'Oct', customers: 140, artisans: 38  },
  { month: 'Nov', customers: 155, artisans: 45  },
  { month: 'Dec', customers: 168, artisans: 54  },
  { month: 'Jan', customers: 195, artisans: 68  },
  { month: 'Feb', customers: 240, artisans: 82  },
  { month: 'Mar', customers: 318, artisans: 101 },
  { month: 'Apr', customers: 430, artisans: 132 },
]

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats: StatCard[] = [
  {
    icon: <Users size={24} className="text-blue-500" />,
    value: '562', label: 'Total Users',
    delta: '+12%', deltaPositive: true,
  },
  {
    icon: <Briefcase size={24} className="text-amber-500" />,
    value: '142', label: 'Active Artisans',
    delta: '+8%', deltaPositive: true,
  },
  {
    icon: <CheckCircle2 size={24} className="text-emerald-500" />,
    value: '891', label: 'Total Bookings',
    delta: '+15%', deltaPositive: true,
  },
  {
    icon: <DollarSign size={24} className="text-purple-500" />,
    value: 'XAF 4.52M', label: 'Platform Revenue',
    delta: '+22%', deltaPositive: true,
  },
]

// ─── Recent activity feed ─────────────────────────────────────────────────────
const recentActivity: ActivityItem[] = [
  { id: 1, message: 'New booking: Alice Brown booked John Smith',        time: '5 mins ago',  type: 'booking'  },
  { id: 2, message: 'New artisan registered: Emma Wilson (Laundry)',     time: '12 mins ago', type: 'artisan'  },
  { id: 3, message: 'Document verified: Mike Brown – Insurance Cert.',   time: '25 mins ago', type: 'document' },
  { id: 4, message: 'New dispute opened: Booking #1234',                 time: '1 hour ago',  type: 'dispute'  },
  { id: 5, message: '5-star review: Sarah Johnson',                      time: '2 hours ago', type: 'review'   },
]

// Activity dot colours per type
const activityColor: Record<ActivityItem['type'], string> = {
  booking:  'bg-blue-500',
  artisan:  'bg-emerald-500',
  document: 'bg-amber-500',
  dispute:  'bg-red-500',
  review:   'bg-purple-500',
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
const navItems = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard',         href: '/admin',             active: true  },
  { icon: <ClipboardCheck size={18} />, label: 'Verification Queue', href: '/admin/verification', active: false },
  { icon: <AlertTriangle size={18} />,  label: 'Disputes',           href: '/admin/disputes',     active: false },
  { icon: <Users size={18} />,          label: 'User Management',    href: '/admin/users',        active: false },
  { icon: <Settings size={18} />,       label: 'Settings',           href: '/settings',           active: false },
]

// ─── Notifications mock ───────────────────────────────────────────────────────
const notifications = [
  { id: 1, text: '3 artisans pending verification',     unread: true  },
  { id: 2, text: 'Dispute #1234 needs review',          unread: true  },
  { id: 3, text: 'Platform revenue up 22% this month',  unread: false },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────


// ─── Notification Bell (with dropdown) ───────────────────────────────────────
// Reusable — will be placed on every dashboard's desktop header
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors relative"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="font-bold text-slate-800 text-sm">Notifications</p>
              <span className="text-xs text-slate-400">{unreadCount} unread</span>
            </div>
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                    n.unread ? 'bg-amber-50/50' : ''
                  }`}
                >
                  {n.unread && (
                    <span className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                  )}
                  <p className={`text-xs leading-snug ${n.unread ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                    {n.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-slate-100 text-center">
              <a href="/admin/notifications" className="text-xs text-amber-500 font-semibold hover:text-amber-600">
                View all notifications
              </a>
            </div>
          </div>
        </>
      )}
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
      <NotificationBell />
    </div>
  )
}

// ─── Desktop page header with bell ───────────────────────────────────────────
function PageHeader() {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor platform activity and manage operations</p>
      </div>
      {/* Bell visible only on desktop — mobile has it in TopBar */}
      <div className="hidden lg:block">
        <NotificationBell />
      </div>
    </div>
  )
}

// ─── Stats row ────────────────────────────────────────────────────────────────
function StatsRow() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            {stat.icon}
            <span className={`text-xs font-bold ${stat.deltaPositive ? 'text-emerald-500' : 'text-red-400'}`}>
              {stat.delta}
            </span>
          </div>
          <p className="text-xl font-extrabold text-slate-800">{stat.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Bookings by Division Bar Chart ──────────────────────────────────────────
// Recharts renders SVG — no canvas, works on all browsers including mobile
function BookingsByDivision() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Bookings by Division</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={bookingsByDivision} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
            cursor={{ fill: '#fef3c7' }}
          />
          <Bar dataKey="bookings" fill="#f59e0b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Top Services Pie Chart ───────────────────────────────────────────────────
function TopServicesChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">Top Services</h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={topServices}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {topServices.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend
            formatter={(value) => (
              <span style={{ fontSize: '11px', color: '#64748b' }}>{value}</span>
            )}
          />
          <Tooltip
            formatter={(value) => value != null ? [`${value}%`, 'Share'] : ['N/A', 'Share']}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── User Growth Line Chart ───────────────────────────────────────────────────
function UserGrowthChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <h2 className="font-extrabold text-slate-800 text-lg mb-5">User Growth</h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={userGrowth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
    </div>
  )
}

// ─── Recent Activity Feed ─────────────────────────────────────────────────────
function RecentActivityFeed() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Clock size={18} className="text-amber-500" />
        <h2 className="font-extrabold text-slate-800 text-lg">Recent Activity</h2>
      </div>

      <div className="flex flex-col gap-1">
        {recentActivity.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0"
          >
            {/* Coloured left border acts as activity type indicator */}
            <div className={`w-1 h-full min-h-[36px] rounded-full ${activityColor[item.type]} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-snug">{item.message}</p>
              <p className="text-xs text-slate-400 mt-1">{item.time}</p>
            </div>
          </div>
        ))}
      </div>

      <a
        href="/admin/activity"
        className="mt-4 w-full flex items-center justify-center py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl transition-all"
      >
        View All Activity
      </a>
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────
function MainContent() {
  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50">
      <PageHeader />
      <StatsRow />

      {/* Charts row — stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <BookingsByDivision />
        <TopServicesChart />
      </div>

      {/* Growth + Activity — stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UserGrowthChart />
        <RecentActivityFeed />
      </div>
    </main>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <MainContent />
      </div>
    </div>
  )
}