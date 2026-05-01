import { useState, useRef, useEffect } from 'react'
import {
  Outlet,
  NavLink,
  Link,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Wallet,
  Brain,
  Terminal,
  LogOut,
  User,
  Settings,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ComingSoonModal from './ComingSoonModal'

const NAV_ITEMS = [
  { to: '/dashboard/market',       label: 'Market Feed',   icon: Activity, accent: 'emerald' },
  { to: '/dashboard/portfolio',    label: 'Portfolio',     icon: Wallet,   accent: 'violet'  },
  { to: '/dashboard/intelligence', label: 'Intelligence',  icon: Brain,    accent: 'cyan'    },
  { to: '/dashboard/terminal',     label: 'Trade Terminal', icon: Terminal, accent: 'rose'   },
]

const ACCENT_TEXT = {
  emerald: 'text-emerald-300',
  violet:  'text-violet-300',
  cyan:    'text-cyan-300',
  rose:    'text-rose-300',
}

const ACCENT_GLOW = {
  emerald: 'shadow-emerald-500/20',
  violet:  'shadow-violet-500/20',
  cyan:    'shadow-cyan-500/20',
  rose:    'shadow-rose-500/20',
}

export default function SidebarLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState(null) // 'profile' | 'settings' | null
  const [collapsed, setCollapsed] = useState(false)
  const dropRef = useRef(null)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? 'U')

  const currentItem = NAV_ITEMS.find(item => location.pathname.startsWith(item.to))
  const pageTitle = currentItem?.label ?? 'Dashboard'

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen bg-neutral-950 text-neutral-100">
      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[600px] w-[600px] rounded-full bg-emerald-500/8 blur-[140px]" />
        <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-cyan-500/6 blur-[120px]" />
        <div className="absolute top-1/3 left-0 h-[300px] w-[300px] rounded-full bg-violet-500/5 blur-[90px]" />
      </div>

      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="sticky top-0 z-40 hidden h-screen flex-shrink-0 flex-col border-r border-white/5 bg-neutral-950/80 backdrop-blur-xl md:flex overflow-hidden"
      >
        {/* Brand */}
        <div className="flex items-center border-b border-white/5 px-3 py-5" style={{ minHeight: 68 }}>
          <Link
            to="/dashboard/market"
            className="flex items-center gap-2.5 flex-1 min-w-0 pl-1"
          >
            <motion.div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10"
              animate={{ boxShadow: ['0 0 12px rgba(52,211,153,0.15)', '0 0 22px rgba(52,211,153,0.35)', '0 0 12px rgba(52,211,153,0.15)'] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-sm font-black text-emerald-400">K</span>
            </motion.div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  className="leading-tight overflow-hidden whitespace-nowrap"
                >
                  <p className="text-sm font-bold tracking-wide text-neutral-100">KAIROS</p>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-neutral-600">
                    Engine
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 px-2 py-5">
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-neutral-700 whitespace-nowrap"
              >
                Navigation
              </motion.p>
            )}
          </AnimatePresence>

          {NAV_ITEMS.map(({ to, label, icon: Icon, accent }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? `bg-white/5 ${ACCENT_TEXT[accent]} shadow-lg ${ACCENT_GLOW[accent]}`
                    : 'text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="active-pill"
                      className="absolute inset-0 -z-10 rounded-xl border border-white/10 bg-white/[0.04]"
                      transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                    />
                  )}
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="font-medium whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Virtual wallet */}
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.div
              key="wallet-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mx-3 mb-4 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80 whitespace-nowrap">
                  Virtual Wallet
                </p>
              </div>
              <p className="text-2xl font-extrabold tabular-nums tracking-tight text-neutral-50">
                $10,000.00
              </p>
              <p className="mt-0.5 text-[10px] font-medium tracking-wider text-neutral-500">
                USDT &middot; Testnet Balance
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="wallet-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mb-4 flex justify-center"
              title="Virtual Wallet · $10,000 USDT"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-neutral-950/70 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-4 md:px-6">
            <div className="flex items-center gap-3 min-w-0">
              {/* Sidebar toggle (desktop only) */}
              <motion.button
                onClick={() => setCollapsed(c => !c)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden md:flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
              >
                {collapsed
                  ? <PanelLeftOpen className="h-4 w-4" />
                  : <PanelLeftClose className="h-4 w-4" />
                }
              </motion.button>

              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-neutral-600">
                  KAIROS Engine
                </p>
                <AnimatePresence mode="wait">
                  <motion.h1
                    key={pageTitle}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className="truncate text-xl font-bold tracking-tight text-neutral-100"
                  >
                    {pageTitle}
                  </motion.h1>
                </AnimatePresence>
              </div>
            </div>

            {/* Avatar */}
            <div className="relative flex-shrink-0" ref={dropRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="User menu"
                className="flex items-center gap-2 rounded-full border border-white/5 bg-neutral-900/60 py-1 pl-1 pr-3 transition hover:border-emerald-500/30 hover:bg-neutral-900"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-xs font-bold text-neutral-950">
                  {initials}
                </span>
                <span className="hidden max-w-[120px] truncate text-xs font-semibold text-neutral-300 sm:inline">
                  {user?.name || user?.email}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-neutral-500 transition ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
                  >
                    <div className="border-b border-white/5 px-4 py-3">
                      <p className="truncate text-xs font-semibold text-neutral-200">
                        {user?.name || user?.email}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-neutral-600">
                        {user?.role ?? 'viewer'}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => { setMenuOpen(false); setModal('profile') }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-neutral-400 transition hover:bg-white/5 hover:text-neutral-200"
                      >
                        <User className="h-3.5 w-3.5" />
                        Profile
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); setModal('settings') }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-neutral-400 transition hover:bg-white/5 hover:text-neutral-200"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                      </button>
                      <div className="mx-3 my-1 h-px bg-white/5" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Animated route content */}
        <main className="relative flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="px-6 py-6 md:px-10 md:py-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Coming-soon modals */}
      <ComingSoonModal
        open={modal === 'profile'}
        title="Profile · Coming Soon"
        onClose={() => setModal(null)}
      />
      <ComingSoonModal
        open={modal === 'settings'}
        title="Settings · Coming Soon"
        onClose={() => setModal(null)}
      />
    </div>
  )
}
