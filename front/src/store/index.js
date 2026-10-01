import { combineReducers, configureStore } from '@reduxjs/toolkit'
import blueprintsReducer from '../features/blueprints/blueprintsSlice.js'
import authReducer from '../features/auth/authSlice.js'

const rootReducer = combineReducers({
  blueprints: blueprintsReducer,
  auth: authReducer,
})

export const makeStore = (preloadedState) =>
  configureStore({ reducer: rootReducer, preloadedState })

const store = makeStore()

export default store
