import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import BlueprintsPage from '../src/pages/BlueprintsPage.jsx'
import blueprintsReducer from '../src/features/blueprints/blueprintsSlice.js'
import authReducer from '../src/features/auth/authSlice.js'
import apimock from '../src/services/apimock.js'

// Store real (con el servicio mock) que además registra las acciones despachadas
function setup({ token = null } = {}) {
  const actions = []
  const recorder = () => (next) => (action) => {
    actions.push(action.type)
    return next(action)
  }
  const store = configureStore({
    reducer: combineReducers({ blueprints: blueprintsReducer, auth: authReducer }),
    preloadedState: { auth: { token, username: token && 'student', status: 'idle', error: null } },
    middleware: (gDM) => gDM().concat(recorder),
  })
  render(
    <Provider store={store}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <BlueprintsPage />
      </MemoryRouter>
    </Provider>,
  )
  return { store, actions }
}

const search = (author) => {
  fireEvent.change(screen.getByPlaceholderText(/Author/i), { target: { value: author } })
  fireEvent.click(screen.getByText(/Get blueprints/i))
}

describe('BlueprintsPage', () => {
  beforeEach(() => apimock.reset())

  it('despacha fetchByAuthor al hacer click en Get blueprints', () => {
    const { actions } = setup()
    search('JohnConnor')
    expect(actions).toContain('blueprints/fetchByAuthor/pending')
  })

  it('lista los planos del autor en una tabla con nombre, puntos y botón Open', async () => {
    setup()
    search('john')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(6)
    expect(within(table).getByText('house')).toBeInTheDocument()
    expect(within(table).getAllByRole('button', { name: 'Open' })).toHaveLength(6)
    expect(screen.getByText(/Total user points: 21/)).toBeInTheDocument()
  })

  it('al hacer Open muestra el nombre del plano actual (estado global)', async () => {
    const { store } = setup()
    search('john')
    const table = await screen.findByRole('table')
    const row = within(table).getByText('garage').closest('tr')
    fireEvent.click(within(row).getByRole('button', { name: 'Open' }))

    expect(await screen.findByDisplayValue('garage')).toBeInTheDocument()
    expect(store.getState().blueprints.current.name).toBe('garage')
  })

  it('muestra solo 5 planos en el Top 5', async () => {
    setup()
    search('john')
    await screen.findByRole('table')
    const top = screen.getByText(/Top 5/).closest('.card')
    expect(within(top).getAllByRole('listitem')).toHaveLength(5)
  })

  it('muestra un banner de error con Reintentar si la consulta falla', async () => {
    const { actions } = setup()
    search('nadie')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/no tiene planos/i)
    fireEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(actions.filter((a) => a === 'blueprints/fetchByAuthor/pending')).toHaveLength(2)
  })

  it('solo permite eliminar planos con sesión iniciada', async () => {
    setup({ token: 'mock-token-student' })
    search('john')
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('button', { name: 'Eliminar' })).toHaveLength(6)
  })

  it('sin sesión no aparece el botón Eliminar', async () => {
    setup()
    search('john')
    const table = await screen.findByRole('table')
    expect(within(table).queryByRole('button', { name: 'Eliminar' })).toBeNull()
  })
})
