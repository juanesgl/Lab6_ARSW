import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { selectIsAuthenticated } from '../features/auth/authSlice.js'

export default function PrivateRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    // Se recuerda la ruta original para volver a ella después del login
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
