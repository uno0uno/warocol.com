import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

/** Matches Tailwind max-h-48 on catalog search listboxes */
const MAX_DROPDOWN_PX = 192
const MIN_DROPDOWN_PX = 96
const GAP_PX = 4

export type CatalogSearchPlacement = 'auto' | 'top' | 'bottom'

export function resolveCatalogSearchOpenUpward({
  placement,
  spaceAbove,
  spaceBelow,
  dropdownHeight,
}: {
  placement: CatalogSearchPlacement
  spaceAbove: number
  spaceBelow: number
  dropdownHeight: number
}) {
  if (placement === 'bottom') return false
  if (placement === 'top') {
    return spaceAbove >= Math.min(MIN_DROPDOWN_PX, dropdownHeight)
      || spaceAbove > spaceBelow
  }
  return spaceBelow < dropdownHeight && spaceAbove > spaceBelow
}

export function useCatalogSearchDropdownPlacement(
  anchorRef: Ref<HTMLElement | null>,
  panelRef: Ref<HTMLElement | null>,
  open: Ref<boolean>,
  placement: Ref<CatalogSearchPlacement>,
) {
  const openUpward = ref(false)
  const panelStyle = ref<Record<string, string>>({})

  function updatePlacement() {
    const el = anchorRef.value
    if (!el || typeof window === 'undefined') return

    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - GAP_PX
    const spaceAbove = rect.top - GAP_PX
    const dropdownHeight = Math.min(
      MAX_DROPDOWN_PX,
      Math.max(
        MIN_DROPDOWN_PX,
        panelRef.value?.scrollHeight || panelRef.value?.getBoundingClientRect().height || MAX_DROPDOWN_PX,
      ),
    )

    openUpward.value = resolveCatalogSearchOpenUpward({
      placement: placement.value,
      spaceAbove,
      spaceBelow,
      dropdownHeight,
    })

    const maxH = Math.min(
      MAX_DROPDOWN_PX,
      Math.max(MIN_DROPDOWN_PX, openUpward.value ? spaceAbove : spaceBelow),
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
