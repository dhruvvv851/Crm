import { Link, useNavigate } from 'react-router-dom'
import { menu } from '../menu'

export default function Header() {
  const navigate = useNavigate()

  function toggleFullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  return (
    <>
      <div className="redbar">
        <div className="back" onClick={() => navigate(-1)} title="Back">&#8249;</div>
        <div className="icon" title="Messages">&#9993;</div>
        <div className="icon" onClick={() => window.location.reload()} title="Refresh">&#8635;</div>
        <Link className="tbtn" to="/">Go to CRM</Link>
        <Link className="tbtn" to="/software">Go to Software</Link>
        <Link className="tbtn" to="/add-call">Add Call</Link>
        <div className="spacer"></div>
        <div className="icon" onClick={toggleFullScreen} title="Full screen">&#9974;</div>
        <div className="avatar" title="Profile">&#128100;</div>
      </div>

      <div className="menubar">
        {menu.map(m => (
          <div className="menu" key={m.text}>
            <span>{m.text} &#9662;</span>
            <div className="drop">
              {m.items.map(([label, to]) => (
                <Link key={label} to={to}>{label}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}