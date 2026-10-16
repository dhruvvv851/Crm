import { Link } from 'react-router-dom'

export default function PageHead({ title }) {
  return (
    <div className="pagehead">
      <h2>{title}</h2>
      <div className="crumb"><Link to="/">Home</Link> &gt; {title}</div>
    </div>
  )
}