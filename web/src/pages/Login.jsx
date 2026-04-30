import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { apiPost } from '../lib/api'

function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Called with AuthSuccessResponse: { role, email, name, expires_in_minutes }
    // The JWT is already in the HTTP-only cookie — nothing to store manually.
    const onAuthSuccess = (data) => {
        login(data)
        navigate('/dashboard')
    }

    // ── Email/Password login ──
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

    // ── Google OAuth success handler ──
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

    // ── Google OAuth error handler ──
    const handleGoogleError = () => {
        setError('Google Sign-In was cancelled or failed. Please try again.')
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 overflow-hidden px-4">
            {/* Background glow */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
                <div className="absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />
            </div>

            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                            KAIROS
                        </span>
                    </h1>
                    <p className="mt-2 text-sm text-neutral-500">Sign in to the AI Financial Engine</p>
                </div>

                {/* Card */}
                <div className="rounded-3xl border border-neutral-800/60 bg-neutral-900/40 p-8 backdrop-blur-xl">
                    {/* Google OAuth Button */}
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
                        <span className="h-px flex-1 bg-neutral-800" />
                        <span className="text-xs text-neutral-500">or</span>
                        <span className="h-px flex-1 bg-neutral-800" />
                    </div>

                    {/* Email/Password form */}
                    <form onSubmit={handleEmailLogin} className="space-y-5">
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
                                placeholder="admin@kairos.local"
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
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-sm text-neutral-100 outline-none ring-emerald-500/50 transition placeholder:text-neutral-600 focus:ring-2"
                            />
                        </div>

                        {/* Error */}
                        {error ? (
                            <p className="rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-300">
                                {error}
                            </p>
                        ) : null}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-5 py-3 text-sm font-bold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? 'Signing in...' : 'Sign in with Email'}
                        </button>
                    </form>
                </div>

                {/* Footer link */}
                <p className="mt-6 text-center text-xs text-neutral-600">
                    <a href="/" className="transition hover:text-neutral-400">
                        &larr; Back to home
                    </a>
                </p>
            </div>
        </div>
    )
}

export default Login
