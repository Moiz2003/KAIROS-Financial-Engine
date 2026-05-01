import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, RefreshCw, Brain, Newspaper } from 'lucide-react'
import { apiGet } from '../lib/api'

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT']

const sentimentMeta = (s) => {
  if (!s) return { label: 'Unknown', cls: 'border-neutral-700 bg-neutral-800/50 text-neutral-400', bar: 'bg-neutral-600', pct: 0 }
  const v = s.toLowerCase()
  if (v === 'bullish') return { label: 'Bullish', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', bar: 'bg-emerald-400', pct: 80 }
  if (v === 'bearish') return { label: 'Bearish', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-400',         bar: 'bg-rose-400',     pct: 25 }
  return { label: 'Neutral', cls: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', bar: 'bg-yellow-400', pct: 50 }
}

function ArticleCard({ article, idx }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * 0.05 }}
      layout
      className="group overflow-hidden rounded-2xl border border-white/5 bg-neutral-950/40 transition hover:border-white/10 hover:bg-neutral-900/60"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3.5 text-left"
      >
        <p className="text-sm font-medium leading-snug text-neutral-200 group-hover:text-neutral-100 line-clamp-2">
          {article.title}
        </p>
        <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-600">
          <span>{article.source}</span>
          <span>{new Date(article.timestamp).toLocaleDateString()}</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Read full article
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function IntelligencePage() {
  const [symbol,   setSymbol]   = useState('BTCUSDT')
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [rotating, setRotating] = useState(false)

  const load = (sym) => {
    setLoading(true)
    apiGet(`/api/debug/pipeline?symbol=${sym}&interval=4h&limit=200&news_limit=12`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(symbol) }, [symbol])

  const refresh = async () => {
    setRotating(true)
    load(symbol)
    setTimeout(() => setRotating(false), 800)
  }

  const sentiment  = data?.panel_b?.sentiment_score
  const summary    = data?.panel_b?.summary
  const articles   = data?.panel_a?.articles ?? []
  const smeta      = sentimentMeta(sentiment)

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-800/60 bg-neutral-900/80 px-3 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-600">Symbol</span>
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="bg-transparent text-sm font-semibold text-neutral-200 focus:outline-none"
          >
            {SYMBOLS.map(s => (
              <option key={s} value={s} className="bg-neutral-900">
                {s.replace('USDT', '/USDT')}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-800/60 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${rotating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Sentiment card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/30 p-6 backdrop-blur-xl shadow-xl shadow-black/30">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-cyan-400" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
              AI Market Intelligence · {symbol.replace('USDT', '/USDT')}
            </p>
          </div>
          {sentiment && !loading && (
            <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest ${smeta.cls}`}>
              {smeta.label}
            </span>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-full rounded bg-neutral-800" />
            <div className="h-4 w-3/4 rounded bg-neutral-800" />
            <div className="h-4 w-5/6 rounded bg-neutral-800" />
          </div>
        ) : summary ? (
          <>
            <p className="text-sm leading-relaxed text-neutral-300">{summary}</p>

            {/* Sentiment bar */}
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[10px] text-neutral-700">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <motion.div
                  className={`h-full rounded-full ${smeta.bar}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${smeta.pct}%` }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-600">No AI summary available.</p>
        )}
      </div>

      {/* News feed */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="h-3.5 w-3.5 text-neutral-500" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
            Latest Headlines
          </h2>
          <span className="ml-auto rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-400">
            {articles.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-neutral-950/40 p-4">
                <div className="mb-2 h-3 w-full rounded bg-neutral-800" />
                <div className="h-3 w-2/3 rounded bg-neutral-800" />
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-2">
            {articles.map((article, idx) => (
              <ArticleCard key={idx} article={article} idx={idx} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-neutral-900/20 px-6 py-10 text-center">
            <p className="text-sm text-neutral-600">No headlines found for {symbol}.</p>
          </div>
        )}
      </div>
    </div>
  )
}
