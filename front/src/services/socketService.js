import { io } from 'socket.io-client'

export function createSocketClient({ onUpdate, onStatus }) {
  const base = import.meta.env.VITE_IO_BASE || 'http://localhost:3001'
  let socket = null

  const joinRoom = (room) => {
    if (!room || !socket) return
    socket.emit('join-room', `blueprints.${room.author}.${room.name}`)
  }

  return {
    id: 'socketio',
    connect(room) {
      if (socket) return
      socket = io(base, { transports: ['websocket'] })

      // join-room solo tiene efecto dentro de connect: emitirlo antes se descarta.
      socket.on('connect', () => {
        joinRoom(room)
        onStatus?.({ state: 'connected' })
      })
      socket.on('disconnect', () => onStatus?.({ state: 'disconnected' }))
      socket.on('connect_error', (err) =>
        onStatus?.({ state: 'error', detail: err.message }),
      )
      socket.on('blueprint-update', (payload) => {
        if (payload?.point) onUpdate?.(payload)
      })
    },
    sendPoint({ author, name, point }) {
      if (!socket?.connected) return false
      socket.emit('draw-event', {
        room: `blueprints.${author}.${name}`,
        author,
        name,
        point,
      })
      return true
    },
    disconnect() {
      socket?.emit('leave-room')
      socket?.disconnect()
      socket = null
    },
  }
}