import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  tech: 'none',
  status: 'idle',
  error: null,
}

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    techSelected(state, action) {
      if (state.tech === action.payload) return
      state.tech = action.payload
      state.status = 'idle'
      state.error = null
    },
    statusChanged(state, action) {
      state.status = action.payload.state
      state.error = action.payload.detail ?? null
    },
    realtimeFailed(state, action) {
      state.status = 'error'
      state.error = action.payload ?? 'Error de tiempo real'
    },
    realtimeDisconnected(state) {
      state.status = 'idle'
      state.error = null
    },
  },
})

export const { techSelected, statusChanged, realtimeFailed, realtimeDisconnected } =
  realtimeSlice.actions

export const selectRealtimeTech = (s) => s.realtime.tech
export const selectRealtimeStatus = (s) => s.realtime.status
export const selectRealtimeError = (s) => s.realtime.error

export default realtimeSlice.reducer