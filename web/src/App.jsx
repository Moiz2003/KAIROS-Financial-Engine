import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { apiGet } from './lib/api'
import LiveTicker from './components/LiveTicker'

// ── Home Page (public landing) ──
function HomePage() {
  const { user } = useAuth()
  const isLoggedIn = !!user

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100 overflow-hidden">

      {/* ── Background glow orbs ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />
        <div className="absolute left-0 top-1/3 h-[400px] w-[400px] rounded-full bg-emerald-400/5 blur-[90px]" />
      </div>

      {/* ── Navigation bar ── */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-emerald-400">KAIROS</span>
          <span className="ml-1 text-neutral-500">/</span>
        </span>
        <div className="flex items-center gap-4">
          <a
            href="#features"
            className="hidden text-sm text-neutral-400 transition hover:text-neutral-200 sm:inline"
          >
            Features
          </a>
          {isLoggedIn ? (
            <a
              href="/dashboard"
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-300 backdrop-blur-sm transition hover:bg-emerald-500/20"
            >
              Dashboard
            </a>
          ) : (
            <a
              href="/login"
              className="rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 text-sm text-neutral-300 backdrop-blur-sm transition hover:border-emerald-500/40 hover:text-emerald-300"
            >
              Sign In
            </a>
          )}
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="mx-auto mt-12 max-w-6xl px-6 text-center md:mt-24 md:px-10">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1 text-xs font-medium tracking-widest uppercase text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Next-Gen Trading Intelligence
        </div>

        <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            KAIROS:
          </span>
          <br />
          <span className="text-neutral-100">
            The AI Financial Engine
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-neutral-400 md:text-lg">
          Where quantitative strategy meets natural-language market intelligence.
          Deploy, backtest, and execute crypto trades through a unified AI-powered
          pipeline — no PhD required.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-3.5 text-sm font-bold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:brightness-110"
          >
            Launch Proving Grounds
            <svg
              className="h-4 w-4 transition group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>

          <a
            href="#features"
            className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-8 py-3.5 text-sm font-medium text-neutral-300 backdrop-blur-sm transition hover:border-neutral-700 hover:text-neutral-100"
          >
            Explore Features
          </a>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
          <div>
            <p className="text-2xl font-bold text-neutral-100">3</p>
            <p className="text-xs text-neutral-500">AI Models</p>
          </div>
          <div className="hidden h-8 w-px bg-neutral-800 sm:block" />
          <div>
            <p className="text-2xl font-bold text-neutral-100">Binance</p>
            <p className="text-xs text-neutral-500">Testnet Ready</p>
          </div>
          <div className="hidden h-8 w-px bg-neutral-800 sm:block" />
          <div>
            <p className="text-2xl font-bold text-neutral-100">Zero</p>
            <p className="text-xs text-neutral-500">Gas Fees</p>
          </div>
        </div>
      </section>

      {/* ── Bento Grid Features Section ── */}
      <section id="features" className="mx-auto mt-32 max-w-6xl px-6 pb-32 md:px-10">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Intelligence Stack
          </h2>
          <p className="mt-3 text-neutral-400">
            Three layers of AI, fused into a single decision engine.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="group relative overflow-hidden rounded-3xl border border-neutral-800/60 bg-neutral-900/40 p-8 backdrop-blur-xl transition hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
            <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition group-hover:opacity-100">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent" />
            </div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-100">Sniper Strategy TA</h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              Multi-timeframe technical analysis powered by real-time market data.
              Identifies high-probability entry and exit zones with configurable indicator suites.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-neutral-500">
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />RSI · MACD · Bollinger Bands</li>
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />1m / 5m / 1h / 4h timeframes</li>
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />Configurable risk thresholds</li>
            </ul>
          </article>

          <article className="group relative overflow-hidden rounded-3xl border border-neutral-800/60 bg-neutral-900/40 p-8 backdrop-blur-xl transition hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5">
            <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition group-hover:opacity-100">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-cyan-500/5 to-transparent" />
            </div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-100">DeepSeek NLP Reality Check</h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              Fuses real-time news sentiment with on-chain data via DeepSeek's language model. Validates or vetoes TA signals before execution.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-neutral-500">
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-cyan-400" />Live news feed ingestion</li>
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-cyan-400" />Bullish / Bearish / Neutral scoring</li>
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-cyan-400" />Cross-references TA with narrative</li>
            </ul>
          </article>

          <article className="group relative overflow-hidden rounded-3xl border border-neutral-800/60 bg-neutral-900/40 p-8 backdrop-blur-xl transition hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5">
            <div className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition group-hover:opacity-100">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-emerald-500/5 to-transparent" />
            </div>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-neutral-100">Binance Testnet Execution</h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-400">
              Paper-trade every signal against the Binance testnet with zero capital risk. Full order lifecycle — from limit placement to fill confirmation.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-neutral-500">
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />Market & limit order support</li>
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />Real-time P&L tracking</li>
              <li className="flex items-center gap-2"><span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />No real funds required</li>
            </ul>
          </article>
        </div>

        <div className="mt-16 text-center">
          <a
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-3.5 text-sm font-bold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:brightness-110"
          >
            Launch Proving Grounds
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>

      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-8 text-center text-xs text-neutral-600 backdrop-blur-sm">
        <p>KAIROS Financial Engine &middot; AI-Powered Trading Intelligence</p>
      </footer>
    </div>
  )
}

// ── Dashboard (protected — requires auth) ──
function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const email = user?.email || 'User'
  const role = user?.role || 'viewer'

  const [symbol, setSymbol] = useState('BTCUSDT')
  const [pipelineData, setPipelineData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPipeline = async (sym) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet(
        `/api/debug/pipeline?symbol=${sym}&interval=4h&limit=200&news_limit=10`
      )
      setPipelineData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPipeline(symbol)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const sentimentColor = (score) => {
    if (!score) return 'text-neutral-400'
    const s = score.toLowerCase()
    if (s === 'bullish') return 'text-emerald-400'
    if (s === 'bearish') return 'text-rose-400'
    return 'text-yellow-400'
  }

  const sentimentBg = (score) => {
    if (!score) return 'bg-neutral-900/40'
    const s = score.toLowerCase()
    if (s === 'bullish') return 'bg-emerald-500/10 border-emerald-500/30'
    if (s === 'bearish') return 'bg-rose-500/10 border-rose-500/30'
    return 'bg-yellow-500/10 border-yellow-500/30'
  }

  const actionColor = (action) => {
    if (!action) return 'text-neutral-400'
    if (action === 'BUY') return 'text-emerald-400'
    if (action === 'SELL') return 'text-rose-400'
    return 'text-yellow-400'
  }

  const actionBg = (action) => {
    if (!action) return 'bg-neutral-900/40'
    if (action === 'BUY') return 'bg-emerald-500/10 border-emerald-500/30'
    if (action === 'SELL') return 'bg-rose-500/10 border-rose-500/30'
    return 'bg-yellow-500/10 border-yellow-500/30'
  }

  const confidenceBar = (val) => {
    const pct = Math.round((val || 0) * 100)
    let barColor = 'bg-yellow-500'
    if (pct >= 70) barColor = 'bg-emerald-500'
    else if (pct >= 45) barColor = 'bg-yellow-500'
    else barColor = 'bg-rose-500'
    return (
      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
        <span className="w-8 text-right text-xs tabular-nums text-neutral-500">{pct}%</span>
      </div>
    )
  }

  // Shared card styles
  const cardClass = 'relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/30 p-6 backdrop-blur-2xl shadow-xl shadow-black/30'
  const CardShine = () => (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  )

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">

      {/* ── Background glow ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />
      </div>

      {/* ── Navigation — sticky frosted glass ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-emerald-400">KAIROS</span>
            <span className="ml-1 text-neutral-600">/</span>
            <span className="ml-2 text-sm font-normal text-neutral-500">Proving Grounds</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-neutral-600 sm:inline">{email} · {role}</span>
            <button
              onClick={handleLogout}
              className="rounded-full border border-neutral-800/60 bg-neutral-900/60 px-4 py-1.5 text-sm text-neutral-400 transition hover:border-rose-500/30 hover:text-rose-400"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* ── Controls ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mx-auto mt-6 flex max-w-7xl items-center justify-between px-6 md:px-10"
      >
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-medium tracking-widest uppercase text-neutral-600">Symbol</label>
          <select
            value={symbol}
            onChange={(e) => { setSymbol(e.target.value); fetchPipeline(e.target.value) }}
            className="rounded-lg border border-neutral-800/60 bg-neutral-900/80 px-3 py-1.5 text-sm text-neutral-300 backdrop-blur-sm focus:border-emerald-500/40 focus:outline-none"
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
            <option value="BNBUSDT">BNB/USDT</option>
            <option value="ADAUSDT">ADA/USDT</option>
          </select>
        </div>
        <button
          onClick={() => fetchPipeline(symbol)}
          disabled={loading}
          className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-40"
        >
          {loading ? 'Loading…' : '⟳ Refresh'}
        </button>
      </motion.div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mx-auto mt-4 max-w-7xl px-6 md:px-10"
          >
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-400">
              ⚠ {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bento Grid — always rendered so LiveTicker is always live ── */}
      <main className="mx-auto mt-6 max-w-7xl px-6 pb-16 md:px-10">
        <div className="grid gap-5 lg:grid-cols-3">

          {/* ── LiveTicker — col 1, row 1 ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <LiveTicker />
          </motion.div>

          {/* ── Panels B / A / C — skeleton until data lands ── */}
          {loading && !pipelineData ? (
            <>
              {/* Skeleton — Panel B slot (col 2-3) */}
              <div className={`animate-pulse lg:col-span-2 ${cardClass}`}>
                <CardShine />
                <div className="mb-5 h-2 w-20 rounded-full bg-neutral-800" />
                <div className="space-y-3">
                  <div className="h-7 w-24 rounded-full bg-neutral-800" />
                  <div className="h-3 rounded-lg bg-neutral-800" />
                  <div className="h-3 w-4/5 rounded-lg bg-neutral-800" />
                  <div className="h-3 w-3/5 rounded-lg bg-neutral-800" />
                </div>
              </div>
              {/* Skeleton — Panel A slot (col 1-2) */}
              <div className={`animate-pulse lg:col-span-2 ${cardClass}`}>
                <CardShine />
                <div className="mb-5 h-2 w-16 rounded-full bg-neutral-800" />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-2xl border border-neutral-800/40 bg-neutral-900/60 p-3.5">
                      <div className="mb-2 h-3 rounded bg-neutral-800" />
                      <div className="h-3 w-2/3 rounded bg-neutral-800" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Skeleton — Panel C slot (col 3) */}
              <div className={`animate-pulse ${cardClass}`}>
                <CardShine />
                <div className="mb-5 h-2 w-24 rounded-full bg-neutral-800" />
                <div className="space-y-3">
                  <div className="h-20 rounded-2xl bg-neutral-800" />
                  <div className="h-20 rounded-2xl bg-neutral-800" />
                  <div className="h-16 rounded-2xl bg-neutral-800" />
                </div>
              </div>
            </>
          ) : pipelineData ? (
            <>
              {/* ═══ Panel B: AI Sentiment — col 2–3 ═══ */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
                className={`lg:col-span-2 ${cardClass}`}
              >
                <CardShine />
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <h2 className="text-[10px] font-semibold tracking-widest uppercase text-neutral-500">AI Sentiment</h2>
                </div>

                {pipelineData.panel_b ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Badge + summary */}
                    <div className="space-y-4">
                      <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${sentimentBg(pipelineData.panel_b.sentiment_score)}`}>
                        <span className={`h-2 w-2 rounded-full ${sentimentColor(pipelineData.panel_b.sentiment_score).replace('text-', 'bg-')}`} />
                        <span className={sentimentColor(pipelineData.panel_b.sentiment_score)}>
                          {pipelineData.panel_b.sentiment_score}
                        </span>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[10px] font-medium tracking-widest uppercase text-neutral-600">Summary</p>
                        <p className="text-sm leading-relaxed text-neutral-300">{pipelineData.panel_b.summary}</p>
                      </div>
                    </div>

                    {/* Signal distribution */}
                    <div className="rounded-2xl border border-white/5 bg-neutral-950/40 p-4">
                      <p className="mb-4 text-[10px] font-medium tracking-widest uppercase text-neutral-600">Signal Distribution</p>
                      <div className="space-y-3">
                        {[
                          { label: 'Bullish', color: 'text-emerald-400', bar: 'bg-emerald-500', active: pipelineData.panel_b.sentiment_score === 'Bullish' },
                          { label: 'Bearish', color: 'text-rose-400',    bar: 'bg-rose-500',    active: pipelineData.panel_b.sentiment_score === 'Bearish' },
                          { label: 'Neutral', color: 'text-yellow-400',  bar: 'bg-yellow-500',  active: pipelineData.panel_b.sentiment_score === 'Neutral'  },
                        ].map(({ label, color, bar, active }) => (
                          <div key={label} className="flex items-center gap-3 text-xs">
                            <span className={`w-14 ${color}`}>{label}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                              <motion.div
                                className={`h-full rounded-full ${bar}`}
                                initial={{ width: '0%' }}
                                animate={{ width: active ? '72%' : '18%' }}
                                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600">Sentiment data unavailable.</p>
                )}
              </motion.section>

              {/* ═══ Panel A: News Feed — col 1–2 ═══ */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.16 }}
                className={`lg:col-span-2 ${cardClass}`}
              >
                <CardShine />
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <h2 className="text-[10px] font-semibold tracking-widest uppercase text-neutral-500">News Feed</h2>
                  </div>
                  <span className="text-[10px] text-neutral-700">
                    {pipelineData.panel_a?.count || 0} headlines · {pipelineData.symbol}
                  </span>
                </div>

                <div className="mt-4 grid max-h-[400px] gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {pipelineData.panel_a?.articles?.length > 0 ? (
                    pipelineData.panel_a.articles.map((article, idx) => (
                      <motion.a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ x: 3 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="block rounded-2xl border border-white/5 bg-neutral-950/40 p-3.5 hover:border-emerald-500/15 hover:bg-neutral-900/60"
                      >
                        <p className="text-sm leading-snug text-neutral-200 line-clamp-2">{article.title}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-600">
                          <span>{article.source}</span>
                          <span>{new Date(article.timestamp).toLocaleDateString()}</span>
                        </div>
                      </motion.a>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-600">No articles available.</p>
                  )}
                </div>
              </motion.section>

              {/* ═══ Panel C: Reality Check — col 3 ═══ */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.24 }}
                className={cardClass}
              >
                <CardShine />
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <h2 className="text-[10px] font-semibold tracking-widest uppercase text-neutral-500">Reality Check</h2>
                </div>

                {pipelineData.panel_c ? (
                  <div className="space-y-4">
                    {/* TA Signal */}
                    <div className="rounded-2xl border border-white/5 bg-neutral-950/40 p-4">
                      <p className="mb-3 text-[10px] font-medium tracking-widest uppercase text-neutral-600">TA Signal</p>
                      <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${actionBg(pipelineData.panel_c.ta_signal?.action)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${actionColor(pipelineData.panel_c.ta_signal?.action).replace('text-', 'bg-')}`} />
                        <span className={actionColor(pipelineData.panel_c.ta_signal?.action)}>
                          {pipelineData.panel_c.ta_signal?.action || 'HOLD'}
                        </span>
                      </div>
                      <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-600">Confidence</p>
                      {confidenceBar(pipelineData.panel_c.ta_signal?.confidence)}
                      {pipelineData.panel_c.ta_signal?.error && (
                        <p className="mt-2 text-xs text-rose-400">⚠ {pipelineData.panel_c.ta_signal.error}</p>
                      )}
                    </div>

                    {/* AI Signal */}
                    <div className="rounded-2xl border border-white/5 bg-neutral-950/40 p-4">
                      <p className="mb-3 text-[10px] font-medium tracking-widest uppercase text-neutral-600">AI Signal</p>
                      <div className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${sentimentBg(pipelineData.panel_c.ai_signal?.sentiment_score)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sentimentColor(pipelineData.panel_c.ai_signal?.sentiment_score).replace('text-', 'bg-')}`} />
                        <span className={sentimentColor(pipelineData.panel_c.ai_signal?.sentiment_score)}>
                          {pipelineData.panel_c.ai_signal?.sentiment_score || 'Neutral'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                        {pipelineData.panel_c.ai_signal?.summary || 'No summary available.'}
                      </p>
                    </div>

                    {/* Verdict */}
                    <div className={`rounded-2xl border p-4 ${
                      pipelineData.panel_c.reality_check?.approved_for_execution
                        ? 'border-emerald-500/20 bg-emerald-500/10'
                        : 'border-rose-500/20 bg-rose-500/10'
                    }`}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-medium tracking-widest uppercase text-neutral-600">Verdict</p>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                          pipelineData.panel_c.reality_check?.approved_for_execution
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            pipelineData.panel_c.reality_check?.approved_for_execution
                              ? 'bg-emerald-400'
                              : 'bg-rose-400'
                          }`} />
                          {pipelineData.panel_c.reality_check?.approved_for_execution ? 'Approved' : 'Rejected'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-neutral-500">
                        {pipelineData.panel_c.reality_check?.reason || 'No reason provided.'}
                      </p>
                      <p className="mt-2 text-[10px] text-neutral-700">
                        Status: <span className="text-neutral-500">{pipelineData.panel_c.reality_check?.status || 'unknown'}</span>
                      </p>
                      {pipelineData.panel_c.reality_check?.final_signal_action && (
                        <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3 text-xs">
                          <span className="text-neutral-600">Final:</span>
                          <span className={`font-semibold ${actionColor(pipelineData.panel_c.reality_check.final_signal_action)}`}>
                            {pipelineData.panel_c.reality_check.final_signal_action}
                          </span>
                          <span className="text-neutral-700">·</span>
                          <span className="text-neutral-600">
                            {Math.round((pipelineData.panel_c.reality_check.final_signal_confidence || 0) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600">Reality check data unavailable.</p>
                )}
              </motion.section>
            </>
          ) : null}
        </div>

        {/* ── Raw JSON toggle ── */}
        {pipelineData && (
          <details className="mt-10">
            <summary className="cursor-pointer text-[10px] tracking-widest uppercase text-neutral-700 hover:text-neutral-500">
              Raw API Response
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-2xl border border-white/5 bg-neutral-900/60 p-4 text-xs text-neutral-500">
              {JSON.stringify(pipelineData, null, 2)}
            </pre>
          </details>
        )}
      </main>
    </div>
  )
}

// ── App with routing ──
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
