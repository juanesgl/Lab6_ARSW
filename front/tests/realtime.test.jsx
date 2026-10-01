import { describe, it, expect } from 'vitest'
import reducer, {
  realtimeDisconnected,
  realtimeFailed,
  selectRealtimeStatus,
  selectRealtimeTech,
  statusChanged,
  techSelected,
} from '../src/features/realtime/realtimeSlice.js'
import {
  CLIENT_ID,
  RT_TECHNOLOGIES,
  createRealtimeClient,
} from '../src/features/realtime/realtimeClients.js'
import { toBrokerURL } from '../src/services/stompService.js'
import blueprintsReducer, {
  addPointToCurrent,
  addRemotePointToCurrent,
  fetchBlueprint,
  remotePointsCleared,
} from '../src/features/blueprints/blueprintsSlice.js'

const init = () => ({ realtime: reducer(undefined, { type: '@@INIT' }) })
const bpInit = () => blueprintsReducer(undefined, { type: '@@INIT' })
const apply = (state, action) => ({ ...state, realtime: reducer(state.realtime, action) })

const withBlueprint = (author = 'john', name = 'plano-1', points = []) =>
  blueprintsReducer(bpInit(), fetchBlueprint.fulfilled({ author, name, points }, 'req', { author, name }))

describe('realtime slice', () => {
  it('should start with tech none and idle status', () => {
    const state = init()
    expect(selectRealtimeTech(state)).toBe('none')
    expect(selectRealtimeStatus(state)).toBe('idle')
  })

  it('should reset status when tech changes', () => {
    const connected = apply(init(), statusChanged({ state: 'connected' }))
    const state = apply(connected, techSelected('stomp'))
    expect(selectRealtimeTech(state)).toBe('stomp')
    expect(selectRealtimeStatus(state)).toBe('idle')
  })

  it('should keep status when the same tech is selected again', () => {
    const connected = apply(init(), statusChanged({ state: 'connected' }))
    const state = apply(connected, techSelected('none'))
    expect(selectRealtimeStatus(state)).toBe('connected')
  })

  it('should store the error detail when status is error', () => {
    const state = apply(init(), statusChanged({ state: 'error', detail: 'ECONNREFUSED' }))
    expect(selectRealtimeStatus(state)).toBe('error')
    expect(state.realtime.error).toBe('ECONNREFUSED')
  })

  it('should clear the error when disconnecting', () => {
    const failed = apply(init(), realtimeFailed('boom'))
    const state = apply(failed, realtimeDisconnected())
    expect(selectRealtimeStatus(state)).toBe('idle')
    expect(state.realtime.error).toBeNull()
  })
})

describe('realtime clients registry', () => {
  it('should offer none, stomp and socket.io options', () => {
    expect(RT_TECHNOLOGIES.map((t) => t.value)).toEqual(['none', 'stomp', 'socketio'])
  })

  it('should return null client when tech is none', () => {
    expect(createRealtimeClient('none', {})).toBeNull()
  })

  it('should build clients with the common transport interface', () => {
    for (const tech of ['stomp', 'socketio']) {
      const client = createRealtimeClient(tech, {})
      for (const method of ['connect', 'sendPoint', 'disconnect']) {
        expect(typeof client[method]).toBe('function')
      }
      // Sin conexión no se envía nada (y no lanza)
      expect(client.sendPoint({ author: 'a', name: 'b', point: { x: 1, y: 1 } })).toBe(false)
    }
  })

  it('should identify this tab with a stable client id', () => {
    expect(CLIENT_ID).toEqual(expect.any(String))
    expect(CLIENT_ID.length).toBeGreaterThan(8)
  })
})

describe('STOMP broker URL', () => {
  it('should append the endpoint and switch http to ws', () => {
    expect(toBrokerURL('http://localhost:8080')).toBe('ws://localhost:8080/ws-blueprints')
    expect(toBrokerURL('https://api.example.com/')).toBe('wss://api.example.com/ws-blueprints')
  })

  it('should keep a ws url that already includes the endpoint', () => {
    expect(toBrokerURL('ws://localhost:8080/ws-blueprints')).toBe(
      'ws://localhost:8080/ws-blueprints',
    )
  })

  it('should fall back to the local backend when unset', () => {
    expect(toBrokerURL(undefined)).toBe('ws://localhost:8080/ws-blueprints')
  })
})

describe('remote points in blueprints slice', () => {
  it('should append a remote point to the current blueprint', () => {
    const state = blueprintsReducer(
      withBlueprint(),
      addRemotePointToCurrent({ author: 'john', name: 'plano-1', point: { x: 10, y: 20 } }),
    )
    expect(state.current.points).toEqual([{ x: 10, y: 20 }])
  })

  it('should ignore a remote point from another blueprint', () => {
    const state = blueprintsReducer(
      withBlueprint(),
      addRemotePointToCurrent({ author: 'juan', name: 'plano-2', point: { x: 10, y: 20 } }),
    )
    expect(state.current.points).toEqual([])
  })

  it('should not duplicate the echo of a locally drawn point', () => {
    const drawn = blueprintsReducer(
      withBlueprint(),
      addPointToCurrent({ x: 10, y: 20 }),
    )
    const state = blueprintsReducer(
      drawn,
      addRemotePointToCurrent({ author: 'john', name: 'plano-1', point: { x: 10, y: 20 } }),
    )
    expect(state.current.points).toHaveLength(1)
  })

  it('should keep a point from another tab even if its coordinates repeat', () => {
    const drawn = blueprintsReducer(withBlueprint(), addPointToCurrent({ x: 10, y: 20 }))
    const state = blueprintsReducer(
      drawn,
      addRemotePointToCurrent({
        author: 'john',
        name: 'plano-1',
        point: { x: 10, y: 20 },
        clientId: 'otra-pestaña',
      }),
    )
    expect(state.current.points).toHaveLength(2)
  })

  it('should keep distinct points even when they share one axis', () => {
    const state = blueprintsReducer(
      withBlueprint(),
      addRemotePointToCurrent({ author: 'john', name: 'plano-1', point: { x: 10, y: 20 } }),
    )
    const next = blueprintsReducer(
      state,
      addRemotePointToCurrent({ author: 'john', name: 'plano-1', point: { x: 10, y: 21 } }),
    )
    expect(next.current.points).toHaveLength(2)
  })

  it('should drop unsaved remote points leaving them for the next session', () => {
    const withSaved = withBlueprint('john', 'plano-1', [{ x: 1, y: 1 }])
    const withRemote = blueprintsReducer(
      withSaved,
      addRemotePointToCurrent({ author: 'john', name: 'plano-1', point: { x: 9, y: 9 } }),
    )
    const state = blueprintsReducer(withRemote, remotePointsCleared())
    expect(state.current.points).toEqual([{ x: 1, y: 1 }])
  })

  it('should ignore remote points when no blueprint is open', () => {
    const state = blueprintsReducer(
      bpInit(),
      addRemotePointToCurrent({ author: 'john', name: 'plano-1', point: { x: 1, y: 1 } }),
    )
    expect(state.current).toBeNull()
  })
})