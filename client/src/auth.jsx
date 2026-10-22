import { createContext, useContext, useEffect, useState } from 'react'

if (!window.__fetchPatched) {
  window.__fetchPatched = true
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (...args) => {
    const res = await originalFetch(...args)
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || ''
    const isAuthCall = url.startsWith('/api/login') || url.startsWith('/api/me')
    if (res.status === 401 && url.startsWith('/api/') && !isAuthCall) {
      window.location.href = '/login'
    }
    return res
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then(res => (res.ok ? res.json() : null))
      .then(me => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(username, password) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    let data = {}
    try {
      data = await res.json()
    } catch (e) {}
    if (!res.ok) return { error: data.error || 'Could not log in' }

    const me = await fetch('/api/me').then(r => r.json())
    setUser(me)
    return { user: me }
  }
    function can(key) {
    if (!key) return true
    return Boolean(user && user.permissions && user.permissions.includes(key))
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    setUser(null)
  }

  return (
        <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}