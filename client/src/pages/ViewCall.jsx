import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fmtDate, fmtDay, fmtTime, fmtLocal, fmtMinutes, callLabel, visitDay, mapLink } from '../utils'

function Place({ lat, lng }) {
  const link = mapLink(lat, lng)
  if (!link) return null
  return (
    <div>
      <a href={link} target="_blank" rel="noreferrer">&#128205; Location</a>
    </div>
  )
}

export default function ViewCall() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [technicians, setTechnicians] = useState([])
  const [full, setFull] = useState(true)
  const [swipeTech, setSwipeTech] = useState('')
  const [swipeReason, setSwipeReason] = useState('')
  const [message, setMessage] = useState('')
  const [notFound, setNotFound] = useState(false)

  function load() {
    fetch('/api/calls/' + id)
      .then(res => {
        if (!res.ok) {
          setNotFound(true)
          return null
        }
        return res.json()
      })
      .then(d => {
        if (d) setData(d)
      })
  }

  useEffect(() => {
    load()
    fetch('/api/technicians').then(res => res.json()).then(list => setTechnicians(list))
  }, [id])

  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
    let out = {}
    try {
      out = await res.json()
    } catch (e) {}
    return { ok: res.ok, data: out }
  }

  async function swipe() {
    setMessage('')
    const r = await post('/api/calls/' + id + '/swipe', { technician_id: swipeTech, reason: swipeReason })
    if (!r.ok) {
      setMessage(r.data.error || 'Could not swipe the call')
      return
    }
    setSwipeTech('')
    setSwipeReason('')
    setMessage('Call swiped.')
    load()
  }

  async function cancelCall() {
    if (!window.confirm('Cancel this call?')) return
    setMessage('')
    const r = await post('/api/calls/' + id + '/cancel')
    if (!r.ok) {
      setMessage(r.data.error || 'Could not cancel the call')
      return
    }
    setMessage('Call cancelled.')
    load()
  }

  if (notFound) {
    return <div className="content"><div className="panel">Call not found.</div></div>
  }
  if (!data) {
    return <div className="content"><div className="panel">Loading...</div></div>
  }

  const c = data.call
  const summary = data.summary
  const pending = c.status === 'Pending'
  const rows = [
    ['Call ID', callLabel(c)],
    ['Call Date', fmtDay(visitDay(c))],
    ['Technician Name', c.technician_name],
    ['Company', c.company],
    ['Address', c.address],
    ['Model', c.model_name],
    ['Model Parts', c.part_no],
    ['Serial No.', c.serial_no],
    ['Nature of Problem', c.problem],
    ['Nature of Visit', c.nature_of_visit],
    ['Status', c.status],
    ['Priority', c.priority]
  ]

  const byTech = {}
  for (const s of data.steps) {
    if (s.total_minutes) {
      const name = s.technician_name || 'Unknown'
      byTech[name] = (byTech[name] || 0) + s.total_minutes
    }
  }
  const steps = data.steps.map((s, i) => ({ ...s, n: i + 1 })).reverse()

  return (
    <>
      <div className="pagehead">
        <h2>View Call # {callLabel(c)}</h2>
        <div className="crumb">
          <Link to="/">Home</Link> &gt; <Link to="/calls">Call History</Link> &gt; View Call
        </div>
      </div>

      <div className="content">
        <div className="viewgrid">

          <div className="panel">
            <table className="details">
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            {message && <p id="msg">{message}</p>}

            <div className="summary">
              <div><div className="k">Times Swiped</div><b>{summary.swipes}</b></div>
              <div><div className="k">Visits</div><b>{summary.visits}</b></div>
              <div><div className="k">Total Working Time</div><b>{fmtMinutes(summary.minutes)}</b></div>
            </div>

            {Object.keys(byTech).length > 0 && (
              <div className="panel">
                <h3>Working time by technician</h3>
                {Object.entries(byTech).map(([name, minutes]) => (
                  <div className="filerow" key={name}>
                    <span style={{ flex: 1 }}>{name}</span>
                    <b>{fmtMinutes(minutes)}</b>
                  </div>
                ))}
              </div>
            )}

            {pending && (
              <div className="panel">
                <h3>Swipe Call</h3>
                <div className="field">
                  <select value={swipeTech} onChange={e => setSwipeTech(e.target.value)}>
                    <option value="">Select Technician</option>
                    {technicians.filter(t => t.id !== c.technician_id).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <input value={swipeReason} onChange={e => setSwipeReason(e.target.value)} placeholder="Swipe Call Reason" />
                </div>
                <button className="btn" onClick={swipe}>Swipe</button>
                <button className="outbtn" style={{ marginLeft: 8 }} onClick={cancelCall}>Cancel Call</button>
              </div>
            )}

            <div className="switchrow">
              <input type="checkbox" id="full" checked={full} onChange={e => setFull(e.target.checked)} style={{ width: 'auto' }} />
              <label htmlFor="full">Show Full Details</label>
            </div>

            {steps.map(s => (
              <div className="stepcard" key={s.id}>
                <span className={'steptab' + (s.status === 'Complete' ? ' done' : '')}>Call Detail # {s.n}</span>

                <div className="stepgrid">
                  <div><div className="k">Status</div><span className={'stat-' + s.status}>{s.status}</span></div>
                  <div><div className="k">Date</div>{fmtDate(s.created_at)}</div>
                  <div><div className="k">Time</div>{fmtTime(s.created_at)}</div>
                  {s.status === 'Swiped' && s.from_technician_name && (
                    <div><div className="k">Swiped By</div>{s.from_technician_name}</div>
                  )}
                  <div><div className="k">Technician Name</div>{s.technician_name}</div>
                </div>

                {full && s.reason && (
                  <div className="reasonrow">
                    <b>{s.status === 'Swiped' ? 'Swipe Call Reason' : 'Pending Call Reason'}</b>
                    <span>{s.reason}</span>
                  </div>
                )}

                {full && s.check_in && (
                  <div className="stepgrid">
                    <div>
                      <div className="k">Check In</div>
                      {fmtLocal(s.check_in)}
                      <Place lat={s.check_in_lat} lng={s.check_in_lng} />
                    </div>
                    <div>
                      <div className="k">Check Out</div>
                      {fmtLocal(s.check_out)}
                      <Place lat={s.check_out_lat} lng={s.check_out_lng} />
                    </div>
                    <div><div className="k">Total Time</div>{fmtMinutes(s.total_minutes)}</div>
                  </div>
                )}

                {full && s.status === 'Complete' && (
                  <div className="stepgrid">
                    <div><div className="k">Running Hours</div>{s.running_hours}</div>
                    <div><div className="k">Load Hours</div>{s.load_hours}</div>
                    <div><div className="k">Contact Person</div>{s.contact_person}</div>
                    <div><div className="k">Contact Phone</div>{s.contact_phone}</div>
                    <div><div className="k">Contact Email</div>{s.contact_email}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}