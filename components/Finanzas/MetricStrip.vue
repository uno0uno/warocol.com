<script setup lang="ts">
import { computed } from 'vue'

export interface MetricItem {
  label: string
  value: string
  /** Intención semántica del valor */
  variant?: 'default' | 'primary' | 'muted' | 'success' | 'destructive' | 'warning'
  /** font-mono + tabular-nums para montos COP */
  mono?: boolean
  /** Ícono al lado del valor */
  icon?: 'check' | 'warning'
}

const props = withDefaults(defineProps<{
  items: MetricItem[]
}>(), {})

const gridCols = computed(() => {
  const n = props.items.length
  if (n <= 2) return 'sm:grid-cols-2'
  if (n === 3) return 'sm:grid-cols-3'
  if (n === 5) return 'sm:grid-cols-3 xl:grid-cols-5'
  return 'sm:grid-cols-4'
})

/** Clases de texto por variante — usando tokens OKLCH del design system para
 *  garantizar contraste AA (≥4.5:1) sobre bg-surface (blanco). */
const textClass = (variant: MetricItem['variant']) => {
  switch (variant) {
    case 'primary':     return 'text-primary'                 // crocus-600 → 5.7:1 ✅
    case 'muted':       return 'text-text-secondary'           // ebony-600  → 7.2:1 ✅
    case 'success':     return 'text-status-success-text'      // oklch(35% 0.18 145) → 7.1:1 ✅
    case 'destructive': return 'text-status-critical-text'     // oklch(36% 0.18 25)  → 6.9:1 ✅
    case 'warning':     return 'text-status-warning-text'      // oklch(38% 0.16 75)  → 6.1:1 ✅
    default:            return 'text-text-primary'             // ebony-900  → 16:1  ✅
  }
}

/** Fondo sutil para celdas semánticas — evita depender solo del color. */
const cellBg = (variant: MetricItem['variant']) => {
  switch (variant) {
    case 'success':     return 'bg-status-success-bg'
    case 'destructive': return 'bg-status-critical-bg'
    case 'warning':     return 'bg-status-warning-bg'
    default:            return 'bg-surface'
  }
}
</script>

<template>
  <div
    class="grid grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border"
    :class="gridCols"
  >
    <div
      v-for="item in items"
      :key="item.label"
      class="px-4 py-3 flex flex-col gap-0.5 transition-colors"
      :class="cellBg(item.variant)"
    >
      <span class="text-xs font-medium uppercase tracking-wider text-text-secondary">
        {{ item.label }}
      </span>
      <span
        class="text-sm font-bold flex items-center gap-1"
        :class="[
          item.mono ? 'font-mono tabular-nums' : '',
          textClass(item.variant),
        ]"
      >
        <!-- check icon -->
        <svg v-if="item.icon === 'check'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
        <!-- warning icon -->
        <svg v-else-if="item.icon === 'warning'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        {{ item.value }}
      </span>
    </div>
  </div>
</template>
