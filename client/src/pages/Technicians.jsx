import { useState, useEffect } from 'react'
import PageHead from '../components/PageHead'

const emptyForm = { name: '', phone: '', email: '', address: '', call_limit: '10' }

export default function Technicians() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')

  function load() {
    fetch('/api/technicians')
      .then(res => res.json())
      .then(data => setList(data))
  }

  useEffect(() => {
    load()
  }, [])

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function openAdd() {
    setForm(emptyForm)
    setEditId(null)
    setMessage('')
    setShowForm(true)
  }

  function openEdit(t) {
    setForm({
      name: t.name || '',
      phone: t.phone || '',
      email: t.email || '',
      address: t.address || '',
      call_limit: String(t.call_limit ?? 10)
    })
    setEditId(t.id)
    setMessage('')
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  function cancel() {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
    setMessage('')
  }

  async function save() {
    const url = editId ? '/api/technicians/' + editId : '/api/technicians'
    const res = await fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error)
      return
    }
    cancel()
    load()
  }

  return (
    <>
      <PageHead title="Technician" />
      <div className="content">

        {showForm && (
          <div className="panel">
            <h3>{editId ? 'Edit Technician' : 'Add Technician'}</h3>
            <div className="form-grid">
              <input name="name" value={form.name} onChange={change} placeholder="Technician Name" />
              <input name="phone" value={form.phone} onChange={change} placeholder="Phone No." />
              <input name="email" value={form.email} onChange={change} placeholder="Email" />
              <input name="call_limit" type="number" min="0" value={form.call_limit} onChange={change} placeholder="Call Limit" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <textarea name="address" rows={3} value={form.address} onChange={change} placeholder="Address" />
            </div>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn" style={{ marginLeft: 8, background: '#5b7186' }} onClick={cancel}>Cancel</button>
            <p id="msg">{message}</p>
          </div>
        )}

        <div className="panel">
          <button className="btn" onClick={openAdd}>Add Technician</button>
          <table className="redtable">
            <thead>
              <tr>
                <th>Technician Name</th><th>Phone No.</th><th>Email</th><th>Address</th><th>Call Limit</th><th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.phone}</td>
                  <td>{t.email}</td>
                  <td>{t.address}</td>
                  <td>{t.call_limit ?? 10}</td>
                  <td><button className="iconbtn" title="Edit" onClick={() => openEdit(t)}>&#9998;</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p>No technicians yet.</p>}
        </div>

      </div>
    </>
  )
}