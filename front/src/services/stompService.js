import { Client } from '@stomp/stompjs'

const RECONNECT_DELAY_MS = 3000

export function createStompClient({ onUpdate, onStatus }) {
  const client = new Client({
    brokerURL: import.meta.env.VITE_STOMP_BASE || 'ws://localhost:8080',
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
    sendPoint({ author, name, point }) {
      if (!client.connected) return false
      client.publish({
        destination: '/app/draw',
        body: JSON.stringify({ author, name, point }),
      })
      return true
    },
    disconnect() {
      subscription?.unsubscribe()
      subscription = null
      room = null
      client.deactivate()
    },
  }
}

