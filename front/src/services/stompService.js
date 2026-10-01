import { Client } from '@stomp/stompjs'

const RECONNECT_DELAY_MS = 3000
const ENDPOINT = '/ws-blueprints'

// VITE_STOMP_BASE es solo el host (el enunciado lo da como http://localhost:8080): el esquema
// se pasa a ws(s) y se agrega el endpoint, porque sin él el handshake cae en una ruta protegida.
export function toBrokerURL(base) {
  const url = (base || 'ws://localhost:8080').trim().replace(/^http/i, 'ws').replace(/\/+$/, '')
  return url.endsWith(ENDPOINT) ? url : `${url}${ENDPOINT}`
}

export function createStompClient({ onUpdate, onStatus }) {
  const client = new Client({
    brokerURL: toBrokerURL(import.meta.env.VITE_STOMP_BASE),
    reconnectDelay: RECONNECT_DELAY_MS,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  })

  let subscription = null
  let room = null

  const subscribeToRoom = () => {
    if (!room) return
    subscription?.unsubscribe()
    subscription = client.subscribe(`/topic/blueprints.${room.author}.${room.name}`, (message) => {
      try {
        const payload = JSON.parse(message.body)
        if (payload?.point) onUpdate?.(payload)
      } catch (error) {
        console.warn('[stomp] payload inválido', error)
      }
    })
  }

  // Suscribir en onConnect: un subscribe() antes del handshake se descarta en silencio.
  client.onConnect = () => {
    subscribeToRoom()
    onStatus?.({ state: 'connected' })
  }

  client.onStompError = (frame) => {
    onStatus?.({ state: 'error', detail: frame.headers.message })
  }

  client.onWebSocketError = () => {
    onStatus?.({ state: 'error', detail: `No se pudo conectar a ${client.brokerURL}` })
  }

  client.onWebSocketClose = () => {
    subscription = null
    onStatus?.({ state: 'disconnected' })
  }

  return {
    id: 'stomp',
    connect(nextRoom) {
      room = nextRoom
      client.activate()
    },
    sendPoint({ author, name, point, clientId }) {
      if (!client.connected) return false
      client.publish({
        destination: '/app/draw',
        body: JSON.stringify({ author, name, point, clientId }),
      })
      return true
    },
    disconnect() {
      if (client.connected) subscription?.unsubscribe()
      subscription = null
      room = null
      client.deactivate()
    },
  }
}
