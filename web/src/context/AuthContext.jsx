import { createContext, useContext, useEffect, useState } from 'react'
import { apiGet, apiPost } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // null  = not authenticated
  // object = { email, role, name }
  const [user, setUser] = useState(null)

  // true while the initial /me check is in-flight.
  // ProtectedRoute must not redirect to /login while this is true —
  // otherwise a hard-refresh to /dashboard always bounces the user out.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verify the HTTP-only cookie on every cold page load.
    // If the cookie is missing or expired, /me returns 401 and we stay logged out.
    apiGet('/api/auth/me')
      .then(data => setUser({ email: data.email, role: data.role, name: data.name }))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Called after a successful /login or /google response.
  // data shape: AuthSuccessResponse { role, email, name, expires_in_minutes }
  // The JWT is already stored in the HTTP-only cookie — nothing to persist here.
  const login = (data) => {
    setUser({ email: data.email, role: data.role, name: data.name })
  }

  // Calls the backend to expire the cookie, then clears local state.
  const logout = async () => {
    await apiPost('/api/auth/logout').catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
