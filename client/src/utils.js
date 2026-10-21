export function parseDb(t) {
  return new Date(t.replace(' ', 'T') + 'Z')
}

export function fmtDate(t) {
  if (!t) return ''
  const d = parseDb(t)
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-GB', { month: 'short' })
  return day + ' ' + month + ', ' + d.getFullYear()
}

export function fmtDateTime(t) {
  if (!t) return ''
  const d = parseDb(t)
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()
  return fmtDate(t) + ' ' + time
}

export function fmtDay(t) {
  if (!t) return ''
  const [y, m, d] = t.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return String(d).padStart(2, '0') + ' ' + date.toLocaleString('en-GB', { month: 'short' }) + ', ' + y
}

export function fmtSize(n) {
  if (!n) return ''
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

export function fmtTime(t) {
  if (!t) return ''
  return parseDb(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()
}

export function fmtLocal(t) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d)) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-GB', { month: 'short' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()
  return day + ' ' + month + ', ' + d.getFullYear() + ' ' + time
}

export function fmtMinutes(n) {
  if (n == null) return ''
  if (n < 60) return n + ' minute'
  return Math.floor(n / 60) + ' hour ' + (n % 60) + ' minute'
}

export function callLabel(c) {
  return c.call_no || 'CALL-' + String(c.id).padStart(5, '0')
}

export function visitDay(c) {
  if (c.call_date) return c.call_date
  return parseDb(c.created_at).toLocaleDateString('en-CA')
}

export function mapLink(lat, lng) {
  if (lat == null || lng == null) return ''
  return 'https://www.google.com/maps?q=' + lat + ',' + lng
}