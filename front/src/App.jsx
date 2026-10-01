import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Route, Routes } from 'react-router-dom'
import BlueprintsPage from './pages/BlueprintsPage.jsx'
import BlueprintDetailPage from './pages/BlueprintDetailPage.jsx'
import CreateBlueprintPage from './pages/CreateBlueprintPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFound from './pages/NotFound.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import { logout, selectIsAuthenticated } from './features/auth/authSlice.js'
import { USE_MOCK } from './services/blueprintsService.js'

export default function App() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const username = useSelector((s) => s.auth.username)

  return (
    <div className="container">
      <header>
        <h1>
          ECI - Laboratorio de Blueprints en React
          <span className={`badge ${USE_MOCK ? 'warn' : 'ok'}`}>{USE_MOCK ? 'Mock' : 'API'}</span>
        </h1>
        <nav>
          <NavLink to="/" end>
            Blueprints
          </NavLink>
          <NavLink to="/create">Crear Blueprint</NavLink>
          {isAuthenticated ? (
            <>
              <span className="muted">👤 {username}</span>
              <button type="button" className="btn small" onClick={() => dispatch(logout())}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <NavLink to="/login">Login</NavLink>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<BlueprintsPage />} />
        <Route path="/blueprints/:author/:name" element={<BlueprintDetailPage />} />
        <Route
          path="/create"
          element={
            <PrivateRoute>
              <CreateBlueprintPage />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}
