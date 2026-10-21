import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead'
import Pager from '../components/Pager'
import { fmtDay, callLabel, visitDay } from '../utils'

const PAGE_SIZE = 10

function today() {
  return new Date().toLocaleDateString('en-CA')
}

export default function CallHistory() {
  const [calls, setCalls] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [text, setText] = useState('')
  const [date, setDate] = useState(today())
  const [applied, setApplied] = useState({ text: '', date: today() })
  const [page, setPage] = useState(1)
  const [swipe, setSwipe] = useState(null)
  const [swipeTech, setSwipeTech] = useState('')
  const [swipeReason, setSwipeReason] = useState('')
  const [message, setMessage] = useState('')

  function load() {
    fetch('/api/calls')
      .then(res => res.json())
      .then(data => setCalls(data))
  }

  useEffect(() => {
    load()
    fetch('/api/technicians').then(res => res.json()).then(data => setTechnicians(data))
  }, [])

  function runSearch() {
    setApplied({ text, date })
    setPage(1)
  }

  function showAll() {
    setDate('')
    setApplied({ text, date: '' })
    setPage(1)
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
    let data = {}
    try {
      data = await res.json()
    } catch (e) {}
    return { ok: res.ok, data }
  }

  async function cancelCall(c) {
    if (!window.confirm('Cancel call ' + callLabel(c) + '?')) return
    const r = await post('/api/calls/' + c.id + '/cancel')
    if (!r.ok) {
      setMessage(r.data.error || 'Could not cancel the call')
      return
    }
    setMessage('Call cancelled.')
    load()
  }

  function openSwipe(c) {
    setSwipe(c)
    setSwipeTech('')
    setSwipeReason('')
    setMessage('')
    window.scrollTo(0, 0)
  }

  async function saveSwipe() {
    const r = await post('/api/calls/' + swipe.id + '/swipe', { technician_id: swipeTech, reason: swipeReason })
    if (!r.ok) {
      setMessage(r.data.error || 'Could not change the technician')
      return
    }
    setSwipe(null)
    setMessage('Technician changed.')
    load()
  }

  const q = applied.text.toLowerCase()
  const shown = calls.filter(c => {
    if (applied.date && visitDay(c) !== applied.date) return false
    return [callLabel(c), c.customer, c.technician_name, c.nature_of_visit, c.status]
      .join(' ').toLowerCase().includes(q)
  })
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <PageHead title="Call History" />
      <div className="content">
        <p><Link className="outbtn" to="/add-call">Add Call</Link></p>
        {message && <p id="msg">{message}</p>}

        {swipe && (
          <div className="panel">
            <h3>Swipe Call {callLabel(swipe)}</h3>
            <div className="field">
              <select value={swipeTech} onChange={e => setSwipeTech(e.target.value)}>
                <option value="">Select Technician</option>
                {technicians.filter(t => t.id !== swipe.technician_id).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

             <div className="field">
              <input value={swipeReason} onChange={e => setSwipeReason(e.target.value)} placeholder="Swipe Call Reason" />
            </div>
            <button className="btn" onClick={saveSwipe}>Save</button>

            <button className="btn" style={{ marginLeft: 8, background: '#5b7186' }} onClick={() => setSwipe(null)}>Cancel</button>
          </div>
        )}

        <div className="panel">
          <div className="searchrow">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
              placeholder="Search call id, company, technician..."
            />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 'none', width: 170 }} />
            <button className="btn" onClick={runSearch}>Search</button>
            <button className="btn" style={{ background: '#5b7186' }} onClick={showAll}>Show all dates</button>
          </div>
          <p className="hint">
            {applied.date ? 'Showing calls of ' + fmtDay(applied.date) + '.' : 'Showing calls of all dates.'}
          </p>

          <table className="redtable">
            <thead>
              <tr>
                <th>Call ID</th><th>Visit Date</th><th>Technician Name</th><th>Company</th>
                <th>Nature of Visit</th><th>Status</th><th>Swipe Call</th><th>Cancel Call</th><th>View Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const open = c.status === 'Pending'
                return (
                  <tr key={c.id}>
                    <td>{callLabel(c)}</td>
                    <td>{fmtDay(visitDay(c))}</td>
                    <td>{c.technician_name}</td>
                    <td>{c.customer}</td>
                    <td>{c.nature_of_visit}</td>
                    <td className={'stat-' + c.status}>{c.status}</td>
                    <td>
                      <button className="circlebtn" title="Swipe Call" disabled={!open} onClick={() => openSwipe(c)}>&#8644;</button>
                    </td>
                    <td>
                      <button className="circlebtn" title="Cancel Call" disabled={!open} onClick={() => cancelCall(c)}>&#8855;</button>
                    </td>
                    <td>
                      <Link className="iconbtn" title="View Details" to={'/calls/' + c.id}>&#128065;</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shown.length === 0 && <p>No calls found.</p>}

          <Pager page={current} pages={pages} onChange={setPage} />
        </div>
      </div>
    </>
  )
}