import { useState, useEffect } from 'react'
import Pager from '../components/Pager'
import { fmtDate } from '../utils'

const kinds = {
  segment: { title: 'Segment Type Master', label: 'Segment Type' },
  city: { title: 'City Master', label: 'City' },
  area: { title: 'Area Master', label: 'Area', parentKind: 'city', parentLabel: 'City' },
  equipment: { title: 'Equipment Type Master', label: 'Equipment Type' }
}

const PAGE_SIZE = 10

export default function MasterPage({ kind }) {
  const cfg = kinds[kind]
  const [list, setList] = useState([])
  const [parents, setParents] = useState([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')

  function load() {
    fetch('/api/masters/' + kind)
      .then(res => res.json())
      .then(data => setList(data))
    if (cfg.parentKind) {
      fetch('/api/masters/' + cfg.parentKind)
        .then(res => res.json())
        .then(data => setParents(data))
    }
  }

  useEffect(() => {
    load()
  }, [])

  function runSearch() {
    setSearch(text)
    setPage(1)
  }

  function openAdd() {
    setName('')
    setParentId('')
    setEditId(null)
    setMessage('')
    setShowForm(true)
  }

  function openEdit(m) {
    setName(m.name)
    setParentId(m.parent_id ? String(m.parent_id) : '')
    setEditId(m.id)
    setMessage('')
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  function cancel() {
    setShowForm(false)
    setEditId(null)
    setName('')
    setParentId('')
    setMessage('')
  }

  async function save() {
    const url = '/api/masters/' + kind + (editId ? '/' + editId : '')
    const res = await fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent_id: parentId })
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error)
      return
    }
    cancel()
    load()
  }

  async function remove(m) {
    if (!window.confirm('Delete "' + m.name + '"?')) return
    const res = await fetch('/api/masters/' + kind + '/' + m.id, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error)
      return
    }
    load()
  }

  const q = search.toLowerCase()
  const shown = list.filter(m => (m.name + ' ' + (m.parent_name || '')).toLowerCase().includes(q))
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <h2 className="softtitle">{cfg.title}</h2>
      <div className="content">

        {showForm && (
          <div className="panel">
            <h3>{editId ? 'Edit ' : 'Add '}{cfg.label}</h3>
            {cfg.parentLabel && (
              <div className="field">
                <select value={parentId} onChange={e => setParentId(e.target.value)}>
                  <option value="">Select {cfg.parentLabel}</option>
                  {parents.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <input value={name} onChange={e => setName(e.target.value)} placeholder={cfg.label + ' Name'} />
            </div>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn" style={{ marginLeft: 8, background: '#5b7186' }} onClick={cancel}>Cancel</button>
            <p id="msg">{message}</p>
          </div>
        )}

        <div className="panel">
          <div className="searchrow">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
              placeholder="Search..."
            />
            <button className="btn" onClick={runSearch}>Search</button>
            <button className="btn" onClick={openAdd}>Add {cfg.label}</button>
          </div>

          <table className="redtable">
            <thead>
              <tr>
                <th>ID</th>
                {cfg.parentLabel && <th>{cfg.parentLabel}</th>}
                <th>{cfg.label}</th>
                <th>Added On</th>
                <th>Edit</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  {cfg.parentLabel && <td>{m.parent_name}</td>}
                  <td>{m.name}</td>
                  <td>{fmtDate(m.created_at)}</td>
                  <td><button className="iconbtn" title="Edit" onClick={() => openEdit(m)}>&#9998;</button></td>
                  <td><button className="iconbtn" title="Delete" onClick={() => remove(m)}>&#10006;</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p>Nothing found.</p>}

          <Pager page={current} pages={pages} onChange={setPage} />
        </div>

      </div>
    </>
  )
}