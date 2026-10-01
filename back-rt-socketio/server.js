import http from 'node:http'
import { pathToFileURL } from 'node:url'
import cors from 'cors'
import express from 'express'
import { Server } from 'socket.io'
import { z } from 'zod'

// Mismas reglas que BlueprintRealtimeController (STOMP): autor/nombre acotados y punto
// dentro del lienzo de 520x360.
const PART = /^[A-Za-z0-9._\- ]{1,64}$/
const part = z.string().trim().regex(PART)

const roomSchema = z.string().regex(/^blueprints\.[A-Za-z0-9._\- ]{3,129}$/)
const drawSchema = z.object({
  author: part,
  name: part,
  point: z.object({
    x: z.number().int().min(0).max(520),
    y: z.number().int().min(0).max(360),
  }),
  clientId: z
    .string()
    .regex(/^[A-Za-z0-9-]{1,64}$/)
    .optional(),
})

export const roomFor = (author, name) => `blueprints.${author}.${name}`

const log = (...args) => console.log(new Date().toISOString(), '[socket.io]', ...args)

export function createRealtimeServer({
  allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
} = {}) {
  const app = express()
  app.use(cors({ origin: allowedOrigins }))

  const server = http.createServer(app)
  const io = new Server(server, { cors: { origin: allowedOrigins } })

  app.get('/health', (_req, res) => {
    const rooms = [...io.sockets.adapter.rooms.keys()].filter((r) => r.startsWith('blueprints.'))
    res.json({ status: 'UP', uptime: process.uptime(), clients: io.engine.clientsCount, rooms })
  })

  io.on('connection', (socket) => {
    log(`${socket.id} connected (origin: ${socket.handshake.headers.origin ?? 'n/a'})`)

    const leaveCurrentRoom = () => {
      const room = socket.data.room
      if (!room) return
      socket.leave(room)
      socket.data.room = null
      log(`${socket.id} left ${room}`)
    }

    socket.on('join-room', (room) => {
      const parsed = roomSchema.safeParse(room)
      if (!parsed.success) {
        log(`${socket.id} rejected join-room: invalid room`)
        socket.emit('rt-error', { event: 'join-room', error: 'invalid room' })
        return
      }
      // Una pestaña colabora en un solo plano a la vez
      leaveCurrentRoom()
      socket.join(parsed.data)
      socket.data.room = parsed.data
      log(`${socket.id} joined ${parsed.data}`)
    })

    socket.on('leave-room', leaveCurrentRoom)

    socket.on('draw-event', (payload) => {
      const parsed = drawSchema.safeParse(payload)
      if (!parsed.success) {
        const error = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
        log(`${socket.id} rejected draw-event: ${error}`)
        socket.emit('rt-error', { event: 'draw-event', error })
        return
      }
      const { author, name, point, clientId } = parsed.data
      // La sala se deriva del autor/nombre validados (no del `room` del cliente) y solo
      // puede dibujar quien está dentro: así nadie publica en un plano ajeno.
      const room = roomFor(author, name)
      if (socket.data.room !== room) {
        log(`${socket.id} rejected draw-event: not joined to ${room}`)
        socket.emit('rt-error', { event: 'draw-event', error: 'join the room first' })
        return
      }
      // socket.to(room) excluye al emisor. `points` es el formato del repo guía.
      socket.to(room).emit('blueprint-update', { author, name, point, points: [point], clientId })
      log(`draw point (${point.x},${point.y}) on ${room}`)
    })

    socket.on('disconnect', (reason) => log(`${socket.id} disconnected (${reason})`))
  })

  return { app, server, io }
}

// Solo arranca al ejecutarse directamente (`node server.js`), no al importarse en las pruebas
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const port = Number(process.env.PORT) || 3001
  const { server } = createRealtimeServer()
  server.listen(port, () => log(`up on http://localhost:${port} (health: /health)`))
}
