import api from './http.js'
import { USE_MOCK } from './blueprintsService.js'

// Mismos usuarios que InMemoryUserService del backend (Lab P2)
const MOCK_USERS = { student: 'student123', assistant: 'assistant123' }

const realAuth = {
  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    // El backend responde { access_token, token_type, expires_in }
    return data.access_token ?? data.token
  },
}

const mockAuth = {
  login: async (username, password) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (MOCK_USERS[username] !== password) {
      const err = new Error('Credenciales inválidas.')
      err.response = { status: 401 }
      throw err
    }
    return `mock-token-${username}`
  },
}

const authService = USE_MOCK ? mockAuth : realAuth

export default authService
