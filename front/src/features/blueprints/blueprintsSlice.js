import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import blueprintsService from '../../services/blueprintsService.js'
import { toErrorMessage } from '../../services/http.js'

// Envuelve la llamada al servicio para que el error llegue a la UI como mensaje legible
const withMessage =
  (fn) =>
  async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg)
    } catch (err) {
      return rejectWithValue(toErrorMessage(err))
    }
  }

export const fetchAuthors = createAsyncThunk(
  'blueprints/fetchAuthors',
  withMessage(async () => {
    const data = await blueprintsService.getAll()
    return [...new Set(data.map((bp) => bp.author))].sort()
  }),
)

export const fetchByAuthor = createAsyncThunk(
  'blueprints/fetchByAuthor',
  withMessage(async (author) => {
    const items = await blueprintsService.getByAuthor(author)
    return { author, items }
  }),
)

export const fetchBlueprint = createAsyncThunk(
  'blueprints/fetchBlueprint',
  withMessage(({ author, name }) => blueprintsService.getByAuthorAndName(author, name)),
)

export const createBlueprint = createAsyncThunk(
  'blueprints/createBlueprint',
  withMessage((blueprint) => blueprintsService.create(blueprint)),
)

// Guarda los puntos agregados en el canvas. Optimista: la tabla se actualiza en `pending`
// y se revierte en `rejected` usando `previousPoints`.
export const saveBlueprint = createAsyncThunk(
  'blueprints/saveBlueprint',
  withMessage(({ author, name, newPoints }) =>
    blueprintsService.addPoints(author, name, newPoints),
  ),
)

// Optimista: el plano desaparece de la tabla en `pending` y se reinserta si falla.
export const deleteBlueprint = createAsyncThunk(
  'blueprints/deleteBlueprint',
  withMessage(({ author, name }) => blueprintsService.remove(author, name)),
)

const THUNKS = {
  fetchAuthors,
  fetchByAuthor,
  fetchBlueprint,
  createBlueprint,
  saveBlueprint,
  deleteBlueprint,
}

const idle = { status: 'idle', error: null }

export const initialState = {
  authors: [],
  byAuthor: {},
  // Último autor consultado (permite reintentar la consulta)
  selectedAuthor: '',
  current: null,
  // Cantidad de puntos de `current` que ya están persistidos en el backend
  savedPointsCount: 0,
  // Estado de carga/error independiente por thunk
  requests: Object.fromEntries(Object.keys(THUNKS).map((key) => [key, idle])),
  // Plano eliminado de forma optimista, para poder reinsertarlo si falla
  pendingDelete: null,
}

const findIndex = (items = [], name) => items.findIndex((bp) => bp.name === name)

const slice = createSlice({
  name: 'blueprints',
  initialState,
  reducers: {
    addPointToCurrent(state, action) {
      if (state.current) state.current.points.push(action.payload)
    },
    discardChanges(state) {
      if (state.current) state.current.points.splice(state.savedPointsCount)
    },
    clearError(state, action) {
      state.requests[action.payload].error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuthors.fulfilled, (s, a) => {
        s.authors = a.payload
      })
      .addCase(fetchByAuthor.pending, (s, a) => {
        s.selectedAuthor = a.meta.arg
      })
      .addCase(fetchByAuthor.fulfilled, (s, a) => {
        s.byAuthor[a.payload.author] = a.payload.items
      })
      .addCase(fetchBlueprint.fulfilled, (s, a) => {
        s.current = { ...a.payload, points: a.payload.points ?? [] }
        s.savedPointsCount = s.current.points.length
      })
      .addCase(createBlueprint.fulfilled, (s, a) => {
        const bp = a.payload
        if (s.byAuthor[bp.author]) s.byAuthor[bp.author].push(bp)
        if (!s.authors.includes(bp.author)) s.authors = [...s.authors, bp.author].sort()
      })

      // Guardado optimista
      .addCase(saveBlueprint.pending, (s, a) => {
        const { author, name, newPoints, previousPoints } = a.meta.arg
        const items = s.byAuthor[author]
        const i = findIndex(items, name)
        if (i !== -1) items[i].points = [...previousPoints, ...newPoints]
      })
      .addCase(saveBlueprint.fulfilled, (s, a) => {
        const { author, name, previousPoints, newPoints } = a.meta.arg
        if (s.current?.author === author && s.current?.name === name) {
          s.savedPointsCount = previousPoints.length + newPoints.length
        }
      })
      .addCase(saveBlueprint.rejected, (s, a) => {
        const { author, name, previousPoints } = a.meta.arg
        const items = s.byAuthor[author]
        const i = findIndex(items, name)
        if (i !== -1) items[i].points = previousPoints
      })

      // Eliminación optimista
      .addCase(deleteBlueprint.pending, (s, a) => {
        const { author, name } = a.meta.arg
        const items = s.byAuthor[author]
        const i = findIndex(items, name)
        if (i !== -1) {
          s.pendingDelete = { author, index: i, item: items[i] }
          items.splice(i, 1)
        }
      })
      .addCase(deleteBlueprint.fulfilled, (s, a) => {
        const { author, name } = a.meta.arg
        s.pendingDelete = null
        if (s.current?.author === author && s.current?.name === name) {
          s.current = null
          s.savedPointsCount = 0
        }
      })
      .addCase(deleteBlueprint.rejected, (s) => {
        const pending = s.pendingDelete
        if (pending && s.byAuthor[pending.author]) {
          s.byAuthor[pending.author].splice(pending.index, 0, pending.item)
        }
        s.pendingDelete = null
      })

    // Estados de carga/error comunes a todos los thunks (los matchers van después de los cases)
    for (const [key, thunk] of Object.entries(THUNKS)) {
      builder
        .addMatcher(thunk.pending.match, (s) => {
          s.requests[key] = { status: 'loading', error: null }
        })
        .addMatcher(thunk.fulfilled.match, (s) => {
          s.requests[key] = { status: 'succeeded', error: null }
        })
        .addMatcher(thunk.rejected.match, (s, a) => {
          s.requests[key] = { status: 'failed', error: a.payload ?? a.error.message }
        })
    }
  },
})

export const { addPointToCurrent, discardChanges, clearError } = slice.actions
export default slice.reducer
