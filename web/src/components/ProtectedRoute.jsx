import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // The AuthProvider is verifying the session cookie via GET /api/auth/me.
  // Render a spinner rather than redirecting — otherwise a hard-refresh to
  // /dashboard would always bounce the user to /login before the check completes.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-emerald-400" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute
