import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SalesTabs from '../components/SalesTabs'
import { fmtDate, fmtDateTime } from '../utils'

const PAGE_SIZE = 10

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/customers')
      .then(res => res.json())
      .then(data => setCustomers(data))
  }, [])

  function runSearch() {
    setSearch(text)
    setPage(1)
  }

  const q = search.toLowerCase()
  const shown = customers.filter(c =>
    [c.name, c.address, c.contact_person, c.phone, c.city, fmtDate(c.created_at)]
      .join(' ').toLowerCase().includes(q)
  )
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <SalesTabs />
      <div className="content">
        <div className="panel">
          <h3>List of Customer</h3>
          <div className="searchrow">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
              placeholder="Search by company, address, person, mobile, city or date"
            />
            <button className="btn" onClick={runSearch}>Search</button>
          </div>

          <table className="redtable">
            <thead>
              <tr>
                <th>ID</th><th>Date</th><th>Company Name</th><th>Company Address</th>
                <th>Contact Person</th><th>Contact Mobile</th><th>Datetime</th><th>View Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{fmtDate(c.created_at)}</td>
                  <td>{c.name}</td>
                  <td>{c.address}</td>
                  <td>{c.contact_person}</td>
                  <td>{c.phone}</td>
                  <td>{fmtDateTime(c.created_at)}</td>
                  <td>
                    <Link className="iconbtn" to={'/customers/' + c.id} title="View Details">&#128065;</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p>No customers found.</p>}

          <div className="pager">
            <button disabled={current === 1} onClick={() => setPage(current - 1)}>&lsaquo;</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
              <button key={n} className={n === current ? 'on' : ''} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button disabled={current === pages} onClick={() => setPage(current + 1)}>&rsaquo;</button>
          </div>
        </div>
      </div>
    </>
  )
}