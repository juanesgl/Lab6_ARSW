import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BlueprintForm from '../src/components/BlueprintForm.jsx'

const fill = (author, name, points) => {
  fireEvent.change(screen.getByLabelText(/Autor/i), { target: { value: author } })
  fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: name } })
  if (points !== undefined) {
    fireEvent.change(screen.getByLabelText(/Puntos/i), { target: { value: points } })
  }
}

describe('BlueprintForm', () => {
  it('envía el formulario con puntos parseados', () => {
    const onSubmit = vi.fn()
    render(<BlueprintForm onSubmit={onSubmit} />)

    fill('john', 'house', '[{"x":1,"y":2}]')
    fireEvent.submit(screen.getByText(/Guardar/i))

    expect(onSubmit).toHaveBeenCalledWith({
      author: 'john',
      name: 'house',
      points: [{ x: 1, y: 2 }],
    })
  })

  it('muestra un error y no envía si el JSON es inválido', () => {
    const onSubmit = vi.fn()
    render(<BlueprintForm onSubmit={onSubmit} />)

    fill('john', 'house', '[{"x":1,')
    fireEvent.submit(screen.getByText(/Guardar/i))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/JSON de puntos inválido/i)
  })

  it('exige autor y nombre', () => {
    const onSubmit = vi.fn()
    render(<BlueprintForm onSubmit={onSubmit} />)

    fireEvent.submit(screen.getByText(/Guardar/i))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/obligatorios/i)
  })

  it('agrega puntos al JSON al hacer click en el lienzo', () => {
    const { container } = render(<BlueprintForm onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByText(/Limpiar puntos/i))

    const canvas = container.querySelector('canvas')
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 520, height: 360 })
    fireEvent.click(canvas, { clientX: 30, clientY: 40 })

    expect(JSON.parse(screen.getByLabelText(/Puntos/i).value)).toEqual([{ x: 30, y: 40 }])
  })

  it('muestra el error recibido del backend', () => {
    render(<BlueprintForm onSubmit={vi.fn()} error="Permisos insuficientes" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Permisos insuficientes')
  })
})
