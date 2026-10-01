import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { fetchBlueprint } from '../features/blueprints/blueprintsSlice.js'
import { selectCurrent, selectRequest } from '../features/blueprints/selectors.js'
import BlueprintCanvas from '../components/BlueprintCanvas.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Spinner from '../components/Spinner.jsx'

export default function BlueprintDetailPage() {
  const { author, name } = useParams()
  const dispatch = useDispatch()
  const current = useSelector(selectCurrent)
  const request = useSelector(selectRequest('fetchBlueprint'))
  // Evita mostrar un plano distinto al de la URL mientras carga
  const bp = current?.author === author && current?.name === name ? current : null

  useEffect(() => {
    dispatch(fetchBlueprint({ author, name }))
  }, [author, name, dispatch])

  return (
    <div className="card">
      <p style={{ marginTop: 0 }}>
        <Link to="/" className="link">
          ← Volver a Blueprints
        </Link>
      </p>
      <ErrorBanner
        message={request.error}
        onRetry={() => dispatch(fetchBlueprint({ author, name }))}
      />
      {request.status === 'loading' && <Spinner />}
      {bp && (
        <>
          <h2>{bp.name}</h2>
          <p>
            <strong>Autor:</strong> {bp.author} · <strong>Puntos:</strong> {bp.points.length}
          </p>
          <BlueprintCanvas id="detail-canvas" points={bp.points} />
        </>
      )}
    </div>
  )
}
