function pageList(page, pages) {
  const set = new Set([1, pages])
  for (let n = page - 2; n <= page + 2; n++) {
    if (n >= 1 && n <= pages) set.add(n)
  }
  const sorted = [...set].sort((a, b) => a - b)
  const out = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap' + n)
    out.push(n)
  })
  return out
}

export default function Pager({ page, pages, onChange }) {
  return (
    <div className="pager">
      <button disabled={page === 1} onClick={() => onChange(page - 1)}>&lsaquo;</button>
      {pageList(page, pages).map(item =>
        typeof item === 'string'
          ? <span key={item}>...</span>
          : <button key={item} className={item === page ? 'on' : ''} onClick={() => onChange(item)}>{item}</button>
      )}
      <button disabled={page === pages} onClick={() => onChange(page + 1)}>&rsaquo;</button>
    </div>
  )
}