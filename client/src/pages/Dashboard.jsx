import { useState, useEffect } from 'react'
import PageHead from '../components/PageHead'

const heights = [20, 35, 15, 40, 25, 45, 30, 18, 38]

function localTime(t) {
  return new Date(t.replace(' ', 'T') + 'Z').toLocaleString()
}

function callId(id) {
  return 'CALL-' + String(id).padStart(5, '0')
}

function StatCard({ number, label, color }) {
  return (
    <div className="card">
      <div>
        <div className="num">{number}</div>
        <div className="label">{label}</div>
      </div>
      <div className="spark" style={{ color: color }}>
        {heights.map((h, i) => (
          <span key={i} style={{ height: h }}></span>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [d, setD] = useState({
    customers: 0, calls: 0, pending: 0, technicians: 0, models: 0, parts: 0,
    recentCalls: [], technicianList: []
  })

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => setD(data))
  }, [])

  return (
    <>
      <PageHead title="Dashboard" />
      <div className="content">
        <div className="cards">
          <StatCard number={d.customers} label="Total Customers" color="#18b9c4" />
          <StatCard number={d.calls} label="Total Calls" color="#f5a623" />
          <StatCard number={d.pending} label="Pending Calls" color="#3f3fb0" />
          <StatCard number={d.technicians} label="Total Technician" color="#6b1a1a" />
          <StatCard number={d.models} label="Total Model" color="#111" />
          <StatCard number={d.parts} label="Total Parts" color="#18b9c4" />
        </div>

        <div className="dash">
          <div>
            <div className="panel">
              <h3>Technician Location</h3>
              <select>
                <option value="">Select Technician</option>
                {d.technicianList.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="panel">
              <h3>Recent calls</h3>
              {d.recentCalls.length === 0 && <p>No calls yet.</p>}
              {d.recentCalls.map(c => (
                <div className="item" key={c.id}>
                  <div>&#9742;</div>
                  <div>
                    <div className="time">{localTime(c.created_at)}</div>
                    <div>New Call Added for {c.customer}</div>
                    <div>Call ID : {callId(c.id)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="panel">
              <h3>Start/End Day - Total 0</h3>
              <p style={{ color: '#8795a3' }}>No data yet.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}