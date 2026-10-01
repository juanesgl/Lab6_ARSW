import { createStompClient } from '../../services/stompService.js'
import { createSocketClient } from '../../services/socketService.js'

export const RT_TECHNOLOGIES = [
  { value: 'none', label: 'None' },
  { value: 'stomp', label: 'STOMP' },
  { value: 'socketio', label: 'Socket.IO' },
]

// Identifica a esta pestaña en el canal: permite reconocer el eco de los puntos propios.
export const CLIENT_ID =
  globalThis.crypto?.randomUUID?.() ?? `c-${Date.now()}-${Math.random().toString(36).slice(2)}`

const FACTORIES = {
  stomp: createStompClient,
  socketio: createSocketClient,
}

export function createRealtimeClient(tech, handlers) {
  const factory = FACTORIES[tech]
  return factory ? factory(handlers) : null
}
