// ─── PublicArtisanProfile ─────────────────────────────────────────────────────
// Route: /artisan/:id — customer-facing view of an artisan's public profile.
// Data source: GET /api/artisans/:id (public endpoint, no auth required by
// the backend, but we gate it here with ProtectedRoute so only logged-in
// customers can reach it).
//
// What is shown to the customer:
//   • Name, quarter, avatar, availability, trust score
//   • Bio
//   • Services with rates in XAF
//   • Verified document names only (NOT file URLs — privacy)
//   • Recent reviews with star ratings
//   • WhatsApp contact button + Post a Job button

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import AppSidebar from '../../components/AppSidebar'
import {
  ArrowLeft, Star, Shield, MapPin, Phone, MessageCircle,
  Briefcase, Clock, CheckCircle2, Menu, Wrench, FileText,
  ThumbsUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
// These mirror the exact fields returned by artisanController.getArtisanById.
// artisan_profiles joined with users, plus three nested arrays.

type AvailabilityStatus = 'available' | 'busy' | 'unavailable'

interface ArtisanService {
  id: number
  title: string
  description: string | null
  rate_per_hour: number
  category_name: string   // joined from service_categories
}

interface VerifiedDocument {
  id: number
  doc_name: string
  status: 'verified'      // only verified docs are returned for the public view
  expiry_date: string | null
}

interface Review {
  id: number
  stars: number
  comment: string | null
  created_at: string
  customer_name: string   // joined from users
}

interface PublicArtisanData {
  // from artisan_profiles
  id: number
  trust_score: number
  avg_rating: string      // DECIMAL comes back as string from pg
  total_jobs: number
  response_rate: number
  availability_status: AvailabilityStatus
  bio: string | null
  // from users (joined)
  full_name: string
  quarter: string
  division: string
  avatar_initials: string
  phone: string | null
  // nested arrays
  services: ArtisanService[]
  verifiedDocuments: VerifiedDocument[]
  recentReviews: Review[]
}

// ─── Utilities ────────────────────────────────────────────────────────────────
// Builds a WhatsApp deep-link from the stored phone number.
// Phone in DB is stored as entered by user (e.g. "677001234" or "237677001234").
// wa.me expects the international format without + or leading zeros.
function buildWhatsAppLink(phone: string, artisanName: string): string {
  const digits = phone.replace(/\D/g, '')
  // Prepend country code 237 if not already present
  const intl = digits.startsWith('237') ? digits : `237${digits}`
  const message = encodeURIComponent(
    `Hi ${artisanName}, I found your profile on TrustLink NW and would like to discuss a job.`
  )
  return `https://wa.me/${intl}?text=${message}`
}

// Maps trust score → colour classes for the badge
function trustScoreStyle(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (score >= 60) return 'bg-blue-50 text-blue-700 border-blue-200'
  if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-600 border-red-200'
}

// Maps availability_status → label + colour
const availabilityConfig: Record<AvailabilityStatus, { label: string; classes: string }> = {
  available:   { label: 'Available',   classes: 'bg-emerald-100 text-emerald-700' },
  busy:        { label: 'Busy',        classes: 'bg-amber-100 text-amber-700'    },
  unavailable: { label: 'Unavailable', classes: 'bg-slate-100 text-slate-500'    },
}

// Formats ISO timestamp to "Apr 20, 2026"
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── StarRating ───────────────────────────────────────────────────────────────
// Renders filled / empty stars. size controls the icon pixel size.
function StarRating({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= stars ? 'text-amber-400' : 'text-slate-200'}
          fill={i <= stars ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  )
}

// ─── TopBar (mobile) ──────────────────────────────────────────────────────────
function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
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
      {/* Spacer to keep logo centred */}
      <div className="w-9" />
    </div>
  )
}

// ─── HeroCard ─────────────────────────────────────────────────────────────────
// Large card at the top: avatar, name, location, availability, score, stats.
interface HeroCardProps {
  artisan: PublicArtisanData
  onWhatsApp: () => void
  onBookNow: () => void
}

function HeroCard({ artisan, onWhatsApp, onBookNow }: HeroCardProps) {
  const avail = availabilityConfig[artisan.availability_status]
  const rating = parseFloat(artisan.avg_rating || '0').toFixed(1)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      {/* Top row: avatar + name block + availability */}
      <div className="flex items-start gap-4">
        {/* Avatar circle with initials */}
        <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0">
          {artisan.avatar_initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-800 leading-tight">
              {artisan.full_name}
            </h1>
            {/* Availability badge */}
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${avail.classes}`}>
              {avail.label}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mt-1 text-slate-500">
            <MapPin size={13} />
            <span className="text-sm">{artisan.quarter}, {artisan.division}</span>
          </div>

          {/* Trust score badge */}
          <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border text-xs font-bold ${trustScoreStyle(artisan.trust_score)}`}>
            <Shield size={12} />
            {artisan.trust_score}% Trust Score
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Star size={14} className="text-amber-400" fill="currentColor" />
            <span className="font-extrabold text-slate-800">{rating}</span>
          </div>
          <p className="text-xs text-slate-400">Rating</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Briefcase size={14} className="text-slate-500" />
            <span className="font-extrabold text-slate-800">{artisan.total_jobs}</span>
          </div>
          <p className="text-xs text-slate-400">Jobs Done</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Clock size={14} className="text-slate-500" />
            <span className="font-extrabold text-slate-800">{artisan.response_rate}%</span>
          </div>
          <p className="text-xs text-slate-400">Response Rate</p>
        </div>
      </div>

      {/* Action buttons — hidden on mobile (sticky bar handles them) */}
      <div className="hidden sm:flex gap-3 mt-5">
        {artisan.phone && (
          <button
            onClick={onWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] shadow-sm shadow-emerald-200"
          >
            <MessageCircle size={16} />
            WhatsApp
          </button>
        )}
        <button
          onClick={onBookNow}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all hover:scale-[1.02] shadow-sm shadow-amber-200"
        >
          Post a Job Request
        </button>
      </div>
    </div>
  )
}

// ─── BioSection ───────────────────────────────────────────────────────────────
function BioSection({ bio }: { bio: string | null }) {
  if (!bio) return null
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h2 className="font-extrabold text-slate-800 text-base mb-3">About</h2>
      <p className="text-sm text-slate-600 leading-relaxed">{bio}</p>
    </div>
  )
}

// ─── ServicesSection ──────────────────────────────────────────────────────────
// Shows all services the artisan offers with their hourly rates in XAF.
function ServicesSection({ services }: { services: ArtisanService[] }) {
  if (services.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-extrabold text-slate-800 text-base mb-3">Services</h2>
        <p className="text-sm text-slate-400">No services listed yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h2 className="font-extrabold text-slate-800 text-base mb-4">Services</h2>
      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-start justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100"
          >
            <div className="flex-1 min-w-0">
              {/* Category tag */}
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                {service.category_name}
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">{service.title}</p>
              {service.description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{service.description}</p>
              )}
            </div>
            {/* Rate */}
            <div className="text-right shrink-0">
              <p className="font-extrabold text-slate-800 text-sm">
                {service.rate_per_hour.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400">XAF/hr</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DocumentsSection ─────────────────────────────────────────────────────────
// Shows only VERIFIED document names — no file URLs exposed to customers.
// The green shield gives customers confidence without leaking private files.
function DocumentsSection({ documents }: { documents: VerifiedDocument[] }) {
  if (documents.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-emerald-500" />
        <h2 className="font-extrabold text-slate-800 text-base">Verified Documents</h2>
      </div>
      <div className="flex flex-col gap-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={15} className="text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{doc.doc_name}</p>
              {doc.expiry_date && (
                <p className="text-xs text-slate-400">
                  Valid until {formatDate(doc.expiry_date)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-emerald-600 shrink-0">
              <CheckCircle2 size={14} />
              <span className="text-xs font-semibold">Verified</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ReviewsSection ───────────────────────────────────────────────────────────
// Shows recent reviews (up to however the backend returns — currently last 5-10).
// Stars rendered visually, not as a number only.
function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <ThumbsUp size={16} className="text-amber-500" />
        <h2 className="font-extrabold text-slate-800 text-base">
          Reviews {reviews.length > 0 && `(${reviews.length})`}
        </h2>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-6">
          <Star size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No reviews yet.</p>
          <p className="text-xs text-slate-300 mt-1">Be the first to book and leave a review.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <div key={review.id} className="flex flex-col gap-1.5 pb-4 border-b border-slate-50 last:border-0">
              {/* Reviewer + date */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">{review.customer_name}</span>
                <span className="text-xs text-slate-400">{formatDate(review.created_at)}</span>
              </div>
              {/* Stars */}
              <StarRating stars={review.stars} />
              {/* Comment */}
              {review.comment && (
                <p className="text-sm text-slate-600 leading-snug">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── StickyBottomBar (mobile CTA) ─────────────────────────────────────────────
// On small screens, action buttons float at the bottom so they're always reachable.
// Hidden on sm+ because HeroCard shows the buttons there instead.
interface StickyBarProps {
  phone: string | null
  artisanName: string
  onWhatsApp: () => void
  onBookNow: () => void
}

function StickyBottomBar({ phone, onWhatsApp, onBookNow }: StickyBarProps) {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 flex gap-3 z-30 shadow-lg">
      {phone && (
        <button
          onClick={onWhatsApp}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-colors"
        >
          <MessageCircle size={16} />
          WhatsApp
        </button>
      )}
      <button
        onClick={onBookNow}
        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors"
      >
        Post a Job Request
      </button>
    </div>
  )
}

// ─── PublicArtisanProfile (Page) ─────────────────────────────────────────────
export default function PublicArtisanProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [artisan, setArtisan]         = useState<PublicArtisanData | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchArtisan = async () => {
      try {
        const res = await api.get(`/artisans/${id}`)
        setArtisan(res.data)
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr?.response?.status === 404) {
          setError('Artisan not found.')
        } else {
          setError('Failed to load profile. Please try again.')
        }
        console.error('PublicArtisanProfile fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchArtisan()
  }, [id])

  // ── WhatsApp handler ────────────────────────────────────────────────────────
  const handleWhatsApp = () => {
    if (!artisan?.phone) return
    window.open(buildWhatsAppLink(artisan.phone, artisan.full_name), '_blank')
  }

  // ── Book Now handler ────────────────────────────────────────────────────────
  // TODO: Change this to navigate('/customer/post-job') once Item 7 is built.
  // For now we return the customer to their dashboard where job posting will live.
  const handleBookNow = () => {
    navigate('/customer')
  }

  // ── Back button ─────────────────────────────────────────────────────────────
  const handleBack = () => {
    // Go back to the previous page (Search or Dashboard)
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/search')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar — same as all other customer pages */}
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeHref="/search"   // customer arrived from search
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* ── Loading state ─────────────────────────────────────────────── */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">Loading profile...</p>
            </div>
          </div>
        )}

        {/* ── Error state ───────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <p className="text-red-500 font-semibold">{error}</p>
              <button
                onClick={() => navigate('/search')}
                className="mt-3 text-sm text-amber-500 underline hover:text-amber-600"
              >
                Back to Search
              </button>
            </div>
          </div>
        )}

        {/* ── Profile content ───────────────────────────────────────────── */}
        {!loading && artisan && (
          <div className="flex-1 overflow-y-auto pb-24 sm:pb-8">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

              {/* Back navigation */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Back
              </button>

              {/* Hero card with avatar, score, stats, action buttons */}
              <HeroCard
                artisan={artisan}
                onWhatsApp={handleWhatsApp}
                onBookNow={handleBookNow}
              />

              {/* Bio — only renders if artisan has set one */}
              <BioSection bio={artisan.bio} />

              {/* Services */}
              <ServicesSection services={artisan.services} />

              {/* Verified documents — name + badge only, no download links */}
              <DocumentsSection documents={artisan.verifiedDocuments} />

              {/* Reviews */}
              <ReviewsSection reviews={artisan.recentReviews} />

            </div>
          </div>
        )}

        {/* Sticky CTA bar — mobile only, hidden on sm+ screens */}
        {artisan && (
          <StickyBottomBar
            phone={artisan.phone}
            artisanName={artisan.full_name}
            onWhatsApp={handleWhatsApp}
            onBookNow={handleBookNow}
          />
        )}
      </div>
    </div>
  )
}