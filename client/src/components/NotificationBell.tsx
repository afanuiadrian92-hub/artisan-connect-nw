// ─── NotificationBell ─────────────────────────────────────────────────────────
// Shared across CustomerDashboard, ArtisanDashboard, and AdminDashboard.
// Badge count and items will come from GET /api/notifications when backend ready.
// For now, accepts props so each role can pass its own notification data.

import { useState } from 'react'
import { Bell } from 'lucide-react'

export interface NotificationItem {
  id: number
  text: string
  time: string
  unread: boolean
  type: 'booking' | 'review' | 'verification' | 'dispute' | 'system' | 'payment'
}

interface NotificationBellProps {
  notifications: NotificationItem[]
  // Called when user clicks "Mark all read" — parent updates its state
  onMarkAllRead?: () => void
}

// Type colour dot
const typeDot: Record<NotificationItem['type'], string> = {
  booking:      'bg-blue-500',
  review:       'bg-amber-500',
  verification: 'bg-emerald-500',
  dispute:      'bg-red-500',
  system:       'bg-slate-400',
  payment:      'bg-purple-500',
}

export default function NotificationBell({ notifications, onMarkAllRead }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors relative"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell size={20} />
        {/* Badge — only visible when there are unread notifications */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-amber-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Dropdown panel */}
          <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="font-bold text-slate-800 text-sm">Notifications</p>
              {unreadCount > 0 && onMarkAllRead && (
                <button
                  onClick={() => { onMarkAllRead(); }}
                  className="text-xs text-amber-500 hover:text-amber-600 font-semibold transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto flex flex-col divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                      n.unread ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* Type colour indicator */}
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeDot[n.type]}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${n.unread ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                        {n.text}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">{n.time}</p>
                    </div>
                    {/* Unread dot */}
                    {n.unread && (
                      <span className="w-2 h-2 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 text-center">
                <a href="/notifications" className="text-xs text-amber-500 font-semibold hover:text-amber-600 transition-colors">
                  View all notifications
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}