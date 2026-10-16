import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TabBar from '../components/TabBar'

const tabs = [
  ['Add New Account', '/software/accounts/add'],
  ['List of Account', '/software/accounts']
]

const empty = {
  segment_id: '', technician_id: '', name: '', email: '',
  contact_person: '', contact_designation: '', phone: '', phone2: '',
  address: '', city_id: '', area_id: '', pincode: '', state: '',
  gst_no: '', pan_no: ''
}

function Card({ title, onSave, onCancel, children }) {
  return (
    <div className="redcard">
      <div className="rh">{title}</div>
      <div className="rb">
        {children}
        <div className="btnrow">
          <button className="btn-save" onClick={onSave}>Save</button>
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function AccountForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [segments, setSegments] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [cities, setCities] = useState([])
  const [areas, setAreas] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/masters/segment').then(res => res.json()).then(data => setSegments(data))
    fetch('/api/technicians').then(res => res.json()).then(data => setTechnicians(data))
    fetch('/api/masters/city').then(res => res.json()).then(data => setCities(data))
    fetch('/api/masters/area').then(res => res.json()).then(data => setAreas(data))
  }, [])

  useEffect(() => {
    if (!id) {
      setForm(empty)
      return
    }
    fetch('/api/accounts/' + id)
      .then(res => (res.ok ? res.json() : null))
      .then(a => {
        if (!a) {
          setMessage('Account not found')
          return
        }
        const f = {}
        for (const key of Object.keys(empty)) {
          f[key] = a[key] == null ? '' : String(a[key])
        }
        setForm(f)
      })
  }, [id])

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function changeCity(e) {
    setForm({ ...form, city_id: e.target.value, area_id: '' })
  }

  async function save() {
    setMessage('')
    const res = await fetch(id ? '/api/accounts/' + id : '/api/accounts', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error)
      window.scrollTo(0, 0)
      return
    }
    navigate('/software/accounts')
  }

  function cancel() {
    navigate('/software/accounts')
  }

  const cityAreas = areas.filter(a => String(a.parent_id) === form.city_id)

  return (
    <>
      <h2 className="softtitle">Account Master</h2>
      <TabBar tabs={tabs} />
      <div className="content">
        {message && <p id="msg">{message}</p>}

        <div className="threecol">

          <div>
            <Card title={id ? 'Edit Account' : 'Register New Account'} onSave={save} onCancel={cancel}>
              <div className="field">
                <select name="segment_id" value={form.segment_id} onChange={change}>
                  <option value="">Select Segment Type</option>
                  {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="field">
                <select name="technician_id" value={form.technician_id} onChange={change}>
                  <option value="">Select Technician</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="field">
                <input name="name" value={form.name} onChange={change} placeholder="Account Name" />
              </div>
              <div className="field">
                <input name="email" value={form.email} onChange={change} placeholder="Email" />
              </div>
            </Card>

            <Card title="Account - Contact Details" onSave={save} onCancel={cancel}>
              <div className="field">
                <input name="contact_person" value={form.contact_person} onChange={change} placeholder="Person" />
              </div>
              <div className="field">
                <input name="contact_designation" value={form.contact_designation} onChange={change} placeholder="Designation" />
              </div>
              <div className="field">
                <input name="phone" value={form.phone} onChange={change} placeholder="Phone" />
              </div>
              <div className="field">
                <input name="phone2" value={form.phone2} onChange={change} placeholder="Phone 2" />
              </div>
            </Card>
          </div>

          <Card title="Account - Location Details" onSave={save} onCancel={cancel}>
            <div className="field">
              <textarea name="address" rows={5} value={form.address} onChange={change} placeholder="Address" />
            </div>
            <div className="field">
              <select name="city_id" value={form.city_id} onChange={changeCity}>
                <option value="">Select City</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <select name="area_id" value={form.area_id} onChange={change}>
                <option value="">Select Area</option>
                {cityAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <input name="pincode" value={form.pincode} onChange={change} placeholder="Pincode" />
            </div>
            <div className="field">
              <input name="state" value={form.state} onChange={change} placeholder="State" />
            </div>
          </Card>

          <Card title="Account Details" onSave={save} onCancel={cancel}>
            <div className="field">
              <input name="gst_no" value={form.gst_no} onChange={change} placeholder="GST No." />
            </div>
            <div className="field">
              <input name="pan_no" value={form.pan_no} onChange={change} placeholder="Pan No." />
            </div>
          </Card>

        </div>
      </div>
    </>
  )
}