import { useState, useEffect } from 'react'
import PageHead from '../components/PageHead'
import { useAuth } from '../auth'
import { fmtDateTime } from '../utils'

async function request(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  let data = {}
  try {
    data = await res.json()
  } catch (e) {}
  return { ok: res.ok, data }
}

export default function AdminPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [defs, setDefs] = useState([])
  const [editId, setEditId] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState([])
  const [newPass, setNewPass] = useState({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function load() {
    fetch('/api/users').then(res => res.json()).then(data => setUsers(data))
  }

  useEffect(() => {
    load()
    fetch('/api/permissions').then(res => res.json()).then(data => setDefs(data))
  }, [])

  function toggle(key) {
    setSelected(list => (list.includes(key) ? list.filter(k => k !== key) : [...list, key]))
  }

  function resetForm() {
    setEditId(null)
    setUsername('')
    setPassword('')
    setSelected([])
    setError('')
  }

  function startEdit(u) {
    setEditId(u.id)
    setUsername(u.username)
    setPassword('')
    setSelected(u.permissions)
    setError('')
    setInfo('')
    window.scrollTo(0, 0)
  }

  async function save() {
    setError('')
    setInfo('')
    const r = editId
      ? await request('/api/users/' + editId, 'PUT', { permissions: selected })
      : await request('/api/users', 'POST', { username, password, permissions: selected })
    if (!r.ok) {
      setError(r.data.error || 'Could not save')
      return
    }
    setInfo(editId ? 'Permissions updated.' : 'User added.')
    resetForm()
    load()
  }

  async function changePassword(u) {
    const value = newPass[u.id] || ''
    setError('')
    setInfo('')
    if (!value) return
    if (!window.confirm('Change the password of "' + u.username + '"? They will be signed out.')) return
    const r = await request('/api/users/' + u.id + '/password', 'PUT', { password: value })
    if (!r.ok) {
      setError(r.data.error || 'Could not change the password')
      return
    }
    setNewPass({ ...newPass, [u.id]: '' })
    setInfo('Password changed for ' + u.username + '.')
  }

  async function remove(u) {
    if (!window.confirm('Delete the user "' + u.username + '"?')) return
    setError('')
    setInfo('')
    const r = await request('/api/users/' + u.id, 'DELETE')
    if (!r.ok) {
      setError(r.data.error || 'Could not delete')
      return
    }
    setInfo('User deleted.')
    if (editId === u.id) resetForm()
    load()
  }

  return (
    <>
      <PageHead title="Add Admin" />
      <div className="content">
        {error && <p id="msg">{error}</p>}
        {info && <p style={{ color: '#1b7f4b', fontWeight: 'bold' }}>{info}</p>}

        <div className="admingrid">

          <div className="panel">
            <table className="redtable">
              <thead>
                <tr>
                  <th>Username</th><th>Last Login</th><th>Change Password</th><th>Edit</th><th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.last_login ? fmtDateTime(u.last_login) : '-'}</td>
                    <td>
                      <input
                        className="passbox"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Type & Enter"
                        value={newPass[u.id] || ''}
                        onChange={e => setNewPass({ ...newPass, [u.id]: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') changePassword(u) }}
                      />
                    </td>
                    <td>
                      <button className="iconbtn" title="Edit" onClick={() => startEdit(u)}>&#9998;</button>
                    </td>
                    <td>
                      <button className="circlebtn" title="Delete" disabled={u.id === user.id} onClick={() => remove(u)}>&#8855;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p>No users yet.</p>}
          </div>

          <div className="panel">
            <h3>{editId ? 'Edit Admin' : 'Add Admin'}</h3>
            <div className="field">
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="off"
                readOnly={Boolean(editId)}
              />
            </div>
            {!editId && (
              <div className="field">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password (at least 8 characters)"
                  autoComplete="new-password"
                />
              </div>
            )}

            <div className="permtitle">Allow Permission</div>
            {defs.map(p => (
              <label className="permrow" key={p.key}>
                <input type="checkbox" checked={selected.includes(p.key)} onChange={() => toggle(p.key)} />
                <span>{p.label}</span>
                {p.soon && <span className="hint">page not built yet</span>}
              </label>
            ))}

            <p style={{ marginTop: 18 }}>
              <button className="btn" onClick={save}>Save</button>
              {editId && (
                <button className="btn" style={{ marginLeft: 8, background: '#5b7186' }} onClick={resetForm}>Cancel</button>
              )}
            </p>
          </div>

        </div>
      </div>
    </>
  )
}