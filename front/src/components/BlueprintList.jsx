// Lista compacta de blueprints con una barra proporcional al número de puntos (usada para el Top-5)
export default function BlueprintList({ items = [], onSelect }) {
  if (!items.length) return <p className="muted">Sin datos.</p>
  const max = Math.max(...items.map((bp) => bp.points?.length || 0), 1)
  return (
    <ol className="rank-list">
      {items.map((bp) => {
        const count = bp.points?.length || 0
        return (
          <li key={bp.name}>
            <button type="button" className="rank-item" onClick={() => onSelect?.(bp)}>
              <span className="rank-name">{bp.name}</span>
              <span className="rank-bar">
                <span style={{ width: `${(count / max) * 100}%` }} />
              </span>
              <span className="rank-count">{count}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
