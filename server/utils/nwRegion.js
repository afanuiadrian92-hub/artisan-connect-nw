// Mirror of the frontend nwRegionData.ts — used by the backend
// to derive division from quarter during registration
const quarters = [
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
  { name: 'Mbengwi Town',        division: 'Momo'  },
  { name: 'Widikum',             division: 'Momo'  },
  { name: 'Batibo',              division: 'Momo'  },
  { name: 'Njikwa',              division: 'Momo'  },
  { name: 'Kumbo Town',          division: 'Bui'   },
  { name: 'Jakiri',              division: 'Bui'   },
  { name: 'Wum Town',            division: 'Menchum' },
  { name: 'Furu-Awa',            division: 'Menchum' },
  { name: 'Fundong',             division: 'Boyo'  },
  { name: 'Belo',                division: 'Boyo'  },
  { name: 'Nkambe Town',         division: 'Donga-Mantung' },
  { name: 'Ako',                 division: 'Donga-Mantung' },
  { name: 'Ndop',                division: 'Ngo-Ketunjia'  },
  { name: 'Babessi',             division: 'Ngo-Ketunjia'  },
]

const getDivisionByQuarter = (quarterName) => {
  return quarters.find(q => q.name === quarterName)?.division ?? null
}

module.exports = { quarters, getDivisionByQuarter }