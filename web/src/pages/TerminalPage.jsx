import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { Zap, ShieldCheck, ShieldOff, Clock, Target, RefreshCw, ChevronDown, Brain, Loader2 } from 'lucide-react'
import { apiPost, apiGet } from '../lib/api'
import { useProMode } from '../context/ProModeContext'

const SYMBOLS    = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT']
const ORDER_MODES = ['MARKET', 'LIMIT', 'DCA']

// ── Toast system ──────────────────────────────────────────────────────────────

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
    timers.current[id] = setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  return { toasts, addToast, dismiss }
}

const toastStyle = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  error:   'border-rose-500/30   bg-rose-500/10   text-rose-300',
  info:    'border-sky-500/30    bg-sky-500/10    text-sky-300',
}
const toastIcon = { success: ShieldCheck, warning: ShieldOff, error: Zap, info: Clock }

function ToastStack({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = toastIcon[t.type] ?? Zap
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0,  scale: 1    }}
              exit={{ opacity: 0, x: 60,    scale: 0.92 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={() => dismiss(t.id)}
              className={`flex w-80 cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl shadow-black/50 backdrop-blur-xl ${toastStyle[t.type] ?? toastStyle.error}`}
            >
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs opacity-70 break-words">{t.message}</p>}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// ── 3-D tilt card ─────────────────────────────────────────────────────────────

function TiltCard({ children, flash, isPro }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rawRX   = useTransform(mouseY, [-150, 150], [6, -6])
  const rawRY   = useTransform(mouseX, [-150, 150], [-6, 6])
  const rotateX = useSpring(rawRX, { stiffness: 180, damping: 24 })
  const rotateY = useSpring(rawRY, { stiffness: 180, damping: 24 })

  return (
    <motion.div
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        mouseX.set(e.clientX - r.left - r.width  / 2)
        mouseY.set(e.clientY - r.top  - r.height / 2)
      }}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0) }}
      animate={{
        boxShadow: flash
          ? (isPro
              ? '0 0 0 2px rgba(239,68,68,0.55), 0 24px 80px rgba(239,68,68,0.20)'
              : '0 0 0 2px rgba(52,211,153,0.55), 0 24px 80px rgba(52,211,153,0.20)')
          : (isPro
              ? '0 20px 60px rgba(0,0,0,0.60), 0 0 0 1px rgba(239,68,68,0.15)'
              : '0 20px 50px rgba(0,0,0,0.40)'),
      }}
      transition={{ boxShadow: { duration: 0.35 } }}
      className={`relative overflow-hidden rounded-3xl border backdrop-blur-2xl transition-colors duration-500 ${
        isPro
          ? 'bg-[#0a0505]/90 border-red-900/40'
          : `bg-neutral-900/30 ${flash ? 'border-emerald-400/40' : 'border-white/5'}`
      }`}
    >
      {isPro && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-900/30 to-transparent" />
          {/* Ambient red glow corners */}
          <div className="pointer-events-none absolute -top-8 -left-8 h-24 w-24 rounded-full bg-red-700/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-red-700/10 blur-2xl" />
        </>
      )}
      {!isPro && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
      {children}
    </motion.div>
  )
}

// ── Order-mode selector ───────────────────────────────────────────────────────

const modeIcon = { MARKET: Zap, LIMIT: Target, DCA: RefreshCw }
const modeColorStd = { MARKET: 'text-emerald-300', LIMIT: 'text-sky-300', DCA: 'text-violet-300' }
const modeColorPro = { MARKET: 'text-red-300',     LIMIT: 'text-rose-300', DCA: 'text-orange-300' }

function OrderModeSelector({ mode, onChange, disabled, isPro }) {
  const modeColor = isPro ? modeColorPro : modeColorStd
  return (
    <div className={`mb-5 flex rounded-xl border p-1 gap-0.5 ${
      isPro ? 'border-red-900/40 bg-black/60' : 'border-white/5 bg-neutral-950/60'
    }`}>
      {ORDER_MODES.map(m => {
        const Icon = modeIcon[m]
        const active = mode === m
        return (
          <button
            key={m}
            onClick={() => !disabled && onChange(m)}
            disabled={disabled}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 transition-colors duration-200 disabled:opacity-40 ${
              active ? modeColor[m] : (isPro ? 'text-red-900/70 hover:text-red-700' : 'text-neutral-600 hover:text-neutral-400')
            }`}
          >
            {active && (
              <motion.div
                layoutId="order-mode-pill"
                className={`absolute inset-0 rounded-lg ${isPro ? 'bg-red-900/30' : 'bg-white/8'}`}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <Icon className="relative z-10 h-3 w-3 flex-shrink-0" />
            <span className="relative z-10 text-[11px] font-bold uppercase tracking-[0.18em]">{m}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Numeric input ─────────────────────────────────────────────────────────────

function NumericInput({ label, sublabel, value, onChange, placeholder, disabled, size = 'normal', isPro, highlight }) {
  const focusRing = isPro
    ? 'focus:border-red-500/50 focus:ring-red-500/20'
    : 'focus:border-emerald-500/40 focus:ring-emerald-500/20'
  const border = isPro
    ? (highlight ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-red-900/40')
    : 'border-white/10'
  const bg = isPro ? 'bg-black/60' : 'bg-neutral-950/60'

  return (
    <div>
      <label className={`mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] ${isPro ? 'text-red-700/80' : 'text-neutral-600'}`}>
        {label}
        {sublabel && <span className={`ml-1 normal-case font-normal ${isPro ? 'text-red-900/60' : 'text-neutral-700'}`}>{sublabel}</span>}
      </label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '0.00'}
        min="0"
        step="any"
        disabled={disabled}
        className={`w-full rounded-xl border px-4 tabular-nums text-neutral-100 placeholder-neutral-700 transition focus:outline-none focus:ring-1 disabled:opacity-50 ${focusRing} ${border} ${bg} ${
          size === 'large' ? 'py-4 text-2xl font-extrabold' : 'py-3 text-base font-bold'
        }`}
      />
    </div>
  )
}

// ── Standard Mode — Market only ───────────────────────────────────────────────

function StandardMarketFields({ amount, setAmount, disabled }) {
  return (
    <motion.div
      key="std-market"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
    >
      <NumericInput
        label="Trade Amount"
        sublabel="(USDT)"
        value={amount}
        onChange={setAmount}
        disabled={disabled}
        size="large"
      />
      <div className="mt-2 flex gap-2">
        {[100, 500, 1000, 5000].map(v => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            disabled={disabled}
            className="flex-1 rounded-lg border border-white/5 bg-neutral-950/40 py-1 text-[10px] font-semibold text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300 disabled:opacity-40"
          >
            {v >= 1000 ? `$${v / 1000}k` : `$${v}`}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ── Pro Mode field panels ─────────────────────────────────────────────────────

function ProMarketFields({ amount, setAmount, disabled }) {
  return (
    <motion.div
      key="pro-market"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
    >
      <NumericInput label="Trade Amount" sublabel="(USDT)" value={amount} onChange={setAmount} disabled={disabled} size="large" isPro />
      <div className="mt-2 flex gap-2">
        {[100, 500, 1000, 5000].map(v => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            disabled={disabled}
            className="flex-1 rounded-lg border border-red-900/30 bg-black/40 py-1 text-[10px] font-semibold text-red-900 transition hover:border-red-700/50 hover:text-red-600 disabled:opacity-40"
          >
            {v >= 1000 ? `$${v / 1000}k` : `$${v}`}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function ProLimitFields({ amount, setAmount, limitPrice, setLimitPrice, disabled, aiHighlight }) {
  return (
    <motion.div
      key="pro-limit"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="space-y-4"
    >
      <NumericInput label="Order Amount" sublabel="(USDT)" value={amount} onChange={setAmount} disabled={disabled} size="large" isPro />
      <div className="relative">
        <NumericInput
          label="Limit Entry Price"
          sublabel="(USDT)"
          value={limitPrice}
          onChange={setLimitPrice}
          placeholder="e.g. 60000"
          disabled={disabled}
          isPro
          highlight={aiHighlight}
        />
        <Target className="pointer-events-none absolute right-3 top-[2.35rem] h-4 w-4 text-red-500/40" />
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-red-900/20 bg-red-950/10 px-3 py-2">
        <Clock className="h-3 w-3 text-red-500/40 flex-shrink-0" />
        <p className="text-[10px] text-red-400/50">
          Order queued. Monitor checks live price every 5 s — executes automatically when triggered.
        </p>
      </div>
    </motion.div>
  )
}

function ProDCAFields({ totalAmount, setTotalAmount, perTrade, setPerTrade, freqHours, setFreqHours, disabled }) {
  const tranches = useMemo(() => {
    const t = parseFloat(totalAmount)
    const p = parseFloat(perTrade)
    if (!t || !p || p <= 0) return null
    return Math.ceil(t / p)
  }, [totalAmount, perTrade])

  return (
    <motion.div
      key="pro-dca"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="space-y-4"
    >
      <NumericInput label="Total Allocation" sublabel="(USDT)" value={totalAmount} onChange={setTotalAmount} placeholder="e.g. 1000" disabled={disabled} size="large" isPro />
      <div className="grid grid-cols-2 gap-3">
        <NumericInput label="Amount per Trade" sublabel="(USDT)" value={perTrade} onChange={setPerTrade} placeholder="e.g. 100" disabled={disabled} isPro />
        <NumericInput label="Frequency" sublabel="(hours)" value={freqHours} onChange={setFreqHours} placeholder="e.g. 24" disabled={disabled} isPro />
      </div>
      {tranches !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 rounded-lg border border-orange-900/20 bg-orange-950/10 px-3 py-2">
          <RefreshCw className="h-3 w-3 text-orange-500/60 flex-shrink-0" />
          <p className="text-[10px] text-orange-400/60">
            <span className="font-bold text-orange-400">{tranches} tranches</span>
            {' '}of ${parseFloat(perTrade).toFixed(0)} every {parseFloat(freqHours) >= 24
              ? `${(parseFloat(freqHours) / 24).toFixed(1)} day(s)`
              : `${freqHours}h`}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

// ── Pro Risk Panel (always open in Pro mode) ──────────────────────────────────

function ProRiskPanel({ takeProfit, setTakeProfit, stopLoss, setStopLoss, disabled, aiHighlightTP, aiHighlightSL }) {
  return (
    <div className="mt-5 rounded-xl border border-red-900/30 bg-black/30 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-red-900/20 px-4 py-2.5">
        <ShieldCheck className="h-3.5 w-3.5 text-red-500/60" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/60">Risk Controls</span>
        {(takeProfit || stopLoss) && (
          <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">ARMED</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 py-4">
        <div className="relative">
          <NumericInput
            label="Take-Profit"
            sublabel="(USDT)"
            value={takeProfit}
            onChange={setTakeProfit}
            placeholder="Optional"
            disabled={disabled}
            isPro
            highlight={aiHighlightTP}
          />
          {takeProfit && <span className="pointer-events-none absolute right-3 top-[2.35rem] text-[10px] font-bold text-emerald-500">TP</span>}
        </div>
        <div className="relative">
          <NumericInput
            label="Stop-Loss"
            sublabel="(USDT)"
            value={stopLoss}
            onChange={setStopLoss}
            placeholder="Optional"
            disabled={disabled}
            isPro
            highlight={aiHighlightSL}
          />
          {stopLoss && <span className="pointer-events-none absolute right-3 top-[2.35rem] text-[10px] font-bold text-red-500">SL</span>}
        </div>
      </div>
    </div>
  )
}

// ── Standard Risk Accordion ───────────────────────────────────────────────────

function RiskAccordion({ takeProfit, setTakeProfit, stopLoss, setStopLoss, disabled }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-5 rounded-xl border border-white/5 bg-neutral-950/40 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-white/3 disabled:opacity-40"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Advanced Risk</span>
          {(takeProfit || stopLoss) && (
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">ACTIVE</span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5 text-neutral-600" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <div className="relative">
            <NumericInput label="Take-Profit Price" sublabel="(USDT)" value={takeProfit} onChange={setTakeProfit} placeholder="Optional" disabled={disabled} />
            {takeProfit && <span className="pointer-events-none absolute right-3 top-[2.35rem] text-[10px] font-bold text-emerald-500">TP</span>}
          </div>
          <div className="relative">
            <NumericInput label="Stop-Loss Price" sublabel="(USDT)" value={stopLoss} onChange={setStopLoss} placeholder="Optional" disabled={disabled} />
            {stopLoss && <span className="pointer-events-none absolute right-3 top-[2.35rem] text-[10px] font-bold text-rose-500">SL</span>}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── DeepSeek AI Targets button ────────────────────────────────────────────────

function _classifyAiError(err) {
  const status = err?.status
  if (status === 401) return 'Session expired — please log out and log back in.'
  if (status === 403) return 'Your account role cannot access AI targets. Contact an admin.'
  if (status === 429) return 'Rate limit hit — wait a moment before retrying.'
  if (status === 503) return 'AI service not configured on the server (missing API key).'
  if (status === 504) return 'DeepSeek timed out — check your connection and retry.'
  if (status === 502) return 'AI returned an invalid response — retry.'
  if (status === 404) return 'AI targets endpoint not found — ensure the backend is restarted.'
  return err?.message ?? 'Unknown error'
}

function AskDeepSeekButton({ symbol, onFill, disabled }) {
  const [loading, setLoading]   = useState(false)
  const [feedback, setFeedback] = useState(null) // { text, isError }

  const handleClick = async () => {
    if (disabled || loading) return
    setLoading(true)
    setFeedback(null)

    // ── Step 1: get live price (non-fatal if it fails) ──────────────────────
    let currentPrice = 0
    try {
      const priceData = await apiGet(`/api/market/price?symbol=${symbol}`)
      currentPrice = priceData?.price ?? 0
    } catch {
      // 503 means TAEngine is warming up; continue with price=0 so DeepSeek
      // can still give a rough estimate based on its own knowledge.
      currentPrice = 0
    }

    // ── Step 2: ask DeepSeek ────────────────────────────────────────────────
    try {
      const ticker = symbol.replace('USDT', '/USDT')
      const result = await apiPost('/api/ai/targets', {
        ticker,
        current_price: currentPrice,
      })
      onFill(result)
      setFeedback({ text: result.rationale, isError: false })
    } catch (err) {
      setFeedback({ text: _classifyAiError(err), isError: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-5 space-y-2">
      <motion.button
        onClick={handleClick}
        disabled={disabled || loading}
        whileTap={!disabled && !loading ? { scale: 0.96, y: 1 } : {}}
        whileHover={!disabled && !loading ? { scale: 1.01 } : {}}
        animate={{
          boxShadow: loading
            ? '0 0 0 1px rgba(239,68,68,0.3)'
            : [
                '0 0 0 1px rgba(239,68,68,0.4), 0 0 20px 2px rgba(239,68,68,0.15)',
                '0 0 0 1px rgba(239,68,68,0.7), 0 0 28px 4px rgba(239,68,68,0.30)',
                '0 0 0 1px rgba(239,68,68,0.4), 0 0 20px 2px rgba(239,68,68,0.15)',
              ],
        }}
        transition={{
          boxShadow: loading
            ? { duration: 0.3 }
            : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
          scale: { type: 'spring', stiffness: 480, damping: 28 },
        }}
        className="relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-red-600/40 bg-red-950/30 text-sm font-black uppercase tracking-[0.18em] text-red-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!loading && (
          <motion.span
            className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-red-400/10 to-transparent"
            initial={{ x: '-120%' }}
            whileHover={{ x: '220%' }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
        )}
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-red-400" />
            <span className="text-red-400/80">Querying DeepSeek…</span>
          </>
        ) : (
          <>
            <Brain className="h-4 w-4" />
            Ask DeepSeek Targets
          </>
        )}
      </motion.button>

      {/* Loading skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5 overflow-hidden"
          >
            {[60, 45, 30].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded-md bg-red-900/20 animate-pulse"
                style={{ width: `${w}%` }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback — success (rationale) or error */}
      <AnimatePresence>
        {feedback && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${
              feedback.isError
                ? 'border-orange-900/40 bg-orange-950/20'
                : 'border-red-900/30 bg-red-950/20'
            }`}
          >
            <Brain className={`mt-0.5 h-3 w-3 flex-shrink-0 ${feedback.isError ? 'text-orange-500/70' : 'text-red-500/60'}`} />
            <p className={`text-[10px] leading-relaxed ${feedback.isError ? 'text-orange-300/80' : 'text-red-300/70'}`}>
              {feedback.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── God Mode toggle (standard mode only) ─────────────────────────────────────

function GodModeToggle({ enabled, onToggle }) {
  return (
    <motion.div
      role="button" tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      animate={{
        boxShadow: enabled
          ? '0 0 22px 5px rgba(239,68,68,0.38), 0 0 44px 10px rgba(251,146,60,0.18)'
          : 'none',
      }}
      transition={{ duration: 0.3 }}
      className={`mb-5 flex w-full cursor-pointer select-none items-center justify-between rounded-xl border px-4 py-3 transition-colors duration-300 ${
        enabled ? 'border-red-500/50 bg-red-950/40' : 'border-zinc-800/60 bg-zinc-950/50'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {enabled
          ? <Zap className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
          : <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
        }
        {enabled ? (
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-400"
          >
            GOD MODE: AI Guardrails Disabled
          </motion.span>
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            AI Guardrails: ACTIVE
          </span>
        )}
      </div>
      <div className={`relative h-5 w-10 flex-shrink-0 rounded-full transition-colors duration-300 ${enabled ? 'bg-red-600/80' : 'bg-zinc-700/80'}`}>
        <motion.div
          animate={{ x: enabled ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm ${enabled ? 'bg-red-100' : 'bg-zinc-300'}`}
        />
      </div>
    </motion.div>
  )
}

// ── Trade Button ──────────────────────────────────────────────────────────────

function TradeButton({ action, loading, disabled, onClick, mode, isPro }) {
  const isBuy = action === 'BUY'
  const label = mode === 'DCA' ? `Schedule DCA ${action}` : mode === 'LIMIT' ? `Queue ${action}` : action
  const active = !disabled && !loading

  if (isPro) {
    return (
      <motion.button
        onClick={() => active && onClick(action)}
        disabled={disabled || loading}
        whileTap={active ? { scale: 0.93, y: 2 } : {}}
        whileHover={active ? { scale: 1.02 } : {}}
        animate={active && !loading ? {
          boxShadow: isBuy
            ? [
                '0 0 0 1px rgba(52,211,153,0.20), 0 8px 24px rgba(52,211,153,0.06)',
                '0 0 0 1px rgba(52,211,153,0.55), 0 8px 36px rgba(52,211,153,0.20)',
                '0 0 0 1px rgba(52,211,153,0.20), 0 8px 24px rgba(52,211,153,0.06)',
              ]
            : [
                '0 0 0 1px rgba(239,68,68,0.25), 0 8px 24px rgba(239,68,68,0.08)',
                '0 0 0 1px rgba(239,68,68,0.70), 0 8px 40px rgba(239,68,68,0.28)',
                '0 0 0 1px rgba(239,68,68,0.25), 0 8px 24px rgba(239,68,68,0.08)',
              ],
        } : {}}
        transition={{
          boxShadow: { duration: isBuy ? 2.8 : 2.2, repeat: Infinity, ease: 'easeInOut' },
          scale: { type: 'spring', stiffness: 480, damping: 28 },
        }}
        className={`relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl text-sm font-extrabold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isBuy
            ? 'border border-emerald-800/60 bg-emerald-950/50 text-emerald-400 hover:bg-emerald-900/40'
            : 'border border-red-700/70 bg-red-950/60 text-red-300 hover:bg-red-900/50'
        }`}
      >
        {/* Shimmer sweep */}
        <motion.span
          className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/6 to-transparent"
          initial={{ x: '-120%' }}
          whileHover={{ x: '220%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
        {/* Inner top edge highlight */}
        <span className={`pointer-events-none absolute inset-x-0 top-0 h-px ${
          isBuy
            ? 'bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent'
            : 'bg-gradient-to-r from-transparent via-red-500/40 to-transparent'
        }`} />
        {loading ? (
          <div className={`h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${isBuy ? 'border-emerald-400' : 'border-red-400'}`} />
        ) : (
          <span className="relative flex items-center gap-1.5 font-mono text-sm font-black uppercase tracking-[0.15em]">
            {mode === 'DCA' ? <RefreshCw className="h-4 w-4" /> : mode === 'LIMIT' ? <Target className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {label}
          </span>
        )}
      </motion.button>
    )
  }

  return (
    <motion.button
      onClick={() => active && onClick(action)}
      disabled={disabled || loading}
      whileTap={active ? { scale: 0.93, y: 2 } : {}}
      whileHover={active ? { scale: 1.02 } : {}}
      transition={{ type: 'spring', stiffness: 480, damping: 28 }}
      className={`relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl text-sm font-extrabold tracking-wide transition-all ${
        isBuy
          ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shadow-lg shadow-emerald-900/30'
          : 'border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 shadow-lg shadow-rose-900/30'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <motion.span
        className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '-120%' }}
        whileHover={{ x: '220%' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />
      {loading ? (
        <div className={`h-5 w-5 animate-spin rounded-full border-2 border-t-transparent ${isBuy ? 'border-emerald-400' : 'border-rose-400'}`} />
      ) : (
        <span className="relative flex items-center gap-1.5">
          {mode === 'DCA' ? <RefreshCw className="h-4 w-4" /> : mode === 'LIMIT' ? <Target className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
          {label}
        </span>
      )}
    </motion.button>
  )
}

// ── Execution log entry ───────────────────────────────────────────────────────

function LogEntry({ entry, idx, isPro }) {
  const isSuccess = entry.type === 'success'
  const isWarning = entry.type === 'warning'
  const isInfo    = entry.type === 'info'
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: idx * 0.04 }}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
        isSuccess ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
        : isWarning ? 'border-yellow-500/20 bg-yellow-500/5 text-yellow-300'
        : isInfo    ? (isPro ? 'border-red-500/15 bg-red-500/5 text-red-300' : 'border-sky-500/20 bg-sky-500/5 text-sky-300')
        : 'border-rose-500/20 bg-rose-500/5 text-rose-300'
      }`}
    >
      {isSuccess ? <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
       : isWarning ? <ShieldOff className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
       : isInfo ? <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
       : <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
      <div>
        <span className="font-semibold">{entry.title}</span>
        {entry.message && <p className="mt-0.5 opacity-70">{entry.message}</p>}
      </div>
      <span className="ml-auto flex-shrink-0 opacity-50">{entry.time}</span>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TerminalPage() {
  const { isProMode } = useProMode()

  const [symbol,      setSymbol]      = useState('BTCUSDT')
  const [amount,      setAmount]      = useState('')
  const [loadingSide, setLoadingSide] = useState(null)
  const [flash,       setFlash]       = useState(false)
  const [log,         setLog]         = useState([])
  const [godMode,     setGodMode]     = useState(false)

  const [orderMode,    setOrderMode]    = useState('MARKET')
  const [limitPrice,   setLimitPrice]   = useState('')
  const [dcaTotal,     setDcaTotal]     = useState('')
  const [dcaPerTrade,  setDcaPerTrade]  = useState('')
  const [dcaFreqHours, setDcaFreqHours] = useState('')
  const [takeProfit,   setTakeProfit]   = useState('')
  const [stopLoss,     setStopLoss]     = useState('')

  // Track which fields were AI-filled for highlight flash
  const [aiHighlight, setAiHighlight] = useState({ entry: false, tp: false, sl: false })

  const { toasts, addToast, dismiss } = useToasts()

  // Reset to MARKET when switching to standard mode
  useEffect(() => {
    if (!isProMode) setOrderMode('MARKET')
  }, [isProMode])

  const pushLog = (entry) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setLog(prev => [{ ...entry, time }, ...prev].slice(0, 50))
  }

  const fetchLogs = useCallback(async () => {
    try {
      const data = await apiGet('/api/trades/logs')
      setLog(
        (data.logs || []).map(entry => ({
          type:    entry.status === 'EXECUTED' ? 'success' : entry.status === 'BLOCKED' ? 'warning' : 'error',
          title:   `${entry.action} ${entry.symbol}`,
          message: entry.message,
          time:    new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }))
      )
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleAiFill = (result) => {
    setLimitPrice(String(result.suggested_entry))
    setTakeProfit(String(result.suggested_take_profit))
    setStopLoss(String(result.suggested_stop_loss))
    // Switch to LIMIT mode so the entry field is visible
    if (orderMode === 'MARKET') setOrderMode('LIMIT')
    setAiHighlight({ entry: true, tp: true, sl: true })
    setTimeout(() => setAiHighlight({ entry: false, tp: false, sl: false }), 3000)
    addToast({ type: 'info', title: 'AI Targets Applied', message: result.rationale })
  }

  const isDisabled = useMemo(() => {
    if (!!loadingSide) return true
    if (orderMode === 'MARKET') return !amount || parseFloat(amount) <= 0
    if (orderMode === 'LIMIT')  return !amount || parseFloat(amount) <= 0 || !limitPrice || parseFloat(limitPrice) <= 0
    if (orderMode === 'DCA')    return !dcaTotal || parseFloat(dcaTotal) <= 0 || !dcaPerTrade || parseFloat(dcaPerTrade) <= 0 || !dcaFreqHours || parseFloat(dcaFreqHours) <= 0
    return true
  }, [orderMode, loadingSide, amount, limitPrice, dcaTotal, dcaPerTrade, dcaFreqHours])

  const execute = async (action) => {
    setLoadingSide(action)

    const base = {
      symbol,
      action,
      amount:          parseFloat(orderMode === 'DCA' ? dcaPerTrade : amount),
      interval:        '4h',
      limit:           200,
      news_limit:      10,
      account_balance: 10000.0,
      god_mode:        godMode,
      order_type:      orderMode === 'DCA' ? 'MARKET' : orderMode,
    }

    if (orderMode === 'LIMIT') base.limit_price = parseFloat(limitPrice)
    if (orderMode === 'DCA') {
      base.dca_config = {
        total_amount:     parseFloat(dcaTotal),
        amount_per_trade: parseFloat(dcaPerTrade),
        interval_hours:   parseFloat(dcaFreqHours),
      }
    }

    const tp = parseFloat(takeProfit)
    const sl = parseFloat(stopLoss)
    if (!isNaN(tp) && tp > 0) base.take_profit = tp
    if (!isNaN(sl) && sl > 0) base.stop_loss   = sl

    try {
      const result = await apiPost('/api/trades/execute', base)

      if (result.status === 'PENDING') {
        addToast({ type: 'info', title: 'Limit Order Queued', message: `${action} ${symbol} @ $${result.limit_price?.toFixed(2)}` })
        pushLog({ type: 'info', title: `Limit queued — ${action} ${symbol}`, message: `Target: $${result.limit_price?.toFixed(2)}` })
        return
      }

      if (result.status === 'DCA_SCHEDULED') {
        addToast({ type: 'info', title: 'DCA Scheduled', message: `${result.total_amount} USDT in ${result.amount_per_trade} USDT tranches every ${result.interval_hours}h` })
        pushLog({ type: 'info', title: `DCA scheduled — ${action} ${symbol}`, message: `$${result.total_amount} total, $${result.amount_per_trade}/tranche` })
        return
      }

      if (result.approved_for_execution && result.execution_result) {
        const ex = result.execution_result
        setFlash(true)
        setTimeout(() => setFlash(false), 2500)
        const notional = (ex.quantity * ex.fill_price).toFixed(2)
        const msg = `${action} ${ex.quantity} ${symbol} @ $${ex.fill_price} — Notional: $${notional}`
        addToast({ type: 'success', title: `Order ${ex.order_id} placed`, message: msg })
        pushLog({ type: 'success', title: `Order ${ex.order_id} placed`, message: msg })
      } else {
        const reason = result.reason ?? 'Pipeline rejected this trade.'
        addToast({ type: 'warning', title: 'Trade Blocked', message: reason })
        pushLog({ type: 'warning', title: 'Trade Blocked', message: reason })
      }
    } catch (err) {
      if (err.status === 429) {
        addToast({ type: 'warning', title: 'Rate Limit Exceeded', message: 'Too many requests. Wait before retrying.' })
        pushLog({ type: 'warning', title: 'Rate Limit Exceeded' })
      } else {
        addToast({ type: 'error', title: 'Execution Failed', message: err.message })
        pushLog({ type: 'error', title: 'Execution Failed', message: err.message })
      }
    } finally {
      setLoadingSide(null)
      fetchLogs()
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3 text-xs text-neutral-600">
        {isProMode ? (
          <>
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.6)]"
            />
            <span className="text-red-700/80 font-semibold uppercase tracking-[0.18em] text-[10px]">
              KAIROS PRO — Full pipeline: TA → AI Sentiment → Reality Check → Risk Gate → Execute
            </span>
          </>
        ) : (
          <>
            <Clock className="h-3.5 w-3.5" />
            <span>Full pipeline: TA → AI Sentiment → Reality Check → Risk Gate → Execute</span>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* Terminal card */}
        <TiltCard flash={flash} isPro={isProMode}>
          <div className="p-7">

            {/* Card label */}
            <div className="mb-6 flex items-center gap-2.5">
              <span className={`h-1.5 w-1.5 rounded-full ${isProMode ? 'bg-red-500 shadow-[0_0_6px_2px_rgba(239,68,68,0.5)]' : 'bg-rose-400'}`} />
              <p className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${isProMode ? 'text-red-600/80' : 'text-neutral-500'}`}>
                {isProMode ? 'Pro Execution Terminal' : 'Execution Terminal'}
              </p>
              <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-widest ${
                isProMode
                  ? 'border-red-800/40 bg-black/40 text-red-700/70'
                  : 'border-white/5 bg-neutral-950/60 text-neutral-600'
              }`}>
                {isProMode ? 'PRO · Testnet' : 'Testnet'}
              </span>
            </div>

            {/* Symbol select */}
            <div className="mb-5">
              <label className={`mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] ${isProMode ? 'text-red-700/80' : 'text-neutral-600'}`}>
                Trading Pair
              </label>
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                disabled={!!loadingSide}
                className={`w-full appearance-none rounded-xl border px-4 py-3 text-lg font-bold text-neutral-100 focus:outline-none disabled:opacity-50 ${
                  isProMode
                    ? 'border-red-900/40 bg-black/60 focus:border-red-600/40'
                    : 'border-white/10 bg-neutral-950/60 focus:border-emerald-500/40'
                }`}
              >
                {SYMBOLS.map(s => (
                  <option key={s} value={s} className="bg-neutral-900 font-semibold">
                    {s.replace('USDT', ' / USDT')}
                  </option>
                ))}
              </select>
            </div>

            {/* Standard mode: just Market + God Mode */}
            {!isProMode && (
              <>
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <GodModeToggle enabled={godMode} onToggle={() => setGodMode(g => !g)} />
                  </motion.div>
                </AnimatePresence>

                <div className="mb-5">
                  <StandardMarketFields amount={amount} setAmount={setAmount} disabled={!!loadingSide} />
                </div>

                <RiskAccordion
                  takeProfit={takeProfit}
                  setTakeProfit={setTakeProfit}
                  stopLoss={stopLoss}
                  setStopLoss={setStopLoss}
                  disabled={!!loadingSide}
                />
              </>
            )}

            {/* Pro mode: full suite */}
            {isProMode && (
              <>
                <OrderModeSelector mode={orderMode} onChange={setOrderMode} disabled={!!loadingSide} isPro />

                {/* DeepSeek AI button — above the fields */}
                <AskDeepSeekButton
                  symbol={symbol}
                  onFill={handleAiFill}
                  disabled={!!loadingSide}
                />

                {/* Mode-specific fields */}
                <div className="mb-5 mt-5">
                  <AnimatePresence mode="wait">
                    {orderMode === 'MARKET' && (
                      <ProMarketFields key="pm" amount={amount} setAmount={setAmount} disabled={!!loadingSide} />
                    )}
                    {orderMode === 'LIMIT' && (
                      <ProLimitFields
                        key="pl"
                        amount={amount}
                        setAmount={setAmount}
                        limitPrice={limitPrice}
                        setLimitPrice={setLimitPrice}
                        disabled={!!loadingSide}
                        aiHighlight={aiHighlight.entry}
                      />
                    )}
                    {orderMode === 'DCA' && (
                      <ProDCAFields
                        key="pd"
                        totalAmount={dcaTotal}
                        setTotalAmount={setDcaTotal}
                        perTrade={dcaPerTrade}
                        setPerTrade={setDcaPerTrade}
                        freqHours={dcaFreqHours}
                        setFreqHours={setDcaFreqHours}
                        disabled={!!loadingSide}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Risk panel always visible in Pro */}
                {orderMode !== 'DCA' && (
                  <ProRiskPanel
                    takeProfit={takeProfit}
                    setTakeProfit={setTakeProfit}
                    stopLoss={stopLoss}
                    setStopLoss={setStopLoss}
                    disabled={!!loadingSide}
                    aiHighlightTP={aiHighlight.tp}
                    aiHighlightSL={aiHighlight.sl}
                  />
                )}
              </>
            )}

            {/* BUY / SELL */}
            <div className={`mt-5 grid gap-3 ${orderMode === 'DCA' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <TradeButton
                action="BUY"
                loading={loadingSide === 'BUY'}
                disabled={isDisabled}
                onClick={execute}
                mode={orderMode}
                isPro={isProMode}
              />
              {orderMode !== 'DCA' && (
                <TradeButton
                  action="SELL"
                  loading={loadingSide === 'SELL'}
                  disabled={isDisabled}
                  onClick={execute}
                  mode={orderMode}
                  isPro={isProMode}
                />
              )}
            </div>
          </div>
        </TiltCard>

        {/* Execution log */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${isProMode ? 'bg-red-700' : 'bg-neutral-500'}`} />
            <p className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${isProMode ? 'text-red-700/70' : 'text-neutral-500'}`}>
              Execution Log
            </p>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 480 }}>
            <AnimatePresence>
              {log.length > 0 ? (
                log.map((entry, idx) => (
                  <LogEntry key={`${entry.time}-${idx}`} entry={entry} idx={idx} isPro={isProMode} />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`rounded-xl border px-4 py-6 text-center ${
                    isProMode ? 'border-red-900/20 bg-black/20' : 'border-white/5 bg-neutral-950/20'
                  }`}
                >
                  <p className={`text-xs ${isProMode ? 'text-red-900' : 'text-neutral-700'}`}>
                    No trades executed yet.<br />Use the terminal to submit an order.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} dismiss={dismiss} />
    </div>
  )
}
