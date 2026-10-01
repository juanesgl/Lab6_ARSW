import api from './http.js'

const path = (author, name) =>
  name === undefined
    ? `/blueprints/${encodeURIComponent(author)}`
    : `/blueprints/${encodeURIComponent(author)}/${encodeURIComponent(name)}`

const apiClient = {
  getAll: async () => {
    const { data } = await api.get('/blueprints')
    return data
  },
  getByAuthor: async (author) => {
    const { data } = await api.get(path(author))
    return data
  },
  getByAuthorAndName: async (author, name) => {
    const { data } = await api.get(path(author, name))
    return data
  },
  create: async (blueprint) => {
    await api.post('/blueprints', blueprint)
    return blueprint
  },
  // El backend expone PUT /blueprints/{author}/{name}/points que agrega UN punto por petición
  addPoints: async (author, name, points) => {
    for (const p of points) {
      await api.put(`${path(author, name)}/points`, p)
    }
    return { author, name, points }
  },
  remove: async (author, name) => {
    await api.delete(path(author, name))
    return { author, name }
  },
}

export default apiClient
