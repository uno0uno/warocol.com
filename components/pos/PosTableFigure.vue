<script setup lang="ts">
const props = defineProps<{ table: any }>()

const chairCount = computed(() => {
  const n = Number(props.table?.capacity ?? 4)
  if (!Number.isFinite(n) || n < 1) return 4
  return Math.min(8, Math.round(n))
})

const circleClass = computed(() => {
  if (props.table?.status === 'open') return 'bg-text-primary text-surface border-text-primary'
  if (props.table?.status === 'bill_requested') return 'bg-status-warning-text text-surface border-status-warning-text'
  return 'bg-surface text-text-primary border-border'
})

const chairClass = computed(() => {
  if (props.table?.status === 'open') return 'bg-text-primary/70'
  if (props.table?.status === 'bill_requested') return 'bg-status-warning-text/70'
  return 'bg-text-tertiary/20'
})

const chairStyle = (index: number) => {
  const angle = (index / chairCount.value) * Math.PI * 2 - Math.PI / 2
  const radius = 46
  return {
    left: `${50 + (Math.cos(angle) * radius) / 76 * 50}%`,
    top: `${50 + (Math.sin(angle) * radius) / 76 * 50}%`,
  }
}
</script>

<template>
  <div class="flex w-[76px] flex-col items-center gap-1">
    <div class="relative h-[76px] w-[76px]">
      <span
        v-for="i in chairCount"
        :key="i"
        class="absolute h-2 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm transition-colors duration-200"
        :class="chairClass"
        :style="chairStyle(i - 1)"
        aria-hidden="true"
      />
      <div
        class="absolute left-1/2 top-1/2 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-200"
        :class="circleClass"
      >
        <span class="max-w-[44px] truncate px-1 text-center text-[11px] font-bold leading-tight">
          {{ table?.code ?? table?.name }}
        </span>
      </div>
    </div>
    <p class="max-w-[76px] truncate text-center text-[11px] font-semibold text-text-primary">
      {{ table?.name }}
    </p>
  </div>
</template>
