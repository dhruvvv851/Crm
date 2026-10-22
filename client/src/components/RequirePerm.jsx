import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth'

export default function RequirePerm({ perm }) {
  const { can } = useAuth()
  const keys = [].concat(perm)

  if (!keys.some(key => can(key))) {
    return (
      <div className="content">
        <div className="panel">You do not have permission to open this page. Please ask the administrator.</div>
      </div>
    )
  }
  return <Outlet />
}