<template>
  <div class="flex items-center justify-between p-4 bg-surface border border-border rounded-xl hover:border-primary/30 transition-colors group">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
        {{ category.name.substring(0, 2).toUpperCase() }}
      </div>
      <div>
        <p class="text-sm font-bold text-text-primary">{{ category.name }}</p>
        <p class="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">Categoría</p>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <!-- Status Badge -->
      <span
        v-if="currentStation"
        class="hidden sm:inline-flex px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border"
        :style="{
          backgroundColor: `${currentStation.color}10`,
          color: currentStation.color,
          borderColor: `${currentStation.color}30`
        }"
      >
        {{ currentStation.name }}
      </span>

      <select
        :value="category.station_id || ''"
        @change="handleSelect"
        class="min-w-[120px] px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-text-primary"
        :disabled="loading"
      >
        <option value="">(Sin asignar)</option>
        <option
          v-for="st in stations"
          :key="st.id"
          :value="st.id"
        >
          {{ st.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Station {
  id: string
  name: string
  color: string
}

interface Category {
  id: string
  name: string
  station_id: string | null
}

const props = defineProps<{
  category: Category
  stations: Station[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'assign', stationId: string | null): void
}>()

const currentStation = computed(() => {
  return props.stations.find(s => s.id === props.category.station_id)
})

const handleSelect = (event: Event) => {
  const val = (event.target as HTMLSelectElement).value
  emit('assign', val || null)
}
</script>
