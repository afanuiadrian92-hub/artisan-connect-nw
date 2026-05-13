/**
 * TrustLink — Redesigned Landing Page
 *
 * FONTS: Add these to your index.html <head> before your app loads:
 * <link rel="preconnect" href="https://fonts.googleapis.com" />
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 * <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
 *
 * GLOBAL CSS: Add this to your index.css (or App.css):
 * .font-display { font-family: 'Fraunces', Georgia, serif; }
 * .font-body    { font-family: 'DM Sans', sans-serif; }
 */

// ─── Image Assets ─────────────────────────────────────────────────────────────
// Uncomment and adjust paths once you've added your images to src/assets/

// import heroImage    from './assets/hero.png'        // Full-width hero: artisans actively working (plumber, tailor, electrician) — warm, candid, natural light
// import artisanImg   from './assets/artisan.png'     // Portrait: confident skilled artisan in work attire, direct eye contact, blurred workshop background
// import communityImg from './assets/community.png'   // Community scene: busy local market or street, people interacting, vibrant colour

// Temporary placeholder — delete once real images are imported
const heroImage    = 'https://placehold.co/1600x900/1e293b/f59e0b?text=hero.png'
const artisanImg   = 'https://placehold.co/600x700/f59e0b/1e293b?text=artisan.png'
const communityImg = 'https://placehold.co/1400x600/292524/f59e0b?text=community.png'

import { useState, useEffect, useRef } from 'react'
import {
  Wrench, Users, ShieldCheck, Star,
  Droplets, Zap, Scissors, Car, ShoppingBasket, Home,
  Shield, MapPin, Menu, X, ArrowRight, CheckCircle2, ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ServiceItem {
  icon: React.ReactNode
  title: string
  description: string
  accent: string
  bg: string
}

interface Step {
  number: string
  title: string
  description: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const services: ServiceItem[] = [
  { icon: <Droplets size={26} />,      title: 'Plumbing',    description: 'Expert repairs, pipe installations, and leak fixes',      accent: 'text-sky-600',    bg: 'bg-sky-50'    },
  { icon: <Zap size={26} />,           title: 'Electrical',  description: 'Licensed wiring, panels, and electrical installations',   accent: 'text-amber-600',  bg: 'bg-amber-50'  },
  { icon: <Scissors size={26} />,      title: 'Tailoring',   description: 'Bespoke clothing, alterations, and embroidery',           accent: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: <Car size={26} />,           title: 'Mechanic',    description: 'Full automotive diagnostics, servicing, and repairs',     accent: 'text-slate-600',  bg: 'bg-slate-100' },
  { icon: <ShoppingBasket size={26} />,title: 'Laundry',     description: 'Commercial washing, ironing, and dry-cleaning',          accent: 'text-orange-600', bg: 'bg-orange-50' },
  { icon: <Home size={26} />,          title: 'Home Care',   description: 'Deep cleaning, painting, and general maintenance',        accent: 'text-teal-600',   bg: 'bg-teal-50'   },
]

const steps: Step[] = [
  { number: '01', title: 'Post your need',    description: 'Tell us what service you need and where you are in the region.' },
  { number: '02', title: 'Browse artisans',   description: 'Explore verified professionals, read reviews, and compare rates.' },
  { number: '03', title: 'Book & relax',      description: 'Confirm your booking and let a skilled expert handle the rest.' },
]

const stats = [
  { value: '150+', label: 'Plumbers',     icon: <Wrench size={20} className="text-amber-500" /> },
  { value: '120+', label: 'Electricians', icon: <Zap    size={20} className="text-amber-500" /> },
  { value: '100%', label: 'Verified',     icon: <ShieldCheck size={20} className="text-amber-500" /> },
  { value: '4.8★', label: 'Avg Rating',  icon: <Star   size={20} className="text-amber-500" /> },
]

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.06)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
            <Wrench size={17} className="text-white" />
          </div>
          <span
            className={`font-bold text-xl tracking-tight transition-colors ${scrolled ? 'text-slate-800' : 'text-white'}`}
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Trust<span className="text-amber-500">Link</span>
          </span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/login"
            className={`px-5 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              scrolled
                ? 'border-slate-200 text-slate-700 hover:border-slate-400'
                : 'border-white/40 text-white hover:border-white hover:bg-white/10'
            }`}
          >
            Sign In
          </a>
          <a
            href="/register"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all hover:-translate-y-0.5"
          >
            Get Started
          </a>
        </div>

        {/* Mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-slate-700' : 'text-white'}`}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-5 py-4 flex flex-col gap-3">
          <a href="/login"    className="py-2.5 border-2 border-slate-200 text-slate-700 text-sm font-semibold rounded-xl text-center">Sign In</a>
          <a href="/register" className="py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl text-center shadow-md shadow-amber-200">Get Started</a>
        </div>
      )}
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-end overflow-hidden">

      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage: `url(${heroImage})`,
          /* Replace heroImage with your import once ready */
        }}
      />

      {/* Multi-layer overlay: dark base + warm amber gradient from bottom */}
      <div className="absolute inset-0 bg-slate-900/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-amber-900/30 via-transparent to-transparent" />

      {/* Decorative top-right circle */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pb-20 pt-32 w-full">
        <div className="max-w-2xl">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-sm mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <MapPin size={13} className="text-amber-400" />
            <span className="text-amber-300 text-xs font-semibold tracking-wider uppercase">North West Region · Cameroon</span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Find skilled hands{' '}
            <span className="text-amber-400 italic font-light">you can trust.</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-10 max-w-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            TrustLink connects you with verified local artisans — plumbers, electricians, tailors, and more — across the North West Region.
          </p>

          <div className="flex flex-col sm:flex-row gap-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <a
              href="/register"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl text-sm shadow-2xl shadow-amber-500/40 transition-all hover:-translate-y-0.5"
            >
              Book a Service
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="/register?role=artisan"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold rounded-2xl text-sm backdrop-blur-sm transition-all"
            >
              Become an Artisan
            </a>
          </div>
        </div>

        {/* Stats strip — floats at the bottom of the hero */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-white/15 transition-colors"
            >
              <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                {s.icon}
              </div>
              <div>
                <p className="text-white font-extrabold text-lg leading-none">{s.value}</p>
                <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Services ─────────────────────────────────────────────────────────────────
function ServicesSection() {
  const { ref, visible } = useReveal()
  return (
    <section className="py-24 px-5 sm:px-8 bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
          <div>
            <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-2">What we offer</p>
            <h2
              className="text-4xl sm:text-5xl font-black text-slate-800 leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Every trade,<br/>covered.
            </h2>
          </div>
          <a
            href="/search"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-amber-600 text-sm font-semibold transition-colors shrink-0 pb-1"
          >
            Browse all <ChevronRight size={15} />
          </a>
        </div>

        {/* Grid */}
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <div
              key={s.title}
              className="group relative border border-slate-100 rounded-2xl p-7 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-50 transition-all cursor-pointer overflow-hidden"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s, box-shadow 0.3s`,
              }}
            >
              {/* Hover accent line */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom rounded-l-2xl" />

              <div className={`w-12 h-12 ${s.bg} ${s.accent} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                {s.icon}
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1.5 group-hover:text-amber-600 transition-colors">
                {s.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.description}</p>
              <div className="mt-4 flex items-center gap-1 text-amber-500 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                Explore <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const { ref, visible } = useReveal()
  return (
    <section
      className="relative py-24 px-5 sm:px-8 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b0e 100%)', fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Decorative blurs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Simple process</p>
          <h2
            className="text-4xl sm:text-5xl font-black text-white"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Three steps to sorted.
          </h2>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0" />

          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative bg-white/5 border border-white/8 rounded-2xl p-8 hover:bg-white/8 hover:border-amber-500/30 transition-all"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
              }}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mb-6">
                <span className="text-amber-400 font-black text-lg" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {step.number}
                </span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Artisan Spotlight ────────────────────────────────────────────────────────
function ArtisanSpotlight() {
  const { ref, visible } = useReveal()
  const perks = [
    'Keep 100% of what you earn',
    'Verified badge builds client trust',
    'Bookings handled for you',
    'Grow your local reputation',
  ]
  return (
    <section className="py-24 px-5 sm:px-8 bg-amber-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        <div
          ref={ref}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
          }}
        >
          {/* Image block */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden aspect-[4/5] max-w-sm mx-auto lg:mx-0 shadow-2xl shadow-amber-200">
              <img
                src={artisanImg}
                alt="Skilled TrustLink artisan"
                /* Replace artisanImg with your import once ready */
                /* Recommended: portrait of an artisan in work attire, warm natural light */
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute bottom-6 -right-2 lg:right-auto lg:-left-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 max-w-[220px]">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-slate-800 font-bold text-sm">1,000+ artisans</p>
                <p className="text-slate-500 text-xs">actively earning</p>
              </div>
            </div>
          </div>

          {/* Text block */}
          <div>
            <p className="text-amber-600 text-xs font-bold tracking-widest uppercase mb-3">For artisans</p>
            <h2
              className="text-4xl sm:text-5xl font-black text-slate-800 leading-tight mb-5"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Your craft deserves an audience.
            </h2>
            <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-md">
              Whether you're a master tailor or a seasoned electrician, TrustLink
              puts your skills in front of customers who are actively searching for them — right now.
            </p>
            <ul className="space-y-3 mb-10">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3 text-slate-700 text-sm">
                  <CheckCircle2 size={18} className="text-amber-500 flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
            <a
              href="/register?role=artisan"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-sm shadow-lg transition-all hover:-translate-y-0.5"
            >
              Join as an Artisan <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Trust Section ─────────────────────────────────────────────────────────────
function TrustSection() {
  const { ref, visible } = useReveal()
  const pillars = [
    { icon: <Shield size={24} />,   title: 'Background Verified', desc: 'Every artisan is vetted before they can receive a booking.' },
    { icon: <Star size={24} />,     title: 'Real Reviews',         desc: 'Ratings from genuine customers — not manufactured scores.' },
    { icon: <MapPin size={24} />,   title: 'Hyper-Local',          desc: 'Pros filtered to your division for fast, nearby service.' },
  ]
  return (
    <section className="py-24 px-5 sm:px-8 bg-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-amber-500 text-xs font-bold tracking-widest uppercase mb-3">Built on trust</p>
          <h2
            className="text-4xl sm:text-5xl font-black text-slate-800"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Why TrustLink works.
          </h2>
        </div>
        <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className="relative group border border-slate-100 rounded-3xl p-8 text-center hover:border-amber-200 hover:shadow-lg hover:shadow-amber-50 transition-all"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
              }}
            >
              <div className="w-16 h-16 bg-amber-50 group-hover:bg-amber-100 transition-colors rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-500">
                {p.icon}
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-2">{p.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="px-5 sm:px-8 py-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        <div
          className="relative rounded-3xl overflow-hidden min-h-[340px] flex items-center"
          style={{ background: '#1e293b' }}
        >
          {/* Background image */}
          <img
            src={communityImg}
            alt="Community in North West Region"
            /* Replace communityImg with your import once ready */
            /* Recommended: vibrant street/market scene or artisans together, wide shot */
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-amber-900/40" />

          <div className="relative px-10 sm:px-14 py-14 max-w-lg">
            <h2
              className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Ready to get started?
            </h2>
            <p className="text-slate-300 text-base mb-8">
              Join thousands of customers and artisans already making things happen across the region.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl text-sm shadow-xl shadow-amber-500/30 transition-all hover:-translate-y-0.5"
              >
                Book a Service <ArrowRight size={14} />
              </a>
              <a
                href="/register?role=artisan"
                className="inline-flex items-center justify-center px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl text-sm backdrop-blur-sm transition-all"
              >
                Join as Artisan
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-14 px-5 sm:px-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">

          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Wrench size={17} className="text-white" />
              </div>
              <span className="font-black text-xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Trust<span className="text-amber-500">Link</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Connecting communities with skilled, trusted service providers across the North West Region of Cameroon.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <p className="text-white font-semibold mb-3">Platform</p>
              <ul className="space-y-2 text-slate-400">
                <li><a href="/search"                className="hover:text-amber-400 transition-colors">Find Services</a></li>
                <li><a href="/register"              className="hover:text-amber-400 transition-colors">Book Now</a></li>
                <li><a href="/register?role=artisan" className="hover:text-amber-400 transition-colors">Join as Artisan</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-3">Company</p>
              <ul className="space-y-2 text-slate-400">
                <li><a href="/about"   className="hover:text-amber-400 transition-colors">About</a></li>
                <li><a href="/contact" className="hover:text-amber-400 transition-colors">Contact</a></li>
                <li><a href="/blog"    className="hover:text-amber-400 transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-3">Legal</p>
              <ul className="space-y-2 text-slate-400">
                <li><a href="/terms"   className="hover:text-amber-400 transition-colors">Terms</a></li>
                <li><a href="/privacy" className="hover:text-amber-400 transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-slate-500 text-xs">
          <p>© {new Date().getFullYear()} TrustLink. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <MapPin size={11} className="text-amber-500" />
            North West Region, Cameroon
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navbar />
      <Hero />
      <ServicesSection />
      <HowItWorks />
      <ArtisanSpotlight />
      <TrustSection />
      <CTABanner />
      <Footer />
    </div>
  )
}