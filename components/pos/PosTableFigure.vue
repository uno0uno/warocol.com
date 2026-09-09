<script setup lang="ts">
import { useTableCard } from '~/composables/useTableCard'
import { displayTableCode } from '~/composables/useTableDisplayCode'

defineProps<{ table: any }>()

const { formatCurrency, formatDuration, tableCardWaiterLine } = useTableCard()

const chairClass = (status: string) => ({
  'bg-text-tertiary/20': status === 'free',
  'bg-text-primary/70': status === 'open',
  'bg-status-warning-text/70': status === 'bill_requested',
})

const circleClass = (status: string) => ({
  'bg-surface-secondary border-2 border-border/50': status === 'free',
  'bg-text-primary shadow-lg shadow-black/20': status === 'open',
  'bg-status-warning-text shadow-lg shadow-status-warning-text/30': status === 'bill_requested',
})
</script>

<template>
  <div class="flex w-[96px] flex-col items-center">
  <!-- Circle + chair marks (historical floor-plan figure) -->
  <div class="relative h-[96px] w-[96px] p-[14px]">
    <!-- Chair marks: 4 cardinal positions -->
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-2 rounded-sm transition-colors duration-200"
      :class="chairClass(table?.status)"
    />
    <div
      class="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-2 rounded-sm transition-colors duration-200"
      :class="chairClass(table?.status)"
    />
    <div
      class="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-5 rounded-sm transition-colors duration-200"
      :class="chairClass(table?.status)"
    />
    <div
      class="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-5 rounded-sm transition-colors duration-200"
      :class="chairClass(table?.status)"
    />
    <!-- Circle -->
    <div
      class="relative w-[68px] h-[68px] rounded-full flex items-center justify-center"
      :class="circleClass(table?.status)"
    >
      <span
        class="text-sm font-bold leading-tight text-center px-2 line-clamp-2"
        :class="table?.status === 'free' ? 'text-text-secondary' : 'text-white'"
      >
        {{ displayTableCode(table) || table?.name }}
      </span>
    </div>
  </div>
  <!-- Info under the table -->
  <div class="flex flex-col items-center gap-0.5 px-2 pb-2 pt-1 text-center">
    <p v-if="table?.status !== 'free'" class="text-xs font-bold tabular-nums text-text-primary">
      {{ formatCurrency(table?.session?.running_total ?? 0) }}
    </p>
    <p v-else class="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
      Libre
    </p>
    <p v-if="table?.status !== 'free' && table?.session?.opened_at" class="text-[11px] tabular-nums text-text-secondary">
      {{ formatDuration(table.session.opened_at) }}
    </p>
    <p class="max-w-[110px] truncate text-[11px] text-text-tertiary">
      {{ tableCardWaiterLine(table) }}
    </p>
    <p class="max-w-[130px] truncate whitespace-nowrap text-center text-xs font-bold text-text-primary" :title="table?.name">
      {{ table?.name }}
    </p>
  </div>
  </div>
</template>
