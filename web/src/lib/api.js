const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include', // always send the HTTP-only auth cookie
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const error = new Error(err.detail || `HTTP ${res.status}`)
    error.status = res.status
    throw error
  }

  if (res.status === 204) return null // No Content (logout, password update)
  return res.json()
}

export const apiGet = (path) => request('GET', path)
export const apiPost = (path, body) => request('POST', path, body)
export const apiPut = (path, body) => request('PUT', path, body)
export const apiDelete = (path) => request('DELETE', path)
