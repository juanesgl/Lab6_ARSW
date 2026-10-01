import apiclient from './apiClient.js'
import apimock from './apimock.js'

// Única línea que decide la implementación: VITE_USE_MOCK=true usa el mock, false el API real
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const blueprintsService = USE_MOCK ? apimock : apiclient

export default blueprintsService
