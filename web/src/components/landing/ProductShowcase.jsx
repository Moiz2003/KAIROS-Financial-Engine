import { useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

// ─── Fake SVG Price Chart ─────────────────────────────────────────────────────
function PriceChart() {
  // Upward-trending points (y is inverted in SVG — smaller y = higher on screen)
  const pts = [
    [0, 85], [40, 78], [80, 80], [120, 62], [160, 66],
    [200, 50], [240, 53], [280, 38], [320, 42], [360, 28],
    [400, 30], [440, 18], [480, 22], [520, 12], [560, 8], [600, 6],
  ]
  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaD = `${pathD} L 600 100 L 0 100 Z`

  return (
    <svg viewBox="0 0 600 100" className="w-full h-28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
        <filter id="lineGlow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={areaD} fill="url(#chartAreaGrad)" />
      <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="2.5" filter="url(#lineGlow)" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx="600" cy="6" r="4" fill="#06b6d4" style={{ filter: 'drop-shadow(0 0 4px #06b6d4)' }} />
    </svg>
  )
}

// ─── Scrolling Signal Ticker ──────────────────────────────────────────────────
const SIGNALS = [
  '🟢 BTC/USDT  LONG · Entry $67,120 · TP $69,500',
  '🔵 ETH/USDT  LONG · Confidence 91% · Vol +34%',
  '🟢 SOL/USDT  LONG · RSI Divergence · 15m Breakout',
  '⚡ SNIPER ALERT: BNB/USDT · Bollinger Squeeze Release',
  '🟢 ADA/USDT  LONG · DeepSeek Score 8.7/10',
  '🔵 AVAX/USDT  Accumulation Zone Confirmed',
]

function ScrollingTicker() {
  const doubled = [...SIGNALS, ...SIGNALS]

  return (
    <div className="overflow-hidden border-t border-zinc-800 pt-3 mt-3">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="flex whitespace-nowrap"
        style={{ width: 'max-content' }}
      >
        {doubled.map((s, i) => (
          <span key={i} className="mx-6 text-xs text-zinc-500 shrink-0">
            {s}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Product Showcase Section ─────────────────────────────────────────────────
export default function ProductShowcase() {
  const cardRef = useRef(null)

  const rotX = useMotionValue(0)
  const rotY = useMotionValue(0)
  const springX = useSpring(rotX, { stiffness: 130, damping: 18 })
  const springY = useSpring(rotY, { stiffness: 130, damping: 18 })

  const handleMouseMove = (e) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    rotY.set(((e.clientX - cx) / rect.width) * 22)
    rotX.set(-((e.clientY - cy) / rect.height) * 22)
  }

  const handleMouseLeave = () => {
    rotX.set(0)
    rotY.set(0)
  }

  return (
    <section id="product" className="py-32 md:py-40 px-6 bg-black">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white">Your Command Center</h2>
          <p className="text-zinc-500 mt-4 text-lg">Every signal. Every trade. One glass panel.</p>
        </motion.div>

        {/* 3D Card wrapper */}
        <div className="relative flex justify-center" style={{ perspective: '1200px' }}>
          {/* Ambient glow */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className="w-96 h-96 rounded-full -z-10 absolute"
              style={{ background: 'rgba(6,182,212,0.15)', filter: 'blur(80px)' }}
            />
          </div>

          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX: springX, rotateY: springY, transformStyle: 'preserve-3d' }}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="w-full max-w-4xl rounded-2xl overflow-hidden cursor-default"
          >
            <div
              className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)' }}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/60">
                <div className="flex items-center gap-3">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"
                    style={{ boxShadow: '0 0 6px rgba(6,182,212,0.8)' }}
                  />
                  <span className="text-white font-bold tracking-widest text-xs">PROVING GROUNDS</span>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5 ml-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-xs font-medium">BETA LIVE</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Chart header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 text-sm font-medium">BTC / USDT</span>
                    <span className="text-white font-bold text-lg">$67,420.00</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-emerald-400 text-sm font-bold"
                      style={{ textShadow: '0 0 12px rgba(16,185,129,0.5)' }}
                    >
                      +2.4% ↑
                    </span>
                    <span className="text-zinc-600 text-xs">24h</span>
                  </div>
                </div>

                {/* Chart */}
                <PriceChart />

                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: 'BTC / USDT',
                      value: '$67,420',
                      sub: '+2.4% ↑',
                      subColor: 'text-emerald-400',
                      glow: 'rgba(16,185,129,0.08)',
                    },
                    {
                      label: 'Signal',
                      value: 'LONG',
                      sub: 'Confidence 94%',
                      subColor: 'text-cyan-400',
                      glow: 'rgba(6,182,212,0.08)',
                    },
                    {
                      label: 'PnL Today',
                      value: '+$1,247',
                      sub: 'Sniper Mode ON',
                      subColor: 'text-emerald-400',
                      glow: 'rgba(16,185,129,0.08)',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl p-3.5 border border-zinc-700/50"
                      style={{ background: `linear-gradient(135deg, rgb(39 39 42 / 0.8), rgb(24 24 27 / 0.9))`, boxShadow: `inset 0 0 20px ${stat.glow}` }}
                    >
                      <p className="text-zinc-500 text-xs mb-1">{stat.label}</p>
                      <p className="text-white font-bold text-base leading-tight">{stat.value}</p>
                      <p className={`text-xs font-medium mt-1 ${stat.subColor}`}>{stat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Ticker */}
                <ScrollingTicker />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
