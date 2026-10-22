import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function FieldHome() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="fieldbar">
        <span>Airmen Field App</span>
        <button onClick={signOut}>Logout</button>
      </div>
      <div className="content">
        <div className="panel">
          <h3>Welcome, {user.technician_name || user.username}</h3>
          <p>You are logged in as a field engineer. My Calls, Swipe Call, Check In and Out, Complete Call and Leave Management are the next step.</p>
        </div>
      </div>
    </>
  )
}