export default function RedCard({ title, saveLabel = 'Save', onSave, onCancel, children }) {
  return (
    <div className="redcard">
      <div className="rh">{title}</div>
      <div className="rb">
        {children}
        <div className="btnrow">
          <button className="btn-save" onClick={onSave}>{saveLabel}</button>
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}