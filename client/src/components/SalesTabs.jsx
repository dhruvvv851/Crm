import { NavLink } from 'react-router-dom'

const tabs = [
  ['Add Customer', '/customers/add'],
  ['List of Customer', '/customers'],
  ['Draft UQN Quotation', '/quotations/draft'],
  ['Sent UQN Quotation', '/quotations/sent'],
  ['Rejected UQN Quotation', '/quotations/rejected'],
  ['Follow Up UQN Quotation', '/quotations/followup']
]

export default function SalesTabs() {
  return (
    <div className="tabs">
      {tabs.map(([label, to]) => (
        <NavLink key={to} to={to} end className="tab">{label}</NavLink>
      ))}
    </div>
  )
}