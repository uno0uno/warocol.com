import { nextTick, onMounted, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

/** Extra px for native select chevron + subpixel rounding (avoids clipped labels). */
const SELECT_WIDTH_BUFFER_PX = 12

/** Size a filter `<select>` to the visible label, not the longest option. */
export function useFilterSelectAutoWidth(displayLabel: MaybeRefOrGetter<string>) {
  const measureRef = ref<HTMLElement | null>(null)
  const widthPx = ref<number | undefined>(undefined)

  async function remeasure() {
    await nextTick()
    const el = measureRef.value
    if (!el) return
    widthPx.value = Math.ceil(el.getBoundingClientRect().width) + SELECT_WIDTH_BUFFER_PX
  }

  watch(() => toValue(displayLabel), remeasure, { immediate: true })
  onMounted(remeasure)

  return { measureRef, widthPx, remeasure }
}
