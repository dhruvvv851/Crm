import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SalesTabs from '../components/SalesTabs'

const emptyCustomer = {
  name: '', email: '', address: '', gstin: '', contact_person: '', phone: '', city: ''
}

function today() {
  return new Date().toLocaleDateString('en-CA')
}

function emptyQuote() {
  return { scope: '', finalization_place: '', installation_place: '', application: '', quotation_date: today() }
}

function unique(list) {
  return [...new Set(list.filter(Boolean))]
}

export default function AddCustomer() {
  const navigate = useNavigate()
  const [type, setType] = useState('Existing Customer')
  const [customers, setCustomers] = useState([])
  const [quotes, setQuotes] = useState([])
  const [companyId, setCompanyId] = useState('')
  const [cust, setCust] = useState(emptyCustomer)
  const [quote, setQuote] = useState(emptyQuote())
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/customers').then(res => res.json()).then(data => setCustomers(data))
    fetch('/api/quotations').then(res => res.json()).then(data => setQuotes(data))
  }, [])

  const existing = type === 'Existing Customer'

  function changeType(e) {
    setType(e.target.value)
    setCompanyId('')
    setCust(emptyCustomer)
    setMessage('')
  }

  function pickCompany(e) {
    const id = e.target.value
    setCompanyId(id)
    const c = customers.find(x => String(x.id) === id)
    setCust(c ? {
      name: c.name || '',
      email: c.email || '',
      address: c.address || '',
      gstin: c.gstin || '',
      contact_person: c.contact_person || '',
      phone: c.phone || '',
      city: c.city || ''
    } : emptyCustomer)
  }

  function changeCust(e) {
    setCust({ ...cust, [e.target.name]: e.target.value })
  }

  function changeQuote(e) {
    setQuote({ ...quote, [e.target.name]: e.target.value })
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    return { ok: res.ok, data: data }
  }

  async function create() {
    setMessage('')
    let customerId = companyId

    if (existing) {
      if (!companyId) {
        setMessage('Please select a company')
        return
      }
    } else {
      const r = await post('/api/customers', cust)
      if (!r.ok) {
        setMessage(r.data.error)
        return
      }
      customerId = r.data.id
    }

    const wantsQuotation = existing || quote.scope.trim() !== ''
    if (wantsQuotation) {
      const q = await post('/api/quotations', { ...quote, customer_id: customerId })
      if (!q.ok) {
        setMessage(q.data.error)
        return
      }
    }

    navigate('/customers/' + customerId)
  }

  const cities = unique(customers.map(c => c.city))
  const finalizations = unique(quotes.map(q => q.finalization_place))
  const installations = unique(quotes.map(q => q.installation_place))
  const applications = unique(quotes.map(q => q.application))

  return (
    <>
      <SalesTabs />
      <div className="content">
        <div className="addgrid">

          <div>
            <div className="panel">
              <h3>Customer Type</h3>
              <select value={type} onChange={changeType}>
                <option>Existing Customer</option>
                <option>New Prospect</option>
              </select>
            </div>

            {existing && (
              <div className="panel">
                <h3>Select Customer Company</h3>
                <select value={companyId} onChange={pickCompany}>
                  <option value="">Select Company</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="twocol">

              <div>
                <h3>Customer/Company Details</h3>
                <div className="field">
                  <input name="name" value={cust.name} onChange={changeCust} readOnly={existing} placeholder="Customer Name" />
                </div>
                <div className="field">
                  <input name="email" value={cust.email} onChange={changeCust} readOnly={existing} placeholder="Customer Email" />
                </div>
                <div className="field">
                  <textarea name="address" rows={4} value={cust.address} onChange={changeCust} readOnly={existing} placeholder="Customer Address" />
                </div>
                <div className="field">
                  <input name="gstin" value={cust.gstin} onChange={changeCust} readOnly={existing} placeholder="GSTIN" />
                </div>
                <div className="field">
                  <input name="contact_person" value={cust.contact_person} onChange={changeCust} readOnly={existing} placeholder="Contact Person Name" />
                </div>
                <div className="field">
                  <input name="phone" value={cust.phone} onChange={changeCust} readOnly={existing} placeholder="Contact Person Mobile" />
                </div>
                <div className="field">
                  <input name="city" list="cityList" value={cust.city} onChange={changeCust} readOnly={existing} placeholder="Select City" />
                  <datalist id="cityList">
                    {cities.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <h3>Quotation Details</h3>
                <div className="field">
                  <input name="scope" value={quote.scope} onChange={changeQuote} placeholder="Proposed Scope of Supply" />
                </div>
                <div className="field">
                  <input name="finalization_place" list="finalList" value={quote.finalization_place} onChange={changeQuote} placeholder="Place of Finalization" />
                  <datalist id="finalList">
                    {finalizations.map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>
                <div className="field">
                  <input name="installation_place" list="installList" value={quote.installation_place} onChange={changeQuote} placeholder="Place of Installation" />
                  <datalist id="installList">
                    {installations.map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>
                <div className="field">
                  <input name="application" list="appList" value={quote.application} onChange={changeQuote} placeholder="Application" />
                  <datalist id="appList">
                    {applications.map(v => <option key={v} value={v} />)}
                  </datalist>
                </div>
                <div className="field">
                  <input type="date" name="quotation_date" value={quote.quotation_date} onChange={changeQuote} />
                </div>

                <div className="createrow">
                  <button className="btn" onClick={create}>Create</button>
                </div>
                <p id="msg">{message}</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  )
}
