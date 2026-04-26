// ─── NW Region Geography Data ─────────────────────────────────────────────────
// Strategy:
//   1. Popular Bamenda/Mezam quarters listed for instant offline autocomplete
//   2. Anything not in this list is geocoded live via Nominatim (OpenStreetMap)
//      so the platform never needs manual updates as it expands to other divisions

export interface Quarter {
  name: string
  division: string
}

export const quarters: Quarter[] = [
  // ── Mezam Division — Bamenda ─────────────────────────────────────────────────
  { name: 'Mile 1',              division: 'Mezam' },
  { name: 'Mile 2',              division: 'Mezam' },
  { name: 'Mile 3',              division: 'Mezam' },
  { name: 'Mile 4',              division: 'Mezam' },
  { name: 'Mile 7',              division: 'Mezam' },
  { name: 'Commercial Avenue',   division: 'Mezam' },
  { name: 'Up Station',          division: 'Mezam' },
  { name: 'Old Town',            division: 'Mezam' },
  { name: 'Nkwen',               division: 'Mezam' },
  { name: 'Ntarinkon',           division: 'Mezam' },
  { name: 'Cow Street',          division: 'Mezam' },
  { name: 'Food Market',         division: 'Mezam' },
  { name: 'Bayelle',             division: 'Mezam' },
  { name: 'Alakuma',             division: 'Mezam' },
  { name: 'Azire',               division: 'Mezam' },
  { name: 'Mankon',              division: 'Mezam' },
  { name: 'Nsongwa',             division: 'Mezam' },
  { name: 'Center Bolt',         division: 'Mezam' },
  { name: 'Menteh',              division: 'Mezam' },
  { name: 'Musang',              division: 'Mezam' },
  { name: 'Savanna',             division: 'Mezam' },
  { name: 'Hospital Roundabout', division: 'Mezam' },
  { name: 'Bambili',             division: 'Mezam' },
  { name: 'Bambui',              division: 'Mezam' },
  { name: 'Bali',                division: 'Mezam' },
  // ── Momo ─────────────────────────────────────────────────────────────────────
  { name: 'Mbengwi Town',        division: 'Momo'          },
  { name: 'Widikum',             division: 'Momo'          },
  { name: 'Batibo',              division: 'Momo'          },
  { name: 'Njikwa',              division: 'Momo'          },
  // ── Bui ──────────────────────────────────────────────────────────────────────
  { name: 'Kumbo Town',          division: 'Bui'           },
  { name: 'Jakiri',              division: 'Bui'           },
  // ── Menchum ──────────────────────────────────────────────────────────────────
  { name: 'Wum Town',            division: 'Menchum'       },
  { name: 'Furu-Awa',            division: 'Menchum'       },
  // ── Boyo ─────────────────────────────────────────────────────────────────────
  { name: 'Fundong',             division: 'Boyo'          },
  { name: 'Belo',                division: 'Boyo'          },
  // ── Donga-Mantung ────────────────────────────────────────────────────────────
  { name: 'Nkambe Town',         division: 'Donga-Mantung' },
  { name: 'Ako',                 division: 'Donga-Mantung' },
  // ── Ngo-Ketunjia ─────────────────────────────────────────────────────────────
  { name: 'Ndop',                division: 'Ngo-Ketunjia'  },
  { name: 'Babessi',             division: 'Ngo-Ketunjia'  },
]

export const quarterNames = quarters
  .map((q) => q.name)
  .sort((a, b) => a.localeCompare(b))

export const divisions = [...new Set(quarters.map((q) => q.division))].sort()

export const getDivisionByQuarter = (name: string): string =>
  quarters.find((q) => q.name === name)?.division ?? 'Unknown'

// ─── Nominatim geocoder ───────────────────────────────────────────────────────
// Used when a user types a quarter not in the local list above.
// Nominatim is OpenStreetMap's free geocoding API — no key needed.
// Always append ", Cameroon" to bias results to the correct country.
export interface GeoResult {
  name: string
  lat: number
  lon: number
  displayName: string
}

export async function geocodeQuarter(query: string): Promise<GeoResult[]> {
  const encoded = encodeURIComponent(`${query}, Cameroon`)
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=cm`

  const res = await fetch(url, {
    headers: {
      // Nominatim usage policy requires a User-Agent identifying your app
      'User-Agent': 'TrustLink/1.0 (artisan-connect-nw)',
    },
  })
  if (!res.ok) throw new Error('Geocoding request failed')

  const data = await res.json()
  return data.map((item: Record<string, string>) => ({
    name:        query,
    lat:         parseFloat(item.lat),
    lon:         parseFloat(item.lon),
    displayName: item.display_name,
  }))
}