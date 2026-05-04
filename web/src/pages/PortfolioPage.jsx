import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Bot, X, Zap, TrendingUp, TrendingDown } from 'lucide-react'
import { apiGet, apiDelete } from '../lib/api'
import { useProMode } from '../context/ProModeContext'

const AI_ANALYSES = {
  'pos-btc-1':
    'DeepSeek advises holding. Resistance at $68k has weakened significantly — price action suggests a bullish continuation toward $72k. RSI at 58, MACD bullish crossover confirmed on 4H. Funding rates remain neutral. Risk/reward still highly favorable.',
  'pos-eth-1':
    'DeepSeek flags caution. ETH is consolidating below the $3,600 resistance zone. On-chain data shows declining DeFi TVL and exchange inflows rising. Consider tightening your stop to $3,480. A close below $3,400 fully invalidates the long thesis.',
  'pos-sol-1':
    'DeepSeek confirms short momentum. SOL failed to reclaim $150 after three attempts — bearish divergence confirmed on RSI. Network activity metrics are flat week-over-week. Target $138 support as first take-profit zone. Trail stop to $147 to protect gains.',
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ type, onClose }) {
  const isWin = type === 'success'

  useEffect(() => {
    const t = setTimeout(onClose, 4500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-2xl ${
        isWin
          ? 'border-emerald-500/30 bg-emerald-950/90 shadow-emerald-500/20'
          : 'border-amber-500/30 bg-amber-950/90 shadow-amber-500/20'
      }`}
    >
      <span className="text-2xl">{isWin ? '🎉' : '🛡️'}</span>
      <div>
        <p className={`text-sm font-extrabold tracking-tight ${isWin ? 'text-emerald-300' : 'text-amber-300'}`}>
          {isWin ? 'Target Reached.' : 'Risk Managed.'}
        </p>
        <p className={`text-xs ${isWin ? 'text-emerald-600' : 'text-amber-600'}`}>
          {isWin ? 'Great execution.' : 'A loss is just data. Stay disciplined.'}
        </p>
      </div>
      <button
        onClick={onClose}
        className="ml-1 rounded-lg p-1 text-neutral-500 transition-colors hover:text-neutral-300"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

// ─── AI Modal ────────────────────────────────────────────────────────────────

function AIModal({ pos, analysis, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.82, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-violet-500/20 bg-neutral-950/98 p-6 shadow-2xl shadow-violet-500/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

        <div className="relative">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/20 to-cyan-500/10">
                <Bot className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-neutral-100">DeepSeek AI Analysis</p>
                <p className="text-[10px] uppercase tracking-widest text-neutral-600">
                  {pos.symbol.replace('USDT', '')}/USDT · {pos.side}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/5 bg-neutral-900 p-2 text-neutral-500 transition-colors hover:text-neutral-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-violet-500/10 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-5">
            <p className="text-sm leading-relaxed text-neutral-300">{analysis}</p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[10px] text-neutral-600">
            <Zap className="h-3 w-3 text-cyan-500" />
            <span>DeepSeek-V3 · {new Date().toLocaleTimeString()}</span>
            <span className="ml-auto rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-violet-500">
              AI-Generated
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Position Card ────────────────────────────────────────────────────────────

function PositionCard({ pos, idx, onClose, onAIConsult, isPro }) {
  const isLong   = pos.side === 'LONG'
  const isPnlPos = pos.pnl >= 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -80, scale: 0.9, transition: { duration: 0.3, ease: 'easeIn' } }}
      transition={{ duration: 0.42, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 380, damping: 28 } }}
      className={`group relative overflow-hidden p-6 backdrop-blur-xl ${
        isPro
          ? 'rounded-xl border border-red-900/30 bg-black/95 shadow-[0_0_30px_rgba(0,0,0,0.7)]'
          : 'rounded-3xl border border-white/5 bg-neutral-900/40'
      }`}
    >
      {/* Chrome top line */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${
        isPro ? 'via-red-800/30' : 'via-white/12'
      }`} />

      {/* PnL accent bar */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 rounded-r-full transition-opacity ${
        isPro
          ? (isPnlPos
              ? 'w-[3px] bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
              : 'w-[3px] bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.7)]')
          : (isPnlPos
              ? 'w-[3px] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
              : 'w-[3px] bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]')
      }`} />

      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className={`text-2xl font-black tracking-tight ${isPro ? 'font-mono text-white' : 'text-neutral-50'}`}>
              {pos.symbol.replace('USDT', '')}
              <span className={isPro ? 'text-zinc-600' : 'text-neutral-600'}>/USDT</span>
            </h3>
            <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
              isPro
                ? (isLong
                    ? 'border-emerald-800/50 bg-emerald-950/50 text-emerald-500'
                    : 'border-red-800/50 bg-red-950/50 text-red-400')
                : (isLong
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400')
            }`}>
              {pos.side}
            </span>
          </div>
          <p className={`mt-1 flex items-center gap-1.5 text-[10px] ${isPro ? 'text-red-900/60 font-mono' : 'text-neutral-600'}`}>
            {isPnlPos ? (
              <TrendingUp className={`h-3 w-3 ${isPro ? 'text-emerald-700' : 'text-emerald-600'}`} />
            ) : (
              <TrendingDown className={`h-3 w-3 ${isPro ? 'text-red-700' : 'text-rose-600'}`} />
            )}
            Entry ${pos.entryPrice.toLocaleString()} · Mark ${pos.currentPrice.toLocaleString()}
          </p>
        </div>

        {/* PnL Badge */}
        <div className={`rounded-2xl border px-4 py-2.5 text-right ${
          isPro
            ? (isPnlPos
                ? 'border-emerald-800/40 bg-black/60'
                : 'border-red-800/40 bg-black/60')
            : (isPnlPos
                ? 'border-emerald-500/20 bg-emerald-500/8'
                : 'border-rose-500/20 bg-rose-500/8')
        }`}>
          <p className={`text-2xl font-black tabular-nums leading-none ${
            isPro
              ? (isPnlPos ? 'font-mono text-emerald-400' : 'font-mono text-red-400')
              : (isPnlPos ? 'text-emerald-400'           : 'text-rose-400')
          }`}
            style={isPro ? {
              textShadow: isPnlPos
                ? '0 0 20px rgba(52,211,153,0.4)'
                : '0 0 20px rgba(220,38,38,0.4)',
            } : {}}
          >
            {isPnlPos ? '+' : ''}{pos.pnl.toFixed(2)}
          </p>
          <p className={`mt-0.5 text-[11px] font-bold ${
            isPro
              ? (isPnlPos ? 'text-emerald-700' : 'text-red-700')
              : (isPnlPos ? 'text-emerald-600' : 'text-rose-600')
          }`}>
            {isPnlPos ? '+' : ''}{pos.pnlPercentage.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: 'Quantity',  value: pos.quantity.toFixed(4) },
          { label: 'Avg Entry', value: `$${pos.entryPrice.toLocaleString()}` },
          { label: 'Notional',  value: `$${(pos.quantity * pos.entryPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        ].map(({ label, value }) => (
          <div key={label} className={`p-3 ${
            isPro
              ? 'rounded-lg bg-zinc-950/80 border border-zinc-900/60'
              : 'rounded-2xl bg-neutral-950/60'
          }`}>
            <p className={`mb-1 text-[9px] uppercase tracking-widest ${isPro ? 'text-red-900/55' : 'text-neutral-600'}`}>
              {label}
            </p>
            <p className={`text-sm font-bold tabular-nums ${isPro ? 'font-mono text-zinc-200' : 'text-neutral-200'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onAIConsult(pos)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
            isPro
              ? 'border-red-800/30 bg-red-950/15 text-red-400 hover:border-red-600/50 hover:bg-red-900/25 hover:text-red-300'
              : 'border-violet-500/25 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 text-violet-300 hover:border-violet-400/40 hover:from-violet-500/18 hover:to-cyan-500/18 hover:text-violet-200'
          }`}
        >
          <Bot className="h-4 w-4" />
          AI Consult
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => onClose(pos.id, pos.pnl, pos.currentPrice)}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
            isPro
              ? 'border-zinc-800/60 bg-black/40 text-zinc-500 hover:border-red-700/50 hover:bg-red-950/25 hover:text-red-400'
              : 'border-neutral-700/50 bg-neutral-900/50 text-neutral-400 hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-400'
          }`}
        >
          <span className="text-base leading-none">🛑</span>
          Close Position
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { isProMode } = useProMode()

  const [openPositions, setOpenPositions] = useState([])
  const [toast,         setToast]         = useState(null)
  const [aiModal,       setAIModal]       = useState(null)
  const [summaryData,   setSummaryData]   = useState(null)

  useEffect(() => {
    const fetchSummary = () => {
      apiGet('/api/portfolio/summary')
        .then(d => {
          setSummaryData(d)
          setOpenPositions(
            (d.positions || []).map(p => ({
              id:            p._id,
              symbol:        p.symbol,
              side:          p.side,
              entryPrice:    p.entry_price,
              currentPrice:  p.current_price,
              quantity:      p.quantity,
              pnl:           p.pnl,
              pnlPercentage: p.pnl_pct,
            }))
          )
        })
        .catch(() => {})
    }

    fetchSummary()
    const interval = setInterval(fetchSummary, 5000)
    return () => clearInterval(interval)
  }, [])

  const totalPnl  = openPositions.reduce((acc, p) => acc + p.pnl, 0)
  const isPnlPos  = totalPnl >= 0
  const winCount  = openPositions.filter(p => p.pnl > 0).length
  const lossCount = openPositions.filter(p => p.pnl < 0).length

  const handleClosePosition = useCallback(async (id, pnl, closePrice) => {
    try {
      await apiDelete(`/api/portfolio/close/${id}?close_price=${closePrice ?? 0}`)
    } catch {
      // 404 means already gone — clean up locally regardless
    }

    setOpenPositions(prev => prev.filter(p => p.id !== id))

    if (pnl > 0) {
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.55 }, startVelocity: 48, gravity: 0.75, scalar: 1.1, colors: ['#34d399', '#10b981', '#6ee7b7', '#fbbf24', '#06b6d4'] })
      setTimeout(() => confetti({ particleCount: 90, angle: 60,  spread: 60, origin: { x: 0, y: 0.6 }, colors: ['#34d399', '#06b6d4'] }), 160)
      setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors: ['#34d399', '#a78bfa'] }), 300)
      setToast({ type: 'success' })
    } else {
      setToast({ type: 'loss' })
    }
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-24">

      {/* ── Scorecard ── */}
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`relative overflow-hidden p-8 backdrop-blur-xl ${
          isProMode
            ? 'rounded-xl border border-red-900/40 bg-black/95 shadow-[0_0_50px_rgba(220,38,38,0.06),0_24px_80px_rgba(0,0,0,0.8)]'
            : 'rounded-3xl border border-white/5 bg-neutral-900/40'
        }`}
      >
        {isProMode ? (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/45 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-900/20 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-red-900/15 to-transparent" />
            <div className={`pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full blur-3xl opacity-8 transition-colors duration-700 ${isPnlPos ? 'bg-emerald-600' : 'bg-red-600'}`} />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-neutral-900/80 via-transparent to-neutral-950/60" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className={`pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full blur-3xl opacity-15 transition-colors duration-700 ${isPnlPos ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          </>
        )}

        <div className="relative">
          <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.35em] ${isProMode ? 'text-red-700/55' : 'text-neutral-600'}`}>
            {isProMode ? 'PORTFOLIO P&L · LIVE' : 'Total Portfolio PnL'}
          </p>

          <motion.div
            key={openPositions.length}
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <motion.div
              animate={isProMode ? { opacity: [0.85, 1, 0.85] } : {}}
              transition={isProMode ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
              className="inline-block"
            >
              <span
                className={`leading-none tracking-tight ${
                  isProMode
                    ? `text-7xl font-black tabular-nums font-mono sm:text-8xl ${
                        isPnlPos ? 'text-emerald-400' : 'text-red-400'
                      }`
                    : `text-7xl font-black tabular-nums tracking-tight sm:text-8xl ${
                        isPnlPos
                          ? 'text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.45)]'
                          : 'text-rose-400 drop-shadow-[0_0_40px_rgba(248,113,113,0.45)]'
                      }`
                }`}
                style={isProMode ? {
                  textShadow: isPnlPos
                    ? '0 0 40px rgba(52,211,153,0.35)'
                    : '0 0 40px rgba(220,38,38,0.35)',
                } : {}}
              >
                {isPnlPos ? '+' : ''}{totalPnl.toFixed(2)}
              </span>
              <span className={`ml-3 text-2xl font-bold ${isProMode ? 'text-zinc-600' : 'text-neutral-600'}`}>USDT</span>
            </motion.div>
          </motion.div>

          {/* Stats pills */}
          <div className="mt-6 flex flex-wrap gap-3">
            {[
              { label: 'Open',     value: openPositions.length, color: isProMode ? 'text-zinc-300' : 'text-neutral-200' },
              { label: 'Winning',  value: winCount,             color: isProMode ? 'text-emerald-400' : 'text-emerald-400' },
              { label: 'Losing',   value: lossCount,            color: isProMode ? 'text-red-400' : 'text-rose-400'    },
              ...(summaryData?.stats?.total_trades !== undefined
                ? [{ label: 'Lifetime Trades', value: summaryData.stats.total_trades, color: isProMode ? 'text-red-500/80' : 'text-cyan-400' }]
                : []),
            ].map(({ label, value, color }) => (
              <div key={label} className={`px-4 py-2 ${
                isProMode
                  ? 'rounded-lg border border-zinc-900 bg-black/60'
                  : 'rounded-2xl border border-white/5 bg-neutral-950/50'
              }`}>
                <p className={`text-[9px] uppercase tracking-widest ${isProMode ? 'text-red-900/55' : 'text-neutral-600'}`}>{label}</p>
                <p className={`text-lg font-black ${isProMode ? 'font-mono' : ''} ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Active Positions ── */}
      <div>
        <div className="mb-5 flex items-center gap-2">
          {isProMode ? (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_2px_rgba(220,38,38,0.5)]"
            />
          ) : (
            <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_8px_3px_rgba(167,139,250,0.4)]" />
          )}
          <h2 className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isProMode ? 'text-red-700/60' : 'text-neutral-500'}`}>
            {isProMode ? 'ACTIVE POSITIONS · LIVE' : 'Active Positions'}
          </h2>
          <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            isProMode
              ? 'border-zinc-900 bg-black/60 text-zinc-400'
              : 'border-white/5 bg-neutral-800 text-neutral-300'
          }`}>
            {openPositions.length}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {openPositions.length > 0 ? (
            <motion.div layout className="space-y-4">
              {openPositions.map((pos, idx) => (
                <PositionCard
                  key={pos.id}
                  pos={pos}
                  idx={idx}
                  onClose={handleClosePosition}
                  onAIConsult={p => setAIModal({ pos: p, analysis: AI_ANALYSES[p.id] })}
                  isPro={isProMode}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className={`px-6 py-20 text-center ${
                isProMode
                  ? 'rounded-xl border border-red-900/20 bg-black/50'
                  : 'rounded-3xl border border-white/5 bg-neutral-900/20'
              }`}
            >
              <p className="mb-3 text-3xl">📭</p>
              <p className={`text-sm font-bold ${isProMode ? 'text-zinc-600' : 'text-neutral-500'}`}>No open positions.</p>
              <p className={`mt-1 text-xs ${isProMode ? 'text-red-900/40' : 'text-neutral-700'}`}>Execute a trade from the Terminal to begin.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── AI Modal ── */}
      <AnimatePresence>
        {aiModal && (
          <AIModal
            pos={aiModal.pos}
            analysis={aiModal.analysis}
            onClose={() => setAIModal(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast type={toast.type} onClose={dismissToast} />}
      </AnimatePresence>
    </div>
  )
}
