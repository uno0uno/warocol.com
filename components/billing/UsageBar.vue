<template>
  <div class="w-full">
    <div class="flex items-center justify-between mb-1 gap-2">
      <span v-if="tenantName" class="text-sm font-medium text-text-primary truncate">
        {{ tenantName }}
      </span>
      <span class="text-xs text-text-secondary whitespace-nowrap ml-auto">
        {{ scansUsed.toLocaleString('es-CO') }} / {{ scansLimit.toLocaleString('es-CO') }}
      </span>
    </div>

    <div
      class="w-full h-2 bg-surface-secondary rounded-full overflow-hidden"
      role="progressbar"
      :aria-valuenow="scansUsed"
      aria-valuemin="0"
      :aria-valuemax="scansLimit"
      :aria-label="`${tenantName ? tenantName + ': ' : ''}${scansUsed} de ${scansLimit} escaneos usados`"
    >
      <div
        :class="['h-full rounded-full transition-all duration-300', barColorClass]"
        :style="{ width: `${Math.min(percentage, 100)}%` }"
      />
    </div>

    <p v-if="showPercentage" :class="['text-xs mt-1', labelColorClass]">
      {{ percentage.toFixed(1) }}% usado
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  scansUsed: number
  scansLimit: number
  percentage: number
  tenantName?: string
  showPercentage?: boolean
}>()

const barColorClass = computed(() => {
  if (props.percentage >= 100) return 'bg-red-500'
  if (props.percentage >= 80) return 'bg-orange-500'
  if (props.percentage >= 50) return 'bg-yellow-500'
  return 'bg-green-500'
})

const labelColorClass = computed(() => {
  if (props.percentage >= 100) return 'text-red-600'
  if (props.percentage >= 80) return 'text-orange-600'
  if (props.percentage >= 50) return 'text-yellow-600'
  return 'text-text-secondary'
})
</script>
