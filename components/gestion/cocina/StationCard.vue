<template>
  <div class="group relative bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
    <!-- Accent line -->
    <div
      class="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
      :style="{ backgroundColor: station.color }"
    />

    <div class="flex items-start justify-between gap-4 pl-3">
      <div class="min-w-0">
        <h3 class="text-sm font-bold text-text-primary truncate">{{ station.name }}</h3>
        <p v-if="station.kitchen_name" class="text-[11px] text-text-secondary uppercase tracking-wider font-medium mt-0.5">
          {{ station.kitchen_name }}
        </p>

        <div class="flex items-center gap-3 mt-3">
          <!-- Threshold 1 -->
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-amber-400" />
            <span class="text-xs text-text-secondary font-medium">{{ station.alert_threshold_1_min }}m</span>
          </div>
          <!-- Threshold 2 -->
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-state-danger-icon" />
            <span class="text-xs text-text-secondary font-medium">{{ station.alert_threshold_2_min }}m</span>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <button
          class="p-1.5 rounded-lg text-text-tertiary hover:text-primary hover:bg-primary/5 transition-colors"
          @click="$emit('edit', station)"
          title="Editar Estación"
        >
          <PencilIcon class="w-4 h-4" />
        </button>
        <button
          class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          :class="station.is_active ? 'text-state-warning-text hover:bg-state-warning-bg border border-state-warning-border' : 'text-state-success-text hover:bg-state-success-bg border border-state-success-border'"
          :disabled="isToggling"
          @click="$emit('toggle', station)"
        >
          <UiLoadingDots v-if="isToggling" size="7px" color="currentColor" />
          <span v-else>{{ station.is_active ? 'Desactivar' : 'Activar' }}</span>
        </button>
      </div>
    </div>

    <!-- Status indicator footer -->
    <div class="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
      <UiStatusBadge
        :variant="station.is_active ? 'success' : 'secondary'"
        :value="station.is_active ? 'Activa' : 'Inactiva'"
        format="text"
        size="sm"
      />
      <div class="flex items-center gap-2">
        <slot name="kds" :station="station" />
        <span class="text-[10px] text-text-tertiary font-mono">#{{ station.display_order }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PencilIcon } from '@heroicons/vue/24/outline'

interface Station {
  id: string
  name: string
  kitchen_name?: string
  color: string
  alert_threshold_1_min: number
  alert_threshold_2_min: number
  display_order: number
  is_active: boolean
}

defineProps<{
  station: Station
  isToggling?: boolean
}>()

defineEmits<{
  (e: 'edit', station: Station): void
  (e: 'toggle', station: Station): void
}>()
</script>
