import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import TabBar from '../components/TabBar'
import RedCard from '../components/RedCard'
import SearchSelect from '../components/SearchSelect'
import { fmtSize } from '../utils'

const tabs = [
  ['Add New Commission Report', '/software/commission/add'],
  ['List of Commission Report', '/software/commission']
]

const KINDS = [
  { kind: 'bom', field: 'bom', title: '1. Upload BOM', ext: ['pdf', 'xls', 'xlsx', 'csv'] },
  { kind: 'image', field: 'images', title: '2. Upload Commissioning Images', ext: ['jpg', 'jpeg', 'png', 'webp'] },
  { kind: 'other', field: 'other', title: '3. Other Documents', ext: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'jpg', 'jpeg', 'png'] }
]

const MAX_FILE = 10 * 1024 * 1024

function emptyForm() {
  return {
    account_id: '', technician_id: '', equipment_id: '', model_id: '',
    part_no: '', serial_no: '', mfg_year: '', compre_pressure: '',
    commission_date: '', pressure_setting: '', service_interval: ''
  }
}

function emptyPending() {
  return { bom: [], image: [], other: [] }
}

export default function CommissionForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const copyId = params.get('copy')
  const navigate = useNavigate()
  const editing = Boolean(id)

  const [form, setForm] = useState(emptyForm())
  const [pending, setPending] = useState(emptyPending())
  const [keys, setKeys] = useState({ bom: 0, image: 0, other: 0 })
  const [attachments, setAttachments] = useState([])
  const [accounts, setAccounts] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [equipment, setEquipment] = useState([])
  const [models, setModels] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/accounts').then(res => res.json()).then(data => setAccounts(data))
    fetch('/api/technicians').then(res => res.json()).then(data => setTechnicians(data))
    fetch('/api/masters/equipment').then(res => res.json()).then(data => setEquipment(data))
    fetch('/api/models').then(res => res.json()).then(data => setModels(data))
  }, [])

  function loadAttachments() {
    if (!id) {
      setAttachments([])
      return
    }
    fetch('/api/commissions/' + id + '/attachments')
      .then(res => res.json())
      .then(data => setAttachments(data))
  }

  useEffect(() => {
    setPending(emptyPending())
    setKeys(k => ({ bom: k.bom + 1, image: k.image + 1, other: k.other + 1 }))
    setMessage('')
    loadAttachments()

    const source = id || copyId
    if (!source) {
      setForm(emptyForm())
      return
    }
    fetch('/api/commissions/' + source)
      .then(res => (res.ok ? res.json() : null))
      .then(c => {
        if (!c) {
          setMessage('Commission report not found')
          return
        }
        const f = {}
        for (const key of Object.keys(emptyForm())) {
          f[key] = c[key] == null ? '' : String(c[key])
        }
        setForm(f)
      })
  }, [id, copyId])

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function setField(name, value) {
    setForm({ ...form, [name]: value })
  }

  function resetKind(kind) {
    setKeys(k => ({ ...k, [kind]: k[kind] + 1 }))
    setPending(p => ({ ...p, [kind]: [] }))
  }

  function pickFiles(k, e) {
    const list = Array.from(e.target.files)
    const extOf = f => f.name.split('.').pop().toLowerCase()

    const bad = list.find(f => !k.ext.includes(extOf(f)))
    if (bad) {
      setMessage(bad.name + ': not allowed here. Allowed: ' + k.ext.join(', ').toUpperCase())
      resetKind(k.kind)
      window.scrollTo(0, 0)
      return
    }
    const big = list.find(f => f.size > MAX_FILE)
    if (big) {
      setMessage(big.name + ': each file must be 10 MB or smaller')
      resetKind(k.kind)
      window.scrollTo(0, 0)
      return
    }
    setMessage('')
    setPending(p => ({ ...p, [k.kind]: list }))
  }

  async function removeAttachment(a) {
    if (!window.confirm('Remove "' + a.name + '"?')) return
    const res = await fetch('/api/attachments/' + a.id, { method: 'DELETE' })
    if (!res.ok) {
      setMessage('Could not remove the file')
      return
    }
    loadAttachments()
  }

  async function save() {
    setMessage('')
    const data = new FormData()
    for (const key of Object.keys(form)) {
      data.append(key, form[key])
    }
    for (const k of KINDS) {
      for (const f of pending[k.kind]) {
        data.append(k.field, f)
      }
    }

    try {
      const res = await fetch(editing ? '/api/commissions/' + id : '/api/commissions', {
        method: editing ? 'PUT' : 'POST',
        body: data
      })
      let body = {}
      try {
        body = await res.json()
      } catch (e) {}

      if (!res.ok) {
        setMessage(body.error || 'Server error (' + res.status + '). Check the red text in the node terminal.')
        window.scrollTo(0, 0)
        return
      }
      navigate('/software/commission')
    } catch (e) {
      setMessage('Could not reach the server. Check that node server.js is running.')
      window.scrollTo(0, 0)
    }
  }

  function cancel() {
    navigate('/software/commission')
  }

  const accountOptions = accounts.map(a => ({
    value: a.id,
    label: [a.name, a.city_name, a.area_name].filter(Boolean).join(' - ')
  }))
  const modelOptions = models.map(m => ({ value: m.id, label: m.name }))
  const saveLabel = editing ? 'Update' : 'Save'

  return (
    <>
      <h2 className="softtitle">Commission Report</h2>
      <TabBar tabs={tabs} />
      <div className="content">
        {copyId && !editing && (
          <p className="hint">You are adding a copy. Change what is different (like the serial number) and click Save. Files are not copied.</p>
        )}
        {message && <p id="msg">{message}</p>}

        <div className="threecol">

          <RedCard
            title={editing ? 'Edit Comission Report' : 'Register New Commission Report'}
            saveLabel={saveLabel}
            onSave={save}
            onCancel={cancel}
          >
            <div className="field">
              <SearchSelect
                options={accountOptions}
                value={form.account_id}
                onChange={v => setField('account_id', v)}
                placeholder="Select Account"
              />
            </div>
            <div className="field">
              <select name="technician_id" value={form.technician_id} onChange={change}>
                <option value="">Select Technician</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field">
              <select name="equipment_id" value={form.equipment_id} onChange={change}>
                <option value="">Select Equipment</option>
                {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="field">
              <SearchSelect
                options={modelOptions}
                value={form.model_id}
                onChange={v => setField('model_id', v)}
                placeholder="Select Model"
              />
            </div>
          </RedCard>

          <RedCard title="Commission Report - Model Details" saveLabel={saveLabel} onSave={save} onCancel={cancel}>
            <div className="field">
              <input name="part_no" value={form.part_no} onChange={change} placeholder="Part No." />
            </div>
            <div className="field">
              <input name="serial_no" value={form.serial_no} onChange={change} placeholder="Serial No." />
            </div>
            <div className="field">
              <input name="mfg_year" value={form.mfg_year} onChange={change} placeholder="Mfg. Year" />
            </div>
            <div className="field">
              <input name="compre_pressure" value={form.compre_pressure} onChange={change} placeholder="Compre. Pressure" />
            </div>
          </RedCard>

          <RedCard title="Commission Report - Service Details" saveLabel={saveLabel} onSave={save} onCancel={cancel}>
            <div className="field">
              <input type="date" name="commission_date" value={form.commission_date} onChange={change} />
            </div>
            <div className="field">
              <input name="pressure_setting" value={form.pressure_setting} onChange={change} placeholder="Pressure Setting SP/SD" />
            </div>
            <div className="field">
              <input type="number" min="0" name="service_interval" value={form.service_interval} onChange={change} placeholder="Service Interval (Next Service Hour)" />
            </div>
          </RedCard>

        </div>

        <div className="threecol">
          {KINDS.map(k => {
            const files = attachments.filter(a => a.kind === k.kind)
            return (
              <RedCard key={k.kind} title={k.title} saveLabel={saveLabel} onSave={save} onCancel={cancel}>
                {editing && files.map(a => (
                  <div className="filerow" key={a.id}>
                    <a href={'/api/attachments/' + a.id + '/file'} target="_blank" rel="noreferrer">{a.name}</a>
                    <span className="hint">{fmtSize(a.size)}</span>
                    <button className="circlebtn" title="Remove" onClick={() => removeAttachment(a)}>&#8855;</button>
                  </div>
                ))}
                {editing && files.length === 0 && <div className="hint">No files yet.</div>}
                <div className="field">
                  <input
                    key={keys[k.kind]}
                    type="file"
                    multiple
                    accept={k.ext.map(e => '.' + e).join(',')}
                    onChange={e => pickFiles(k, e)}
                  />
                  <div className="hint">{k.ext.join(', ').toUpperCase()} only, max 10 MB each. You can choose several files.</div>
                </div>
              </RedCard>
            )
          })}
        </div>
      </div>
    </>
  )
}