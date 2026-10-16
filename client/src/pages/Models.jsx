import { useState, useEffect } from 'react'
import PageHead from '../components/PageHead'
import Pager from '../components/Pager'
import { fmtDate } from '../utils'

const PAGE_SIZE = 10

export default function Models() {
  const [list, setList] = useState([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')

  function load() {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => setList(data))
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
    setEditId(null)
    setMessage('')
    setShowForm(true)
  }

  function openEdit(m) {
    setName(m.name)
    setEditId(m.id)
    setMessage('')
    setShowForm(true)
    window.scrollTo(0, 0)
  }

  function cancel() {
    setShowForm(false)
    setEditId(null)
    setName('')
    setMessage('')
  }

  async function save() {
    const url = editId ? '/api/models/' + editId : '/api/models'
    const res = await fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error)
      return
    }
    cancel()
    load()
  }

  const q = search.toLowerCase()
  const shown = list.filter(m => m.name.toLowerCase().includes(q))
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <PageHead title="Model Master" />
      <div className="content">

        {showForm && (
          <div className="panel">
            <h3>{editId ? 'Edit Model' : 'Add Model'}</h3>
            <div className="field">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Model Name" />
            </div>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn" style={{ marginLeft: 8, background: '#5b7186' }} onClick={cancel}>Cancel</button>
            <p id="msg">{message}</p>
          </div>
        )}

        <div className="panel">
          <h3>Model Master ({list.length})</h3>
          <div className="searchrow">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
              placeholder="Search model"
            />
            <button className="btn" onClick={runSearch}>Search</button>
            <button className="btn" onClick={openAdd}>Add Model</button>
          </div>

          <table className="redtable">
            <thead>
              <tr><th>ID</th><th>Model Name</th><th>Added On</th><th>Edit</th></tr>
            </thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.name}</td>
                  <td>{fmtDate(m.created_at)}</td>
                  <td><button className="iconbtn" title="Edit" onClick={() => openEdit(m)}>&#9998;</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p>No models found.</p>}

          <Pager page={current} pages={pages} onChange={setPage} />
        </div>

      </div>
    </>
  )
}