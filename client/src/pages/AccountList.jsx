import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TabBar from '../components/TabBar'
import Pager from '../components/Pager'

const tabs = [
  ['Add New Account', '/software/accounts/add'],
  ['List of Account', '/software/accounts']
]

const PAGE_SIZE = 10

export default function AccountList() {
  const [list, setList] = useState([])
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  function load() {
    fetch('/api/accounts')
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

  async function remove(a) {
    if (!window.confirm('Delete "' + a.name + '"?')) return
    const res = await fetch('/api/accounts/' + a.id, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error)
      return
    }
    load()
  }

  const q = search.toLowerCase()
  const shown = list.filter(a =>
    [a.name, a.address, a.contact_person, a.phone, a.phone2, a.city_name, a.area_name]
      .join(' ').toLowerCase().includes(q)
  )
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  return (
    <>
      <h2 className="softtitle">Account Master</h2>
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
                <th>Name</th><th>Address</th><th>Contact Person</th><th>Phone</th><th>Edit</th><th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(a => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.address}</td>
                  <td>{a.contact_person}</td>
                  <td>{[a.phone, a.phone2].filter(Boolean).join(', ')}</td>
                  <td>
                    <Link className="iconbtn" title="Edit" to={'/software/accounts/' + a.id + '/edit'}>&#9998;</Link>
                  </td>
                  <td>
                    <button className="circlebtn" title="Delete" onClick={() => remove(a)}>&#8855;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p>No accounts found.</p>}

          <Pager page={current} pages={pages} onChange={setPage} />
        </div>
      </div>
    </>
  )
}