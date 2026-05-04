import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiPut } from '../lib/api'

const AuthContext = createContext(null)

const _buildUser = (data) => ({
  email: data.email,
  role: data.role,
  name: data.name,
  bio: data.bio ?? '',
  avatar_url: data.avatar_url ?? '',
})

export function AuthProvider({ children }) {
  // null  = not authenticated
  // object = { email, role, name, bio, avatar_url }
  const [user, setUser] = useState(null)

  // true while the initial /me check is in-flight.
  // ProtectedRoute must not redirect to /login while this is true —
  // otherwise a hard-refresh to /dashboard always bounces the user out.
  const [loading, setLoading] = useState(true)

  // Guards against the initial /api/auth/me 401 response wiping a user
  // that was just set by an explicit login() call. Without this, the flow
  // login() → navigate('/dashboard') would race with the pending /me check:
  // the 401 catch fires, clears the user, and ProtectedRoute bounces to /login.
  const didLoginRef = useRef(false)

  useEffect(() => {
    apiGet('/api/auth/me')
      .then(data => setUser(_buildUser(data)))
      .catch(() => { if (!didLoginRef.current) setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  // Called after a successful /login or /google response.
  const login = (data) => {
    didLoginRef.current = true
    setUser(_buildUser(data))
    // Resolve loading immediately so ProtectedRoute renders children without
    // waiting for the still-in-flight initial /api/auth/me to complete.
    setLoading(false)
  }

  // Persists bio/avatar_url to the backend and syncs local state immediately.
  const updateProfile = async ({ bio, avatar_url }) => {
    const updated = await apiPut('/api/user/profile', { bio, avatar_url })
    setUser(prev => ({ ...prev, bio: updated.bio, avatar_url: updated.avatar_url }))
    return updated
  }

  const logout = async () => {
    await apiPost('/api/auth/logout').catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
