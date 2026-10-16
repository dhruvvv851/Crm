import { NavLink } from 'react-router-dom'

export default function TabBar({ tabs }) {
  return (
    <div className="tabs">
      {tabs.map(([label, to]) => (
        <NavLink key={to} to={to} end className="tab">{label}</NavLink>
      ))}
    </div>
  )
}