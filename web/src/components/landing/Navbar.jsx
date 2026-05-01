import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 transition-colors duration-300 ${
        scrolled ? 'bg-black/90 backdrop-blur-xl' : 'bg-black/60 backdrop-blur-xl'
      }`}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2 cursor-pointer"
        >
          <span
            className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"
            style={{ boxShadow: '0 0 8px rgba(6,182,212,0.9)' }}
          />
          <span className="text-white font-bold tracking-widest text-sm">PROVING GROUNDS</span>
        </button>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Features', id: 'features' },
            { label: 'Product', id: 'product' },
            { label: 'Docs', id: 'cta' },
          ].map(({ label, id }) => (
            <button
              key={label}
              onClick={() => scrollTo(id)}
              className="text-zinc-400 hover:text-white text-sm transition-colors duration-200 cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-zinc-400 hover:text-white text-sm transition-colors duration-200"
          >
            Sign In
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/signup')}
            className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-semibold px-4 py-2 text-sm rounded-lg transition-all duration-200"
            style={{ boxShadow: '0 4px 20px rgba(6,182,212,0.25)' }}
          >
            Get Access →
          </motion.button>
        </div>
      </div>
    </motion.nav>
  )
}
