import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import apimock from '../src/services/apimock.js'
import apiClient from '../src/services/apiClient.js'
import api, { toErrorMessage } from '../src/services/http.js'

describe('apimock y apiClient', () => {
  beforeEach(() => apimock.reset())
  afterEach(() => vi.restoreAllMocks())

  it('exponen la misma interfaz', () => {
    const required = ['getAll', 'getByAuthor', 'getByAuthorAndName', 'create']
    for (const method of required) {
      expect(typeof apimock[method]).toBe('function')
      expect(typeof apiClient[method]).toBe('function')
    }
    for (const method of Object.keys(apiClient)) {
      expect(typeof apimock[method]).toBe('function')
    }
  })

  it('apimock devuelve copias (no comparte referencias con quien lo llama)', async () => {
    const bp = await apimock.getByAuthorAndName('john', 'house')
    Object.freeze(bp)
    Object.freeze(bp.points)
    // Antes fallaba con "Cannot assign to read only property" al guardar
    await expect(apimock.addPoints('john', 'house', [{ x: 1, y: 1 }])).resolves.toBeTruthy()
    const updated = await apimock.getByAuthorAndName('john', 'house')
    expect(updated.points).toHaveLength(bp.points.length + 1)
  })

  it('apimock crea, rechaza duplicados y elimina', async () => {
    await apimock.create({ author: 'ana', name: 'x', points: [] })
    await expect(apimock.create({ author: 'ana', name: 'x', points: [] })).rejects.toThrow()
    await apimock.remove('ana', 'x')
    await expect(apimock.getByAuthor('ana')).rejects.toThrow(/no tiene planos/)
  })

  it('apiClient.addPoints hace un PUT por punto al endpoint /points', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ status: 202 })
    await apiClient.addPoints('john', 'my house', [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ])
    expect(put).toHaveBeenCalledTimes(2)
    expect(put).toHaveBeenNthCalledWith(1, '/blueprints/john/my%20house/points', { x: 1, y: 2 })
  })

  it('apiClient.getByAuthor consulta /blueprints/{author}', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [] })
    await apiClient.getByAuthor('john')
    expect(get).toHaveBeenCalledWith('/blueprints/john')
  })
})

describe('blueprintsService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('usa apimock cuando VITE_USE_MOCK=true', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    vi.resetModules()
    const { default: service } = await import('../src/services/blueprintsService.js')
    const { default: mock } = await import('../src/services/apimock.js')
    expect(service).toBe(mock)
  })

  it('usa apiClient cuando VITE_USE_MOCK=false', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'false')
    vi.resetModules()
    const { default: service } = await import('../src/services/blueprintsService.js')
    const { default: client } = await import('../src/services/apiClient.js')
    expect(service).toBe(client)
  })
})

describe('http (interceptores JWT)', () => {
  beforeEach(() => localStorage.clear())

  it('agrega Authorization: Bearer <token> si hay token', () => {
    localStorage.setItem('token', 'abc')
    const interceptor = api.interceptors.request.handlers[0].fulfilled
    const config = interceptor({ headers: {} })
    expect(config.headers.Authorization).toBe('Bearer abc')
  })

  it('no agrega Authorization sin token', () => {
    const interceptor = api.interceptors.request.handlers[0].fulfilled
    const config = interceptor({ headers: {} })
    expect(config.headers.Authorization).toBeUndefined()
  })

  it('ante un 401 elimina el token y emite el evento de sesión expirada', async () => {
    localStorage.setItem('token', 'abc')
    const listener = vi.fn()
    window.addEventListener('auth:unauthorized', listener)
    const onRejected = api.interceptors.response.handlers[0].rejected
    await expect(onRejected({ response: { status: 401 } })).rejects.toBeTruthy()
    expect(localStorage.getItem('token')).toBeNull()
    expect(listener).toHaveBeenCalled()
    window.removeEventListener('auth:unauthorized', listener)
  })

  it('toErrorMessage traduce códigos HTTP a mensajes legibles', () => {
    expect(toErrorMessage({ response: { status: 403 } })).toMatch(/403/)
    expect(toErrorMessage({ response: { status: 403, data: { error: 'Ya existe' } } })).toBe(
      'Ya existe (403).',
    )
    expect(toErrorMessage({ response: { status: 404, data: { error: 'No existe' } } })).toBe(
      'No existe (404).',
    )
    expect(toErrorMessage({ isAxiosError: true })).toMatch(/conectar/)
    expect(toErrorMessage(new Error('x'))).toBe('x')
  })
})
