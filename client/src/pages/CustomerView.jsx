import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import SalesTabs from '../components/SalesTabs'

function localTime(t) {
  return t ? new Date(t.replace(' ', 'T') + 'Z').toLocaleString() : ''
}

export default function CustomerView() {
  const { id } = useParams()
  const [c, setC] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch('/api/customers/' + id)
      .then(res => {
        if (!res.ok) {
          setNotFound(true)
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data) setC(data)
      })

    fetch('/api/customers/' + id + '/quotations')
      .then(res => res.json())
      .then(data => setQuotes(data))
  }, [id])

  if (notFound) {
    return (
      <>
        <SalesTabs />
        <div className="content"><div className="panel">Customer not found.</div></div>
      </>
    )
  }

  if (!c) {
    return (
      <>
        <SalesTabs />
        <div className="content"><div className="panel">Loading...</div></div>
      </>
    )
  }

  const rows = [
    ['Customer ID', c.id],
    ['Company Name', c.name],
    ['Contact Person', c.contact_person],
    ['Contact Designation', c.contact_designation],
    ['Phone', c.phone],
    ['Phone 2', c.phone2],
    ['Email', c.email],
    ['GSTIN', c.gstin],
    ['City', c.city],
    ['Address', c.address],
    ['Added on', localTime(c.created_at)]
  ]

  return (
    <>
      <SalesTabs />
      <div className="content">

        <div className="panel">
          <h3>Customer Details</h3>
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
          <p><Link className="btn small" to="/customers">Back to list</Link></p>
        </div>

        <div className="panel">
          <h3>Quotations ({quotes.length})</h3>
          {quotes.length === 0 && <p>No quotations yet.</p>}
          {quotes.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Scope of Supply</th><th>Place of Finalization</th>
                  <th>Place of Installation</th><th>Application</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q.id}>
                    <td>{q.quotation_date}</td>
                    <td>{q.scope}</td>
                    <td>{q.finalization_place}</td>
                    <td>{q.installation_place}</td>
                    <td>{q.application}</td>
                    <td>{q.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </>
  )
}