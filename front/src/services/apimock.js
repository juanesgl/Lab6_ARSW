// Implementación en memoria con la misma interfaz que apiClient.
// Siempre devuelve copias: Redux congela lo que guarda en el store y el mock
// no debe compartir referencias con él.

const initialData = [
  {
    author: 'john',
    name: 'house',
    points: [
      { x: 60, y: 60 },
      { x: 260, y: 60 },
      { x: 260, y: 240 },
      { x: 60, y: 240 },
      { x: 60, y: 60 },
    ],
  },
  {
    author: 'john',
    name: 'garage',
    points: [
      { x: 300, y: 120 },
      { x: 460, y: 120 },
      { x: 460, y: 300 },
      { x: 300, y: 300 },
    ],
  },
  {
    author: 'john',
    name: 'roof',
    points: [
      { x: 40, y: 200 },
      { x: 260, y: 40 },
      { x: 480, y: 200 },
    ],
  },
  {
    author: 'john',
    name: 'fence',
    points: [
      { x: 20, y: 330 },
      { x: 500, y: 330 },
    ],
  },
  {
    author: 'john',
    name: 'garden',
    points: [
      { x: 100, y: 280 },
      { x: 160, y: 250 },
      { x: 220, y: 290 },
      { x: 280, y: 250 },
      { x: 340, y: 290 },
      { x: 400, y: 250 },
    ],
  },
  {
    author: 'john',
    name: 'window',
    points: [{ x: 120, y: 120 }],
  },
  {
    author: 'mary',
    name: 'office',
    points: [
      { x: 80, y: 80 },
      { x: 440, y: 80 },
      { x: 440, y: 280 },
      { x: 80, y: 280 },
      { x: 80, y: 80 },
    ],
  },
  {
    author: 'mary',
    name: 'bridge',
    points: [
      { x: 20, y: 260 },
      { x: 140, y: 140 },
      { x: 260, y: 100 },
      { x: 380, y: 140 },
      { x: 500, y: 260 },
    ],
  },
]

const clone = (value) => structuredClone(value)
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

let data = clone(initialData)

const find = (author, name) => data.find((bp) => bp.author === author && bp.name === name)

const apimock = {
  getAll: async () => {
    await delay()
    return clone(data)
  },
  getByAuthor: async (author) => {
    await delay()
    const bps = data.filter((bp) => bp.author === author)
    if (bps.length === 0) throw new Error(`El autor "${author}" no tiene planos registrados.`)
    return clone(bps)
  },
  getByAuthorAndName: async (author, name) => {
    await delay()
    const bp = find(author, name)
    if (!bp) throw new Error(`No existe el plano "${name}" de "${author}".`)
    return clone(bp)
  },
  create: async (blueprint) => {
    await delay()
    if (find(blueprint.author, blueprint.name)) {
      throw new Error(`Ya existe el plano "${blueprint.name}" de "${blueprint.author}".`)
    }
    data.push(clone(blueprint))
    return clone(blueprint)
  },
  addPoints: async (author, name, points) => {
    await delay()
    const bp = find(author, name)
    if (!bp) throw new Error(`No existe el plano "${name}" de "${author}".`)
    bp.points.push(...clone(points))
    return { author, name, points: clone(points) }
  },
  remove: async (author, name) => {
    await delay()
    if (!find(author, name)) throw new Error(`No existe el plano "${name}" de "${author}".`)
    data = data.filter((bp) => !(bp.author === author && bp.name === name))
    return { author, name }
  },
  // Solo para pruebas
  reset: () => {
    data = clone(initialData)
  },
}

export default apimock
