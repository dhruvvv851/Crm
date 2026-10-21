import { useState, useEffect } from 'react'
import PageHead from '../components/PageHead'
import SearchSelect from '../components/SearchSelect'

function today() {
  return new Date().toLocaleDateString('en-CA')
}

function emptyForm() {
  return {
    account_id: '', commission_id: '', technician_id: '',
    problem: '', nature_of_visit: '', priority: 'Low Priority', call_date: today()
  }
}

export default function AddCall() {
  const [accounts, setAccounts] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [options, setOptions] = useState({ visits: [], priorities: [] })
  const [machines, setMachines] = useState([])
  const [form, setForm] = useState(emptyForm())
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    fetch('/api/accounts').then(res => res.json()).then(data => setAccounts(data))
    fetch('/api/technicians').then(res => res.json()).then(data => setTechnicians(data))
    fetch('/api/call-options').then(res => res.json()).then(data => setOptions(data))
  }, [])

  const account = accounts.find(a => String(a.id) === form.account_id)

  function pickAccount(id) {
    const a = accounts.find(x => String(x.id) === id)
    setForm({
      ...form,
      account_id: id,
      commission_id: '',
      technician_id: a && a.technician_id ? String(a.technician_id) : ''
    })
    setMachines([])
    setMessage('')
    setSaved('')
    if (id) {
      fetch('/api/accounts/' + id + '/machines')
        .then(res => res.json())
        .then(data => setMachines(data))
    }
  }

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function save() {
    setMessage('')
    setSaved('')
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      let data = {}
      try {
        data = await res.json()
      } catch (e) {}

      if (!res.ok) {
        setMessage(data.error || 'Server error (' + res.status + '). Check the red text in the node terminal.')
        return
      }
      setSaved('Call saved. Call ID: ' + data.call_no)
      setForm(emptyForm())
      setMachines([])
      window.scrollTo(0, 0)
    } catch (e) {
      setMessage('Could not reach the server. Check that node server.js is running.')
    }
  }

  const accountOptions = accounts.map(a => ({
    value: a.id,
    label: [a.name, a.city_name, a.area_name].filter(Boolean).join(' - ')
  }))

  const rows = account ? [
    ['Company Name', account.name],
    ['Contact Person', account.contact_person],
    ['Contact Designation', account.contact_designation],
    ['Address', account.address],
    ['Phone', account.phone],
    ['Phone', account.phone2]
  ] : []

  return (
    <>
      <PageHead title="Add Call" />
      <div className="content">
        {saved && <p id="msg">{saved}</p>}

        <div className="threecol">

          <div className="panel">
            <h3>Company Details</h3>
            <SearchSelect
              options={accountOptions}
              value={form.account_id}
              onChange={pickAccount}
              placeholder="Select Company"
            />
            {account && (
              <table className="details">
                <tbody>
                  {rows.map(([label, value], i) => (
                    <tr key={i}>
                      <th>{label}</th>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {account && (
            <div>
              <div className="panel">
                <h3>Model Details</h3>
                <select name="commission_id" value={form.commission_id} onChange={change}>
                  <option value="">Select Model</option>
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      {[m.model_name, m.part_no, m.serial_no].filter(Boolean).join(' - ')}
                    </option>
                  ))}
                </select>
                {machines.length === 0 && (
                  <div className="hint">No machines added for this company yet. Add one in Go to Software, Comission Report.</div>
                )}
              </div>

              <div className="panel">
                <h3>Call Details</h3>
                <div className="field">
                  <textarea name="problem" rows={6} value={form.problem} onChange={change} placeholder="Nature of Problem" />
                </div>
                <div className="field">
                  <select name="nature_of_visit" value={form.nature_of_visit} onChange={change}>
                    <option value="">Nature of Visit</option>
                    {options.visits.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <select name="priority" value={form.priority} onChange={change}>
                    {options.priorities.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {account && (
            <div className="panel">
              <h3>Technician Details</h3>
              <div className="field">
                <input type="date" name="call_date" value={form.call_date} onChange={change} />
              </div>
              <select name="technician_id" value={form.technician_id} onChange={change}>
                <option value="">Select Technician</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.email ? ' - ' + t.email : ''}</option>
                ))}
              </select>
            </div>
          )}

        </div>

        {account && (
          <>
            <p><button className="btn" onClick={save}>Save Call</button></p>
            {message && <p id="msg">{message}</p>}
          </>
        )}
      </div>
    </>
  )
}