import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import authService from '../../services/authService.js'
import { TOKEN_KEY } from '../../services/http.js'

const USER_KEY = 'username'

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const token = await authService.login(username, password)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, username)
      return { token, username }
    } catch (err) {
      const status = err?.response?.status
      return rejectWithValue(
        status === 401 || status === 400
          ? 'Usuario o contraseña incorrectos.'
          : 'No se pudo conectar con el servidor de autenticación.',
      )
    }
  },
)

export const logout = () => (dispatch) => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  dispatch(slice.actions.loggedOut())
}

const slice = createSlice({
  name: 'auth',
  initialState: () => ({
    token: localStorage.getItem(TOKEN_KEY),
    username: localStorage.getItem(USER_KEY),
    status: 'idle',
    error: null,
  }),
  reducers: {
    loggedOut(state) {
      state.token = null
      state.username = null
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (s) => {
        s.status = 'loading'
        s.error = null
      })
      .addCase(login.fulfilled, (s, a) => {
        s.status = 'succeeded'
        s.token = a.payload.token
        s.username = a.payload.username
      })
      .addCase(login.rejected, (s, a) => {
        s.status = 'failed'
        s.error = a.payload
      })
  },
})

export const { loggedOut } = slice.actions
export const selectIsAuthenticated = (state) => Boolean(state.auth.token)
export default slice.reducer
