import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { apiPost } from '../lib/api'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import clsx from 'clsx'

// ── Animated cyberpunk grid + aurora background ──────────────────────────────
function GridBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            {/* Base */}
            <div className="absolute inset-0 bg-[#010108]" />

            {/* Subtle dot grid */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage:
                        'radial-gradient(circle, rgba(52,211,153,0.18) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage:
                        'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
                }}
            />

            {/* Horizontal scan line */}
            <motion.div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
                initial={{ top: '-2px' }}
                animate={{ top: '100vh' }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
            />

            {/* Aurora blobs */}
            <motion.div
                className="absolute -top-20 left-1/3 h-[560px] w-[560px] rounded-full bg-emerald-500/12 blur-[130px]"
                animate={{ x: [0, 40, -25, 0], y: [0, -35, 20, 0], scale: [1, 1.08, 0.96, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute -bottom-20 right-1/4 h-[440px] w-[440px] rounded-full bg-cyan-500/10 blur-[110px]"
                animate={{ x: [0, -35, 25, 0], y: [0, 25, -15, 0], scale: [1, 0.92, 1.08, 1] }}
                transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            />
            <motion.div
                className="absolute top-1/2 -left-20 h-[320px] w-[320px] rounded-full bg-violet-500/8 blur-[90px]"
                animate={{ x: [0, 50, -15, 0], y: [0, -25, 40, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
            />
        </div>
    )
}

// ── Mouse-tracked glowing card wrapper ───────────────────────────────────────
function GlowCard({ children }) {
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    const glowBg = useTransform(
        [mouseX, mouseY],
        ([x, y]) =>
            `radial-gradient(380px circle at ${x}px ${y}px, rgba(52,211,153,0.20), rgba(6,182,212,0.08), transparent 65%)`
    )

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        mouseX.set(e.clientX - rect.left)
        mouseY.set(e.clientY - rect.top)
    }

    return (
        <motion.div
            className="group relative"
            onMouseMove={handleMouseMove}
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Mouse-tracked glow layer */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: glowBg }}
            />
            {/* Hover border */}
            <div className="pointer-events-none absolute -inset-px rounded-3xl border border-emerald-400/0 transition-colors duration-500 group-hover:border-emerald-400/30" />

            {/* Card body */}
            <div className="relative rounded-3xl border border-neutral-800/60 bg-neutral-900/50 p-8 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)]">
                {children}
            </div>
        </motion.div>
    )
}

// ── Input field with focus glow ───────────────────────────────────────────────
function InputField({ id, label, type, value, onChange, placeholder, hasError, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.4 }}
        >
            <label
                htmlFor={id}
                className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500"
            >
                {label}
            </label>
            <input
                id={id}
                type={type}
                required
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={clsx(
                    'w-full rounded-xl border bg-neutral-950/80 px-4 py-3 text-sm text-neutral-100',
                    'outline-none transition-all duration-200 placeholder:text-neutral-700',
                    'focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50',
                    hasError
                        ? 'border-rose-500/60 bg-rose-950/30'
                        : 'border-neutral-800 hover:border-neutral-700'
                )}
            />
        </motion.div>
    )
}

// ── Main Login page ───────────────────────────────────────────────────────────
function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const onAuthSuccess = (data) => {
        login(data)
        navigate('/dashboard')
    }

    const handleEmailLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const data = await apiPost('/api/auth/login', { email, password })
            onAuthSuccess(data)
        } catch (err) {
            setError(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true)
        setError('')
        try {
            const data = await apiPost('/api/auth/google', {
                google_id_token: credentialResponse.credential,
            })
            onAuthSuccess(data)
        } catch (err) {
            setError(err.message || 'Google authentication failed')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleError = () => {
        setError('Google Sign-In was cancelled or failed. Please try again.')
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
            <GridBackground />

            <div className="w-full max-w-md">
                {/* Brand */}
                <motion.div
                    className="mb-8 text-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-1 flex items-center justify-center gap-2">
                        {/* K logo mark */}
                        <motion.div
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10"
                            animate={{ boxShadow: ['0 0 12px rgba(52,211,153,0.2)', '0 0 24px rgba(52,211,153,0.4)', '0 0 12px rgba(52,211,153,0.2)'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <span className="text-sm font-black text-emerald-400">K</span>
                        </motion.div>
                        <h1 className="text-3xl font-black tracking-[0.15em]">
                            <span className="bg-gradient-to-r from-emerald-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
                                KAIROS
                            </span>
                        </h1>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-neutral-600">
                        AI Financial Engine
                    </p>
                </motion.div>

                {/* Card */}
                <GlowCard>
                    {/* Google OAuth */}
                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            theme="filled_black"
                            size="large"
                            shape="pill"
                            text="signin_with"
                            width="300"
                        />
                    </div>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-neutral-800" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                            or email
                        </span>
                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-neutral-800" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <InputField
                            id="email"
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            hasError={!!error}
                            delay={0.15}
                        />
                        <InputField
                            id="password"
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            hasError={!!error}
                            delay={0.25}
                        />

                        {/* Error */}
                        <AnimatePresence>
                            {error && (
                                <motion.p
                                    key="error"
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-300"
                                >
                                    {error}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {/* Submit */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35, duration: 0.4 }}
                        >
                            <motion.button
                                type="submit"
                                disabled={loading}
                                className={clsx(
                                    'relative w-full overflow-hidden rounded-xl px-5 py-3 text-sm font-bold text-neutral-950',
                                    'bg-gradient-to-r from-emerald-400 to-cyan-400',
                                    'shadow-lg shadow-emerald-500/20 transition-shadow',
                                    'hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60'
                                )}
                                whileHover={{ scale: loading ? 1 : 1.015 }}
                                whileTap={{ scale: loading ? 1 : 0.975 }}
                            >
                                {/* Shimmer sweep on hover */}
                                <motion.span
                                    className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                                    initial={{ x: '-120%' }}
                                    whileHover={{ x: '220%' }}
                                    transition={{ duration: 0.55, ease: 'easeInOut' }}
                                />
                                <span className="relative flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Authenticating...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </span>
                            </motion.button>
                        </motion.div>
                    </form>
                </GlowCard>

                {/* Footer links */}
                <motion.div
                    className="mt-6 space-y-2 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <p className="text-sm text-neutral-600">
                        No account?{' '}
                        <Link
                            to="/signup"
                            className="font-semibold text-emerald-400 underline-offset-4 transition hover:text-emerald-300 hover:underline"
                        >
                            Sign Up
                        </Link>
                    </p>
                    <p className="text-xs text-neutral-700">
                        <a href="/" className="transition hover:text-neutral-500">
                            &larr; Back to home
                        </a>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}

export default Login
