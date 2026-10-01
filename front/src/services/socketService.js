import { io } from 'socket.io-client'

const roomOf = ({ author, name }) => `blueprints.${author}.${name}`

export function createSocketClient({ onUpdate, onStatus }) {
  const base = import.meta.env.VITE_IO_BASE || 'http://localhost:3001'
  let socket = null
  let room = null

  return {
    id: 'socketio',
    connect(nextRoom) {
      if (socket) return
      room = nextRoom
      socket = io(base, { transports: ['websocket'] })

      // join-room solo tiene efecto dentro de connect: emitirlo antes se descarta.
      // Se repite en cada reconexión porque el servidor olvida las salas al caer el socket.
      socket.on('connect', () => {
        if (room) socket.emit('join-room', roomOf(room))
        onStatus?.({ state: 'connected' })
      })
      socket.on('disconnect', () => onStatus?.({ state: 'disconnected' }))
      socket.on('connect_error', (err) =>
        onStatus?.({ state: 'error', detail: `No se pudo conectar a ${base} (${err.message})` }),
      )
      // El servidor guía envía `points: [p]`; el nuestro agrega además `point`.
      socket.on('blueprint-update', (payload) => {
        const points = payload?.points ?? (payload?.point ? [payload.point] : [])
        for (const point of points) onUpdate?.({ ...payload, point })
      })
    },
    sendPoint({ author, name, point, clientId }) {
      if (!socket?.connected) return false
      socket.emit('draw-event', { room: roomOf({ author, name }), author, name, point, clientId })
      return true
    },
    disconnect() {
      if (room) socket?.emit('leave-room', roomOf(room))
      socket?.disconnect()
      socket = null
      room = null
    },
  }
}
