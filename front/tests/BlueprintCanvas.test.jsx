import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import BlueprintCanvas from '../src/components/BlueprintCanvas.jsx'

describe('BlueprintCanvas', () => {
  it('renderiza un canvas y llama getContext', () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    const { container } = render(
      <BlueprintCanvas
        points={[
          { x: 10, y: 10 },
          { x: 50, y: 60 },
        ]}
      />,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('tiene identificador propio y dimensiones 520x360 por defecto', () => {
    const { container } = render(<BlueprintCanvas />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toHaveAttribute('id', 'blueprint-canvas')
    expect(canvas).toHaveAttribute('width', '520')
    expect(canvas).toHaveAttribute('height', '360')
  })

  it('al hacer click notifica el punto con coordenadas del lienzo', () => {
    const onAddPoint = vi.fn()
    const { container } = render(<BlueprintCanvas onAddPoint={onAddPoint} />)
    const canvas = container.querySelector('canvas')
    canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 520, height: 360 })
    fireEvent.click(canvas, { clientX: 110, clientY: 70 })
    expect(onAddPoint).toHaveBeenCalledWith({ x: 100, y: 50 })
  })

  it('no agrega puntos cuando es de solo lectura', () => {
    const { container } = render(<BlueprintCanvas />)
    const canvas = container.querySelector('canvas')
    expect(() => fireEvent.click(canvas, { clientX: 5, clientY: 5 })).not.toThrow()
    expect(canvas.style.cursor).toBe('default')
  })
})
