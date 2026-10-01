import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import {
  addPointToCurrent,
  clearError,
  deleteBlueprint,
  discardChanges,
  fetchAuthors,
  fetchBlueprint,
  fetchByAuthor,
  saveBlueprint,
} from '../features/blueprints/blueprintsSlice.js'
import {
  selectAuthors,
  selectBlueprintsByAuthor,
  selectCurrent,
  selectRequest,
  selectSelectedAuthor,
  selectTop5ByPoints,
  selectTotalPoints,
  selectUnsavedPoints,
} from '../features/blueprints/selectors.js'
import { selectIsAuthenticated } from '../features/auth/authSlice.js'
import { USE_MOCK } from '../services/blueprintsService.js'
import BlueprintCanvas from '../components/BlueprintCanvas.jsx'
import BlueprintList from '../components/BlueprintList.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Spinner from '../components/Spinner.jsx'

export default function BlueprintsPage() {
  const dispatch = useDispatch()
  const location = useLocation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const authors = useSelector(selectAuthors)
  const selectedAuthor = useSelector(selectSelectedAuthor)
  const items = useSelector((s) => selectBlueprintsByAuthor(s, selectedAuthor))
  const top5 = useSelector((s) => selectTop5ByPoints(s, selectedAuthor))
  const totalPoints = useSelector((s) => selectTotalPoints(s, selectedAuthor))
  const current = useSelector(selectCurrent)
  const unsavedPoints = useSelector(selectUnsavedPoints)
  const authorsReq = useSelector(selectRequest('fetchAuthors'))
  const listReq = useSelector(selectRequest('fetchByAuthor'))
  const openReq = useSelector(selectRequest('fetchBlueprint'))
  const saveReq = useSelector(selectRequest('saveBlueprint'))
  const deleteReq = useSelector(selectRequest('deleteBlueprint'))

  const [authorInput, setAuthorInput] = useState(location.state?.author ?? selectedAuthor)
  const [lastOpened, setLastOpened] = useState(null)
  const [lastDeleted, setLastDeleted] = useState(null)

  // El backend real exige JWT incluso para GET /blueprints; el mock no
  const canListAuthors = USE_MOCK || isAuthenticated

  useEffect(() => {
    if (canListAuthors) dispatch(fetchAuthors())
  }, [dispatch, canListAuthors])

  useEffect(() => {
    // Al volver desde "Crear Blueprint" se consulta automáticamente el autor creado
    if (location.state?.author) dispatch(fetchByAuthor(location.state.author))
  }, [dispatch, location.state])

  const getBlueprints = (e) => {
    e?.preventDefault()
    const author = authorInput.trim()
    if (author) dispatch(fetchByAuthor(author))
  }

  const openBlueprint = (bp) => {
    const arg = { author: bp.author, name: bp.name }
    setLastOpened(arg)
    dispatch(fetchBlueprint(arg))
  }

  const handleSave = () => {
    if (!current || !unsavedPoints.length) return
    dispatch(
      saveBlueprint({
        author: current.author,
        name: current.name,
        previousPoints: current.points.slice(0, current.points.length - unsavedPoints.length),
        newPoints: unsavedPoints,
      }),
    )
  }

  const handleDelete = (bp) => {
    const arg = { author: bp.author, name: bp.name }
    setLastDeleted(arg)
    dispatch(deleteBlueprint(arg))
  }

  return (
    <div className="page-grid">
      <section className="grid" style={{ gap: 16, alignContent: 'start' }}>
        <form className="card" onSubmit={getBlueprints}>
          <h2 style={{ marginTop: 0 }}>Blueprints</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              className="input"
              placeholder="Author"
              aria-label="Autor"
              list="authors-list"
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
            />
            <datalist id="authors-list">
              {authors.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <button className="btn primary" disabled={listReq.status === 'loading'}>
              Get blueprints
            </button>
          </div>
          {authorsReq.status === 'loading' && <Spinner label="Cargando autores..." />}
          {authors.length > 0 && (
            <p className="muted" style={{ marginBottom: 0 }}>
              Autores disponibles: {authors.join(', ')}
            </p>
          )}
        </form>

        <ErrorBanner
          message={authorsReq.error}
          onRetry={() => dispatch(fetchAuthors())}
          onClose={() => dispatch(clearError('fetchAuthors'))}
        />
        <ErrorBanner
          message={listReq.error}
          onRetry={() => selectedAuthor && dispatch(fetchByAuthor(selectedAuthor))}
          onClose={() => dispatch(clearError('fetchByAuthor'))}
        />
        <ErrorBanner
          message={deleteReq.error && `No se pudo eliminar el plano: ${deleteReq.error}`}
          onRetry={() => lastDeleted && dispatch(deleteBlueprint(lastDeleted))}
          onClose={() => dispatch(clearError('deleteBlueprint'))}
        />

        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            {selectedAuthor ? `${selectedAuthor}'s blueprints:` : 'Results'}
          </h3>
          {listReq.status === 'loading' && <Spinner label="Consultando planos..." />}
          {!items.length && listReq.status !== 'loading' && (
            <p className="muted">Sin resultados.</p>
          )}
          {!!items.length && (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Blueprint name</th>
                    <th className="num">Number of points</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((bp) => (
                    <tr
                      key={bp.name}
                      className={
                        current?.author === bp.author && current?.name === bp.name ? 'selected' : ''
                      }
                    >
                      <td>
                        <Link
                          to={`/blueprints/${encodeURIComponent(bp.author)}/${encodeURIComponent(bp.name)}`}
                          className="link"
                        >
                          {bp.name}
                        </Link>
                      </td>
                      <td className="num">{bp.points?.length || 0}</td>
                      <td className="row-actions">
                        <button type="button" className="btn" onClick={() => openBlueprint(bp)}>
                          Open
                        </button>
                        {isAuthenticated && (
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => handleDelete(bp)}
                            disabled={deleteReq.status === 'loading'}
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: 12, fontWeight: 700 }}>Total user points: {totalPoints}</p>
        </div>

        {!!items.length && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Top 5 por número de puntos</h3>
            <BlueprintList items={top5} onSelect={openBlueprint} />
          </div>
        )}
      </section>

      <section className="card" style={{ alignSelf: 'start' }}>
        <h3 style={{ marginTop: 0 }}>Current blueprint:</h3>
        <input
          className="input"
          aria-label="Plano actual"
          readOnly
          value={current ? current.name : ''}
          style={{ marginBottom: 8 }}
        />
        {current && (
          <p className="muted" style={{ marginTop: 0 }}>
            Autor: <strong>{current.author}</strong> · Puntos: {current.points.length}
            {unsavedPoints.length > 0 && (
              <span className="badge warn">{unsavedPoints.length} sin guardar</span>
            )}
          </p>
        )}

        <ErrorBanner
          message={openReq.error}
          onRetry={() => lastOpened && dispatch(fetchBlueprint(lastOpened))}
          onClose={() => dispatch(clearError('fetchBlueprint'))}
        />
        <ErrorBanner
          message={saveReq.error && `No se pudieron guardar los cambios: ${saveReq.error}`}
          onRetry={handleSave}
          onClose={() => dispatch(clearError('saveBlueprint'))}
        />
        {openReq.status === 'loading' && <Spinner label="Abriendo plano..." />}

        <BlueprintCanvas
          points={current?.points || []}
          onAddPoint={
            current && isAuthenticated ? (p) => dispatch(addPointToCurrent(p)) : undefined
          }
        />

        {current && isAuthenticated && (
          <div className="actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
              disabled={!unsavedPoints.length || saveReq.status === 'loading'}
            >
              {saveReq.status === 'loading' ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => dispatch(discardChanges())}
              disabled={!unsavedPoints.length}
            >
              Descartar
            </button>
            <span className="muted">Haz click en el lienzo para agregar puntos.</span>
          </div>
        )}
        {current && !isAuthenticated && (
          <p className="muted">
            <Link to="/login" className="link">
              Inicia sesión
            </Link>{' '}
            para editar o eliminar planos.
          </p>
        )}
      </section>
    </div>
  )
}
