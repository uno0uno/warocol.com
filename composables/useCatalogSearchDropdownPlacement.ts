import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** Matches Tailwind max-h-48 on catalog search listboxes */
const MAX_DROPDOWN_PX = 192
const GAP_PX = 4
/** Prefer flipping up when less than this space remains below the input */
const FLIP_THRESHOLD_PX = 160

export function useCatalogSearchDropdownPlacement(
  anchorRef: Ref<HTMLElement | null>,
  open: Ref<boolean>,
) {
  const openUpward = ref(false)
  const panelStyle = ref<Record<string, string>>({})

  function updatePlacement() {
    const el = anchorRef.value
    if (!el || typeof window === 'undefined') return

    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - GAP_PX
    const spaceAbove = rect.top - GAP_PX

    openUpward.value =
      spaceBelow < FLIP_THRESHOLD_PX && spaceAbove > spaceBelow

    const maxH = Math.min(
      MAX_DROPDOWN_PX,
      Math.max(96, openUpward.value ? spaceAbove : spaceBelow),
    )

    panelStyle.value = {
      position: 'fixed',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${maxH}px`,
      zIndex: '9999',
      ...(openUpward.value
        ? { bottom: `${window.innerHeight - rect.top + GAP_PX}px` }
        : { top: `${rect.bottom + GAP_PX}px` }),
    }
  }

  let raf = 0
  const scheduleUpdate = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(updatePlacement)
  }

  watch(open, async (isOpen) => {
    if (isOpen) {
      await nextTick()
      updatePlacement()
      window.addEventListener('scroll', scheduleUpdate, true)
      window.addEventListener('resize', scheduleUpdate)
    } else {
      window.removeEventListener('scroll', scheduleUpdate, true)
      window.removeEventListener('resize', scheduleUpdate)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', scheduleUpdate, true)
    window.removeEventListener('resize', scheduleUpdate)
    cancelAnimationFrame(raf)
  })

  return { openUpward, panelStyle, updatePlacement }
}
