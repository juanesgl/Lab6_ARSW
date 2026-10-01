import { describe, it, expect } from 'vitest'
import reducer, {
  addPointToCurrent,
  clearError,
  createBlueprint,
  deleteBlueprint,
  discardChanges,
  fetchBlueprint,
  fetchByAuthor,
  saveBlueprint,
} from '../src/features/blueprints/blueprintsSlice.js'
import {
  selectTop5ByPoints,
  selectTotalPoints,
  selectUnsavedPoints,
} from '../src/features/blueprints/selectors.js'

const bp = (name, n, author = 'john') => ({
  author,
  name,
  points: Array.from({ length: n }, (_, i) => ({ x: i, y: i })),
})

const init = () => reducer(undefined, { type: '@@INIT' })
const withAuthor = (items) =>
  reducer(init(), fetchByAuthor.fulfilled({ author: 'john', items }, 'req', 'john'))

describe('blueprints slice', () => {
  it('should initialize correctly', () => {
    const state = init()
    expect(state.authors).toEqual([])
    expect(state.current).toBeNull()
    expect(state.requests.fetchByAuthor).toEqual({ status: 'idle', error: null })
  })

  it('maneja loading/error de forma independiente por thunk', () => {
    let state = reducer(init(), fetchByAuthor.pending('req', 'john'))
    expect(state.requests.fetchByAuthor.status).toBe('loading')
    expect(state.requests.fetchBlueprint.status).toBe('idle')
    expect(state.selectedAuthor).toBe('john')

    state = reducer(state, fetchByAuthor.rejected(null, 'req', 'john', 'Falló'))
    expect(state.requests.fetchByAuthor).toEqual({ status: 'failed', error: 'Falló' })

    state = reducer(state, clearError('fetchByAuthor'))
    expect(state.requests.fetchByAuthor.error).toBeNull()
  })

  it('guarda los planos del autor al completar fetchByAuthor', () => {
    const state = withAuthor([bp('a', 2)])
    expect(state.byAuthor.john).toHaveLength(1)
    expect(state.requests.fetchByAuthor.status).toBe('succeeded')
  })

  it('fetchBlueprint define el plano actual y los puntos guardados', () => {
    const state = reducer(init(), fetchBlueprint.fulfilled(bp('a', 3), 'req', {}))
    expect(state.current.name).toBe('a')
    expect(state.savedPointsCount).toBe(3)
  })

  it('addPointToCurrent y discardChanges', () => {
    let state = reducer(init(), fetchBlueprint.fulfilled(bp('a', 2), 'req', {}))
    state = reducer(state, addPointToCurrent({ x: 9, y: 9 }))
    expect(state.current.points).toHaveLength(3)
    expect(selectUnsavedPoints({ blueprints: state })).toEqual([{ x: 9, y: 9 }])

    state = reducer(state, discardChanges())
    expect(state.current.points).toHaveLength(2)
  })

  it('createBlueprint agrega el plano al autor y al catálogo', () => {
    const state = reducer(withAuthor([bp('a', 1)]), createBlueprint.fulfilled(bp('b', 2), 'req'))
    expect(state.byAuthor.john.map((b) => b.name)).toEqual(['a', 'b'])
    expect(state.authors).toContain('john')
  })

  it('saveBlueprint es optimista y revierte si falla', () => {
    const arg = {
      author: 'john',
      name: 'a',
      previousPoints: bp('a', 2).points,
      newPoints: [{ x: 5, y: 5 }],
    }
    let state = withAuthor([bp('a', 2)])
    state = reducer(state, saveBlueprint.pending('req', arg))
    expect(state.byAuthor.john[0].points).toHaveLength(3)

    state = reducer(state, saveBlueprint.rejected(null, 'req', arg, 'Error'))
    expect(state.byAuthor.john[0].points).toHaveLength(2)
    expect(state.requests.saveBlueprint.error).toBe('Error')
  })

  it('deleteBlueprint es optimista y reinserta el plano si falla', () => {
    const arg = { author: 'john', name: 'b' }
    let state = withAuthor([bp('a', 1), bp('b', 2), bp('c', 3)])
    state = reducer(state, deleteBlueprint.pending('req', arg))
    expect(state.byAuthor.john.map((b) => b.name)).toEqual(['a', 'c'])

    state = reducer(state, deleteBlueprint.rejected(null, 'req', arg, 'Error'))
    expect(state.byAuthor.john.map((b) => b.name)).toEqual(['a', 'b', 'c'])
    expect(state.pendingDelete).toBeNull()
  })

  it('deleteBlueprint exitoso limpia el plano actual si era el eliminado', () => {
    const arg = { author: 'john', name: 'a' }
    let state = withAuthor([bp('a', 1)])
    state = reducer(state, fetchBlueprint.fulfilled(bp('a', 1), 'req', {}))
    state = reducer(state, deleteBlueprint.pending('req', arg))
    state = reducer(state, deleteBlueprint.fulfilled(arg, 'req', arg))
    expect(state.byAuthor.john).toHaveLength(0)
    expect(state.current).toBeNull()
  })
})

describe('selectores', () => {
  const state = {
    blueprints: withAuthor([
      bp('a', 1),
      bp('b', 6),
      bp('c', 3),
      bp('d', 2),
      bp('e', 5),
      bp('f', 4),
    ]),
  }

  it('selectTop5ByPoints ordena por puntos y devuelve 5', () => {
    const top = selectTop5ByPoints(state, 'john')
    expect(top.map((b) => b.name)).toEqual(['b', 'e', 'f', 'c', 'd'])
  })

  it('selectTop5ByPoints está memoizado', () => {
    expect(selectTop5ByPoints(state, 'john')).toBe(selectTop5ByPoints(state, 'john'))
  })

  it('selectTotalPoints suma los puntos del autor', () => {
    expect(selectTotalPoints(state, 'john')).toBe(21)
    expect(selectTotalPoints(state, 'otro')).toBe(0)
  })
})
