import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import ProductShowcase from '../components/landing/ProductShowcase'
import BentoFeatures from '../components/landing/BentoFeatures'
import CTASection from '../components/landing/CTASection'

export default function LandingPage() {
  return (
    <div className="bg-black min-h-screen text-white overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ProductShowcase />
      <BentoFeatures />
      <CTASection />

      <footer className="border-t border-zinc-900 bg-black py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-cyan-400"
              style={{ boxShadow: '0 0 6px rgba(6,182,212,0.8)' }}
            />
            <span className="text-zinc-500 text-sm font-medium tracking-widest">PROVING GROUNDS</span>
          </div>
          <p className="text-zinc-700 text-xs text-center">
            KAIROS Financial Engine · AI-Powered Crypto Trading Intelligence · Binance Testnet
          </p>
          <p className="text-zinc-700 text-xs">© 2025</p>
        </div>
      </footer>
    </div>
  )
}
