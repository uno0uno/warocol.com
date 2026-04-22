<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useActiveStationsQuery } from '@/composables/queries/useActiveStations'

// Self-contained: fetches active stations, persists ON/OFF state per shift to localStorage.
// Only renders when there are stations to show.

const { currentTenant } = useTenantReactive()

const { activeStations } = useActiveStationsQuery()

// localStorage key: one entry per tenant so switching tenants resets state
const storageKey = computed(() =>
  currentTenant.value?.id ? `waro_pos_station_session_${currentTenant.value.id}` : null
)

// localStates: stationId → isOn (boolean)
const localStates = ref<Record<string, boolean>>({})

// Hydrate from localStorage on mount; fall back to station.is_active
onMounted(() => {
  if (!storageKey.value) return
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (raw) {
      const parsed: Array<{ stationId: string; isOn: boolean }> = JSON.parse(raw)
      const map: Record<string, boolean> = {}
      for (const entry of parsed) {
        map[entry.stationId] = entry.isOn
      }
      localStates.value = map
    }
  } catch {
    // Ignore malformed localStorage
  }
})

const stationIsOn = (station: any): boolean => {
  if (station.id in localStates.value) return localStates.value[station.id]
  return station.is_active
}

const persistToLocalStorage = () => {
  if (!storageKey.value) return
  const entries = Object.entries(localStates.value).map(([stationId, isOn]) => ({ stationId, isOn }))
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(entries))
  } catch {
    // Non-critical
  }
}

const togglingId = ref<string | null>(null)

const toggleStation = async (station: any) => {
  if (togglingId.value) return
  togglingId.value = station.id
  const newState = !stationIsOn(station)
  try {
    await $fetch(`/api/api/stations/${station.id}/toggle`, {
      method: 'PATCH',
      body: { is_active: newState },
    })
    localStates.value = { ...localStates.value, [station.id]: newState }
    persistToLocalStorage()
  } catch {
    // Non-critical — local state unchanged on error
  } finally {
    togglingId.value = null
  }
}
</script>

<template>
  <div
    v-if="activeStations.length > 0"
    class="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5"
    title="Estaciones desactivadas no recibirán comandas"
  >
    <button
      v-for="station in activeStations"
      :key="station.id"
      type="button"
      class="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed"
      :class="stationIsOn(station)
        ? 'bg-surface border-border text-text-primary hover:bg-surface-secondary'
        : 'bg-surface-secondary border-border text-text-secondary opacity-60 hover:opacity-80'"
      :disabled="togglingId === station.id"
      :aria-label="`${station.name}: ${stationIsOn(station) ? 'activa' : 'inactiva'} — clic para cambiar`"
      @click="toggleStation(station)"
    >
      <!-- Station color dot -->
      <span
        class="w-2 h-2 rounded-full flex-shrink-0"
        :style="{ backgroundColor: station.color ?? '#94a3b8' }"
      />
      <!-- Station name -->
      <span class="truncate max-w-[80px]">{{ station.name }}</span>
      <!-- ON/OFF badge -->
      <span v-if="togglingId === station.id" class="flex-shrink-0">
        <CommonsTheCustomLoader size="small" />
      </span>
      <span
        v-else
        class="flex-shrink-0 text-[9px] font-black uppercase tracking-widest"
        :class="stationIsOn(station) ? 'text-green-600' : 'text-text-tertiary'"
      >
        {{ stationIsOn(station) ? 'ON' : 'OFF' }}
      </span>
    </button>
  </div>
</template>
