import { useState, useEffect } from 'react'
import {
  Wrench, Users, ShieldCheck, Star,
  Droplets, Zap, Scissors, Car, ShoppingBasket, Home,
  Shield, MapPin, Menu, X
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface StatItem {
  icon: React.ReactNode
  value: string
  label: string
}

interface ServiceItem {
  icon: React.ReactNode
  title: string
  description: string
}

interface ValueProp {
  icon: React.ReactNode
  title: string
  description: string
}

// ─── Data (swap values with API calls later) ──────────────────────────────────
const stats: StatItem[] = [
  { icon: <Wrench size={28} className="text-amber-500" />, value: '150+', label: 'Plumbers' },
  { icon: <Users size={28} className="text-amber-500" />, value: '120+', label: 'Electricians' },
  { icon: <ShieldCheck size={28} className="text-amber-500" />, value: '100%', label: 'Verified' },
  { icon: <Star size={28} className="text-amber-500" />, value: '4.8', label: 'Avg Rating' },
]

const services: ServiceItem[] = [
  { icon: <Droplets size={32} className="text-blue-400" />, title: 'Plumbing', description: 'Expert plumbing repairs and installations' },
  { icon: <Zap size={32} className="text-amber-400" />, title: 'Electrical', description: 'Licensed electrical services and repairs' },
  { icon: <Scissors size={32} className="text-purple-400" />, title: 'Tailoring', description: 'Custom clothing and alterations' },
  { icon: <Car size={32} className="text-slate-500" />, title: 'Mechanic', description: 'Professional automotive repair services' },
  { icon: <ShoppingBasket size={32} className="text-orange-400" />, title: 'Laundry', description: 'Commercial and residential laundry services' },
  { icon: <Home size={32} className="text-teal-400" />, title: 'Home Care', description: 'Cleaning and general home maintenance' },
]

const valueProps: ValueProp[] = [
  {
    icon: <Shield size={28} className="text-amber-500" />,
    title: 'Verified Artisans',
    description: 'All service providers are verified and background-checked for your safety.',
  },
  {
    icon: <Star size={28} className="text-amber-500" />,
    title: 'Quality Guaranteed',
    description: 'Read reviews and ratings from real customers before booking.',
  },
  {
    icon: <MapPin size={28} className="text-amber-500" />,
    title: 'Local Experts',
    description: 'Find skilled professionals in your division for quick, reliable service.',
  },
]

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md' : 'bg-white/90 backdrop-blur-sm'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Wrench size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">
            Trust<span className="text-amber-500">Link</span>
          </span>
        </a>

        {/* Desktop nav — only Sign In + Get Started */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/login"
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Sign In
          </a>
          <a
            href="/register"
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-md shadow-amber-200"
          >
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 flex flex-col gap-3">
          <a href="/login" className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg text-center">
            Sign In
          </a>
          <a href="/register" className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg text-center">
            Get Started
          </a>
        </div>
      )}
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-28 pb-20 px-4 sm:px-6 bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">

        {/* Left — headline + CTAs */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 leading-tight mb-4">
            Connect with{' '}
            <span className="text-amber-500">Trusted Local</span>
            {' '}Service Providers
          </h1>
          <p className="text-slate-500 text-base sm:text-lg mb-8 max-w-md mx-auto md:mx-0">
            TrustLink brings together skilled artisans and customers across the
            North West Region. Find verified professionals for every need.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <a
              href="/register"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-amber-200 transition-all hover:scale-105"
            >
              Book a Service
            </a>
            <a
              href="/register?role=artisan"
              className="px-6 py-3 border-2 border-slate-800 hover:bg-slate-800 hover:text-white text-slate-800 font-bold rounded-xl text-sm transition-all"
            >
              Become an Artisan
            </a>
          </div>
        </div>

        {/* Right — stats grid */}
        <div className="flex-1 w-full max-w-sm mx-auto md:mx-0">
          <div className="bg-white rounded-2xl shadow-xl p-6 grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-50 rounded-xl p-4 flex flex-col items-center text-center hover:bg-amber-50 transition-colors"
              >
                {stat.icon}
                <span className="text-2xl font-extrabold text-slate-800 mt-2">{stat.value}</span>
                <span className="text-xs text-slate-500 mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

// ─── Services ─────────────────────────────────────────────────────────────────
function ServicesSection() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-800 text-center mb-12">Our Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <div
              key={service.title}
              className="border border-slate-100 rounded-xl p-6 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="mb-4">{service.icon}</div>
              <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-amber-600 transition-colors">
                {service.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <a
            href="/search"
            className="inline-block px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Browse All Services
          </a>
        </div>
      </div>
    </section>
  )
}

// ─── Why TrustLink ────────────────────────────────────────────────────────────
function WhyChooseUs() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-800 text-center mb-12">
          Why Choose TrustLink?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {valueProps.map((prop) => (
            <div key={prop.title} className="flex flex-col items-center text-center px-4">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                {prop.icon}
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{prop.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{prop.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-slate-800 text-white py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
            <Wrench size={15} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            Trust<span className="text-amber-400">Link</span>
          </span>
        </div>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Connecting communities with trusted service providers across North West Region, Cameroon
        </p>
        <div className="flex gap-6 text-sm text-slate-400 mt-2">
          <a href="/about" className="hover:text-white transition-colors">About</a>
          <a href="/search" className="hover:text-white transition-colors">Find Services</a>
          <a href="/register?role=artisan" className="hover:text-white transition-colors">Join as Artisan</a>
        </div>
        <p className="text-slate-500 text-xs mt-4">
          © {year} TrustLink. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans">
      <Navbar />
      <Hero />
      <ServicesSection />
      <WhyChooseUs />
      <Footer />
    </div>
  )
}