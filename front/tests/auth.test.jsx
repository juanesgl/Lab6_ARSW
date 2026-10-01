import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { makeStore } from '../src/store/index.js'
import { login, logout } from '../src/features/auth/authSlice.js'
import PrivateRoute from '../src/components/PrivateRoute.jsx'

describe('authSlice', () => {
  beforeEach(() => localStorage.clear())

  it('login exitoso guarda el token en el store y en localStorage', async () => {
    const store = makeStore()
    await store.dispatch(login({ username: 'student', password: 'student123' }))
    expect(store.getState().auth.token).toBeTruthy()
    expect(store.getState().auth.username).toBe('student')
    expect(localStorage.getItem('token')).toBe(store.getState().auth.token)
  })

  it('login fallido informa el error y no guarda token', async () => {
    const store = makeStore()
    await store.dispatch(login({ username: 'student', password: 'mala' }))
    expect(store.getState().auth.token).toBeNull()
    expect(store.getState().auth.error).toMatch(/incorrectos/i)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('logout limpia la sesión', async () => {
    const store = makeStore()
    await store.dispatch(login({ username: 'student', password: 'student123' }))
    store.dispatch(logout())
    expect(store.getState().auth.token).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('PrivateRoute', () => {
  const renderAt = (token) => {
    const store = makeStore({ auth: { token, username: null, status: 'idle', error: null } })
    render(
      <Provider store={store}>
        <MemoryRouter
          initialEntries={['/create']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route
              path="/create"
              element={
                <PrivateRoute>
                  <p>Contenido protegido</p>
                </PrivateRoute>
              }
            />
            <Route path="/login" element={<p>Pantalla de login</p>} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    )
  }

  it('redirige a /login si no hay token', () => {
    renderAt(null)
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).toBeNull()
  })

  it('muestra el contenido si hay token', () => {
    renderAt('jwt')
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })
})
