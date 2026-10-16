import { useState, useEffect, useRef } from 'react'

export default function SearchSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const box = useRef(null)

  const selected = options.find(o => String(o.value) === String(value))

  useEffect(() => {
    function onDocClick(e) {
      if (box.current && !box.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const q = text.toLowerCase()
  const matches = options.filter(o => o.label.toLowerCase().includes(q))
  const shown = matches.slice(0, 50)

  function pick(o) {
    onChange(String(o.value))
    setOpen(false)
    setText('')
  }

  function clear() {
    onChange('')
    setOpen(false)
    setText('')
  }

  return (
    <div className="ss" ref={box}>
      <input
        value={open ? text : (selected ? selected.label : '')}
        placeholder={open && selected ? selected.label : placeholder}
        onFocus={() => { setOpen(true); setText('') }}
        onChange={e => { setText(e.target.value); setOpen(true) }}
      />
      {open && (
        <div className="sslist">
          {value !== '' && <div className="ssitem muted" onMouseDown={clear}>Clear selection</div>}
          {shown.map(o => (
            <div key={o.value} className="ssitem" onMouseDown={() => pick(o)}>{o.label}</div>
          ))}
          {matches.length === 0 && <div className="ssitem muted">No match</div>}
          {matches.length > 50 && <div className="ssitem muted">Showing the first 50. Type to narrow down.</div>}
        </div>
      )}
    </div>
  )
}