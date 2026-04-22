<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Tablero de Cocina (KDS)' })

const { currentTenant } = useTenantReactive()
const toast = useToast()

// ── State ──────────────────────────────────────────────────────────────────
const selectedStationId = ref<string | null>(null)
const refreshInterval = ref<any>(null)

// ── Fetch Stations ─────────────────────────────────────────────────────────
const { data: stationsData, status: stationsStatus } = useQuery({
  key: () => ['kitchen-stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations'),
  enabled: () => !!currentTenant.value,
})

const stations = computed(() => stationsData.value?.data ?? [])

// Auto-select first station if none selected
watch(stations, (newStations) => {
  if (newStations.length > 0 && !selectedStationId.value) {
    selectedStationId.value = newStations[0].id
  }
}, { immediate: true })

// ── Fetch Comandas ─────────────────────────────────────────────────────────
const { data: comandasData, status: comandasStatus, refetch } = useQuery({
  key: () => ['comandas-active', currentTenant.value?.id, selectedStationId.value],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/comandas/active', {
    params: { station_id: selectedStationId.value }
  }),
  enabled: () => !!currentTenant.value && !!selectedStationId.value,
})

const comandas = computed(() => comandasData.value?.data ?? [])

// ── Polling ────────────────────────────────────────────────────────────────
const startPolling = () => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
  refreshInterval.value = setInterval(() => {
    if (comandasStatus.value !== 'pending') {
      refetch()
    }
  }, 30000) // 30 seconds polling
}

const stopPolling = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="flex flex-col h-full gap-4">
    <!-- Header / Filters -->
    <div class="flex flex-wrap items-center justify-between gap-4 py-2">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-text-primary">Tablero de Cocina</h1>
        <div v-if="stations.length > 0" class="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-border">
          <button
            v-for="station in stations"
            :key="station.id"
            type="button"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
            :class="selectedStationId === station.id 
              ? 'bg-primary text-white shadow-sm' 
              : 'text-text-secondary hover:bg-surface-tertiary'"
            @click="selectedStationId = station.id"
          >
            {{ station.kitchen_name || station.name }}
          </button>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          @click="refetch"
          class="flex items-center justify-center h-9 w-9 rounded-lg bg-surface border border-border hover:bg-surface-secondary transition-colors"
          title="Refrescar"
        >
          <Icon name="lucide:refresh-cw" class="w-4 h-4" :class="comandasStatus === 'pending' ? 'animate-spin' : ''" />
        </button>
      </div>
    </div>

    <!-- Board Content -->
    <div class="flex-1 min-h-0">
      <!-- Loading -->
      <div v-if="stationsStatus === 'pending' && !stations.length" class="flex items-center justify-center h-full">
        <CommonsTheCustomLoader size="large" />
      </div>

      <!-- No Stations -->
      <div v-else-if="!stations.length && stationsStatus !== 'pending'" class="flex flex-col items-center justify-center h-full text-center p-8 bg-surface border-2 border-dashed border-border rounded-2xl">
        <div class="w-16 h-16 bg-titan-200 rounded-full flex items-center justify-center mb-4 text-primary">
          <Icon name="lucide:settings" size="32" />
        </div>
        <h3 class="text-lg font-bold text-text-primary">No hay estaciones configuradas</h3>
        <p class="text-sm text-text-secondary max-w-xs mt-1">Configura tus estaciones de cocina (Cocina, Barra, etc.) en los ajustes del negocio.</p>
      </div>

      <!-- Station Selected but no Comandas -->
      <div v-else-if="!comandas.length && comandasStatus !== 'pending'" class="flex flex-col items-center justify-center h-full text-center p-8 bg-surface/50 border border-border rounded-2xl">
        <div class="w-16 h-16 bg-titan-100 rounded-full flex items-center justify-center mb-4 text-titan-500">
          <Icon name="lucide:check-circle-2" size="32" />
        </div>
        <h3 class="text-lg font-bold text-text-primary">Todo al día</h3>
        <p class="text-sm text-text-secondary mt-1">No hay pedidos pendientes en esta estación.</p>
      </div>

      <!-- Comandas Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pb-8 pr-2">
        <CocinaComandaCard
          v-for="comanda in comandas"
          :key="comanda.id"
          :comanda="comanda"
          @refresh="refetch"
        />
      </div>
    </div>
  </div>
</template>
