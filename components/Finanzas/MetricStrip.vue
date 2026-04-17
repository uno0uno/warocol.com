<script setup lang="ts">
import { computed } from 'vue'
export interface MetricItem {
  label: string
  value: string
  /** Color del valor */
  variant?: 'default' | 'primary' | 'muted' | 'success' | 'destructive' | 'warning'
  /** font-mono + tabular-nums (útil para montos COP) */
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
</script>

<template>
  <div class="grid grid-cols-2 gap-px bg-border rounded-xl overflow-hidden border border-border" :class="gridCols">
    <div
      v-for="item in items"
      :key="item.label"
      class="bg-surface px-4 py-3 flex flex-col gap-0.5"
    >
      <span class="text-xs font-medium uppercase tracking-wider text-text-secondary">{{ item.label }}</span>
      <span
        class="text-sm font-semibold flex items-center gap-1"
        :class="[
          item.mono ? 'font-mono tabular-nums' : '',
          item.variant === 'primary'     ? 'text-primary'
          : item.variant === 'muted'     ? 'text-text-secondary'
          : item.variant === 'success'   ? 'text-green-600'
          : item.variant === 'destructive' ? 'text-destructive'
          : item.variant === 'warning'   ? 'text-amber-600'
          : 'text-text-primary',
        ]"
      >
        <!-- check icon -->
        <svg v-if="item.icon === 'check'" class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
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
