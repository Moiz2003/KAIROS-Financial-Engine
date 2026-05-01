import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { Zap, ShieldCheck, ShieldOff, Clock } from 'lucide-react'
import { apiPost, apiGet } from '../lib/api'

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT']

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
}

const toastIcon = {
  success: ShieldCheck,
  warning: ShieldOff,
  error:   Zap,
}

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

// ── 3D tilt card ──────────────────────────────────────────────────────────────

function TiltCard({ children, flash }) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rawRotateX = useTransform(mouseY, [-150, 150], [6, -6])
  const rawRotateY = useTransform(mouseX, [-150, 150], [-6, 6])
  const rotateX = useSpring(rawRotateX, { stiffness: 180, damping: 24 })
  const rotateY = useSpring(rawRotateY, { stiffness: 180, damping: 24 })

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width  / 2)
    mouseY.set(e.clientY - rect.top  - rect.height / 2)
  }
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0) }

  return (
    <motion.div
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        boxShadow: flash
          ? '0 0 0 2px rgba(52,211,153,0.55), 0 24px 80px rgba(52,211,153,0.20)'
          : '0 20px 50px rgba(0,0,0,0.40)',
      }}
      transition={{ boxShadow: { duration: 0.35 } }}
      className={`relative overflow-hidden rounded-3xl border bg-neutral-900/30 backdrop-blur-2xl transition-colors duration-500 ${
        flash ? 'border-emerald-400/40' : 'border-white/5'
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {children}
    </motion.div>
  )
}

// ── Button with ripple ────────────────────────────────────────────────────────

function TradeButton({ action, loading, disabled, onClick }) {
  const isBuy  = action === 'BUY'
  const active = !disabled && !loading
  return (
    <motion.button
      onClick={() => active && onClick(action)}
      disabled={disabled || loading}
      whileTap={active ? { scale: 0.93, y: 2 } : {}}
      whileHover={active ? { scale: 1.02 } : {}}
      transition={{ type: 'spring', stiffness: 480, damping: 28 }}
      className={`relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl text-base font-extrabold tracking-wide transition-all ${
        isBuy
          ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 shadow-lg shadow-emerald-900/30'
          : 'border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 shadow-lg shadow-rose-900/30'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {/* shimmer on hover */}
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
          <Zap className="h-4 w-4" />
          {action}
        </span>
      )}
    </motion.button>
  )
}

// ── Execution log entry ───────────────────────────────────────────────────────

function LogEntry({ entry, idx }) {
  const isSuccess = entry.type === 'success'
  const isWarning = entry.type === 'warning'
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: idx * 0.04 }}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
        isSuccess ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
        : isWarning ? 'border-yellow-500/20 bg-yellow-500/5 text-yellow-300'
        : 'border-rose-500/20 bg-rose-500/5 text-rose-300'
      }`}
    >
      {isSuccess ? <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
       : isWarning ? <ShieldOff className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
       : <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
      <div>
        <span className="font-semibold">{entry.title}</span>
        {entry.message && <p className="mt-0.5 opacity-70">{entry.message}</p>}
      </div>
      <span className="ml-auto flex-shrink-0 opacity-50">{entry.time}</span>
    </motion.div>
  )
}

// ── God Mode toggle ───────────────────────────────────────────────────────────

function GodModeToggle({ enabled, onToggle }) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      animate={{
        boxShadow: enabled
          ? '0 0 22px 5px rgba(239,68,68,0.38), 0 0 44px 10px rgba(251,146,60,0.18)'
          : 'none',
      }}
      transition={{ duration: 0.3 }}
      className={`mb-5 flex w-full cursor-pointer select-none items-center justify-between rounded-xl border px-4 py-3 transition-colors duration-300 ${
        enabled
          ? 'border-red-500/50 bg-red-950/40'
          : 'border-zinc-800/60 bg-zinc-950/50'
      }`}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-2.5">
        {enabled ? (
          <Zap className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500" />
        )}
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

      {/* Track + thumb */}
      <div
        className={`relative h-5 w-10 flex-shrink-0 rounded-full transition-colors duration-300 ${
          enabled ? 'bg-red-600/80' : 'bg-zinc-700/80'
        }`}
      >
        <motion.div
          animate={{ x: enabled ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm ${
            enabled ? 'bg-red-100' : 'bg-zinc-300'
          }`}
        />
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TerminalPage() {
  const [symbol,      setSymbol]      = useState('BTCUSDT')
  const [amount,      setAmount]      = useState('')
  const [loadingSide, setLoadingSide] = useState(null)
  const [flash,       setFlash]       = useState(false)
  const [log,         setLog]         = useState([])
  const [godMode,     setGodMode]     = useState(false)
  const { toasts, addToast, dismiss } = useToasts()

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
      // non-fatal — in-session local log remains intact
    }
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

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
        god_mode: godMode,
      })

      if (result.approved_for_execution && result.execution_result) {
        const ex = result.execution_result
        setFlash(true)
        setTimeout(() => setFlash(false), 2500)
        const msg = `${action} ${ex.quantity} ${symbol} @ $${ex.fill_price}`
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

  const isDisabled = !!loadingSide || !amount || parseFloat(amount) <= 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header info */}
      <div className="flex items-center gap-3 text-xs text-neutral-600">
        <Clock className="h-3.5 w-3.5" />
        <span>Full pipeline: TA → AI Sentiment → Reality Check → Risk Gate → Execute</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* Terminal card with 3D tilt */}
        <TiltCard flash={flash}>
          <div className="p-7">
            {/* Label */}
            <div className="mb-6 flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                Execution Terminal
              </p>
              <span className="ml-auto rounded-full border border-white/5 bg-neutral-950/60 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-neutral-600">
                Testnet
              </span>
            </div>

            {/* Symbol select */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                Trading Pair
              </label>
              <div className="relative">
                <select
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  disabled={!!loadingSide}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-3 text-lg font-bold text-neutral-100 focus:border-emerald-500/40 focus:outline-none disabled:opacity-50"
                >
                  {SYMBOLS.map(s => (
                    <option key={s} value={s} className="bg-neutral-900 font-semibold">
                      {s.replace('USDT', ' / USDT')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* God Mode toggle */}
            <GodModeToggle enabled={godMode} onToggle={() => setGodMode(g => !g)} />

            {/* Amount */}
            <div className="mb-7">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
                Trade Amount <span className="normal-case font-normal text-neutral-700">(USDT)</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
                disabled={!!loadingSide}
                className="w-full rounded-xl border border-white/10 bg-neutral-950/60 px-4 py-4 text-2xl font-extrabold tabular-nums text-neutral-100 placeholder-neutral-700 transition focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
              />
              {/* Quick amounts */}
              <div className="mt-2 flex gap-2">
                {[100, 500, 1000, 5000].map(v => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    disabled={!!loadingSide}
                    className="flex-1 rounded-lg border border-white/5 bg-neutral-950/40 py-1 text-[10px] font-semibold text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300 disabled:opacity-40"
                  >
                    {v >= 1000 ? `$${v / 1000}k` : `$${v}`}
                  </button>
                ))}
              </div>
            </div>

            {/* BUY / SELL */}
            <div className="grid grid-cols-2 gap-3">
              <TradeButton action="BUY"  loading={loadingSide === 'BUY'}  disabled={isDisabled} onClick={execute} />
              <TradeButton action="SELL" loading={loadingSide === 'SELL'} disabled={isDisabled} onClick={execute} />
            </div>
          </div>
        </TiltCard>

        {/* Execution log */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
              Execution Log
            </p>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 480 }}>
            <AnimatePresence>
              {log.length > 0 ? (
                log.map((entry, idx) => <LogEntry key={`${entry.time}-${idx}`} entry={entry} idx={idx} />)
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-white/5 bg-neutral-950/20 px-4 py-6 text-center"
                >
                  <p className="text-xs text-neutral-700">No trades executed yet.<br />Use the terminal to submit an order.</p>
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
