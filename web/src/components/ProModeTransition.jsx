import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useProMode } from '../context/ProModeContext'

// ── Shared timing constants ───────────────────────────────────────────────────

const DOOR_EASE = [0.76, 0, 0.24, 1]
const TOTAL_MS  = 1520

// ── PRO MODE splash (black + crimson metal doors) ─────────────────────────────

const PRO_LEFT = {
  initial: { x: '-105%', skewX: '-4deg' },
  enter:   { x: '0%',   skewX: '0deg',  transition: { duration: 0.42, ease: DOOR_EASE } },
  exit:    { x: '-105%', skewX: '-4deg', transition: { duration: 0.38, ease: DOOR_EASE, delay: 0.72 } },
}
const PRO_RIGHT = {
  initial: { x: '105%', skewX: '4deg' },
  enter:   { x: '0%',  skewX: '0deg',   transition: { duration: 0.42, ease: DOOR_EASE, delay: 0.06 } },
  exit:    { x: '105%', skewX: '4deg',  transition: { duration: 0.38, ease: DOOR_EASE, delay: 0.78 } },
}
const PRO_TEXT = {
  initial: { opacity: 0, scale: 0.84, letterSpacing: '0.6em' },
  enter:   { opacity: 1, scale: 1, letterSpacing: '0.24em', transition: { duration: 0.36, ease: 'easeOut', delay: 0.52 } },
  exit:    { opacity: 0, scale: 1.08, transition: { duration: 0.22, ease: 'easeIn', delay: 0.62 } },
}
const SLASH_V = {
  initial: { scaleX: 0, originX: 0 },
  enter:   { scaleX: 1, transition: { duration: 0.28, ease: 'easeOut', delay: 0.60 } },
  exit:    { scaleX: 0, originX: 1, transition: { duration: 0.20, ease: 'easeIn', delay: 0.68 } },
}

function ProSplash() {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {/* Left metal door */}
      <motion.div variants={PRO_LEFT} className="absolute inset-y-0 left-0 w-[52%]" style={{ transformOrigin: 'left center' }}>
        <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-zinc-950 to-red-950/80 border-r border-red-600/60" />
        <div className="absolute right-0 inset-y-0 w-px bg-red-500 shadow-[0_0_24px_4px_rgba(239,68,68,0.8)]" />
      </motion.div>

      {/* Right metal door */}
      <motion.div variants={PRO_RIGHT} className="absolute inset-y-0 right-0 w-[52%]" style={{ transformOrigin: 'right center' }}>
        <div className="w-full h-full bg-gradient-to-l from-neutral-950 via-zinc-950 to-red-950/80 border-l border-red-600/60" />
        <div className="absolute left-0 inset-y-0 w-px bg-red-500 shadow-[0_0_24px_4px_rgba(239,68,68,0.8)]" />
      </motion.div>

      {/* Center seam glow */}
      <motion.div
        variants={SLASH_V}
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-red-500"
        style={{ boxShadow: '0 0 32px 6px rgba(239,68,68,0.7)' }}
      />

      {/* Text */}
      <motion.div variants={PRO_TEXT} className="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-red-400/80"
            style={{ textShadow: '0 0 20px rgba(239,68,68,0.6)' }}>KAIROS</span>
          <span className="text-4xl font-black uppercase text-white"
            style={{ letterSpacing: '0.24em', textShadow: '0 0 40px rgba(239,68,68,0.9), 0 0 80px rgba(239,68,68,0.4)' }}>PRO</span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: 1, ease: 'easeInOut' }}
            className="text-[11px] font-bold uppercase tracking-[0.45em] text-red-400"
            style={{ textShadow: '0 0 14px rgba(239,68,68,0.8)' }}>INITIALIZED</motion.span>
        </div>
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />
        <motion.div
          className="absolute inset-x-0 h-px bg-red-500/30"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 0.7, ease: 'linear', delay: 0.55 }}
        />
      </motion.div>

      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
    </motion.div>
  )
}

// ── STANDARD MODE splash (emerald/white frosted panels sliding down from top) ──

const STD_TOP = {
  initial: { y: '-105%', skewY: '-2deg' },
  enter:   { y: '0%',   skewY: '0deg',  transition: { duration: 0.44, ease: DOOR_EASE } },
  exit:    { y: '-105%', skewY: '-2deg', transition: { duration: 0.38, ease: DOOR_EASE, delay: 0.74 } },
}
const STD_BOTTOM = {
  initial: { y: '105%', skewY: '2deg' },
  enter:   { y: '0%',  skewY: '0deg',   transition: { duration: 0.44, ease: DOOR_EASE, delay: 0.06 } },
  exit:    { y: '105%', skewY: '2deg',  transition: { duration: 0.38, ease: DOOR_EASE, delay: 0.80 } },
}
const STD_TEXT = {
  initial: { opacity: 0, y: 16, scale: 0.92 },
  enter:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.34, ease: 'easeOut', delay: 0.54 } },
  exit:    { opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.22, ease: 'easeIn', delay: 0.60 } },
}
const STD_LINE = {
  initial: { scaleX: 0, originX: 0.5 },
  enter:   { scaleX: 1, transition: { duration: 0.30, ease: 'easeOut', delay: 0.62 } },
  exit:    { scaleX: 0, transition: { duration: 0.20, ease: 'easeIn', delay: 0.66 } },
}

function StandardSplash() {
  return (
    <motion.div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {/* Top panel — frosted white-green */}
      <motion.div variants={STD_TOP} className="absolute inset-x-0 top-0 h-[52%]" style={{ transformOrigin: 'top center' }}>
        <div className="w-full h-full bg-gradient-to-b from-neutral-950 via-emerald-950/60 to-emerald-900/30 border-b border-emerald-500/50" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-emerald-400 shadow-[0_0_24px_4px_rgba(52,211,153,0.7)]" />
      </motion.div>

      {/* Bottom panel */}
      <motion.div variants={STD_BOTTOM} className="absolute inset-x-0 bottom-0 h-[52%]" style={{ transformOrigin: 'bottom center' }}>
        <div className="w-full h-full bg-gradient-to-t from-neutral-950 via-emerald-950/60 to-emerald-900/30 border-t border-emerald-500/50" />
        <div className="absolute top-0 inset-x-0 h-px bg-emerald-400 shadow-[0_0_24px_4px_rgba(52,211,153,0.7)]" />
      </motion.div>

      {/* Horizontal seam glow */}
      <motion.div
        variants={STD_LINE}
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-emerald-400"
        style={{ boxShadow: '0 0 32px 6px rgba(52,211,153,0.6)' }}
      />

      {/* Text */}
      <motion.div variants={STD_TEXT} className="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-40 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" />

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-emerald-400/70"
            style={{ textShadow: '0 0 16px rgba(52,211,153,0.5)' }}>KAIROS</span>

          <span className="text-4xl font-black uppercase text-white"
            style={{ letterSpacing: '0.2em', textShadow: '0 0 30px rgba(52,211,153,0.7), 0 0 60px rgba(52,211,153,0.3)' }}>
            STANDARD
          </span>

          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.9, repeat: 1, ease: 'easeInOut' }}
            className="text-[11px] font-bold uppercase tracking-[0.4em] text-emerald-400"
            style={{ textShadow: '0 0 12px rgba(52,211,153,0.7)' }}>
            MODE ACTIVE
          </motion.span>
        </div>

        {/* Friendly subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.72, duration: 0.28 }}
          className="text-[10px] text-emerald-300/50 tracking-widest uppercase"
        >
          AI Guardrails On · Simplified View
        </motion.p>

        <div className="w-40 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" />

        {/* Scan line — top to bottom, green */}
        <motion.div
          className="absolute inset-x-0 h-px bg-emerald-400/25"
          animate={{ top: ['0%', '100%'] }}
          transition={{ duration: 0.65, ease: 'linear', delay: 0.57 }}
        />
      </motion.div>

      {/* Soft vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)' }} />
    </motion.div>
  )
}

// ── Root transition dispatcher ────────────────────────────────────────────────

export default function ProModeTransition() {
  const { activeTransition, onProTransitionComplete, onStandardTransitionComplete } = useProMode()

  useEffect(() => {
    if (!activeTransition) return
    const cb = activeTransition === 'pro' ? onProTransitionComplete : onStandardTransitionComplete
    const timer = setTimeout(cb, TOTAL_MS)
    return () => clearTimeout(timer)
  }, [activeTransition, onProTransitionComplete, onStandardTransitionComplete])

  return (
    <AnimatePresence>
      {activeTransition === 'pro'      && <ProSplash      key="pro-splash"      />}
      {activeTransition === 'standard' && <StandardSplash key="standard-splash" />}
    </AnimatePresence>
  )
}
