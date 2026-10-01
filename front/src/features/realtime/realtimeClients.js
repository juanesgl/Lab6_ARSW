import { createStompClient } from '../../services/stompService.js'
import { createSocketClient } from '../../services/socketService.js'

export const RT_TECHNOLOGIES = [
  { value: 'none', label: 'None' },
  { value: 'stomp', label: 'STOMP' },
  { value: 'socketio', label: 'Socket.IO' },
]

const FACTORIES = {
  stomp: createStompClient,
  socketio: createSocketClient,
}

export function createRealtimeClient(tech, handlers) {
  const factory = FACTORIES[tech]
  return factory ? factory(handlers) : null
}