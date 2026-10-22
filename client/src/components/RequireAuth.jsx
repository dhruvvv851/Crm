import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'

export default function RequireAuth({ role }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="content">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    return <Navigate to={user.role === 'engineer' ? '/field' : '/'} replace />
  }
  return <Outlet />
}