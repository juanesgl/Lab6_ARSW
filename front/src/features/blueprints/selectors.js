import { createSelector } from '@reduxjs/toolkit'

const EMPTY = []

export const selectBlueprintsState = (state) => state.blueprints
export const selectAuthors = (state) => state.blueprints.authors
export const selectSelectedAuthor = (state) => state.blueprints.selectedAuthor
export const selectCurrent = (state) => state.blueprints.current
export const selectRequest = (key) => (state) => state.blueprints.requests[key]

export const selectBlueprintsByAuthor = (state, author) =>
  state.blueprints.byAuthor[author] ?? EMPTY

export const selectTotalPoints = createSelector([selectBlueprintsByAuthor], (items) =>
  items.reduce((acc, bp) => acc + (bp.points?.length || 0), 0),
)

// Memo selector: top-5 de planos del autor con más puntos
export const selectTop5ByPoints = createSelector([selectBlueprintsByAuthor], (items) =>
  [...items].sort((a, b) => (b.points?.length || 0) - (a.points?.length || 0)).slice(0, 5),
)

// Puntos agregados en el canvas que aún no se han guardado
export const selectUnsavedPoints = createSelector(
  [selectCurrent, (state) => state.blueprints.savedPointsCount],
  (current, saved) => (current ? current.points.slice(saved) : EMPTY),
)
