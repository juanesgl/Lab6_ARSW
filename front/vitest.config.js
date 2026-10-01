import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    // Las pruebas usan el mock salvo que indiquen lo contrario
    env: { VITE_USE_MOCK: 'true' },
  },
})
