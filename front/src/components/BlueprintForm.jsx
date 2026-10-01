import { useMemo, useState } from 'react'
import BlueprintCanvas from './BlueprintCanvas.jsx'

const DEFAULT_POINTS = '[{"x":40,"y":40},{"x":200,"y":120}]'

// Devuelve { points } si el JSON es un arreglo de {x, y} numéricos, o { error }
function parsePoints(json) {
  try {
    const points = JSON.parse(json)
    const valid =
      Array.isArray(points) &&
      points.every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
    return valid ? { points } : { error: 'Los puntos deben ser un arreglo de objetos {"x","y"}.' }
  } catch {
    return { error: 'JSON de puntos inválido.' }
  }
}

export default function BlueprintForm({ onSubmit, submitting = false, error = null }) {
  const [author, setAuthor] = useState('')
  const [name, setName] = useState('')
  const [pointsJSON, setPointsJSON] = useState(DEFAULT_POINTS)
  const [validationError, setValidationError] = useState(null)

  const parsed = useMemo(() => parsePoints(pointsJSON), [pointsJSON])

  const addPoint = (p) => {
    const base = parsed.points ?? []
    setPointsJSON(JSON.stringify([...base, p]))
  }

  const handle = (e) => {
    e.preventDefault()
    if (!author.trim() || !name.trim()) {
      setValidationError('El autor y el nombre son obligatorios.')
      return
    }
    if (parsed.error) {
      setValidationError(parsed.error)
      return
    }
    setValidationError(null)
    onSubmit({ author: author.trim(), name: name.trim(), points: parsed.points })
  }

  const message = validationError || error

  return (
    <form onSubmit={handle} className="card" noValidate>
      <h2 style={{ marginTop: 0 }}>Crear Blueprint</h2>
      <div className="grid form-layout">
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="grid cols-2">
            <div>
              <label htmlFor="autor">Autor</label>
              <input
                id="autor"
                className="input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="john"
              />
            </div>
            <div>
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mi-dibujo"
              />
            </div>
          </div>
          <div>
            <label htmlFor="puntos">Puntos (JSON)</label>
            <textarea
              id="puntos"
              className="input mono"
              rows="7"
              value={pointsJSON}
              onChange={(e) => setPointsJSON(e.target.value)}
            />
          </div>
          {message && (
            <p className="text-error" role="alert">
              {message}
            </p>
          )}
          <div className="actions">
            <button className="btn primary" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className="btn" onClick={() => setPointsJSON('[]')}>
              Limpiar puntos
            </button>
          </div>
        </div>
        <div>
          <p className="muted" style={{ marginTop: 0 }}>
            Haz click en el lienzo para agregar puntos ({parsed.points?.length ?? 0} puntos).
          </p>
          <BlueprintCanvas id="create-canvas" points={parsed.points ?? []} onAddPoint={addPoint} />
        </div>
      </div>
    </form>
  )
}
