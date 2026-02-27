import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useScroll } from 'framer-motion'
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { checkHealth } from './api/claimApi'
import LandingPage from './pages/LandingPage'
import EstimatorPage from './pages/EstimatorPage'

function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { scrollY } = useScroll()
  const isLanding = location.pathname === '/'

  // On the landing page: transparent → dark on scroll. On other pages: always dark.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setScrolled(v > 80))
    return unsub
  }, [scrollY])

  const isDark = !isLanding || scrolled

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 print:hidden
        ${isDark
          ? 'bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/50'
          : 'bg-transparent border-b border-transparent'
        }
      `}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-[72px] flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => { window.scrollTo(0, 0); navigate('/') }}
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/30 transition-colors">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
          </div>
          <span className="font-bold text-[1.1rem] tracking-tight text-white flex items-center">
            InsureClaim <span className="text-blue-500 ml-1.5">Vision</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          {location.pathname !== '/estimate' && (
            <button
              onClick={() => { window.scrollTo(0, 0); navigate('/estimate') }}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Analyze Damage
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

function AppContent() {
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  useEffect(() => {
    checkHealth()
      .then((h) => setGeminiConfigured(h.gemini_configured))
      .catch(() => setGeminiConfigured(false))
  }, [])

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans bg-gray-950 selection:bg-blue-600/30 selection:text-white text-white">
      {!isLanding && <Navigation />}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/estimate" element={
          <div className="pt-[72px]">
            <EstimatorPage />
          </div>
        } />
      </Routes>

      {/* Footer */}
      {!isLanding && (
        <footer className="mt-20 py-10 bg-gray-900 border-t border-gray-800 relative z-10 print:hidden">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Motor Claim Estimator
            </p>
            <p className="text-sm text-gray-400">
              AI Insurance Grade System · Hyderabad 2025 Market Rates
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
