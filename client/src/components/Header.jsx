import { Link, useNavigate } from 'react-router-dom'
import { menu } from '../menu'
import { softMenu } from '../softMenu'
import { useAuth } from '../auth'

export default function Header() {
  const navigate = useNavigate()
  const { user, logout, can } = useAuth()

  function toggleFullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  const showSoftware = softMenu.some(m => m.items.some(([, , perm]) => can(perm)))

  return (
    <>
      <div className="redbar">
        <div className="back" onClick={() => navigate(-1)} title="Back">&#8249;</div>
        <div className="icon" title="Messages">&#9993;</div>
        <div className="icon" onClick={() => window.location.reload()} title="Refresh">&#8635;</div>
        <Link className="tbtn" to="/">Go to CRM</Link>
        {showSoftware && <Link className="tbtn" to="/software">Go to Software</Link>}
        {can('add_call') && <Link className="tbtn" to="/add-call">Add Call</Link>}
        <div className="spacer"></div>
        <div className="icon" onClick={toggleFullScreen} title="Full screen">&#9974;</div>
        <div className="usermenu">
          <div className="avatar" title="Profile">&#128100;</div>
          <div className="udrop">
            <div className="who">{user ? user.username : ''}</div>
            <a href="#logout" onClick={e => { e.preventDefault(); signOut() }}>Logout</a>
          </div>
        </div>
      </div>

      <div className="menubar">
        {menu.map(m => {
          const items = m.items.filter(([, , perm]) => can(perm))
          if (items.length === 0) return null
          return (
            <div className="menu" key={m.text}>
              <span>{m.text} &#9662;</span>
              <div className="drop">
                {items.map(([label, to]) => (
                  <Link key={label} to={to}>{label}</Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}