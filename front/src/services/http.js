import axios from 'axios'

export const TOKEN_KEY = 'token'
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

// En desarrollo '/api' pasa por el proxy de Vite (vite.config.js), evitando problemas de CORS.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 8000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token ausente, inválido o expirado: se limpia la sesión y se avisa a la app
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(err)
  },
)

// Traduce errores de Axios/servicios a un mensaje legible para la UI
export function toErrorMessage(err) {
  const status = err?.response?.status
  if (status === 401) return 'No autorizado: inicia sesión para continuar (401).'
  // El backend también usa 403 (con cuerpo { error }) cuando el plano ya existe
  if (status === 403) {
    const detail = err.response.data?.error
    return detail ? `${detail} (403).` : 'Permisos insuficientes para esta operación (403).'
  }
  if (status === 404) {
    const detail = err.response.data?.error
    return detail ? `${detail} (404).` : 'El recurso solicitado no existe (404).'
  }
  if (status === 405) return 'El backend no soporta esta operación (405).'
  // El proxy (Vite/nginx) responde 500/502-504 sin cuerpo cuando el backend no está arriba
  if (status >= 500 && !err.response.data) return `No se pudo conectar con el backend (${status}).`
  if (status) return err.response.data?.error || `Error del servidor (${status}).`
  if (err?.code === 'ECONNABORTED') return 'El servidor tardó demasiado en responder.'
  if (err?.isAxiosError) return 'No se pudo conectar con el servidor.'
  return err?.message || 'Ocurrió un error inesperado.'
}

export default api
