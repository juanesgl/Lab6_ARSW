import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { io as connect } from 'socket.io-client'
import { createRealtimeServer, roomFor } from '../server.js'

let rt
let url
const sockets = []

const client = () =>
  new Promise((resolve, reject) => {
    const socket = connect(url, { transports: ['websocket'] })
    sockets.push(socket)
    socket.on('connect', () => resolve(socket))
    socket.on('connect_error', reject)
  })

const next = (socket, event, ms = 300) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    socket.once(event, (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })

const settle = () => new Promise((resolve) => setTimeout(resolve, 60))

before(async () => {
  rt = createRealtimeServer({ allowedOrigins: ['http://localhost:5173'] })
  await new Promise((resolve) => rt.server.listen(0, resolve))
  url = `http://localhost:${rt.server.address().port}`
})

after(async () => {
  for (const socket of sockets) socket.disconnect()
  await rt.io.close()
})

test('replica el punto a la otra pestaña de la misma sala, sin eco al emisor', async () => {
  const [a, b] = await Promise.all([client(), client()])
  const room = roomFor('juan', 'plano-1')
  a.emit('join-room', room)
  b.emit('join-room', room)
  await settle()

  const onB = next(b, 'blueprint-update')
  const onA = next(a, 'blueprint-update')
  a.emit('draw-event', { room, author: 'juan', name: 'plano-1', point: { x: 12, y: 34 }, clientId: 'tab-a' })

  assert.deepEqual(await onB, {
    author: 'juan',
    name: 'plano-1',
    point: { x: 12, y: 34 },
    points: [{ x: 12, y: 34 }],
    clientId: 'tab-a',
  })
  assert.equal(await onA, null)
})

test('aísla los planos: una sala distinta no recibe el punto', async () => {
  const [a, other] = await Promise.all([client(), client()])
  a.emit('join-room', roomFor('juan', 'plano-1'))
  other.emit('join-room', roomFor('juan', 'casa-de-campo'))
  await settle()

  const onOther = next(other, 'blueprint-update')
  a.emit('draw-event', { author: 'juan', name: 'plano-1', point: { x: 1, y: 1 } })
  assert.equal(await onOther, null)
})

test('rechaza payloads inválidos y dibujar en una sala a la que no se unió', async () => {
  const [a, b] = await Promise.all([client(), client()])
  a.emit('join-room', roomFor('juan', 'plano-1'))
  b.emit('join-room', roomFor('juan', 'casa-de-campo'))
  await settle()

  let error = next(a, 'rt-error')
  a.emit('draw-event', { author: 'juan', name: 'plano-1', point: { x: 9999, y: 1 } })
  assert.equal((await error).event, 'draw-event')

  // `room` apunta a la sala de B, pero A no está en ella
  const onB = next(b, 'blueprint-update')
  error = next(a, 'rt-error')
  a.emit('draw-event', {
    room: roomFor('juan', 'casa-de-campo'),
    author: 'juan',
    name: 'casa-de-campo',
    point: { x: 1, y: 1 },
  })
  assert.equal((await error).error, 'join the room first')
  assert.equal(await onB, null)
})

test('al cambiar de sala deja de recibir los puntos de la anterior', async () => {
  const [a, b] = await Promise.all([client(), client()])
  a.emit('join-room', roomFor('juan', 'plano-1'))
  b.emit('join-room', roomFor('juan', 'plano-1'))
  await settle()
  b.emit('join-room', roomFor('juan', 'casa-de-campo'))
  await settle()

  const onB = next(b, 'blueprint-update')
  a.emit('draw-event', { author: 'juan', name: 'plano-1', point: { x: 2, y: 2 } })
  assert.equal(await onB, null)
})

test('GET /health informa el estado y las salas activas', async () => {
  const a = await client()
  a.emit('join-room', roomFor('ana', 'x'))
  await settle()

  const res = await fetch(`${url}/health`)
  const body = await res.json()
  assert.equal(res.status, 200)
  assert.equal(body.status, 'UP')
  assert.ok(body.rooms.includes('blueprints.ana.x'))
})
