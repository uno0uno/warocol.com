import { computed, ref, type Ref } from 'vue'

export type SidebarCollapsedTipStyle = Record<string, string>

/**
 * Shared collapsed-sidebar tip (Teleport + letter reveal).
 * One instance per sidebar shell; pass `enabled` false when expanded.
 */
export function useSidebarCollapsedTip() {
  const visible = ref(false)
  const label = ref('')
  const style = ref<SidebarCollapsedTipStyle>({})
  const nonce = ref(0)

  const chars = computed(() => Array.from(label.value))

  function show(event: Event, text: string, enabled: boolean) {
    if (!enabled || !text) {
      visible.value = false
      return
    }
    const el = event.currentTarget as HTMLElement | null
    if (!el || typeof window === 'undefined') return
    const rect = el.getBoundingClientRect()
    style.value = {
      top: `${Math.round(rect.top + rect.height / 2)}px`,
      left: `${Math.round(rect.right + 8)}px`,
    }
    label.value = text
    nonce.value += 1
    visible.value = true
  }

  function hide() {
    visible.value = false
  }

  return {
    visible,
    label,
    style,
    nonce,
    chars,
    show,
    hide,
  }
}

export type SidebarCollapsedTipApi = ReturnType<typeof useSidebarCollapsedTip> & {
  collapsed: Ref<boolean>
}
