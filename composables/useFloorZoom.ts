import { computed, ref } from 'vue'

export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 2
export const ZOOM_STEP = 0.25

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

/**
 * Zoom state for the POS floor grid (uno0uno/warocol.com#2617).
 * CSS transform scale on the grid wrapper; drag & drop keeps working
 * because SortableJS tracks pointer deltas, not layout pixels.
 */
export function useFloorZoom() {
  const zoom = ref(1)
  const zoomIn = () => {
    zoom.value = clampZoom(zoom.value + ZOOM_STEP)
  }
  const zoomOut = () => {
    zoom.value = clampZoom(zoom.value - ZOOM_STEP)
  }
  const zoomReset = () => {
    zoom.value = 1
  }
  const zoomStyle = computed(() => ({
    transform: `scale(${zoom.value})`,
    transformOrigin: 'top left',
  }))
  return { zoom, zoomIn, zoomOut, zoomReset, zoomStyle }
}
