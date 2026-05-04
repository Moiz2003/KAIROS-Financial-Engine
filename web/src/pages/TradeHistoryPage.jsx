import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Trophy, Target, BarChart2,
  Clock, DollarSign, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { apiGet } from '../lib/api'
import { useProMode } from '../context/ProModeContext'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n, decimals = 2) {
  if (n == null) return '—'
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── HUD Metric Card ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, icon: Icon, accent, delay = 0, isPro }) {
  const stdColors = {
    emerald: {
      border: 'border-emerald-500/25', glow: 'shadow-emerald-500/15', text: 'text-emerald-400',
      bg: 'from-emerald-500/10 to-emerald-500/3', icon: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      ambient: 'bg-emerald-400',
    },
    rose: {
      border: 'border-rose-500/25', glow: 'shadow-rose-500/15', text: 'text-rose-400',
      bg: 'from-rose-500/10 to-rose-500/3', icon: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
      ambient: 'bg-rose-400',
    },
    violet: {
      border: 'border-violet-500/25', glow: 'shadow-violet-500/15', text: 'text-violet-400',
      bg: 'from-violet-500/10 to-violet-500/3', icon: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
      ambient: 'bg-violet-400',
    },
    cyan: {
      border: 'border-cyan-500/25', glow: 'shadow-cyan-500/15', text: 'text-cyan-400',
      bg: 'from-cyan-500/10 to-cyan-500/3', icon: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
      ambient: 'bg-cyan-400',
    },
  }

  const proColors = {
    emerald: {
      border: 'border-emerald-900/40', glow: 'shadow-black/60', text: 'text-emerald-400',
      bg: 'from-emerald-950/40 to-black/0', icon: 'border-emerald-900/40 bg-emerald-950/30 text-emerald-500',
      ambient: 'bg-emerald-700',
    },
    rose: {
      border: 'border-red-900/40', glow: 'shadow-black/60', text: 'text-red-400',
      bg: 'from-red-950/40 to-black/0', icon: 'border-red-900/40 bg-red-950/30 text-red-500',
      ambient: 'bg-red-700',
    },
    violet: {
      border: 'border-red-900/30', glow: 'shadow-black/60', text: 'text-red-300',
      bg: 'from-red-950/20 to-black/0', icon: 'border-red-900/30 bg-red-950/20 text-red-400',
      ambient: 'bg-red-800',
    },
    cyan: {
      border: 'border-zinc-800/60', glow: 'shadow-black/60', text: 'text-zinc-200',
      bg: 'from-zinc-900/40 to-black/0', icon: 'border-zinc-800/50 bg-zinc-900/40 text-zinc-400',
      ambient: 'bg-zinc-700',
    },
  }

  const palette = isPro ? proColors : stdColors
  const c = palette[accent] ?? palette.cyan

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 400, damping: 26 } }}
      className={`relative overflow-hidden border p-7 shadow-2xl backdrop-blur-xl ${c.border} ${c.glow} ${
        isPro ? 'rounded-xl bg-black/95' : 'rounded-3xl bg-neutral-900/50'
      }`}
    >
      <div className={`pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full blur-3xl opacity-12 ${c.ambient}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${c.bg} opacity-60`} />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isPro ? 'text-red-900/55' : 'text-neutral-500'}`}>
            {label}
          </p>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${c.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <motion.p
          key={String(value)}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`text-4xl font-black tabular-nums leading-none tracking-tight ${isPro ? 'font-mono' : ''} ${c.text}`}
          style={{ textShadow: `0 0 32px currentColor` }}
        >
          {value}
        </motion.p>

        {sub && (
          <p className={`mt-2 text-xs font-medium ${isPro ? 'text-red-900/45' : 'text-neutral-600'}`}>{sub}</p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Custom Tooltip (AreaChart) ───────────────────────────────────────────────

function EquityTooltip({ active, payload, label, isPro }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  const pos = val >= 0
  return (
    <div className={`rounded-xl border px-4 py-3 shadow-xl backdrop-blur-xl ${
      isPro
        ? 'border-red-900/40 bg-black/95'
        : 'border-white/10 bg-neutral-900/95'
    }`}>
      <p className={`mb-1 text-[10px] uppercase tracking-widest ${isPro ? 'text-red-900/55' : 'text-neutral-500'}`}>{label}</p>
      <p className={`text-lg font-black tabular-nums ${isPro ? 'font-mono' : ''} ${
        pos
          ? (isPro ? 'text-emerald-400' : 'text-emerald-400')
          : (isPro ? 'text-red-400'     : 'text-rose-400')
      }`}>
        {pos ? '+' : ''}{fmt(val)} USDT
      </p>
    </div>
  )
}

// ─── Custom Tooltip (Pie) ─────────────────────────────────────────────────────

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  const isWin = name === 'Wins'
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900/95 px-4 py-3 shadow-xl backdrop-blur-xl">
      <p className={`text-sm font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
        {name}: {value}
      </p>
    </div>
  )
}

// ─── Trade Row ────────────────────────────────────────────────────────────────

function TradeRow({ trade, idx, isPro }) {
  const isWin  = trade.realized_pnl >= 0
  const isLong = trade.side === 'LONG'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative overflow-hidden px-5 py-4 backdrop-blur-xl transition-all ${
        isPro
          ? 'rounded-lg border border-zinc-900/60 bg-black/90 hover:border-red-900/40 hover:bg-black/95'
          : 'rounded-2xl border border-white/5 bg-neutral-900/40 hover:border-white/10 hover:bg-neutral-900/60'
      }`}
    >
      {/* Side accent bar */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 rounded-r-full ${
        isWin
          ? (isPro
              ? 'w-[3px] bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
              : 'w-[3px] bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]')
          : (isPro
              ? 'w-[3px] bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.6)]'
              : 'w-[3px] bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]')
      }`} />

      <div className="flex items-center gap-4">
        {/* Symbol */}
        <div className="min-w-[80px]">
          <p className={`text-sm font-black tracking-tight ${isPro ? 'font-mono text-white' : 'text-neutral-100'}`}>
            {(trade.symbol || '').replace('USDT', '')}
            <span className={isPro ? 'text-zinc-700' : 'text-neutral-600'}>/USDT</span>
          </p>
          <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${
            isPro
              ? (isLong
                  ? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-500'
                  : 'border-red-800/50 bg-red-950/40 text-red-400')
              : (isLong
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400')
          }`}>
            {trade.side}
          </span>
        </div>

        {/* Entry / Exit */}
        <div className="hidden flex-1 grid-cols-2 gap-4 sm:grid">
          <div>
            <p className={`text-[9px] uppercase tracking-widest ${isPro ? 'text-red-900/55' : 'text-neutral-600'}`}>Entry</p>
            <p className={`text-sm font-bold tabular-nums ${isPro ? 'font-mono text-zinc-300' : 'text-neutral-300'}`}>
              ${fmt(trade.entry_price, 4)}
            </p>
          </div>
          <div>
            <p className={`text-[9px] uppercase tracking-widest ${isPro ? 'text-red-900/55' : 'text-neutral-600'}`}>Close</p>
            <p className={`text-sm font-bold tabular-nums ${isPro ? 'font-mono text-zinc-300' : 'text-neutral-300'}`}>
              ${fmt(trade.close_price, 4)}
            </p>
          </div>
        </div>

        {/* Qty */}
        <div className="hidden min-w-[80px] sm:block">
          <p className={`text-[9px] uppercase tracking-widest ${isPro ? 'text-red-900/55' : 'text-neutral-600'}`}>Qty</p>
          <p className={`text-sm font-bold tabular-nums ${isPro ? 'font-mono text-zinc-300' : 'text-neutral-300'}`}>
            {fmt(trade.quantity, 4)}
          </p>
        </div>

        {/* Date */}
        <div className="hidden min-w-[120px] md:block">
          <p className={`text-[9px] uppercase tracking-widest ${isPro ? 'text-red-900/55' : 'text-neutral-600'}`}>Closed</p>
          <p className={`text-xs ${isPro ? 'text-zinc-600' : 'text-neutral-500'}`}>{fmtDate(trade.closed_at)}</p>
        </div>

        {/* Realized PnL */}
        <div className="ml-auto text-right">
          <div className={`flex items-center justify-end gap-1 font-black tabular-nums text-lg leading-none ${
            isWin
              ? (isPro ? 'font-mono text-emerald-400' : 'text-emerald-400')
              : (isPro ? 'font-mono text-red-400'     : 'text-rose-400')
          }`}
            style={isPro ? {
              textShadow: isWin
                ? '0 0 16px rgba(52,211,153,0.35)'
                : '0 0 16px rgba(220,38,38,0.35)',
            } : {}}
          >
            {isWin ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {isWin ? '+' : ''}{fmt(trade.realized_pnl)}
          </div>
          <p className={`mt-0.5 text-[10px] ${isPro ? 'text-red-900/45' : 'text-neutral-600'}`}>USDT</p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TradeHistoryPage() {
  const { isProMode } = useProMode()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/portfolio/history')
      .then(d => setData(d))
      .catch(() => setData({ trades: [], stats: { total_trades: 0, win_count: 0, loss_count: 0, win_rate: 0, total_realized_pnl: 0 } }))
      .finally(() => setLoading(false))
  }, [])

  const stats  = data?.stats  ?? {}
  const trades = data?.trades ?? []

  const isProfit = (stats.total_realized_pnl ?? 0) >= 0

  const equityCurve = useMemo(() => {
    const sorted = [...trades].reverse()
    let running = 0
    return sorted.map((t, i) => {
      running += t.realized_pnl ?? 0
      return { name: `#${i + 1}`, pnl: parseFloat(running.toFixed(4)) }
    })
  }, [trades])

  const pieData = [
    { name: 'Wins',   value: stats.win_count  ?? 0 },
    { name: 'Losses', value: stats.loss_count ?? 0 },
  ]
  const PIE_COLORS = ['#34d399', '#f87171']
  const PRO_PIE_COLORS = ['#10b981', '#ef4444']

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className={`text-sm font-semibold uppercase tracking-widest ${isProMode ? 'text-red-900/60' : 'text-neutral-600'}`}
        >
          {isProMode ? 'LOADING LEDGER…' : 'Loading History…'}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-24">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-end justify-between"
      >
        <div>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${isProMode ? 'text-red-700/55' : 'text-neutral-600'}`}>
            {isProMode ? 'KAIROS PRO' : 'Quant Play'}
          </p>
          <h1 className={`mt-1 text-3xl font-black tracking-tight ${isProMode ? 'text-white' : 'text-neutral-50'}`}>
            {isProMode ? 'TRADE LEDGER' : 'Analytics Dashboard'}
          </h1>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-xl ${
          isProMode
            ? 'border-red-900/30 bg-black/70'
            : 'border-white/5 bg-neutral-900/60'
        }`}>
          {isProMode ? (
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_2px_rgba(220,38,38,0.5)]"
            />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]" />
          )}
          <p className={`text-[10px] font-semibold uppercase tracking-widest ${isProMode ? 'text-red-700/60' : 'text-neutral-500'}`}>
            {stats.total_trades} Closed Trades
          </p>
        </div>
      </motion.div>

      {/* ── HUD: Metric cards ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <MetricCard
          label="Total Realized PnL"
          value={`${isProfit ? '+' : ''}${fmt(stats.total_realized_pnl)} USDT`}
          sub={isProfit ? 'Cumulative profit across all closed trades' : 'Cumulative loss across all closed trades'}
          icon={isProfit ? TrendingUp : TrendingDown}
          accent={isProfit ? 'emerald' : 'rose'}
          delay={0}
          isPro={isProMode}
        />
        <MetricCard
          label="Win Rate"
          value={`${fmt(stats.win_rate, 1)}%`}
          sub={`${stats.win_count ?? 0} wins · ${stats.loss_count ?? 0} losses`}
          icon={Trophy}
          accent="violet"
          delay={0.07}
          isPro={isProMode}
        />
        <MetricCard
          label="Total Trades"
          value={stats.total_trades ?? 0}
          sub="Fully closed positions archived"
          icon={BarChart2}
          accent="cyan"
          delay={0.14}
          isPro={isProMode}
        />
      </div>

      {/* ── Charts ── */}
      {trades.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* Equity Curve */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`relative overflow-hidden p-6 backdrop-blur-xl shadow-2xl lg:col-span-3 ${
              isProMode
                ? 'rounded-xl border border-red-900/35 bg-black/95'
                : 'rounded-3xl border border-white/5 bg-neutral-900/50'
            }`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className={`pointer-events-none absolute -top-20 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full blur-3xl opacity-12 ${isProfit ? 'bg-emerald-500' : (isProMode ? 'bg-red-600' : 'bg-rose-400')}`} />

            <div className="relative mb-6 flex items-center justify-between">
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isProMode ? 'text-red-700/55' : 'text-neutral-600'}`}>
                  {isProMode ? 'EQUITY CURVE' : 'Equity Curve'}
                </p>
                <p className={`mt-0.5 text-sm font-bold ${isProMode ? 'text-zinc-300' : 'text-neutral-300'}`}>
                  Cumulative PnL over trades
                </p>
              </div>
              <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                isProMode
                  ? (isProfit
                      ? 'border-emerald-900/40 bg-emerald-950/30 text-emerald-500'
                      : 'border-red-900/40 bg-red-950/30 text-red-400')
                  : (isProfit
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                      : 'border-rose-500/25 bg-rose-500/10 text-rose-400')
              }`}>
                {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isProfit ? 'Profitable' : 'In Drawdown'}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={isProfit ? (isProMode ? '#10b981' : '#34d399') : (isProMode ? '#ef4444' : '#f87171')} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={isProfit ? (isProMode ? '#10b981' : '#34d399') : (isProMode ? '#ef4444' : '#f87171')} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isProMode ? 'rgba(127,29,29,0.12)' : 'rgba(255,255,255,0.04)'} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: isProMode ? '#450a0a' : '#525252', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: isProMode ? '#450a0a' : '#525252', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}`}
                />
                <Tooltip content={<EquityTooltip isPro={isProMode} />} />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke={isProfit ? (isProMode ? '#10b981' : '#34d399') : (isProMode ? '#ef4444' : '#f87171')}
                  strokeWidth={2.5}
                  fill="url(#equityGrad)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: isProfit ? (isProMode ? '#10b981' : '#34d399') : (isProMode ? '#ef4444' : '#f87171') }}
                  style={{ filter: `drop-shadow(0 0 6px ${isProfit ? (isProMode ? 'rgba(16,185,129,0.6)' : 'rgba(52,211,153,0.6)') : (isProMode ? 'rgba(239,68,68,0.6)' : 'rgba(248,113,113,0.6)')})` }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Win / Loss Donut */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`relative overflow-hidden p-6 backdrop-blur-xl shadow-2xl lg:col-span-2 ${
              isProMode
                ? 'rounded-xl border border-red-900/30 bg-black/95'
                : 'rounded-3xl border border-white/5 bg-neutral-900/50'
            }`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className={`pointer-events-none absolute -top-16 right-0 h-32 w-32 rounded-full blur-3xl ${isProMode ? 'bg-red-800/10' : 'bg-violet-500/15'}`} />

            <div className="relative mb-4">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isProMode ? 'text-red-700/55' : 'text-neutral-600'}`}>
                {isProMode ? 'WIN / LOSS RATIO' : 'Win / Loss Ratio'}
              </p>
              <p className={`mt-0.5 text-sm font-bold ${isProMode ? 'text-zinc-300' : 'text-neutral-300'}`}>
                Distribution of outcomes
              </p>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, i) => {
                    const colors = isProMode ? PRO_PIE_COLORS : PIE_COLORS
                    return (
                      <Cell
                        key={i}
                        fill={colors[i]}
                        style={{ filter: `drop-shadow(0 0 6px ${colors[i]}99)` }}
                      />
                    )
                  })}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: isProMode ? '#450a0a' : '#a3a3a3', fontSize: 11 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
              <div className="text-center">
                <p className={`text-2xl font-black ${isProMode ? 'font-mono text-zinc-100' : 'text-neutral-100'}`}>
                  {fmt(stats.win_rate, 1)}%
                </p>
                <p className={`text-[9px] uppercase tracking-widest ${isProMode ? 'text-red-900/55' : 'text-neutral-600'}`}>
                  Win Rate
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── The Ledger ── */}
      <div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mb-5 flex items-center gap-2"
        >
          {isProMode ? (
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_2px_rgba(220,38,38,0.5)]"
            />
          ) : (
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_3px_rgba(34,211,238,0.4)]" />
          )}
          <h2 className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isProMode ? 'text-red-700/55' : 'text-neutral-500'}`}>
            {isProMode ? 'EXECUTION LEDGER' : 'Trade Ledger'}
          </h2>
          <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
            isProMode
              ? 'border-zinc-900 bg-black/60 text-zinc-500'
              : 'border-white/5 bg-neutral-800 text-neutral-300'
          }`}>
            {trades.length}
          </span>
        </motion.div>

        <AnimatePresence>
          {trades.length === 0 ? (
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
              <p className="mb-3 text-3xl">📂</p>
              <p className={`text-sm font-bold ${isProMode ? 'text-zinc-600' : 'text-neutral-500'}`}>
                No closed trades yet.
              </p>
              <p className={`mt-1 text-xs ${isProMode ? 'text-red-900/35' : 'text-neutral-700'}`}>
                Close a position from the Portfolio page to archive it here.
              </p>
            </motion.div>
          ) : (
            <motion.div layout className="space-y-2.5">
              {trades.map((trade, idx) => (
                <TradeRow key={trade._id ?? idx} trade={trade} idx={idx} isPro={isProMode} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
