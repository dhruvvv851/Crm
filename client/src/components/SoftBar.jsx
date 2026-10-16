import { Link } from 'react-router-dom'
import { softMenu } from '../softMenu'

export default function SoftBar() {
  return (
    <div className="softbar">
      {softMenu.map(m => (
        <div className="softmenu" key={m.text}>
          <span>{m.text}{m.items.length > 0 && ' \u25BE'}</span>
          {m.items.length > 0 && (
            <div className="drop">
              {m.items.map(([label, to]) => (
                <Link key={label} to={to}>{label}</Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}