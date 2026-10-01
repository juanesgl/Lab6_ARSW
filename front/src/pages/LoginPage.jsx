import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { login, selectIsAuthenticated } from '../features/auth/authSlice.js'
import { USE_MOCK } from '../services/blueprintsService.js'

export default function LoginPage() {
  const dispatch = useDispatch()
  const location = useLocation()
  const { status, error } = useSelector((s) => s.auth)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const from = location.state?.from || '/'

  // Con sesión activa no tiene sentido mostrar el formulario
  if (isAuthenticated) return <Navigate to={from} replace />

  // Al autenticarse, el <Navigate> de arriba redirige a la ruta original
  const submit = (e) => {
    e.preventDefault()
    dispatch(login({ username, password }))
  }

  return (
    <form className="card narrow" onSubmit={submit}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      {location.state?.from && (
        <p className="banner info">Debes iniciar sesión para acceder a {location.state.from}.</p>
      )}
      <div className="grid">
        <div>
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary" style={{ marginTop: 12 }} disabled={status === 'loading'}>
        {status === 'loading' ? 'Ingresando...' : 'Ingresar'}
      </button>
      <p className="muted" style={{ marginBottom: 0 }}>
        Usuarios de prueba{USE_MOCK ? ' (modo mock)' : ' del backend'}:{' '}
        <code>student / student123</code>
        {!USE_MOCK && ' (solo lectura)'}, <code>assistant / assistant123</code>
        {!USE_MOCK && ' (lectura y escritura)'}
      </p>
    </form>
  )
}
