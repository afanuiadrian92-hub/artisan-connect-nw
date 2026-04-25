// ─── LogoutDialog ─────────────────────────────────────────────────────────────
// Confirmation modal shown before signing out.
// Props:
//   open     — controls visibility
//   onConfirm — called when user clicks "Yes, Sign Out"
//   onCancel  — called when user clicks "No" or clicks the backdrop

import { LogOut, X } from 'lucide-react'

interface LogoutDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function LogoutDialog({ open, onConfirm, onCancel }: LogoutDialogProps) {
  if (!open) return null

  return (
    // Full-screen backdrop — clicking it cancels
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
    >
      {/* Dialog card — stop click from bubbling to backdrop */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <LogOut size={22} className="text-red-500" />
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <div>
          <h2 className="font-extrabold text-slate-800 text-lg mb-1">Sign Out?</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Are you sure you want to sign out? You will be redirected to the sign in page.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
          >
            No, Stay
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-red-200"
          >
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}