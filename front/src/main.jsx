import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import store from './store'
import { logout } from './features/auth/authSlice.js'
import { UNAUTHORIZED_EVENT } from './services/http.js'
import './styles.css'

// El interceptor de Axios avisa cuando el backend responde 401: se cierra la sesión en Redux
window.addEventListener(UNAUTHORIZED_EVENT, () => store.dispatch(logout()))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
)
