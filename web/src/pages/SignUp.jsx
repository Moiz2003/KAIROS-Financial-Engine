import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { apiPost } from '../lib/api'

function SignUp() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const validate = () => {
        if (!name.trim()) return 'Full name is required.'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
        if (password.length < 8) return 'Password must be at least 8 characters.'
        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const validationError = validate()
        if (validationError) { setError(validationError); return }

        setLoading(true)
        setError('')
        try {
            const data = await apiPost('/api/auth/register', {
                name: name.trim(),
                email,
                password,
            })
            login(data)
            navigate('/dashboard')
        } catch (err) {
            if (err.status === 429) {
                setError('Too many attempts, please wait a minute.')
            } else {
                setError(err.message || 'Registration failed. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 overflow-hidden px-4">
            {/* Background glow */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
                <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md"
            >
                {/* Logo / Brand */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                            KAIROS
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-neutral-500">Create your AI Financial Engine account</p>
                </div>

                {/* Card */}
                <div className="rounded-3xl border border-neutral-800/60 bg-neutral-900/40 p-8 backdrop-blur-xl">
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        {/* Full Name */}
                        <div>
                            <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                Full Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Jane Doe"
                                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none ring-emerald-500/50 transition placeholder:text-neutral-600 focus:ring-2"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none ring-emerald-500/50 transition placeholder:text-neutral-600 focus:ring-2"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 8 characters"
                                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none ring-emerald-500/50 transition placeholder:text-neutral-600 focus:ring-2"
                            />
                        </div>

                        {/* Error */}
                        {error ? (
                            <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-300"
                            >
                                {error}
                            </motion.p>
                        ) : null}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <span className="h-px flex-1 bg-neutral-800" />
                        <span className="text-xs text-neutral-500">or</span>
                        <span className="h-px flex-1 bg-neutral-800" />
                    </div>

                    <p className="text-center text-sm text-neutral-500">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="font-medium text-emerald-400 transition hover:text-emerald-300"
                        >
                            Sign In
                        </Link>
                    </p>
                </div>

                {/* Footer link */}
                <p className="mt-6 text-center text-xs text-neutral-600">
                    <a href="/" className="transition hover:text-neutral-400">
                        &larr; Back to home
                    </a>
                </p>
            </motion.div>
        </div>
    )
}

export default SignUp
