import { useState, useRef } from 'react'
import {
  CheckCircle2, Clock, XCircle, Upload, Plus,
  Pencil, Trash2, Menu, Bell, Wrench, Eye,
  ShieldCheck, Star, Briefcase
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import NotificationBell, { NotificationItem } from '../../components/NotificationBell'
import { useAuth } from '../../context/AuthContext'
import { quarterNames } from '../../data/nwRegionData'

// ─── Types ────────────────────────────────────────────────────────────────────
type DocStatus = 'verified' | 'pending' | 'rejected'

interface VerificationDoc {
  id: number
  name: string
  uploaded: string
  expires?: string
  status: DocStatus
  rejectionReason?: string
}

interface Service {
  id: number
  title: string
  description: string
  ratePerHour: number   // XAF
}

// ─── Placeholder data — replace with API calls later ─────────────────────────
const initialDocs: VerificationDoc[] = [
  { id: 1, name: 'Professional License',   uploaded: '2026-03-15', expires: '2027-03-15', status: 'verified'  },
  { id: 2, name: 'Insurance Certificate',  uploaded: '2026-03-10', expires: '2027-03-10', status: 'verified'  },
  { id: 3, name: 'Background Check',       uploaded: '2026-04-20',                         status: 'pending'   },
  { id: 4, name: 'Tax Clearance',          uploaded: '2026-04-15',                         status: 'rejected',
     rejectionReason: 'Document expired' },
]

const initialServices: Service[] = [
  { id: 1, title: 'Emergency Plumbing',  description: '24/7 emergency plumbing services',        ratePerHour: 6000 },
  { id: 2, title: 'Pipe Installation',   description: 'New pipe installation and replacement',    ratePerHour: 4500 },
  { id: 3, title: 'Drain Cleaning',      description: 'Professional drain cleaning and maintenance', ratePerHour: 4000 },
]

const mockNotifications: NotificationItem[] = [
  { id: 1, text: 'Your Professional License has been verified', time: '1 hour ago',  unread: true,  type: 'verification' },
  { id: 2, text: 'Tax Clearance rejected — please re-upload',  time: '3 hours ago', unread: true,  type: 'verification' },
  { id: 3, text: 'New booking request from Alice Brown',        time: '5 hours ago', unread: false, type: 'booking'      },
]

const primaryServices = [
  'Plumbing', 'Electrical', 'Solar', 'Mechanic',
  'Laundry', 'HVAC', 'Tailoring', 'Home Care', 'Other',
]

const formatXAF = (n: number) => `XAF ${n.toLocaleString()}`

// ─── Document status config ───────────────────────────────────────────────────
const docStatusConfig: Record<DocStatus, {
  icon: React.ReactNode; bg: string; text: string
}> = {
  verified: {
    icon: <CheckCircle2 size={20} className="text-emerald-500" />,
    bg: 'bg-emerald-50', text: 'text-emerald-600',
  },
  pending: {
    icon: <Clock size={20} className="text-amber-500" />,
    bg: 'bg-amber-50', text: 'text-amber-600',
  },
  rejected: {
    icon: <XCircle size={20} className="text-red-500" />,
    bg: 'bg-red-50', text: 'text-red-600',
  },
}

// ─── Add / Edit Service Modal ─────────────────────────────────────────────────
function ServiceModal({
  existing,
  onSave,
  onClose,
}: {
  existing?: Service
  onSave: (s: Omit<Service, 'id'>) => void
  onClose: () => void
}) {
  const [title, setTitle]       = useState(existing?.title ?? '')
  const [desc, setDesc]         = useState(existing?.description ?? '')
  const [rate, setRate]         = useState(existing ? String(existing.ratePerHour) : '')
  const [error, setError]       = useState('')

  const handleSave = () => {
    if (!title.trim()) { setError('Service title is required.'); return }
    if (!rate || isNaN(Number(rate))) { setError('Enter a valid rate.'); return }
    onSave({ title: title.trim(), description: desc.trim(), ratePerHour: Number(rate) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="font-extrabold text-slate-800 text-lg">
          {existing ? 'Edit Service' : 'Add New Service'}
        </h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Service Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Emergency Plumbing"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 transition-all" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Brief description of this service"
            rows={2}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 resize-none transition-all" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate per Hour (XAF)</label>
          <input value={rate} onChange={(e) => setRate(e.target.value)}
            placeholder="e.g. 4500" type="number" min={0}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 transition-all" />
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:border-slate-300 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-200">
            {existing ? 'Save Changes' : 'Add Service'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Verification Documents Panel ────────────────────────────────────────────
function VerificationDocuments() {
  const [docs, setDocs]             = useState<VerificationDoc[]>(initialDocs)
  const fileInputRef                = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<number | null>(null) // reupload doc id

  const handleUpload = (docId?: number) => {
    setUploadTarget(docId ?? null)
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (uploadTarget !== null) {
      // Re-upload a rejected doc — set to pending for admin review
      setDocs((prev) => prev.map((d) =>
        d.id === uploadTarget
          ? { ...d, status: 'pending', uploaded: new Date().toISOString().split('T')[0], rejectionReason: undefined }
          : d
      ))
    } else {
      // New document upload
      const newDoc: VerificationDoc = {
        id: Date.now(),
        name: file.name.replace(/\.[^.]+$/, ''), // strip extension
        uploaded: new Date().toISOString().split('T')[0],
        status: 'pending',
      }
      setDocs((prev) => [...prev, newDoc])
    }
    setUploadTarget(null)
    e.target.value = ''
    // TODO: POST /api/documents (FormData with file + docType)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-slate-800 text-lg">Verification Documents</h2>
        <button
          onClick={() => handleUpload()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-amber-200"
        >
          <Upload size={15} />
          Upload Document
        </button>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={handleFileChange} />

      <div className="flex flex-col gap-3">
        {docs.map((doc) => {
          const cfg = docStatusConfig[doc.status]
          return (
            <div key={doc.id} className={`rounded-xl border p-4 ${
              doc.status === 'rejected' ? 'border-red-100 bg-red-50/30' : 'border-slate-100'
            }`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                {/* Icon + name + dates */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0`}>
                    {cfg.icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Uploaded: {doc.uploaded}
                      {doc.expires && <span> · Expires: {doc.expires}</span>}
                    </p>
                    <span className={`text-xs font-semibold capitalize ${cfg.text}`}>
                      {doc.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:border-slate-300 text-xs font-semibold rounded-lg transition-colors">
                    <Eye size={13} /> View
                    {/* TODO: open Cloudinary URL in a new tab */}
                  </button>
                  {doc.status === 'rejected' && (
                    <button
                      onClick={() => handleUpload(doc.id)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Re-upload
                    </button>
                  )}
                </div>
              </div>

              {/* Rejection reason */}
              {doc.status === 'rejected' && doc.rejectionReason && (
                <div className="mt-3 flex items-center gap-2 bg-red-100 text-red-600 rounded-lg px-3 py-2">
                  <XCircle size={13} />
                  <p className="text-xs font-semibold">
                    Rejection Reason: <span className="font-normal">{doc.rejectionReason}</span>
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── My Services Panel ────────────────────────────────────────────────────────
function MyServices() {
  const [services, setServices]           = useState<Service[]>(initialServices)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editTarget, setEditTarget]       = useState<Service | undefined>()

  const openAdd = () => { setEditTarget(undefined); setModalOpen(true) }
  const openEdit = (s: Service) => { setEditTarget(s); setModalOpen(true) }

  const handleSave = (data: Omit<Service, 'id'>) => {
    if (editTarget) {
      setServices((prev) => prev.map((s) => s.id === editTarget.id ? { ...s, ...data } : s))
      // TODO: PUT /api/services/:id
    } else {
      setServices((prev) => [...prev, { id: Date.now(), ...data }])
      // TODO: POST /api/services
    }
    setModalOpen(false)
  }

  const handleDelete = (id: number) => {
    setServices((prev) => prev.filter((s) => s.id !== id))
    // TODO: DELETE /api/services/:id
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      {modalOpen && (
        <ServiceModal existing={editTarget} onSave={handleSave} onClose={() => setModalOpen(false)} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-slate-800 text-lg">My Services</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-amber-200"
        >
          <Plus size={15} />
          Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          No services added yet. Click "Add Service" to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <div key={service.id} className="flex items-start justify-between gap-3 p-4 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{service.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{service.description}</p>
                <span className="inline-block mt-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                  {formatXAF(service.ratePerHour)} / hr
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(service)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:border-slate-300 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Pencil size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-1.5 border border-red-100 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Delete service"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Profile Information Panel ────────────────────────────────────────────────
function ProfileInformation() {
  const { user } = useAuth()
  const [fullName, setFullName]   = useState(user?.fullName ?? 'John Smith')
  const [email]                   = useState(user?.email ?? 'john.smith@example.com')
  const [phone, setPhone]         = useState('+237 6XX XXX XXX')
  const [service, setService]     = useState('Plumbing')
  const [quarter, setQuarter]     = useState(user?.division ?? 'Mile 4')
  const [saved, setSaved]         = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    // TODO: PATCH /api/artisan/profile { fullName, phone, service, quarter }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <h2 className="font-extrabold text-slate-800 text-lg">Profile Information</h2>

      <div className="flex flex-col gap-3">
        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
        </div>

        {/* Email — read only */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Email</label>
          <input value={email} disabled
            className="bg-slate-100 border border-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-400 outline-none cursor-not-allowed" />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" />
        </div>

        {/* Primary Service */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Primary Service</label>
          <select value={service} onChange={(e) => setService(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 cursor-pointer transition-all">
            {primaryServices.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Quarter — changed from Division */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Quarter</label>
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400 cursor-pointer transition-all">
            {quarterNames.map((q) => <option key={q}>{q}</option>)}
          </select>
        </div>

        <button onClick={handleSave}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors mt-1">
          {saved ? '✓ Changes Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── Trust Score Panel ────────────────────────────────────────────────────────
// Read-only — computed server-side, never user-editable
function TrustScorePanel() {
  const score = 98  // TODO: GET /api/artisan/trust-score

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-slate-800 text-lg">Trust Score</h2>
        <span className="text-3xl font-extrabold text-emerald-500">{score}%</span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Documents Verified</span>
          <CheckCircle2 size={18} className="text-emerald-500" />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <span className="text-sm text-slate-500">Background Check</span>
          <CheckCircle2 size={18} className="text-emerald-500" />
        </div>
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-amber-400" fill="currentColor" />
            <span className="text-sm text-slate-500">Customer Rating</span>
          </div>
          <span className="text-sm font-bold text-slate-700">4.9/5</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-1.5">
            <Briefcase size={14} className="text-slate-400" />
            <span className="text-sm text-slate-500">Jobs Completed</span>
          </div>
          <span className="text-sm font-bold text-slate-700">156</span>
        </div>
      </div>

      {/* Score breakdown explanation */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck size={15} className="text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-700 leading-snug">
            Your trust score is calculated automatically from verification status,
            ratings, and job history. It cannot be manually edited.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile top bar ───────────────────────────────────────────────────────────
function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const [notifications, setNotifications] = useState(mockNotifications)
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
      <NotificationBell
        notifications={notifications}
        onMarkAllRead={() => setNotifications((p) => p.map((n) => ({ ...n, unread: false })))}
      />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ArtisanProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/artisan/profile" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Profile & Verification</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your documents and service offerings</p>
            </div>
            {/* Desktop bell */}
            <div className="hidden lg:block">
              <NotificationBell
                notifications={notifications}
                onMarkAllRead={() => setNotifications((p) => p.map((n) => ({ ...n, unread: false })))}
              />
            </div>
          </div>

          {/* Two-column layout — stacks on mobile */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">

            {/* Left column — documents + services */}
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              <VerificationDocuments />
              <MyServices />
            </div>

            {/* Right column — profile info + trust score */}
            <div className="flex flex-col gap-5 w-full lg:w-72 xl:w-80 shrink-0">
              <ProfileInformation />
              <TrustScorePanel />
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}