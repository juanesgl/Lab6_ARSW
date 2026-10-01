import '@testing-library/jest-dom/vitest'

// ---- Canvas mock para jsdom ----
HTMLCanvasElement.prototype.getContext = () => {
  const noop = () => {}
  return {
    canvas: {},
    fillRect: noop,
    clearRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    arc: noop,
    fill: noop,
    strokeRect: noop,
    closePath: noop,
    save: noop,
    restore: noop,
    setTransform: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    transform: noop,
    drawImage: noop,
    fillText: noop,
    measureText: () => ({ width: 0 }),
    putImageData: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createPattern: () => ({}),
    createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({}),
    getLineDash: () => [],
    setLineDash: noop,
  }
}
