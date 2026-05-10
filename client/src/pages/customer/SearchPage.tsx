import { useState, useEffect, useCallback } from 'react'
import {
  Search, MapPin, Star, List, Map,
  Menu, Bell, ChevronDown, Wrench
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import AppSidebar from '../../components/AppSidebar'
import { quarterNames } from '../../data/nwRegionData'
import api from '../../utils/api'

// Fix Leaflet default marker icons broken by Vite asset handling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// ─── Types ────────────────────────────────────────────────────────────────────
interface Artisan {
  id: number
  full_name: string
  quarter: string
  avatar_initials: string
  artisan_profile_id: number
  trust_score: number
  avg_rating: string
  total_jobs: number
  availability_status: string
  primary_service: string
  rate_per_hour: number
  category_name: string
  lat: number | null
  lon: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const formatXAF = (amount: number) => `XAF ${amount.toLocaleString()}`
const trustColor = (score: number) =>
  score >= 95 ? 'text-emerald-600' : score >= 85 ? 'text-amber-600' : 'text-red-500'
const serviceOptions = [
  'All Services','Plumbing','Electrical','Solar',
  'Mechanic','Laundry','HVAC','Tailoring','Home Care',
]
// Bamenda city centre — default map centre
const BAMENDA_CENTER: [number, number] = [5.9597, 10.1456]

// ─── Nominatim geocoder ───────────────────────────────────────────────────────
// Converts a quarter name to real GPS coordinates for the map
// Called only when an artisan has no stored lat/lon yet
const geocodeQuarter = async (quarter: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const q   = encodeURIComponent(`${quarter}, Bamenda, Cameroon`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=cm`,
      { headers: { 'User-Agent': 'TrustLink/1.0 (artisan-marketplace-nw)' } }
    )
    const data = await res.json()
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
    }
    return null
  } catch {
    return null
  }
}

// ─── Artisan Card ─────────────────────────────────────────────────────────────
function ArtisanCard({ artisan }: { artisan: Artisan }) {
  const available = artisan.availability_status === 'available'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
            {artisan.avatar_initials}
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-base">{artisan.full_name}</p>
            <p className="text-amber-500 text-sm font-semibold">
              {artisan.primary_service || artisan.category_name}
            </p>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
              <MapPin size={11} />
              <span>{artisan.quarter}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          {artisan.rate_per_hour && (
            <>
              <p className="font-extrabold text-slate-800 text-sm">
                {formatXAF(artisan.rate_per_hour)}
              </p>
              <p className="text-xs text-slate-400">per hour</p>
            </>
          )}
          <div className="flex items-center gap-1 justify-end mt-1">
            <span className={`w-2 h-2 rounded-full ${available ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            <span className={`text-xs font-medium ${available ? 'text-emerald-600' : 'text-slate-400'}`}>
              {available ? 'Available' : 'Busy'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Star size={14} className="text-amber-400" fill="currentColor" />
          <span className="font-bold text-slate-700">
            {parseFloat(artisan.avg_rating || '0').toFixed(1)}
          </span>
          <span className="text-slate-400">({artisan.total_jobs} jobs)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Trust:</span>
          <span className={`font-extrabold ${trustColor(artisan.trust_score)}`}>
            {artisan.trust_score}%
          </span>
        </div>
      </div>

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
            available
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

// ─── Map View ─────────────────────────────────────────────────────────────────
// Shows artisan pins on OpenStreetMap via Leaflet
// Artisans without stored coordinates are geocoded via Nominatim on the fly
function MapView({ artisans }: { artisans: Artisan[] }) {
  const [positioned, setPositioned] = useState<
    Array<Artisan & { lat: number; lon: number }>
  >([])
  const [geocoding, setGeocoding] = useState(true)

  useEffect(() => {
    if (artisans.length === 0) { setGeocoding(false); return }

    const geocodeAll = async () => {
      setGeocoding(true)
      const results: Array<Artisan & { lat: number; lon: number }> = []

      for (const artisan of artisans) {
        if (artisan.lat && artisan.lon) {
          // Already has stored coordinates — use them directly
          results.push({ ...artisan, lat: artisan.lat, lon: artisan.lon })
        } else if (artisan.quarter) {
          // Geocode the quarter name via Nominatim
          const coords = await geocodeQuarter(artisan.quarter)
          if (coords) {
            results.push({ ...artisan, ...coords })
          }
        }
      }

      setPositioned(results)
      setGeocoding(false)
    }

    geocodeAll()
  }, [artisans])

  if (geocoding) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-500 text-sm">Locating artisans on map...</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 500 }}>
      <MapContainer center={BAMENDA_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positioned.map((artisan) => (
          <Marker key={artisan.id} position={[artisan.lat, artisan.lon]}>
            <Popup>
              <div className="text-sm min-w-[140px]">
                <p className="font-bold text-slate-800">{artisan.full_name}</p>
                <p className="text-amber-600 text-xs">{artisan.primary_service}</p>
                <p className="text-slate-500 text-xs">{artisan.quarter}</p>
                {artisan.rate_per_hour && (
                  <p className="font-semibold text-slate-700 mt-1 text-xs">
                    {formatXAF(artisan.rate_per_hour)}/hr
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Star size={10} className="text-amber-400" fill="currentColor" />
                  <span className="text-xs">{parseFloat(artisan.avg_rating || '0').toFixed(1)}</span>
                  <span className="text-xs text-emerald-600 ml-1 font-semibold">
                    {artisan.trust_score}%
                  </span>
                </div>
                <a
                  href={`/artisan/${artisan.id}`}
                  className="text-amber-500 hover:text-amber-600 font-semibold text-xs mt-2 block"
                >
                  View Profile →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
        {positioned.length === 0 && (
          <div className="leaflet-top leaflet-left" style={{ margin: 16 }}>
            <div className="bg-white rounded-xl shadow px-4 py-2 text-sm text-slate-500">
              No artisan locations found for current filters
            </div>
          </div>
        )}
      </MapContainer>
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
  const [artisans, setArtisans]       = useState<Artisan[]>([])
  const [loading, setLoading]         = useState(true)
  const [query, setQuery]             = useState('')
  const [service, setService]         = useState('All Services')
  const [quarter, setQuarter]         = useState('All Quarters')
  const [viewMode, setViewMode]       = useState<'list' | 'map'>('list')

  // Fetch artisans from real backend with filters as query params
  const fetchArtisans = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (query)                      params.q       = query
      if (service !== 'All Services') params.service = service
      if (quarter !== 'All Quarters') params.quarter = quarter

      const res = await api.get('/artisans', { params })
      setArtisans(res.data.artisans || [])
    } catch (err) {
      console.error('Search error:', err)
      setArtisans([])
    } finally {
      setLoading(false)
    }
  }, [query, service, quarter])

  // Debounce text search — wait 400ms after typing stops before API call
  useEffect(() => {
    const timer = setTimeout(fetchArtisans, 400)
    return () => clearTimeout(timer)
  }, [fetchArtisans])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeHref="/search"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              Find Service Providers
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Search for trusted artisans in your area
            </p>
          </div>

          {/* Filter bar */}
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

              {/* Quarter filter */}
              <div className="relative">
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm text-slate-700 outline-none cursor-pointer focus:border-amber-400 transition-all w-full sm:w-44"
                >
                  <option>All Quarters</option>
                  {quarterNames.map((q) => <option key={q}>{q}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>

              {/* List / Map toggle */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  aria-label="List view"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'map'
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  aria-label="Map view"
                >
                  <Map size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Result count */}
          <p className="text-sm text-slate-500 mb-4 font-medium">
            {loading
              ? 'Searching...'
              : `${artisans.length} artisan${artisans.length !== 1 ? 's' : ''} found${
                  quarter !== 'All Quarters' ? ` in ${quarter}` : ''
                }`}
          </p>

          {/* Results area */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === 'list' ? (
            artisans.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {artisans.map((a) => (
                  <ArtisanCard key={a.id} artisan={a} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <Search size={28} className="text-slate-400" />
                </div>
                <p className="font-bold text-slate-700 mb-1">No artisans found</p>
                <p className="text-slate-400 text-sm">
                  Try adjusting your filters or search terms
                </p>
              </div>
            )
          ) : (
            <MapView artisans={artisans} />
          )}
        </main>
      </div>
    </div>
  )
}