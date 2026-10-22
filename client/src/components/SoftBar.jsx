import { Link } from 'react-router-dom'
import { softMenu } from '../softMenu'
import { useAuth } from '../auth'

export default function SoftBar() {
  const { can } = useAuth()

  return (
    <div className="softbar">
      {softMenu.map(m => {
        const items = m.items.filter(([, , perm]) => can(perm))
        return (
          <div className="softmenu" key={m.text}>
            <span>{m.text}{items.length > 0 && ' \u25BE'}</span>
            {items.length > 0 && (
              <div className="drop">
                {items.map(([label, to]) => (
                  <Link key={label} to={to}>{label}</Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}