import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiGet, apiPost } from '../lib/api'
import LiveTicker from '../components/LiveTicker'

// ─── Shared styles ────────────────────────────────────────────────────────────

const card =
  'relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/30 p-6 backdrop-blur-2xl shadow-xl shadow-black/30'

function CardShine() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  )
}

function PanelLabel({ dot, children }) {
  const colors = { emerald: 'bg-emerald-400', cyan: 'bg-cyan-400', violet: 'bg-violet-400', rose: 'bg-rose-400' }
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span className={`h-1.5 w-1.5 rounded-full ${colors[dot] ?? 'bg-neutral-400'}`} />
      <h2 className="text-[10px] font-semibold tracking-widest uppercase text-neutral-500">
        {children}
      </h2>
    </div>
  )
}

function Spinner({ className = '' }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${className}`}
    />
  )
}

// ─── Toast system ─────────────────────────────────────────────────────────────

function useToasts() {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    clearTimeout(timers.current[id])
  }, [])

  const addToast = useCallback((toast) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, ...toast }])
    timers.current[id] = setTimeout(() => dismiss(id), 4500)
    return id
  }, [dismiss])

  return { toasts, addToast, dismiss }
}

const toastStyle = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  error:   'border-rose-500/30   bg-rose-500/10   text-rose-300',
}

function ToastStack({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 48, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 48, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => dismiss(t.id)}
            className={`w-80 cursor-pointer rounded-2xl border px-5 py-3.5 shadow-xl shadow-black/40 backdrop-blur-xl ${toastStyle[t.type] ?? toastStyle.error}`}
          >
            <p className="text-sm font-semibold">{t.title}</p>
            {t.message && <p className="mt-0.5 text-xs opacity-70">{t.message}</p>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Panel B: Portfolio Scorecard ─────────────────────────────────────────────

function PortfolioScorecard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/portfolio/summary')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pnl = data?.stats?.total_pnl ?? 0
  const pnlUp = pnl >= 0
  const trades = data?.stats?.total_trades ?? 0
  const winRate = data?.stats?.win_rate ?? null
  const openPos = data?.open_positions_count ?? 0

  return (
    <div className={`${card} h-full`}>
      <CardShine />
      <PanelLabel dot="violet">Portfolio Scorecard</PanelLabel>

      {loading ? (
        <div className="animate-pulse space-y-5">
          <div>
            <div className="mb-2 h-2 w-20 rounded-full bg-neutral-800" />
            <div className="h-10 w-36 rounded-lg bg-neutral-800" />
          </div>
          <div>
            <div className="mb-2 h-2 w-24 rounded-full bg-neutral-800" />
            <div className="h-10 w-12 rounded-lg bg-neutral-800" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Total PnL */}
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-600">Total PnL</p>
            <p className={`text-4xl font-extrabold tabular-nums tracking-tight ${pnlUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {pnlUp ? '+' : ''}{pnl.toFixed(2)}
              <span className="ml-2 text-lg font-semibold text-neutral-600">USDT</span>
            </p>
          </div>

          {/* Open Positions */}
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-600">Open Positions</p>
            <p className="text-4xl font-extrabold tabular-nums tracking-tight text-neutral-100">
              {openPos}
              <span className="ml-2 text-sm font-normal text-neutral-600">active</span>
            </p>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
            <div className="rounded-2xl border border-white/5 bg-neutral-950/40 p-3">
              <p className="mb-0.5 text-[10px] text-neutral-600">Total Trades</p>
              <p className="text-lg font-bold tabular-nums text-neutral-300">{trades}</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-neutral-950/40 p-3">
              <p className="mb-0.5 text-[10px] text-neutral-600">Win Rate</p>
              <p className="text-lg font-bold tabular-nums text-neutral-300">
                {winRate !== null ? `${Math.round(winRate * 100)}%` : '--'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel C: Market Intelligence ─────────────────────────────────────────────

const sentimentBadgeClass = (s) => {
  if (!s) return 'border-neutral-700 bg-neutral-800/60 text-neutral-400'
  const v = s.toLowerCase()
  if (v === 'bullish') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
  if (v === 'bearish') return 'border-rose-500/30 bg-rose-500/10 text-rose-400'
  return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
}

function MarketIntelligence({ symbol }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    apiGet(`/api/debug/pipeline?symbol=${symbol}&interval=4h&limit=200&news_limit=8`)
      .then(result => { if (!cancelled) setData(result) })
      .catch(() => { /* silently ignore — stale data persists */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [symbol])

  const sentiment = data?.panel_b?.sentiment_score
  const summary = data?.panel_b?.summary
  const articles = data?.panel_a?.articles ?? []

  return (
    <div className={`${card} flex flex-col`}>
      <CardShine />
      <div className="mb-4 flex items-center justify-between">
        <PanelLabel dot="cyan">Market Intelligence</PanelLabel>
        {sentiment && (
          <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${sentimentBadgeClass(sentiment)}`}>
            {sentiment}
          </span>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 rounded-2xl bg-neutral-800" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-neutral-800" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-hidden">
          {/* AI analysis block */}
          {summary && (
            <div className="rounded-2xl border border-cyan-500/10 bg-cyan-500/5 p-3.5">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-cyan-400/70">
                AI Analysis · {symbol}
              </p>
              <p className="text-xs leading-relaxed text-neutral-300">{summary}</p>
            </div>
          )}

          {/* Scrollable news feed */}
          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {articles.length > 0 ? articles.map((article, i) => (
              <motion.a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="block rounded-xl border border-white/5 bg-neutral-950/40 p-3 hover:border-emerald-500/20 hover:bg-neutral-900/60"
              >
                <p className="text-sm leading-snug text-neutral-200 line-clamp-2">{article.title}</p>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-600">
                  <span>{article.source}</span>
                  <span>{new Date(article.timestamp).toLocaleDateString()}</span>
                </div>
              </motion.a>
            )) : (
              <p className="text-sm text-neutral-600">No headlines available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel D: Execution Terminal ──────────────────────────────────────────────

function ExecutionTerminal({ symbol, addToast }) {
  const [amount, setAmount] = useState('')
  const [loadingSide, setLoadingSide] = useState(null)
  const [flash, setFlash] = useState(false)

  const execute = async (action) => {
    const qty = parseFloat(amount)
    if (!qty || qty <= 0) return

    setLoadingSide(action)
    try {
      const result = await apiPost('/api/trades/execute', {
        symbol,
        action,
        interval: '4h',
        limit: 200,
        news_limit: 10,
        account_balance: 10000.0,
      })

      if (result.approved_for_execution && result.execution_result) {
        setFlash(true)
        setTimeout(() => setFlash(false), 2000)
        addToast({
          type: 'success',
          title: `Order ${result.execution_result.order_id} placed`,
          message: `${action} ${result.execution_result.quantity} ${symbol} @ $${result.execution_result.fill_price}`,
        })
      } else {
        addToast({
          type: 'warning',
          title: 'Trade Blocked',
          message: result.reason ?? 'Pipeline rejected this trade.',
        })
      }
    } catch (err) {
      if (err.status === 429) {
        addToast({
          type: 'warning',
          title: 'Rate Limit Exceeded',
          message: 'Too many requests. Please wait before retrying.',
        })
      } else {
        addToast({
          type: 'error',
          title: 'Execution Failed',
          message: err.message,
        })
      }
    } finally {
      setLoadingSide(null)
    }
  }

  const isDisabled = !!loadingSide || !amount || parseFloat(amount) <= 0

  return (
    <motion.div
      animate={{
        boxShadow: flash
          ? '0 0 0 2px rgba(52, 211, 153, 0.5), 0 20px 60px rgba(52, 211, 153, 0.15)'
          : '0 20px 40px rgba(0,0,0,0.3)',
      }}
      transition={{ duration: 0.3 }}
      className={`${card} h-full transition-colors duration-500 ${flash ? 'border-emerald-400/40' : 'border-white/5'}`}
    >
      <CardShine />
      <PanelLabel dot="rose">Execution Terminal</PanelLabel>

      {/* Pair display */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-600">Pair</p>
          <p className="text-xl font-bold text-neutral-100">
            {symbol.replace('USDT', '')}<span className="text-neutral-600">/USDT</span>
          </p>
        </div>
        <div className="rounded-full border border-white/5 bg-neutral-950/60 px-3 py-1 text-[10px] uppercase tracking-widest text-neutral-600">
          Testnet
        </div>
      </div>

      {/* Amount input */}
      <div className="mb-6">
        <label className="mb-2 block text-[10px] uppercase tracking-widest text-neutral-600">
          Trade Amount <span className="normal-case text-neutral-700">(USDT)</span>
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          step="any"
          disabled={!!loadingSide}
          className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-xl font-semibold tabular-nums text-neutral-100 placeholder-neutral-700 transition focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
        />
      </div>

      {/* BUY / SELL */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => execute('BUY')}
          disabled={isDisabled}
          className="flex h-13 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3.5 text-sm font-bold text-emerald-400 transition hover:border-emerald-500/50 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loadingSide === 'BUY'
            ? <Spinner className="border-emerald-400" />
            : 'BUY'}
        </button>

        <button
          onClick={() => execute('SELL')}
          disabled={isDisabled}
          className="flex h-13 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 py-3.5 text-sm font-bold text-rose-400 transition hover:border-rose-500/50 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loadingSide === 'SELL'
            ? <Spinner className="border-rose-400" />
            : 'SELL'}
        </button>
      </div>

      <p className="mt-3 text-center text-[10px] text-neutral-700">
        Full pipeline: TA → AI → Risk Gate → Execute
      </p>
    </motion.div>
  )
}

// ─── Dashboard Page ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const { toasts, addToast, dismiss } = useToasts()

  return (
    <main className="mx-auto max-w-7xl px-6 pb-16 pt-6 md:px-10">

      {/* symbol selector */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-center gap-3"
      >
        <label className="text-[10px] font-medium uppercase tracking-widest text-neutral-600">
          Symbol
        </label>
        <select
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          className="rounded-lg border border-neutral-800/60 bg-neutral-900/80 px-3 py-1.5 text-sm text-neutral-300 backdrop-blur-sm focus:border-emerald-500/40 focus:outline-none"
        >
          <option value="BTCUSDT">BTC/USDT</option>
          <option value="ETHUSDT">ETH/USDT</option>
          <option value="SOLUSDT">SOL/USDT</option>
          <option value="BNBUSDT">BNB/USDT</option>
          <option value="ADAUSDT">ADA/USDT</option>
        </select>
      </motion.div>

      {/* 2 × 2 bento grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* Panel A — Live Market Ticker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0 }}
        >
          <LiveTicker />
        </motion.div>

        {/* Panel B — Portfolio Scorecard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        >
          <PortfolioScorecard />
        </motion.div>

        {/* Panel C — Market Intelligence */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.16 }}
        >
          <MarketIntelligence symbol={symbol} />
        </motion.div>

        {/* Panel D — Execution Terminal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.24 }}
        >
          <ExecutionTerminal symbol={symbol} addToast={addToast} />
        </motion.div>
      </div>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </main>
  )
}
