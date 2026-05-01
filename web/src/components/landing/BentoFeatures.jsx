import { motion } from 'framer-motion'
import { Crosshair, Brain, Shield, Zap, BarChart2, Globe } from 'lucide-react'

// ─── Inline Sparkline for Card 1 ─────────────────────────────────────────────
function Sparkline() {
  return (
    <svg viewBox="0 0 120 36" className="w-28 h-9 mt-4" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
        <filter id="spGlow" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polyline
        points="0,30 15,25 30,26 45,16 60,19 75,10 90,7 105,4 120,2"
        fill="url(#spAreaGrad)"
        stroke="none"
      />
      <polyline
        points="0,30 15,25 30,26 45,16 60,19 75,10 90,7 105,4 120,2"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
        filter="url(#spGlow)"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Stat Pill row for Card 6 ─────────────────────────────────────────────────
const PILLS = [
  { text: '94% Signal Accuracy', cls: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' },
  { text: '3.2x Sharpe Ratio', cls: 'border-violet-500/30 bg-violet-500/10 text-violet-400' },
  { text: '<200ms Latency', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
]

// ─── Card definitions ─────────────────────────────────────────────────────────
const CARDS = [
  {
    id: 1,
    Icon: Crosshair,
    iconCls: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    hoverBorder: 'hover:border-cyan-500/40',
    hoverShadow: 'hover:shadow-cyan-500/10',
    title: 'Sniper Strategy TA',
    desc: 'Multi-timeframe confluence engine. RSI divergence, Bollinger squeeze, and volume profile — fused into one high-confidence signal. No noise. Only precision.',
    span: 'md:col-span-2',
    extra: 'sparkline',
  },
  {
    id: 2,
    Icon: Brain,
    iconCls: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    hoverBorder: 'hover:border-violet-500/40',
    hoverShadow: 'hover:shadow-violet-500/10',
    title: 'DeepSeek NLP Engine',
    desc: 'Parses 10,000+ crypto news articles and social signals per hour. Sentiment scored in real-time before the market moves.',
    span: 'md:col-span-1',
  },
  {
    id: 3,
    Icon: Shield,
    iconCls: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    hoverBorder: 'hover:border-emerald-500/40',
    hoverShadow: 'hover:shadow-emerald-500/10',
    title: 'Binance Testnet Sandbox',
    desc: 'Execute real strategies with zero financial risk. Full order book simulation. Identical to live trading.',
    span: 'md:col-span-1',
  },
  {
    id: 4,
    Icon: Zap,
    iconCls: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    hoverBorder: 'hover:border-amber-500/40',
    hoverShadow: 'hover:shadow-amber-500/10',
    title: 'Zero-Emotion Execution',
    desc: "Algorithms don't panic. Define your edge once. The system executes it with machine discipline, every time.",
    span: 'md:col-span-1',
  },
  {
    id: 5,
    Icon: BarChart2,
    iconCls: 'text-pink-400',
    iconBg: 'bg-pink-500/10',
    hoverBorder: 'hover:border-pink-500/40',
    hoverShadow: 'hover:shadow-pink-500/10',
    title: 'Live PnL Dashboard',
    desc: 'Track open positions, realized gains, drawdown, and win rate in a real-time glass-panel interface.',
    span: 'md:col-span-1',
  },
  {
    id: 6,
    Icon: Globe,
    iconCls: 'text-cyan-400',
    iconBg: 'bg-gradient-to-br from-cyan-500/10 to-violet-500/10',
    hoverBorder: 'hover:border-cyan-500/40',
    hoverShadow: 'hover:shadow-cyan-500/10',
    title: 'Your Edge, Quantified',
    desc: 'Backtest any strategy against 3 years of OHLCV data. Sharpe ratio, max drawdown, expectancy — all calculated before you risk a single dollar.',
    span: 'md:col-span-3',
    extra: 'pills',
  },
]

// ─── BentoFeatures Section ────────────────────────────────────────────────────
export default function BentoFeatures() {
  return (
    <section id="features" className="py-32 md:py-40 px-6 bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white">The Intelligence Stack</h2>
          <p className="text-zinc-500 mt-4 text-lg">Six weapons. One platform.</p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CARDS.map(({ id, Icon, iconCls, iconBg, hoverBorder, hoverShadow, title, desc, span, extra }, index) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className={`group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all duration-300 cursor-default ${span} ${hoverBorder} hover:shadow-xl ${hoverShadow}`}
            >
              {/* Hover glow overlay */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)' }}
              />

              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${iconBg} mb-5`}>
                <Icon className={`w-6 h-6 ${iconCls}`} />
              </div>

              <h3 className="text-white font-bold text-xl mb-3">{title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>

              {extra === 'sparkline' && <Sparkline />}

              {extra === 'pills' && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {PILLS.map(({ text, cls }) => (
                    <motion.span
                      key={text}
                      whileHover={{ scale: 1.05 }}
                      className={`border rounded-full px-4 py-1.5 text-sm font-medium ${cls} cursor-default`}
                    >
                      {text}
                    </motion.span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
