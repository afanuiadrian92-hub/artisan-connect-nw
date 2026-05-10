import { useState, useEffect, useRef } from 'react'
import {
  CheckCircle2, Clock, XCircle, Upload, Eye,
  Plus, Pencil, Trash2, Menu, Bell, Wrench,
  Shield, Star, Briefcase, Save
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import { useAuth } from '../../context/AuthContext'
import { quarterNames } from '../../data/nwRegionData'
import api from '../../utils/api'

// ─── Types ────────────────────────────────────────────────────────────────────
type DocStatus = 'verified' | 'pending' | 'rejected'

interface VerificationDoc {
  id: number
  doc_name: string
  file_url: string
  status: DocStatus
  rejection_reason: string | null
  expiry_date: string | null
  uploaded_at: string
}

interface ArtisanService {
  id: number
  title: string
  description: string
  rate_per_hour: number
  category: string
}

interface ProfileData {
  full_name: string
  email: string
  phone: string
  quarter: string
  bio: string
  trust_score: number
  avg_rating: number
  total_jobs: number
}

interface TrustBreakdown {
  label: string
  value: string
  icon: React.ReactNode
  ok: boolean
}

// ─── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<DocStatus, { icon: React.ReactNode; bg: string; label: string }> = {
  verified: {
    icon:  <CheckCircle2 size={20} className="text-emerald-500" />,
    bg:    'bg-emerald-100',
    label: 'Verified',
  },
  pending: {
    icon:  <Clock size={20} className="text-amber-500" />,
    bg:    'bg-amber-100',
    label: 'Pending',
  },
  rejected: {
    icon:  <XCircle size={20} className="text-red-500" />,
    bg:    'bg-red-100',
    label: 'Rejected',
  },
}

const serviceCategories = [
  { id: 1, name: 'Plumbing'   },
  { id: 2, name: 'Electrical' },
  { id: 3, name: 'Solar'      },
  { id: 4, name: 'Mechanic'   },
  { id: 5, name: 'Laundry'    },
  { id: 6, name: 'HVAC'       },
  { id: 7, name: 'Tailoring'  },
  { id: 8, name: 'Home Care'  },
]

// ─── Service Modal ────────────────────────────────────────────────────────────
function ServiceModal({ service, onClose, onSave }: {
  service?: ArtisanService
  onClose: () => void
  onSave: () => void
}) {
  const [title, setTitle]         = useState(service?.title || '')
  const [description, setDesc]    = useState(service?.description || '')
  const [rate, setRate]           = useState(service?.rate_per_hour?.toString() || '')
  const [categoryId, setCategoryId] = useState(
    serviceCategories.find(c => c.name === service?.category)?.id || 1
  )
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleSave = async () => {
    if (!title.trim())                { setError('Title is required.'); return }
    if (!rate || isNaN(Number(rate))) { setError('Enter a valid rate.'); return }
    setLoading(true)
    try {
      if (service) {
        await api.patch(`/artisans/artisan/services/${service.id}`, {
          title: title.trim(),
          description: description.trim(),
          ratePerHour: Number(rate),
        })
      } else {
        await api.post('/artisans/artisan/services', {
          title: title.trim(),
          description: description.trim(),
          categoryId,
          ratePerHour: Number(rate),
        })
      }
      onSave()
      onClose()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err.response?.data?.error || 'Failed to save service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}>
        <h2 className="font-extrabold text-slate-800 text-lg">
          {service ? 'Edit Service' : 'Add Service'}
        </h2>

        {!service && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</label>
            <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400">
              {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Emergency Plumbing"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
          <textarea value={description} onChange={e => setDesc(e.target.value)}
            placeholder="Brief description" rows={2}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400 resize-none" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate per Hour (XAF)</label>
          <input value={rate} onChange={e => setRate(e.target.value)} type="number"
            placeholder="e.g. 4500"
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-amber-400" />
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md shadow-amber-200">
            {loading ? 'Saving...' : service ? 'Save Changes' : 'Add Service'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Verification Documents ───────────────────────────────────────────────────
function VerificationSection() {
  const [docs, setDocs]     = useState<VerificationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docName, setDocName]     = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedFile = useRef<File | null>(null)

  const fetchDocs = async () => {
    try {
      const res = await api.get('/artisans/artisan/documents')
      setDocs(res.data.documents || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDocs() }, [])

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      selectedFile.current = e.target.files[0]
      setShowNameInput(true)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile.current || !docName.trim()) {
      alert('Please enter a document name.')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('document', selectedFile.current)
      formData.append('docName', docName.trim())

      await api.post('/artisans/artisan/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setDocName('')
      setShowNameInput(false)
      selectedFile.current = null
      if (fileRef.current) fileRef.current.value = ''
      fetchDocs()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-extrabold text-slate-800 text-lg">Verification Documents</h2>
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-amber-200">
          <Upload size={15} /> Upload Document
        </button>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
        className="hidden" onChange={handleFileSelected} />

      {/* Document name input — shown after file is selected */}
      {showNameInput && (
        <div className="mb-4 flex gap-2 items-center bg-amber-50 border border-amber-200 rounded-xl p-3">
          <input
            value={docName}
            onChange={e => setDocName(e.target.value)}
            placeholder="Document name (e.g. National ID)"
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button onClick={handleUpload} disabled={uploading}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-bold rounded-lg">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button onClick={() => { setShowNameInput(false); selectedFile.current = null }}
            className="text-slate-400 hover:text-slate-600">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-4">Loading documents...</p>
      ) : docs.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-4">
          No documents uploaded yet. Upload your ID or professional license to increase your trust score.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {docs.map((doc) => {
            const cfg = statusConfig[doc.status]
            return (
              <div key={doc.id} className="py-4 first:pt-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
                      {cfg.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{doc.doc_name}</p>
                      <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-slate-400">
                        <span>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                        {doc.expiry_date && <span>Expires: {doc.expiry_date}</span>}
                        <span className={`font-semibold ${
                          doc.status === 'verified' ? 'text-emerald-600' :
                          doc.status === 'pending'  ? 'text-amber-600'  : 'text-red-500'
                        }`}>{cfg.label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={doc.file_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                      <Eye size={12} /> View
                    </a>
                    {doc.status === 'rejected' && (
                      <button onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg">
                        <Upload size={12} /> Re-upload
                      </button>
                    )}
                  </div>
                </div>
                {doc.status === 'rejected' && doc.rejection_reason && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 border border-red-100 text-red-600 rounded-lg px-3 py-1.5 font-medium">
                      <XCircle size={11} /> Rejection Reason: {doc.rejection_reason}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── My Services ─────────────────────────────────────────────────────────────
function ServicesSection() {
  const [services, setServices]     = useState<ArtisanService[]>([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState<ArtisanService | undefined>()

  const fetchServices = async () => {
    // Services are returned in the artisan profile endpoint
    // We re-use the dashboard data — or we can call the public profile
    // For now fetch from the artisan's own profile via getMe
    try {
      const res = await api.get('/auth/me')
      const profileRes = await api.get(`/artisans/${res.data.user.id}`)
      setServices(profileRes.data.services || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchServices() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this service?')) return
    try {
      await api.delete(`/artisans/artisan/services/${id}`)
      fetchServices()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'Could not delete service.')
    }
  }

  return (
    <>
      {modalOpen && (
        <ServiceModal
          service={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(undefined) }}
          onSave={fetchServices}
        />
      )}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-extrabold text-slate-800 text-lg">My Services</h2>
          <button onClick={() => { setEditTarget(undefined); setModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-md shadow-amber-200">
            <Plus size={15} /> Add Service
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm text-center py-4">Loading services...</p>
        ) : services.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">
            No services added yet. Add your first service offering.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {services.map((svc) => (
              <div key={svc.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{svc.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{svc.description}</p>
                  <span className="inline-block mt-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                    XAF {svc.rate_per_hour.toLocaleString()} / hr
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => { setEditTarget(svc); setModalOpen(true) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-600 text-xs font-semibold rounded-lg transition-all">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(svc.id)}
                    className="p-1.5 border border-red-100 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Profile Information ──────────────────────────────────────────────────────
function ProfileInfo({ profile, onSaved }: { profile: ProfileData; onSaved: () => void }) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone]       = useState(profile.phone || '')
  const [quarter, setQuarter]   = useState(profile.quarter || '')
  const [bio, setBio]           = useState(profile.bio || '')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch('/artisans/artisan/profile', { fullName, phone, quarter, bio })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onSaved()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h2 className="font-extrabold text-slate-800 text-base mb-4">Profile Information</h2>
      <div className="flex flex-col gap-3">
        {[
          { label: 'Full Name', value: fullName, setter: setFullName, disabled: false },
          { label: 'Email',     value: profile.email, setter: undefined, disabled: true  },
          { label: 'Phone',     value: phone, setter: setPhone, disabled: false },
        ].map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500">{f.label}</label>
            <input value={f.value} onChange={e => f.setter?.(e.target.value)}
              disabled={f.disabled}
              className={`border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${
                f.disabled
                  ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-amber-400'
              }`}
            />
          </div>
        ))}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Quarter</label>
          <select value={quarter} onChange={e => setQuarter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none cursor-pointer focus:border-amber-400">
            <option value="">Select quarter</option>
            {quarterNames.map(q => <option key={q}>{q}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Describe your skills and experience..."
            rows={3}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 resize-none" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 mt-1">
          <Save size={14} />
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── Trust Score Panel ────────────────────────────────────────────────────────
function TrustScorePanel({ profile }: { profile: ProfileData }) {
  const breakdown: TrustBreakdown[] = [
    {
      label: 'Documents Verified',
      value: profile.trust_score > 0 ? '✓' : '—',
      icon:  <Shield size={14} className="text-emerald-500" />,
      ok:    profile.trust_score > 0,
    },
    {
      label: 'Customer Rating',
      value: `${(profile.avg_rating || 0).toFixed(1)}/5`,
      icon:  <Star size={14} className="text-amber-400" />,
      ok:    (profile.avg_rating || 0) >= 4,
    },
    {
      label: 'Jobs Completed',
      value: profile.total_jobs.toString(),
      icon:  <Briefcase size={14} className="text-blue-500" />,
      ok:    profile.total_jobs > 0,
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-extrabold text-slate-800 text-base">Trust Score</h2>
        <span className="text-2xl font-extrabold text-emerald-500">{profile.trust_score}%</span>
      </div>
      <div className="flex flex-col gap-3">
        {breakdown.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              {item.icon}{item.label}
            </div>
            <span className={`font-bold text-xs ${item.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 bg-slate-50 rounded-xl p-3">
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${profile.trust_score}%` }} />
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          Calculated from verification level, ratings, jobs completed, and response rate.
        </p>
      </div>
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
      <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"><Bell size={20} /></button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ArtisanProfilePage() {
  const { user }  = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile]         = useState<ProfileData | null>(null)
  const [loading, setLoading]         = useState(true)

  const fetchProfile = async () => {
    try {
      if (!user?.id) return
      const res = await api.get(`/artisans/${user.id}`)
      setProfile({
        full_name:   res.data.full_name,
        email:       user.email,
        phone:       res.data.phone || '',
        quarter:     res.data.quarter || '',
        bio:         res.data.bio || '',
        trust_score: res.data.trust_score || 0,
        avg_rating:  parseFloat(res.data.avg_rating) || 0,
        total_jobs:  res.data.total_jobs || 0,
      })
    } catch (e) {
      console.error('Profile fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProfile() }, [user?.id])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/artisan/profile" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Profile & Verification</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your documents and service offerings</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Left — documents + services */}
            <div className="flex-1 flex flex-col gap-5">
              <VerificationSection />
              <ServicesSection />
            </div>
            {/* Right — profile info + trust score */}
            <div className="flex flex-col gap-5 w-full lg:w-72 shrink-0">
              {profile && (
                <>
                  <ProfileInfo profile={profile} onSaved={fetchProfile} />
                  <TrustScorePanel profile={profile} />
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}