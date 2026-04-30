import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Derive ws:// or wss:// from the existing VITE_API_BASE env var so there
// is no second env var to configure.
const WS_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8000')
  .replace(/^http/, 'ws')
const WS_URL = `${WS_BASE}/api/market/stream`

const INITIAL_BACKOFF = 1_000   // ms
const MAX_BACKOFF     = 30_000
const BACKOFF_FACTOR  = 2

export default function LiveTicker() {
  const [ticker, setTicker] = useState(null)   // last bookTicker message
  const [kline,  setKline]  = useState(null)   // last kline message
  const [status, setStatus] = useState('connecting')

  const wsRef      = useRef(null)
  const backoffRef = useRef(INITIAL_BACKOFF)
  const deadRef    = useRef(false)

  useEffect(() => {
    deadRef.current = false
    let timer

    function connect() {
      if (deadRef.current) return
      setStatus('connecting')

      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        backoffRef.current = INITIAL_BACKOFF
        setStatus('connected')
      }

      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          if      (msg.type === 'ticker') setTicker(msg)
          else if (msg.type === 'kline')  setKline(msg)
        } catch {}
      }

      ws.onclose = () => {
        if (deadRef.current) return
        setStatus('disconnected')
        timer = setTimeout(() => {
          backoffRef.current = Math.min(
            backoffRef.current * BACKOFF_FACTOR,
            MAX_BACKOFF,
          )
          connect()
        }, backoffRef.current)
      }

      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      deadRef.current = true
      clearTimeout(timer)
      wsRef.current?.close()
    }
  }, [])

  const parseNum = (s) => parseFloat((s ?? '0').replace(/,/g, ''))
  const priceUp  = kline
    ? parseNum(kline.close) >= parseNum(kline.open)
    : true

  const statusConfig = {
    connected:    { dot: 'bg-emerald-400', pulse: true,  label: 'Live'         },
    connecting:   { dot: 'bg-amber-400',   pulse: true,  label: 'Connecting'   },
    disconnected: { dot: 'bg-rose-500',    pulse: false, label: 'Disconnected' },
  }[status]

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/30 p-6 backdrop-blur-2xl shadow-xl shadow-black/30"
    >
      {/* Inner top-edge highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* ── Header ── */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
          <h2 className="text-[10px] font-semibold tracking-widest uppercase text-neutral-500">
            Live Market Feed
          </h2>
        </div>
        <span className="text-[10px] text-neutral-700">{statusConfig.label}</span>
      </div>

      {ticker ? (
        <div className="space-y-4">
          {/* ── Price ── */}
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-600">
              BTC / USDT
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={ticker.price}
                initial={{ opacity: 0.4, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`text-4xl font-extrabold tabular-nums tracking-tight ${
                  priceUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${ticker.price}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* ── Bid / Ask / Spread ── */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Bid',    value: ticker.bid,    color: 'text-emerald-400' },
              { label: 'Ask',    value: ticker.ask,    color: 'text-rose-400'    },
              { label: 'Spread', value: ticker.spread, color: 'text-neutral-300' },
            ].map(({ label, value, color }) => (
              <motion.div
                key={label}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="rounded-2xl border border-white/5 bg-neutral-950/50 p-3"
              >
                <p className="mb-1 text-[10px] text-neutral-600">{label}</p>
                <p className={`text-sm font-semibold tabular-nums ${color}`}>${value}</p>
              </motion.div>
            ))}
          </div>

          {/* ── 1m OHLC Candle ── */}
          {kline && (
            <div className="rounded-2xl border border-white/5 bg-neutral-950/40 p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-neutral-600">
                  1m Candle
                </p>
                {kline.closed && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    Closed
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'O', value: kline.open,  color: 'text-neutral-400' },
                  { label: 'H', value: kline.high,  color: 'text-emerald-400' },
                  { label: 'L', value: kline.low,   color: 'text-rose-400'    },
                  { label: 'C', value: kline.close, color: priceUp ? 'text-emerald-400' : 'text-rose-400' },
                ].map(({ label, value, color }) => (
                  <motion.div
                    key={label}
                    whileHover={{ y: -1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    <p className="text-[10px] text-neutral-700">{label}</p>
                    <p className={`text-xs font-semibold tabular-nums ${color}`}>${value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Loading skeleton ── */
        <div className="animate-pulse space-y-4">
          <div>
            <div className="mb-2 h-2 w-16 rounded-lg bg-neutral-800" />
            <div className="h-10 w-40 rounded-lg bg-neutral-800" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-white/5 bg-neutral-950/50 p-3">
                <div className="mb-2 h-2 w-8 rounded bg-neutral-800" />
                <div className="h-4 w-14 rounded bg-neutral-800" />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  )
}
