import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import VideoModal from '../VideoModal'

// ─── Inline Aurora Background ────────────────────────────────────────────────
function AuroraBackground({ children }) {
  return (
    <div className="relative overflow-hidden bg-black">
      {/* Cyan orb */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: '-10%',
          left: '20%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.35) 0%, transparent 70%)',
          filter: 'blur(72px)',
        }}
        animate={{ x: [0, 60, -40, 0], y: [0, -50, 30, 0], scale: [1, 1.12, 0.93, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Violet orb */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 500,
          height: 500,
          top: '15%',
          right: '15%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.30) 0%, transparent 70%)',
          filter: 'blur(72px)',
        }}
        animate={{ x: [0, -70, 50, 0], y: [0, 60, -35, 0], scale: [1, 0.88, 1.18, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      {/* Emerald orb */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 450,
          height: 450,
          bottom: '5%',
          left: '30%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)',
          filter: 'blur(72px)',
        }}
        animate={{ x: [0, 50, -60, 0], y: [0, -40, 50, 0], scale: [1, 1.22, 0.88, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
      {children}
    </div>
  )
}

// ─── Text Generate Effect (staggered word reveal) ────────────────────────────
function TextGenerateEffect({ text, className }) {
  const words = text.split(' ')

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.65 },
    },
  }

  const child = {
    hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.45, ease: 'easeOut' },
    },
  }

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {words.map((word, i) => (
        <motion.span key={i} variants={child} className="inline-block mr-[0.3em]">
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}

// ─── Main Hero Section ────────────────────────────────────────────────────────
export default function HeroSection() {
  const navigate = useNavigate()
  const [videoOpen, setVideoOpen] = useState(false)

  const scrollToProduct = () => {
    document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <AuroraBackground>
      {/* Animated SVG grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.07,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%2306b6d4' stroke-width='0.6'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs px-3 py-1.5 rounded-full"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Powered by DeepSeek AI · Live on Binance Testnet
        </motion.div>

        {/* Headline */}
        <div className="max-w-5xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-white font-black text-5xl sm:text-6xl md:text-7xl tracking-tight leading-[1.1] mb-2"
          >
            Trade With the
          </motion.h1>

          <div className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
            <TextGenerateEffect
              text="Intelligence of a Sniper"
              className="bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent"
            />
          </div>
        </div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto text-center mt-2"
        >
          Real-time NLP sentiment. Sniper-precision TA signals. Zero-emotion execution.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center gap-4 mt-10"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/signup')}
            className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200"
            style={{ boxShadow: '0 8px 32px rgba(6,182,212,0.25)' }}
          >
            Launch Proving Grounds →
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, borderColor: 'rgb(113 113 122)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setVideoOpen(true)}
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white px-8 py-4 rounded-xl text-lg transition-all duration-200"
          >
            Watch Demo
          </motion.button>
        </motion.div>

        {/* Demo Video Modal */}
        <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
        >
          {[
            { value: '3', label: 'AI Models' },
            { value: 'Binance', label: 'Testnet Ready' },
            { value: 'Zero', label: 'Capital Risk' },
          ].map((stat, i) => (
            <div key={i} className="flex items-center gap-10">
              {i > 0 && <div className="hidden sm:block h-8 w-px bg-zinc-800" />}
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-600"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={24} />
        </motion.div>
      </div>
    </AuroraBackground>
  )
}
