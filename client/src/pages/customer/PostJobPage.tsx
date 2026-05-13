// ─── PostJobPage ──────────────────────────────────────────────────────────────
// Customer posts a new job request.
// Flow:
//   1. Customer types a free-form description (English or Pidgin)
//   2. "Analyze" → POST /api/ai/analyze-job → auto-fills all fields
//   3. Customer reviews / adjusts any field
//   4. Submit → POST /api/customer/jobs → redirect to /customer/bookings
//
// If AI returns fallback:true → fields stay empty, form still fully usable.
// Route: /customer/post-job    Auth: customer only

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wrench, Menu, Sparkles, Loader2, AlertCircle,
  ChevronRight, RotateCcw, MapPin, DollarSign,
  FileText, Tag, Zap, CheckCircle2, ArrowLeft,
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'
import api from '../../utils/api'
import { quarterNames } from '../../data/nwRegionData'

// ─── Service categories matching DB seed ─────────────────────────────────────
// IDs: 1=Plumbing, 2=Electrical, 3=Solar, 4=Mechanic,
//      5=Laundry, 6=HVAC, 7=Tailoring, 8=Home Care
const CATEGORIES = [
  { id: 1, name: 'Plumbing',   icon: '🔧' },
  { id: 2, name: 'Electrical', icon: '⚡' },
  { id: 3, name: 'Solar',      icon: '☀️' },
  { id: 4, name: 'Mechanic',   icon: '🚗' },
  { id: 5, name: 'Laundry',    icon: '👕' },
  { id: 6, name: 'HVAC',       icon: '💨' },
  { id: 7, name: 'Tailoring',  icon: '✂️' },
  { id: 8, name: 'Home Care',  icon: '🏠' },
]

const URGENCY_LABELS: Record<string, { label: string; active: string }> = {
  low:    { label: 'Low — no rush',        active: 'bg-emerald-50 border-emerald-400 text-emerald-700' },
  medium: { label: 'Medium — within days', active: 'bg-amber-50 border-amber-400 text-amber-700'       },
  high:   { label: 'High — ASAP',          active: 'bg-red-50 border-red-400 text-red-600'             },
  urgent: { label: 'Urgent — right now',   active: 'bg-red-100 border-red-500 text-red-700'            },
}

// ─── AI analysis result shape (matches /api/ai/analyze-job response) ──────────
interface AIAnalysis {
  success: boolean
  fallback?: boolean
  categoryId: number | null
  categoryName: string
  title: string
  description: string
  urgency: string
  estimatedBudgetMin: number
  estimatedBudgetMax: number
  confidence: number
  detectedLanguage: string
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
      {children}
    </div>
  )
}

// ─── TopBar (mobile only) ─────────────────────────────────────────────────────
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

// ─── PostJobPage ──────────────────────────────────────────────────────────────
export default function PostJobPage() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Step: 'describe' → 'review' → 'done'
  const [step, setStep] = useState<'describe' | 'review' | 'done'>('describe')

  // Step 1
  const [rawText,      setRawText]      = useState('')
  const [analyzing,    setAnalyzing]    = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [aiMeta,       setAiMeta]       = useState<{ confidence: number; lang: string } | null>(null)
  const [wasFallback,  setWasFallback]  = useState(false)

  // Step 2 form fields
  const [categoryId,  setCategoryId]  = useState<number | ''>('')
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [urgency,     setUrgency]     = useState('medium')
  const [quarter,     setQuarter]     = useState('')
  const [budgetMin,   setBudgetMin]   = useState('')
  const [budgetMax,   setBudgetMax]   = useState('')

  // Submission
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Analyze with AI ───────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (rawText.trim().length < 5) return
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const res = await api.post<{ analysis: AIAnalysis }>('/ai/analyze-job', { text: rawText })
      const a   = res.data.analysis

      if (a.fallback) {
        setWasFallback(true)
        setAiMeta(null)
        setDescription(rawText)
      } else {
        setCategoryId(a.categoryId ?? '')
        setTitle(a.title || '')
        setDescription(a.description || rawText)
        setUrgency(a.urgency || 'medium')
        setBudgetMin(a.estimatedBudgetMin ? String(a.estimatedBudgetMin) : '')
        setBudgetMax(a.estimatedBudgetMax ? String(a.estimatedBudgetMax) : '')
        setWasFallback(false)
        setAiMeta({ confidence: a.confidence, lang: a.detectedLanguage })
      }
      setStep('review')
    } catch {
      setAnalyzeError('Could not reach the AI service. You can still fill the form manually.')
      setWasFallback(true)
      setDescription(rawText)
      setStep('review')
    } finally {
      setAnalyzing(false)
    }
  }

  // Skip AI — go straight to manual form
  const handleSkipAI = () => {
    setDescription(rawText)
    setWasFallback(true)
    setStep('review')
  }

  // ── Submit job post ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!categoryId)       { setSubmitError('Please select a service category.'); return }
    if (!title.trim())     { setSubmitError('Please enter a job title.'); return }
    if (!quarter)          { setSubmitError('Please select your quarter.'); return }

    setSubmitting(true)
    setSubmitError('')
    try {
      await api.post('/customer/jobs', {
        title:       title.trim(),
        description: description.trim(),
        categoryId:  Number(categoryId),
        quarter,
        budgetMin:   budgetMin ? Number(budgetMin) : undefined,
        budgetMax:   budgetMax ? Number(budgetMax) : undefined,
      })
      setStep('done')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setSubmitError(err.response?.data?.error || 'Failed to post job. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Reset everything back to step 1
  const handleReset = () => {
    setStep('describe'); setRawText(''); setCategoryId(''); setTitle('')
    setDescription(''); setUrgency('medium'); setQuarter('')
    setBudgetMin(''); setBudgetMax(''); setAnalyzeError('')
    setSubmitError(''); setAiMeta(null); setWasFallback(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/customer" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">

            {/* Back */}
            <button
              onClick={() => navigate('/customer')}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-500 font-semibold mb-5 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </button>

            {/* Header */}
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Post a Job</h1>
              <p className="text-slate-500 text-sm mt-1">
                Describe what you need — artisans near you will send quotes
              </p>
            </div>

            {/* Step indicator */}
            {step !== 'done' && (
              <div className="flex items-center gap-3 mb-8">
                {(['describe', 'review'] as const).map((s, i) => {
                  const done   = step === 'review' && s === 'describe'
                  const active = step === s
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                        done   ? 'bg-emerald-500 text-white' :
                        active ? 'bg-amber-500 text-white shadow-md shadow-amber-200' :
                                 'bg-slate-200 text-slate-400'
                      }`}>
                        {done ? <CheckCircle2 size={14} /> : i + 1}
                      </div>
                      <span className={`text-xs font-bold ${active ? 'text-slate-800' : 'text-slate-400'}`}>
                        {s === 'describe' ? 'Describe' : 'Review & Post'}
                      </span>
                      {i === 0 && <ChevronRight size={14} className="text-slate-300" />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ══ STEP 1 — Describe ══════════════════════════════════════════ */}
            {step === 'describe' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">

                {/* AI badge */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <Sparkles size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700">
                    <span className="font-extrabold">AI-powered.</span>{' '}
                    Write in plain English or Cameroon Pidgin — our AI will detect the service type, suggest a title, and estimate a budget automatically.
                  </p>
                </div>

                {/* Textarea */}
                <Field
                  label="What do you need help with?"
                  hint='e.g. "My pipe dey leak for kitchen since morning, e don bad well well, I need somebody quick" — or just describe in your own words.'
                >
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    rows={6}
                    placeholder="Describe your problem or request here..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none transition-all"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Minimum 5 characters</span>
                    <span className={`text-xs font-semibold ${rawText.length >= 5 ? 'text-emerald-500' : 'text-slate-300'}`}>
                      {rawText.length} chars
                    </span>
                  </div>
                </Field>

                {/* Analyze error */}
                {analyzeError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-600">{analyzeError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={rawText.trim().length < 5 || analyzing}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-200"
                  >
                    {analyzing
                      ? <><Loader2 size={16} className="animate-spin" /> Analyzing your request...</>
                      : <><Sparkles size={16} /> Analyze with AI</>
                    }
                  </button>
                  <button
                    onClick={handleSkipAI}
                    disabled={analyzing}
                    className="px-5 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Skip, fill manually
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 2 — Review & Post ═════════════════════════════════════ */}
            {step === 'review' && (
              <div className="flex flex-col gap-5">

                {/* Banner */}
                {!wasFallback && aiMeta ? (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-emerald-700">Fields auto-filled by AI</p>
                      <p className="text-xs text-emerald-600">
                        Detected: <span className="font-semibold capitalize">{aiMeta.lang}</span> ·{' '}
                        Confidence: <span className="font-semibold">{Math.round(aiMeta.confidence * 100)}%</span>
                        {' '}— review and adjust anything below
                      </p>
                    </div>
                    <button onClick={handleReset} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-semibold shrink-0">
                      <RotateCcw size={12} /> Start over
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-500 font-medium flex-1">Fill in the details below. Category, title and quarter are required.</p>
                    <button onClick={handleReset} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-semibold shrink-0">
                      <RotateCcw size={12} /> Start over
                    </button>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-6">

                  {/* Category grid */}
                  <Field label="Service Category *" hint="What type of work do you need?">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setCategoryId(cat.id)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                            categoryId === cat.id
                              ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200 scale-[1.02]'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          <span className="text-xl leading-none">{cat.icon}</span>
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Title */}
                  <Field label="Job Title *" hint="A short, clear summary of what you need">
                    <div className="relative">
                      <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Fix kitchen pipe leak"
                        maxLength={150}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-700 placeholder:text-slate-400 transition-all"
                      />
                    </div>
                  </Field>

                  {/* Description */}
                  <Field label="Full Description" hint="More detail helps artisans give accurate quotes">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      placeholder="Describe the issue, what you've already tried, any special requirements..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none transition-all"
                    />
                  </Field>

                  {/* Urgency */}
                  <Field label="Urgency">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(URGENCY_LABELS).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => setUrgency(key)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                            urgency === key
                              ? val.active
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <Zap size={11} />
                          {val.label}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Quarter selector */}
                  <Field label="Your Quarter *" hint="Artisans near you will be notified first">
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={quarter}
                        onChange={(e) => setQuarter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-700 bg-white appearance-none cursor-pointer transition-all"
                      >
                        <option value="">Select your quarter...</option>
                        {quarterNames.map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                    </div>
                  </Field>

                  {/* Budget range — optional */}
                  <Field label="Budget Range — XAF (optional)" hint="Helps artisans quote within your range. Leave blank if unsure.">
                    <div className="flex gap-3 items-center">
                      <div className="relative flex-1">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                          placeholder="Min"
                          min={0}
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-700 transition-all"
                        />
                      </div>
                      <span className="text-slate-400 text-sm font-semibold shrink-0">to</span>
                      <div className="relative flex-1">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          placeholder="Max"
                          min={0}
                          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-700 transition-all"
                        />
                      </div>
                    </div>
                  </Field>

                  {/* Submit error */}
                  {submitError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-600">{submitError}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !categoryId || !title.trim() || !quarter}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl transition-colors shadow-md shadow-amber-200"
                  >
                    {submitting
                      ? <><Loader2 size={16} className="animate-spin" /> Posting your job...</>
                      : <><FileText size={16} /> Post Job Request</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ══ STEP 3 — Done ══════════════════════════════════════════════ */}
            {step === 'done' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 flex flex-col items-center text-center gap-5">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 mb-2">Job Posted!</h2>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    Your request is live. Artisans near{' '}
                    <span className="font-semibold text-slate-700">{quarter}</span>{' '}
                    will review it and send quotes shortly.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <button
                    onClick={() => navigate('/customer/bookings')}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-200"
                  >
                    View My Bookings
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Post Another
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}