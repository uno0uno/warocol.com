<template>
  <div class="page-layout max-w-5xl mx-auto py-8 px-4 sm:px-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-black text-text-primary tracking-tight flex items-center gap-3">
          <FireIcon class="w-8 h-8 text-primary" />
          Configuración de Cocina
        </h1>
        <p class="text-text-secondary text-sm mt-1 font-medium">Administra estaciones de preparación y asignación de categorías.</p>
      </div>

      <div class="flex items-center gap-2 bg-surface-secondary p-1 rounded-xl self-start sm:self-auto">
        <button
          v-for="t in tabs" :key="t.id"
          @click="activeTab = t.id"
          class="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
          :class="activeTab === t.id ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="stationsAsyncStatus === 'loading' && !stationsData" class="flex flex-col items-center justify-center py-20">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div v-else>
      <!-- TAB: ESTACIONES -->
      <div v-if="activeTab === 'stations'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-text-primary">Puntos de Preparación</h2>
          <button
            @click="openCreateModal"
            class="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <PlusIcon class="w-4 h-4" />
            Nueva Estación
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <GestionCocinaStationCard
            v-for="st in stations"
            :key="st.id"
            :station="st"
            :is-toggling="togglingStationId === st.id"
            @edit="openEditModal"
            @toggle="handleToggleStation"
          />
        </div>

        <div v-if="stations.length === 0" class="text-center py-12 bg-surface border border-border rounded-xl">
          <p class="text-text-primary font-medium">Sin estaciones configuradas</p>
          <p class="text-text-secondary text-sm mt-1">Crea la primera estación para empezar.</p>
        </div>
      </div>

      <!-- TAB: MAPEO -->
      <div v-if="activeTab === 'mapping'" class="space-y-6">
        <div class="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-primary shadow-sm flex-shrink-0">
            <InformationCircleIcon class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-text-primary leading-tight">Mapeo de Categorías</h4>
            <p class="text-xs text-text-secondary mt-1 leading-relaxed">
              Define a qué estación deben enviarse los productos de cada categoría.
              Si una categoría no tiene estación asignada, sus productos no generarán comanda en cocina.
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <GestionCocinaCategoryMappingRow
            v-for="cat in mappedCategories"
            :key="cat.id"
            :category="cat"
            :stations="stations"
            :loading="isAssigningCategoryId === cat.id"
            @assign="(stId) => handleAssignCategory(cat.id, stId)"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <GestionCocinaStationFormModal
      v-if="isModalOpen"
      v-model="isModalOpen"
      :initial-data="editingStation"
      :loading="isSaving"
      @close="isModalOpen = false"
      @submit="handleSaveStation"
    />
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, FireIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Configuración Cocina | WaRo' })

const { currentTenant } = useTenantReactive()
const toast = useToast()

const tabs = [
  { id: 'stations', label: 'Estaciones' },
  { id: 'mapping', label: 'Asignación' },
]
const activeTab = ref('stations')

const { data: stationsData, asyncStatus: stationsAsyncStatus, refetch: refetchStations } = useQuery({
  key: () => ['tenant', 'stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const { data: categoryStationsData, refetch: refetchCategoryStations } = useQuery({
  key: () => ['tenant', 'category-stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const { data: categoriesData } = useQuery({
  key: () => ['tenant', 'menu-categories', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/menu/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const stations = computed(() => stationsData.value?.data ?? [])

const mappedCategories = computed(() => {
  const cats = categoriesData.value?.data ?? []
  const maps = categoryStationsData.value?.data ?? []
  return cats.map((cat: any) => {
    const m = maps.find((x: any) => x.category_id === cat.id)
    return { ...cat, station_id: m?.station_id ?? null }
  })
})

const isSaving = ref(false)
const isModalOpen = ref(false)
const editingStation = ref<any>(null)
const togglingStationId = ref<string | null>(null)
const isAssigningCategoryId = ref<string | null>(null)

const openCreateModal = () => {
  editingStation.value = null
  isModalOpen.value = true
}

const openEditModal = (station: any) => {
  editingStation.value = station
  isModalOpen.value = true
}

const handleSaveStation = async (formData: any) => {
  isSaving.value = true
  try {
    if (editingStation.value) {
      await $fetch(`/api/api/stations/${editingStation.value.id}`, {
        method: 'PATCH',
        body: formData,
      })
      toast.success('Estación actualizada')
    } else {
      await $fetch('/api/api/stations', {
        method: 'POST',
        body: formData,
      })
      toast.success('Estación creada')
    }
    isModalOpen.value = false
    await refetchStations()
  } catch {
    toast.error('Error al guardar la estación')
  } finally {
    isSaving.value = false
  }
}

const handleToggleStation = async (station: any) => {
  if (togglingStationId.value === station.id) return
  togglingStationId.value = station.id
  try {
    await $fetch(`/api/api/stations/${station.id}/toggle`, {
      method: 'PATCH',
      body: { is_active: !station.is_active },
    })
    toast.success(station.is_active ? 'Estación desactivada' : 'Estación activada')
    await refetchStations()
  } catch {
    toast.error('Error al cambiar estado de la estación')
  } finally {
    togglingStationId.value = null
  }
}

const handleAssignCategory = async (categoryId: string, stationId: string | null) => {
  isAssigningCategoryId.value = categoryId
  try {
    await $fetch(`/api/api/stations/categories/${categoryId}`, {
      method: 'POST',
      body: { station_id: stationId },
    })
    toast.success('Asignación actualizada')
    await refetchCategoryStations()
  } catch (e: any) {
    const detail = e.data?.detail || e.message
    toast.error(`Error al asignar categoría: ${detail}`)
  } finally {
    isAssigningCategoryId.value = null
  }
}
</script>

<style scoped>
.page-layout {
  min-height: calc(100vh - 100px);
}
</style>
