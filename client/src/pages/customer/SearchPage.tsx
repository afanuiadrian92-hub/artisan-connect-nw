import { useState, useMemo } from 'react'
import {
  Search, MapPin, Star, List, Map,
  Menu, Bell, ChevronDown, Wrench
} from 'lucide-react'
import AppSidebar from '../../components/AppSidebar'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Artisan {
  id: number
  initials: string
  name: string
  service: string
  division: string
  distanceKm: number
  ratePerHour: number        // stored in XAF
  rating: number
  reviews: number
  trustScore: number
  available: boolean
  avatarColor: string
}

// ─── Data — replace with GET /api/artisans?division=&service=&q= ──────────────
const allArtisans: Artisan[] = [
  { id: 1,  initials: 'JS', name: 'John Smith',    service: 'Plumbing',   division: 'Mezam',         distanceKm: 1.2, ratePerHour: 4500,  rating: 4.9, reviews: 156, trustScore: 98, available: true,  avatarColor: 'bg-slate-500'  },
  { id: 2,  initials: 'SJ', name: 'Sarah Johnson', service: 'Electrical', division: 'Menchum',       distanceKm: 2.5, ratePerHour: 5500,  rating: 4.8, reviews: 203, trustScore: 95, available: true,  avatarColor: 'bg-teal-500'   },
  { id: 3,  initials: 'MB', name: 'Mike Brown',    service: 'Solar',      division: 'Bui',           distanceKm: 3.1, ratePerHour: 6500,  rating: 4.7, reviews: 89,  trustScore: 92, available: true,  avatarColor: 'bg-purple-500' },
  { id: 4,  initials: 'DL', name: 'David Lee',     service: 'Mechanic',   division: 'Mezam',         distanceKm: 1.8, ratePerHour: 5000,  rating: 4.9, reviews: 178, trustScore: 96, available: true,  avatarColor: 'bg-blue-500'   },
  { id: 5,  initials: 'EW', name: 'Emma Wilson',   service: 'Laundry',    division: 'Momo',          distanceKm: 4.2, ratePerHour: 3500,  rating: 4.6, reviews: 124, trustScore: 88, available: false, avatarColor: 'bg-rose-500'   },
  { id: 6,  initials: 'RC', name: 'Robert Chen',   service: 'HVAC',       division: 'Donga-Mantung', distanceKm: 2.9, ratePerHour: 6000,  rating: 4.8, reviews: 142, trustScore: 94, available: true,  avatarColor: 'bg-amber-600'  },
  { id: 7,  initials: 'AN', name: 'Alice Nkeng',   service: 'Tailoring',  division: 'Boyo',          distanceKm: 5.1, ratePerHour: 2500,  rating: 4.5, reviews: 67,  trustScore: 85, available: true,  avatarColor: 'bg-emerald-500'},
  { id: 8,  initials: 'PF', name: 'Paul Fon',      service: 'Plumbing',   division: 'Ngo-Ketunjia',  distanceKm: 6.3, ratePerHour: 4000,  rating: 4.3, reviews: 45,  trustScore: 80, available: true,  avatarColor: 'bg-orange-500' },
]

const serviceOptions = ['All Services', 'Plumbing', 'Electrical', 'Solar', 'Mechanic', 'Laundry', 'HVAC', 'Tailoring', 'Home Care']
const divisionOptions = ['All Divisions', 'Boyo', 'Bui', 'Donga-Mantung', 'Menchum', 'Mezam', 'Momo', 'Ngo-Ketunjia']

// ─── Format XAF ───────────────────────────────────────────────────────────────
const formatXAF = (amount: number) => `XAF ${amount.toLocaleString()}`

// ─── Trust score colour ───────────────────────────────────────────────────────
const trustColor = (score: number) => {
  if (score >= 95) return 'text-emerald-600'
  if (score >= 85) return 'text-amber-600'
  return 'text-red-500'
}

// ─── Artisan Card ─────────────────────────────────────────────────────────────
function ArtisanCard({ artisan }: { artisan: Artisan }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all flex flex-col gap-4">

      {/* Top row — avatar, name, rate */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${artisan.avatarColor} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {artisan.initials}
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-base">{artisan.name}</p>
            <p className="text-amber-500 text-sm font-semibold">{artisan.service}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <MapPin size={11} />
              <span>{artisan.division}</span>
              <span>·</span>
              <span>{artisan.distanceKm} km away</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-extrabold text-slate-800 text-base">{formatXAF(artisan.ratePerHour)}</p>
          <p className="text-xs text-slate-400">per hour</p>
          {/* Availability dot */}
          <div className="flex items-center gap-1 justify-end mt-1">
            <span className={`w-2 h-2 rounded-full ${artisan.available ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            <span className={`text-xs font-medium ${artisan.available ? 'text-emerald-600' : 'text-slate-400'}`}>
              {artisan.available ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>
      </div>

      {/* Rating + Trust Score */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Star size={14} className="text-amber-400" fill="currentColor" />
          <span className="font-bold text-slate-700">{artisan.rating}</span>
          <span className="text-slate-400">({artisan.reviews} reviews)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Trust Score:</span>
          <span className={`font-extrabold ${trustColor(artisan.trustScore)}`}>
            {artisan.trustScore}%
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <a
          href={`/artisan/${artisan.id}`}
          className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl text-center transition-colors"
        >
          View Profile
        </a>
        <a
          href={`/artisan/${artisan.id}/book`}
          className={`flex-1 py-2.5 text-sm font-bold rounded-xl text-center transition-all ${
            artisan.available
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none'
          }`}
        >
          Book Now
        </a>
      </div>
    </div>
  )
}

// ─── Map placeholder ──────────────────────────────────────────────────────────
// Leaflet map will be wired here once artisan coordinates exist in the database
function MapView() {
  return (
    <div className="bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center h-96 lg:h-full min-h-[400px]">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
        <Map size={28} className="text-amber-500" />
      </div>
      <p className="font-bold text-slate-700 mb-1">Map View</p>
      <p className="text-slate-400 text-sm text-center max-w-xs px-4">
        Leaflet + OpenStreetMap integration will display artisan locations here
        once GPS coordinates are collected from the database.
      </p>
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
      <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100">
        <Bell size={20} />
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery]             = useState('')
  const [service, setService]         = useState('All Services')
  const [division, setDivision]       = useState('All Divisions')
  const [viewMode, setViewMode]       = useState<'list' | 'map'>('list')

  // Client-side filtering — will move to server-side query params when backend is ready
  // GET /api/artisans?q=query&service=service&division=division
  const filtered = useMemo(() => {
    return allArtisans.filter((a) => {
      const matchesQuery   = query === '' ||
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.service.toLowerCase().includes(query.toLowerCase())
      const matchesService  = service === 'All Services'  || a.service === service
      const matchesDivision = division === 'All Divisions' || a.division === division
      return matchesQuery && matchesService && matchesDivision
    })
  }, [query, service, division])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeHref="/search" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Find Service Providers</h1>
            <p className="text-slate-500 text-sm mt-1">Search for trusted artisans in your area</p>
          </div>

          {/* Search + Filter bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">

              {/* Text search */}
              <div className="flex items-center gap-2 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or service..."
                  className="bg-transparent flex-1 text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                />
              </div>

              {/* Service filter */}
              <div className="relative">
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm text-slate-700 outline-none cursor-pointer focus:border-amber-400 transition-all w-full sm:w-40"
                >
                  {serviceOptions.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* Division filter */}
              <div className="relative">
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm text-slate-700 outline-none cursor-pointer focus:border-amber-400 transition-all w-full sm:w-40"
                >
                  {divisionOptions.map((d) => <option key={d}>{d}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* List / Map toggle */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                  aria-label="List view"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                  aria-label="Map view"
                >
                  <Map size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-slate-500 mb-4 font-medium">
            {filtered.length} artisan{filtered.length !== 1 ? 's' : ''} found
            {division !== 'All Divisions' ? ` in ${division}` : ''}
          </p>

          {/* Results */}
          {viewMode === 'list' ? (
            filtered.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((artisan) => (
                  <ArtisanCard key={artisan.id} artisan={artisan} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <Search size={28} className="text-slate-400" />
                </div>
                <p className="font-bold text-slate-700 mb-1">No artisans found</p>
                <p className="text-slate-400 text-sm">Try adjusting your filters or search terms</p>
              </div>
            )
          ) : (
            <MapView />
          )}
        </main>
      </div>
    </div>
  )
}