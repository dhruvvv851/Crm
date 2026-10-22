import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import {
  UserIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowIcon, ShieldIcon, GearIcon, ChartIcon
} from '../components/LoginIcons'

const IMAGES = [
  '/login-bg/bg1.jpg',
  '/login-bg/bg2.jpg',
  '/login-bg/bg3.jpg',
  '/login-bg/bg4.jpg'
]
const SECONDS = 5

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [forgot, setForgot] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [logoOk, setLogoOk] = useState(true)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    IMAGES.forEach(src => {
      const img = new Image()
      img.src = src
    })
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setSlide(s => (s + 1) % IMAGES.length), SECONDS * 1000)
    return () => clearInterval(timer)
  }, [])

  if (!loading && user) {
    return <Navigate to={user.role === 'engineer' ? '/field' : '/'} replace />
  }

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    setBusy(true)
    const result = await login(username, password, remember)
    setBusy(false)
    if (result.error) {
      setMessage(result.error)
      setPassword('')
      return
    }
    navigate(result.user.role === 'engineer' ? '/field' : '/', { replace: true })
  }

  return (
    <div className="lp">
      <div className="lpbg" aria-hidden="true">
        {IMAGES.map((src, i) => (
          <div
            key={src}
            className={'lpslide' + (i === slide ? ' on' : '')}
            style={{ backgroundImage: 'url(' + src + ')' }}
          />
        ))}
      </div>
      <div className="lpshade" aria-hidden="true" />

      <div className="lptag">
        <span>SAFER</span><i>|</i><span>SMARTER</span><i>|</i><span>TOGETHER</span>
      </div>

      <div className="lpmain">
        <section className="lphero">
          <div className="lpkicker">AIRMEN ENGINEERS CRM</div>
          <div className="lpbar" />
          <h1>
            Powering Progress.<br />
            <em>Connecting Possibilities.</em>
          </h1>
          <p>Manage operations, track service requests, and keep your business moving forward.</p>
          <ul className="lpfeatures">
            <li><GearIcon /><span>Efficient<br />Operations</span></li>
            <li><ShieldIcon size={38} /><span>Better<br />Service Management</span></li>
            <li><ChartIcon /><span>Stronger<br />Business Growth</span></li>
          </ul>
        </section>

        <form className="lpcard" onSubmit={submit}>
          <div className="lplogo">
            {logoOk
              ? <img src="/logo.png" alt="Airmen" onError={() => setLogoOk(false)} />
              : <div className="logotext">AIRMEN</div>}
          </div>
          <h2>Welcome Back</h2>
          <p className="lpsub">Sign in to your CRM account</p>

          {message && <div className="loginerr" role="alert">{message}</div>}

          <div className="lpfield">
            <UserIcon />
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              aria-label="Username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="lpfield">
            <LockIcon />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="lpeye"
              onClick={() => setShow(s => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
            >
              {show ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>

          <div className="lprow">
            <label className="lpcheck">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>Remember Me</span>
            </label>
            <button type="button" className="lplink" onClick={() => setForgot(f => !f)}>
              Forgot Password?
            </button>
          </div>

          {forgot && (
            <div className="lpinfo">
              Please contact your administrator. They can reset your password from the Admin List.
            </div>
          )}

          <button className="lpbtn" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : <>Login <ArrowIcon /></>}
          </button>

          <div className="lpsecure"><ShieldIcon /> Secure Access Portal</div>
        </form>
      </div>

      <div className="lpfoot">&copy; {new Date().getFullYear()} Airmen Engineers. All rights reserved.</div>
    </div>
  )
}