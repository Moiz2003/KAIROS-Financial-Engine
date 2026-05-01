import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? 'U')

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />
      </div>

      {/* top nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">

          {/* left: logo + links */}
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="text-lg font-bold tracking-tight">
              <span className="text-emerald-400">KAIROS</span>
              <span className="mx-1.5 text-neutral-700">/</span>
              <span className="text-sm font-normal text-neutral-500">Engine</span>
            </Link>
            <div className="hidden items-center gap-6 sm:flex">
              <Link
                to="/dashboard"
                className="text-sm text-neutral-400 transition hover:text-neutral-200"
              >
                Dashboard
              </Link>
              <span className="cursor-not-allowed text-sm text-neutral-700">Markets</span>
            </div>
          </div>

          {/* right: avatar + dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setOpen(o => !o)}
              aria-label="User menu"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-neutral-950 ring-2 ring-transparent transition hover:ring-emerald-400/40 focus:outline-none focus:ring-emerald-400/40"
            >
              {initials}
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
                >
                  {/* identity header */}
                  <div className="border-b border-white/5 px-4 py-3">
                    <p className="truncate text-xs font-semibold text-neutral-200">
                      {user?.name || user?.email}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-neutral-600">
                      {user?.role ?? 'viewer'}
                    </p>
                  </div>

                  <div className="py-1">
                    <button className="flex w-full items-center px-4 py-2.5 text-left text-sm text-neutral-400 transition hover:bg-white/5 hover:text-neutral-200">
                      Profile
                    </button>
                    <button className="flex w-full items-center px-4 py-2.5 text-left text-sm text-neutral-400 transition hover:bg-white/5 hover:text-neutral-200">
                      Settings
                    </button>
                    <div className="mx-3 my-1 h-px bg-white/5" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2.5 text-left text-sm text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* nested page content */}
      <Outlet />
    </div>
  )
}
