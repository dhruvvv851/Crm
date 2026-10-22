import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  if (!loading && user) {
    return <Navigate to={user.role === 'engineer' ? '/field' : '/'} replace />
  }

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    setBusy(true)
    const result = await login(username, password)
    setBusy(false)
    if (result.error) {
      setMessage(result.error)
      setPassword('')
      return
    }
    navigate(result.user.role === 'engineer' ? '/field' : '/', { replace: true })
  }

  return (
    <div className="loginpage">
      <div className="loginbox">
        <div className="loginlogo">
          {logoOk
            ? <img src="/logo.png" alt="Airmen" onError={() => setLogoOk(false)} />
            : <div className="logotext">AIRMEN</div>}
        </div>
        <form className="loginform" onSubmit={submit}>
          {message && <div className="loginerr">{message}</div>}
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Login'}</button>
        </form>
      </div>
    </div>
  )
}