import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { menu } from '../menu'
import { softMenu } from '../softMenu'
import Dashboard from './Dashboard'

export default function Home() {
  const { can } = useAuth()

  if (can('dashboard')) return <Dashboard />

  for (const m of menu) {
    for (const [, to, perm] of m.items) {
      if (perm && can(perm)) return <Navigate to={to} replace />
    }
  }
  for (const m of softMenu) {
    for (const [, , perm] of m.items) {
      if (can(perm)) return <Navigate to="/software" replace />
    }
  }

  return (
    <div className="content">
      <div className="panel">No pages are assigned to your account yet. Please ask the administrator.</div>
    </div>
  )
}