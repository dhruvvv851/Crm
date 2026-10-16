import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TabBar from '../components/TabBar'
import Pager from '../components/Pager'
import { fmtDay } from '../utils'

const tabs = [
  ['Add New Commission Report', '/software/commission/add'],
  ['List of Commission Report', '/software/commission']
]

const PAGE_SIZE = 10

export default function CommissionList() {
  const [list, setList] = useState([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  function load() {
    fetch('/api/commissions')
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

  async function remove(c) {
    if (!window.confirm('Delete this commission report of "' + c.account_name + '"?')) return
    const res = await fetch('/api/commissions/' + c.id, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error)
      return
    }
    load()
  }

  const q = search.toLowerCase()
  const shown = list.filter(c =>
    [c.account_name, c.model_name, c.equipment_name, c.part_no, c.serial_no, c.technician_name, fmtDay(c.commission_date)]
      .join(' ').toLowerCase().includes(q)
  )
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <h2 className="softtitle">Commission Report</h2>
      <TabBar tabs={tabs} />
      <div className="content">
        <div className="panel">
          <div className="searchrow">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch() }}
              placeholder="Search..."
            />
            <button className="btn" onClick={runSearch}>Search</button>
          </div>

          <table className="redtable">
            <thead>
              <tr>
                <th>Account</th><th>Model</th><th>Part No.</th><th>Serial No.</th>
                <th>Commission Date</th><th>Edit</th><th>Copy</th><th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id}>
                  <td>{c.account_name}</td>
                  <td>{c.model_name}</td>
                  <td>{c.part_no}</td>
                  <td>{c.serial_no}</td>
                  <td>{fmtDay(c.commission_date)}</td>
                  <td>
                    <Link className="iconbtn" title="Edit" to={'/software/commission/' + c.id + '/edit'}>&#9998;</Link>
                  </td>
                  <td>
                    <Link className="circlebtn" title="Copy" to={'/software/commission/add?copy=' + c.id}>&#8853;</Link>
                  </td>
                  <td>
                    <button className="circlebtn" title="Delete" onClick={() => remove(c)}>&#8855;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p>No commission reports found.</p>}

          <Pager page={current} pages={pages} onChange={setPage} />
        </div>
      </div>
    </>
  )
}