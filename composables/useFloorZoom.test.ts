import { describe, expect, it } from 'vitest'
import { MAX_ZOOM, MIN_ZOOM, clampZoom, useFloorZoom } from './useFloorZoom'

describe('clampZoom', () => {
  it('clamps to [MIN_ZOOM, MAX_ZOOM]', () => {
    expect(clampZoom(1)).toBe(1)
    expect(clampZoom(99)).toBe(MAX_ZOOM)
    expect(clampZoom(-3)).toBe(MIN_ZOOM)
    expect(clampZoom(NaN)).toBe(1)
  })
})

describe('useFloorZoom', () => {
  it('zooms in/out by step and resets', () => {
    const { zoom, zoomIn, zoomOut, zoomReset, zoomStyle } = useFloorZoom()
    zoomIn()
    expect(zoom.value).toBeCloseTo(1.25)
    zoomOut()
    zoomOut()
    expect(zoom.value).toBeCloseTo(0.75)
    expect(zoomStyle.value.transform).toContain('scale(0.75)')
    zoomReset()
    expect(zoom.value).toBe(1)
  })

  it('never exceeds bounds after many steps', () => {
    const { zoom, zoomIn } = useFloorZoom()
    for (let i = 0; i < 20; i++) zoomIn()
    expect(zoom.value).toBe(MAX_ZOOM)
    expect(MIN_ZOOM).toBeLessThan(MAX_ZOOM)
  })
})
