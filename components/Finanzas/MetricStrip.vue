<script setup lang="ts">
import { computed } from 'vue'

export interface MetricItem {
  label: string
  value: string
  variant?: 'default' | 'primary' | 'muted' | 'success' | 'destructive' | 'warning'
  /** tabular-nums para montos — NO cambia la fuente */
  mono?: boolean
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

/** Tokens OKLCH del design system — contraste ≥ 6:1 sobre blanco */
const valueColor = (variant: MetricItem['variant']) => {
  switch (variant) {
    case 'primary':     return 'text-primary'              // crocus-600 → 5.7:1
    case 'muted':       return 'text-text-secondary'        // ebony-600  → 7.2:1
    case 'success':     return 'text-status-success-text'   // oklch(35% 0.18 145) → 7.1:1
    case 'destructive': return 'text-status-critical-text'  // oklch(36% 0.18 25)  → 6.9:1
    case 'warning':     return 'text-status-warning-text'   // oklch(38% 0.16 75)  → 6.1:1
    default:            return 'text-text-primary'          // ebony-900  → 16:1
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
      class="bg-surface px-5 py-5 flex flex-col justify-between gap-3"
    >
      <!--
        Jerarquía tipográfica KPI:
          Valor   → text-2xl bold  (24px) — domina, primer punto de lectura
          Label   → text-xs muted  (12px) — subordinado, contexto
          Ratio   → 2:1 → el ojo sabe inmediatamente qué es el dato y qué es la etiqueta
      -->

      <!-- Valor — grande, bold, semántico -->
      <span
        class="text-2xl font-bold leading-none flex items-center gap-2"
        :class="[
          item.mono ? 'tabular-nums' : '',
          valueColor(item.variant),
        ]"
      >
        <svg v-if="item.icon === 'check'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else-if="item.icon === 'warning'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        {{ item.value }}
      </span>

      <!-- Label — pequeño, muted, subordinado -->
      <span class="text-xs font-medium text-text-secondary leading-none">
        {{ item.label }}
      </span>
    </div>
  </div>
</template>
