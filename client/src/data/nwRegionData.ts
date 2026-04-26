// ─── NW Region Geography Data ─────────────────────────────────────────────────
// Quarters are the hyperlocal location units used by residents.
// Each quarter belongs to a division for admin/analytics grouping.
// Users interact with quarters; the backend groups them by division.

export interface Quarter {
  name: string
  division: string
}

// Popular quarters across NW Region — focused on Bamenda (Mezam) and
// surrounding towns in other divisions. Expand as platform grows.
export const quarters: Quarter[] = [
  // ── Mezam Division (Bamenda) ────────────────────────────────────────────────
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

  // ── Mezam — Surrounding towns ───────────────────────────────────────────────
  { name: 'Bambili',             division: 'Mezam' },
  { name: 'Bambui',              division: 'Mezam' },
  { name: 'Bali',                division: 'Mezam' },

  // ── Momo Division ───────────────────────────────────────────────────────────
  { name: 'Mbengwi Town',        division: 'Momo'  },
  { name: 'Widikum',             division: 'Momo'  },
  { name: 'Batibo',              division: 'Momo'  },
  { name: 'Njikwa',              division: 'Momo'  },

  // ── Bui Division ────────────────────────────────────────────────────────────
  { name: 'Kumbo Town',          division: 'Bui'   },
  { name: 'Jakiri',              division: 'Bui'   },
  { name: 'Nkambe',              division: 'Bui'   },

  // ── Menchum Division ────────────────────────────────────────────────────────
  { name: 'Wum Town',            division: 'Menchum' },
  { name: 'Furu-Awa',            division: 'Menchum' },

  // ── Boyo Division ───────────────────────────────────────────────────────────
  { name: 'Fundong',             division: 'Boyo'  },
  { name: 'Belo',                division: 'Boyo'  },

  // ── Donga-Mantung Division ──────────────────────────────────────────────────
  { name: 'Nkambe Town',         division: 'Donga-Mantung' },
  { name: 'Ako',                 division: 'Donga-Mantung' },

  // ── Ngo-Ketunjia Division ───────────────────────────────────────────────────
  { name: 'Ndop',                division: 'Ngo-Ketunjia' },
  { name: 'Babessi',             division: 'Ngo-Ketunjia' },
]

// Sorted alphabetically for dropdowns
export const quarterNames = quarters
  .map((q) => q.name)
  .sort((a, b) => a.localeCompare(b))

// All unique division names
export const divisions = [...new Set(quarters.map((q) => q.division))].sort()

// Look up which division a quarter belongs to
export const getDivisionByQuarter = (quarterName: string): string => {
  return quarters.find((q) => q.name === quarterName)?.division ?? 'Unknown'
}