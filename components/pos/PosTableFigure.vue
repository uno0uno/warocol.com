<script setup lang="ts">
defineProps<{ table: any }>()

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
  <!-- Circle + chair marks (historical floor-plan figure) -->
  <div class="relative p-[14px]">
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
      class="relative w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
      :class="circleClass(table?.status)"
    >
      <span
        class="text-sm font-bold leading-tight text-center px-2 line-clamp-2"
        :class="table?.status === 'free' ? 'text-text-secondary' : 'text-white'"
      >
        {{ table?.name }}
      </span>
    </div>
  </div>
</template>
