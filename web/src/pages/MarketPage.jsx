import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws')
const wsUrl = `${wsBase}/api/market/stream`
const INITIAL_BACKOFF = 1_000
const MAX_BACKOFF = 30_000
const BACKOFF_FACTOR = 2

function useMarketWS() {
  const [ticker, setTicker] = useState(null)
  const [kline, setKline] = useState(null)
  const [status, setStatus] = useState('connecting')

  const wsRef = useRef(null)
  const backoffRef = useRef(INITIAL_BACKOFF)
  const deadRef = useRef(false)

  useEffect(() => {
    deadRef.current = false
    let timer
    function connect() {
      if (deadRef.current) return
      setStatus('connecting')
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.onopen = () => { backoffRef.current = INITIAL_BACKOFF; setStatus('connected') }
      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          if (msg.type === 'ticker') setTicker(msg)
          else if (msg.type === 'kline') setKline(msg)
        } catch { /* ignore malformed */ }
      }
      ws.onclose = () => {
        if (deadRef.current) return
        setStatus('disconnected')
        timer = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * BACKOFF_FACTOR, MAX_BACKOFF)
          connect()
        }, backoffRef.current)
      }
      ws.onerror = () => ws.close()
    }
    connect()
    return () => { deadRef.current = true; clearTimeout(timer); wsRef.current?.close() }
  }, [])

  return { ticker, kline, status }
}

const statusConfig = {
  connected: { dot: 'bg-emerald-400', pulse: true, label: 'Live', text: 'text-emerald-400' },
  connecting: { dot: 'bg-amber-400', pulse: true, label: 'Connecting', text: 'text-amber-400' },
  disconnected: { dot: 'bg-rose-500', pulse: false, label: 'Disconnected', text: 'text-rose-400' },
}

function StatCard({ label, value, color = 'text-neutral-100', sub }) {
  return (
    <motion.div
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.1)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="rounded-2xl border border-white/5 bg-neutral-950/50 p-4"
    >
      <p className="mb-1 text-[10px] uppercase tracking-widest text-neutral-600">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-neutral-700">{sub}</p>}
    </motion.div>
  )
}

export default function MarketPage() {
  const { ticker, kline, status } = useMarketWS()
  const cfg = statusConfig[status]
  const parseNum = (s) => parseFloat((s ?? '0').replace(/,/g, ''))
  const priceUp = kline ? parseNum(kline.close) >= parseNum(kline.open) : true

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* Status banner */}
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
        <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
        <span className="text-xs text-neutral-700">· BTC/USDT Binance WebSocket</span>
      </div>

      {/* Price hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/30 p-8 backdrop-blur-2xl shadow-xl shadow-black/30">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-600">
          BTC / USDT · Last Price
        </p>

        {ticker ? (
          <AnimatePresence mode="wait">
            <motion.p
              key={ticker.price}
              initial={{ opacity: 0.4, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`text-6xl font-extrabold tabular-nums tracking-tight ${priceUp ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              ${ticker.price}
            </motion.p>
          </AnimatePresence>
        ) : (
          <div className="animate-pulse">
            <div className="h-16 w-64 rounded-xl bg-neutral-800" />
          </div>
        )}

        {/* Bid / Ask / Spread */}
        {ticker && (
          <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-3">
            <StatCard label="Bid" value={`$${ticker.bid}`} color="text-emerald-400" />
            <StatCard label="Ask" value={`$${ticker.ask}`} color="text-rose-400" />
            <StatCard label="Spread" value={`$${ticker.spread}`} />
          </div>
        )}
      </div>

      {/* 1m Candle */}
      {kline && (
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/30 p-6 backdrop-blur-2xl shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="mb-5 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-600">
              1 Minute Candle · OHLC
            </p>
            <div className="flex items-center gap-2">
              {kline.closed && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Closed
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${priceUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {priceUp ? '▲ Bullish' : '▼ Bearish'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Open', value: kline.open, color: 'text-neutral-300' },
              { label: 'High', value: kline.high, color: 'text-emerald-400' },
              { label: 'Low', value: kline.low, color: 'text-rose-400' },
              { label: 'Close', value: kline.close, color: priceUp ? 'text-emerald-400' : 'text-rose-400' },
            ].map(({ label, value, color }) => (
              <motion.div
                key={label}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="rounded-2xl border border-white/5 bg-neutral-950/60 p-4 text-center"
              >
                <p className="mb-1.5 text-[10px] uppercase tracking-widest text-neutral-600">{label}</p>
                <p className={`text-lg font-bold tabular-nums ${color}`}>${value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Connection skeleton while loading */}
      {!ticker && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-neutral-900/30 p-4">
              <div className="mb-2 h-2 w-12 rounded bg-neutral-800" />
              <div className="h-6 w-20 rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
