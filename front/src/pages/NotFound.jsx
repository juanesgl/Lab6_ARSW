import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>404</h2>
      <p>Página no encontrada.</p>
      <Link to="/" className="link">
        ← Volver a Blueprints
      </Link>
    </div>
  )
}
