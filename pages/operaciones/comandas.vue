<template>
  <div class="space-y-4 sm:space-y-6">

    <!-- First-load — block UI until critical queries resolve (issue #461) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <template v-else>
    <!-- ══════ COMANDAS Y COCINA — TOGGLES ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <div class="flex items-center gap-2 mb-5">
        <FireIcon class="w-5 h-5 text-primary flex-shrink-0" />
        <h3 class="text-base sm:text-lg font-semibold text-text-primary">Comandas y Cocina</h3>
      </div>

      <div class="space-y-5">
        <!-- Activar comandas -->
        <div class="space-y-2">
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-medium text-text-primary">Activar comandas</p>
              <p class="text-xs text-text-secondary mt-0.5">
                Al vender un producto se genera una comanda para cada estación de preparación configurada.
              </p>
            </div>
            <div class="flex-shrink-0 ml-4 flex items-center justify-center w-10 h-6">
              <UiLoadingDots v-if="isTogglingComandas" color="var(--color-primary)" size="11px" />
              <label v-else class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  class="sr-only peer"
                  :checked="businessProfile?.comandas_enabled"
                  @change="handleToggleComandas"
                />
                <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>
          <!-- Inline disable-warning banner -->
          <div v-if="showDisableComandasWarning" class="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start justify-between gap-3">
            <p class="text-xs text-amber-800 leading-relaxed">
              Las comandas activas no serán afectadas. Los nuevos pedidos no generarán comandas mientras esté desactivado.
            </p>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button @click="showDisableComandasWarning = false" class="text-xs text-amber-700 font-medium hover:underline">Cancelar</button>
              <button
                @click="confirmDisableComandas"
                class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1 rounded-lg transition-colors min-h-[32px]"
              >
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>

        <div class="border-t border-border/40" />

        <!-- Activar KDS (only when comandas ON) -->
        <div v-if="businessProfile?.comandas_enabled" class="space-y-2">
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-medium text-text-primary">Activar pantallas KDS</p>
              <p class="text-xs text-text-secondary mt-0.5">
                Habilita rutas <span class="font-mono text-[11px]">/cocina/[estacion]</span> para pantallas de cocina independientes.
              </p>
            </div>
            <div class="flex-shrink-0 ml-4 flex items-center justify-center w-10 h-6">
              <UiLoadingDots v-if="isTogglingKds" color="var(--color-primary)" size="11px" />
              <label v-else class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  class="sr-only peer"
                  :checked="businessProfile?.kds_enabled"
                  @change="handleToggleKds"
                />
                <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>
          <!-- KDS station URLs with token management (when KDS enabled) -->
          <div v-if="businessProfile?.kds_enabled" class="mt-2 space-y-2">
            <div
              v-for="st in stations.filter((s: any) => s.is_active)"
              :key="st.id"
              class="rounded-lg bg-background border border-border px-3 py-2.5 space-y-1.5"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-text-primary">{{ st.name }}</span>
                <div class="flex items-center gap-1.5">
                  <button
                    v-if="!kdsTokens[st.id]"
                    @click="generateKdsToken(st.id)"
                    :disabled="generatingToken === st.id"
                    class="min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {{ generatingToken === st.id ? 'Generando...' : 'Generar enlace' }}
                  </button>
                  <template v-else>
                    <button
                      @click="copyKdsUrl(st.id)"
                      class="min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors flex items-center gap-1"
                      aria-label="Copiar enlace KDS"
                    >
                      <ClipboardIcon class="w-3 h-3" />
                      Copiar
                    </button>
                    <button
                      @click="revokeKdsToken(st.id)"
                      :disabled="revokingToken === st.id"
                      class="min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      aria-label="Revocar enlace KDS"
                    >
                      {{ revokingToken === st.id ? '...' : 'Revocar' }}
                    </button>
                  </template>
                </div>
              </div>
              <div v-if="kdsTokens[st.id]" class="text-[10px] font-mono text-text-tertiary truncate">
                {{ kdsBaseUrl }}/cocina/{{ st.id }}?token={{ kdsTokens[st.id] }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════ ESTACIONES DE PREPARACIÓN (shown when comandas ON) ══════ -->
    <div v-if="businessProfile?.comandas_enabled" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-2">
          <QueueListIcon class="w-5 h-5 text-primary flex-shrink-0" />
          <h3 class="text-base sm:text-lg font-semibold text-text-primary">Estaciones de preparación</h3>
        </div>
        <button
          @click="openCreateStation"
          class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]"
        >
          <PlusIcon class="w-3.5 h-3.5" />
          Nueva
        </button>
      </div>

      <UiResponsiveDataView
        :data="stations"
        :columns="stationColumns"
        empty-message="Sin estaciones configuradas"
        empty-sub-message="Crea la primera estación para empezar."
        item-key="id"
        row-size="sm"
      >
        <template #card="{ item: st }">
          <GestionCocinaStationCard
            :station="st"
            :is-toggling="togglingStationId === st.id"
            @edit="openEditStation"
            @toggle="handleToggleStation"
          />
        </template>
        <template #cell-name="{ item: st }">
          <div class="flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: st.color }" />
            <span class="text-sm font-medium text-text-primary">{{ st.name }}</span>
          </div>
        </template>
        <template #cell-monitor="{ item: st }">
          <span v-if="st.kitchen_name" class="text-sm text-text-secondary font-mono">{{ st.kitchen_name }}</span>
          <span v-else class="text-xs text-text-tertiary italic">—</span>
        </template>
        <template #cell-status="{ item: st }">
          <UiStatusBadge
            :variant="st.is_active ? 'success' : 'secondary'"
            :value="st.is_active ? 'Activa' : 'Inactiva'"
            format="text"
            size="sm"
          />
        </template>
        <template #cell-thresholds="{ item: st }">
          <span class="text-xs text-text-secondary">{{ st.alert_threshold_1_min }}m / {{ st.alert_threshold_2_min }}m</span>
        </template>
        <template #cell-actions="{ item: st }">
          <div class="flex items-center gap-1">
            <button
              @click="openEditStation(st)"
              class="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
              :aria-label="`Editar estación ${st.name}`"
            >
              <PencilSquareIcon class="w-4 h-4" />
            </button>
            <button
              @click="handleToggleStation(st)"
              :disabled="togglingStationId === st.id"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              :class="st.is_active ? 'text-amber-600 hover:bg-amber-50 border border-amber-200' : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'"
            >
              <UiLoadingDots v-if="togglingStationId === st.id" size="7px" color="currentColor" />
              <span v-else>{{ st.is_active ? 'Desactivar' : 'Activar' }}</span>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

    <!-- ══════ ROUTING DE CATEGORÍAS (shown when comandas ON) ══════ -->
    <div v-if="businessProfile?.comandas_enabled" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <div class="flex items-center gap-2 mb-1">
        <ArrowsRightLeftIcon class="w-5 h-5 text-primary flex-shrink-0" />
        <h3 class="text-base sm:text-lg font-semibold text-text-primary">Routing de categorías</h3>
      </div>
      <p class="text-xs text-text-secondary mb-4">
        Define a qué estación deben enviarse los productos de cada categoría. Sin estación asignada = no genera comanda.
      </p>
      <UiResponsiveDataView
        :data="mappedCategories"
        :columns="categoryColumns"
        empty-message="Sin categorías"
        empty-sub-message="Crea categorías en el menú para asignarlas."
        item-key="id"
        row-size="sm"
      >
        <template #card="{ item: cat }">
          <GestionCocinaCategoryMappingRow
            :category="cat"
            :stations="stations"
            :loading="isAssigningCategoryId === cat.id"
            @assign="(stId) => handleAssignCategory(cat.id, stId)"
          />
        </template>
        <template #cell-name="{ item: cat }">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
              {{ cat.name.substring(0, 2).toUpperCase() }}
            </div>
            <span class="text-sm font-medium text-text-primary">{{ cat.name }}</span>
          </div>
        </template>
        <template #cell-station="{ item: cat }">
          <template v-if="stations.find((s: any) => s.id === cat.station_id)">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
              :style="{
                backgroundColor: `${stations.find((s: any) => s.id === cat.station_id)?.color}15`,
                color: stations.find((s: any) => s.id === cat.station_id)?.color,
                borderColor: `${stations.find((s: any) => s.id === cat.station_id)?.color}30`,
              }"
            >
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: stations.find((s: any) => s.id === cat.station_id)?.color }"
              />
              {{ stations.find((s: any) => s.id === cat.station_id)?.name }}
            </span>
          </template>
          <span v-else class="text-xs text-text-tertiary italic">Sin asignar</span>
        </template>
        <template #cell-assign="{ item: cat }">
          <div class="flex justify-end">
            <select
              :value="cat.station_id || ''"
              @change="(e) => handleAssignCategory(cat.id, (e.target as HTMLSelectElement).value || null)"
              :disabled="isAssigningCategoryId === cat.id"
              class="min-w-[130px] px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-text-primary disabled:opacity-50"
            >
              <option value="">(Sin asignar)</option>
              <option v-for="st in stations" :key="st.id" :value="st.id">{{ st.name }}</option>
            </select>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>
    </template>

    <!-- Station Deactivate Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="deactivateModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="deactivateModalOpen = false"
        >
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
            appear
          >
            <div v-if="deactivateModalOpen" class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div class="relative px-5 pt-5 pb-4 border-b border-border/60">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-200">
                    <ExclamationTriangleIcon class="w-5 h-5 text-amber-600" />
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <h3 class="text-base font-bold text-text-primary leading-tight">Desactivar estación</h3>
                    <div class="flex items-center gap-1.5 mt-1">
                      <span
                        class="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: deactivateModalStation?.color ?? '#6B7280' }"
                      />
                      <span class="text-sm text-text-secondary font-medium truncate">{{ deactivateModalStation?.name }}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  @click="deactivateModalOpen = false"
                  aria-label="Cerrar"
                  class="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
              </div>

              <div class="px-5 py-4 flex flex-col gap-4">
                <div v-if="isLoadingDeactivateInfo" class="flex flex-col items-center justify-center py-8 gap-3">
                  <UiLoadingDots size="10px" />
                  <p class="text-xs text-text-tertiary">Verificando estado...</p>
                </div>

                <template v-else-if="deactivateInfo">
                  <div v-if="deactivateInfo.active_comandas_count > 0" class="rounded-xl bg-destructive/8 border border-destructive/20 p-4">
                    <div class="flex items-start gap-3">
                      <div class="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                        <ExclamationTriangleIcon class="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p class="text-sm font-semibold text-destructive leading-snug">No se puede desactivar ahora</p>
                        <p class="text-xs text-destructive/80 mt-1 leading-relaxed">
                          Hay <strong>{{ deactivateInfo.active_comandas_count }} comanda{{ deactivateInfo.active_comandas_count !== 1 ? 's' : '' }} activa{{ deactivateInfo.active_comandas_count !== 1 ? 's' : '' }}</strong> en esta estación. Resuélvelas antes de desactivarla.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div v-if="deactivateInfo.affected_categories.length > 0" class="rounded-xl bg-amber-50 border border-amber-200/70 p-4">
                    <p class="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                      {{ deactivateInfo.affected_categories.length }} categoría{{ deactivateInfo.affected_categories.length !== 1 ? 's' : '' }} afectada{{ deactivateInfo.affected_categories.length !== 1 ? 's' : '' }}
                    </p>
                    <p class="text-xs text-amber-700/80 leading-relaxed mb-3">
                      Sus productos dejarán de generar comandas mientras la estación esté inactiva.
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="cat in deactivateInfo.affected_categories"
                        :key="cat.id"
                        class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800"
                      >{{ cat.name }}</span>
                    </div>
                  </div>

                  <div
                    v-if="deactivateInfo.affected_categories.length === 0 && deactivateInfo.active_comandas_count === 0"
                    class="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200/70 px-4 py-3"
                  >
                    <div class="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p class="text-sm text-emerald-700 leading-snug">Sin impacto activo. Se puede desactivar de forma segura.</p>
                  </div>
                </template>
              </div>

              <div class="px-5 pb-5 flex gap-2.5">
                <button
                  type="button"
                  @click="deactivateModalOpen = false"
                  class="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary hover:border-border/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  v-if="deactivateInfo"
                  type="button"
                  :disabled="deactivateInfo.active_comandas_count > 0 || isConfirmingDeactivate"
                  class="flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                  @click="confirmDeactivateStation"
                >
                  <UiLoadingDots v-if="isConfirmingDeactivate" size="8px" color="currentColor" />
                  <template v-else>
                    <span>Desactivar</span>
                  </template>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Station Form Modal -->
    <GestionCocinaStationFormModal
      v-if="stationModalOpen"
      v-model="stationModalOpen"
      :initial-data="editingStation"
      :loading="isSavingStation"
      @close="stationModalOpen = false"
      @submit="handleSaveStation"
    />
  </div>
</template>

<script setup lang="ts">
import {
  FireIcon,
  QueueListIcon,
  PlusIcon,
  ClipboardIcon,
  ArrowsRightLeftIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Comandas & Cocina | Operaciones' })

const { currentTenant } = useTenantReactive()
const toast = useToast()

// ─── Business profile ───
const { data: profileData, asyncStatus: profileAsyncStatus, refetch: refreshProfile } = useQuery({
  key: () => ['tenant', 'negocio-profile', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/public-profile'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const businessProfile = computed(() => profileData.value?.data ?? null)

// ─── Stations & categories ───
const { data: stationsData, asyncStatus: stationsAsyncStatus, refetch: refetchStations } = useQuery({
  key: () => ['tenant', 'stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const stations = computed(() => stationsData.value?.data ?? [])

const { data: categoryStationsData, asyncStatus: categoryStationsAsyncStatus, refetch: refetchCategoryStations } = useQuery({
  key: () => ['tenant', 'category-stations', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/stations/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const { data: categoriesData, asyncStatus: categoriesAsyncStatus, refetch: refetchCategories } = useQuery({
  key: () => ['tenant', 'menu-categories', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/menu/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

// ─── Layout-level loading orchestration (issue #461) ───
// First-load: block UI until the queries that drive the main listing have data.
// `stationsData` + `categoriesData` are the critical ones; profile and category-station
// mappings load alongside but their loading is non-blocking (rendered inline).
const isLoading = computed(() => !stationsData.value || !categoriesData.value)

// Progressive refresh: any of the four queries revalidating with data in place.
// OR-combined so any background refetch surfaces in the layout indicator.
const isRefreshing = computed(() => (
  (profileAsyncStatus.value === 'loading' && profileData.value != null) ||
  (stationsAsyncStatus.value === 'loading' && stationsData.value != null) ||
  (categoryStationsAsyncStatus.value === 'loading' && categoryStationsData.value != null) ||
  (categoriesAsyncStatus.value === 'loading' && categoriesData.value != null)
))

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

const refreshAll = async () => {
  await Promise.all([
    refreshProfile(),
    refetchStations(),
    refetchCategoryStations(),
    refetchCategories(),
  ])
}
onMounted(() => setRefreshHandler(refreshAll))
onUnmounted(() => clearRefreshHandler(refreshAll))

const mappedCategories = computed(() => {
  const cats = categoriesData.value?.data ?? []
  const maps = categoryStationsData.value?.data ?? []
  return cats.map((cat: any) => {
    const m = maps.find((x: any) => x.category_id === cat.id)
    return { ...cat, station_id: m?.station_id ?? null }
  })
})

// ─── Comandas / KDS toggles ───
const isTogglingComandas = ref(false)
const isTogglingKds = ref(false)
const showDisableComandasWarning = ref(false)

const handleToggleComandas = async (event: Event) => {
  const newState = (event.target as HTMLInputElement).checked
  if (!newState) {
    ;(event.target as HTMLInputElement).checked = true
    showDisableComandasWarning.value = true
    return
  }
  if (isTogglingComandas.value) return
  isTogglingComandas.value = true
  try {
    await $fetch('/api/api/tenant/public-profile', { method: 'PATCH', body: { comandas_enabled: true } })
    await refreshProfile()
    toast.success('Módulo de comandas activado', { title: 'Activado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al activar comandas', { title: 'Error' })
  } finally {
    isTogglingComandas.value = false
  }
}

const confirmDisableComandas = async () => {
  showDisableComandasWarning.value = false
  if (isTogglingComandas.value) return
  isTogglingComandas.value = true
  try {
    await $fetch('/api/api/tenant/public-profile', { method: 'PATCH', body: { comandas_enabled: false } })
    await refreshProfile()
    toast.success('Módulo de comandas desactivado', { title: 'Desactivado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al desactivar comandas', { title: 'Error' })
  } finally {
    isTogglingComandas.value = false
  }
}

const handleToggleKds = async (event: Event) => {
  if (isTogglingKds.value) return
  const newState = (event.target as HTMLInputElement).checked
  isTogglingKds.value = true
  try {
    await $fetch('/api/api/tenant/public-profile', { method: 'PATCH', body: { kds_enabled: newState } })
    await refreshProfile()
    toast.success(
      newState ? 'Pantallas KDS activadas' : 'Pantallas KDS desactivadas',
      { title: newState ? 'Activado' : 'Desactivado' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al cambiar estado KDS', { title: 'Error' })
  } finally {
    isTogglingKds.value = false
  }
}

const kdsBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://warocol.com'

// KDS token management
const kdsTokens = ref<Record<string, string>>({})
const generatingToken = ref<string | null>(null)
const revokingToken = ref<string | null>(null)

const generateKdsToken = async (stationId: string) => {
  generatingToken.value = stationId
  try {
    const res = await $fetch<any>(`/api/api/stations/${stationId}/kds-token`, { method: 'POST' })
    if (res.data?.token) {
      kdsTokens.value[stationId] = res.data.token
    }
    toast.success('Enlace KDS generado')
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al generar token')
  } finally {
    generatingToken.value = null
  }
}

const revokeKdsToken = async (stationId: string) => {
  revokingToken.value = stationId
  try {
    await $fetch(`/api/api/stations/${stationId}/kds-token`, { method: 'DELETE' })
    delete kdsTokens.value[stationId]
    toast.success('Enlace KDS revocado')
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al revocar token')
  } finally {
    revokingToken.value = null
  }
}

const copyKdsUrl = (stationId: string) => {
  const token = kdsTokens.value[stationId]
  const url = token
    ? `${kdsBaseUrl}/cocina/${stationId}?token=${token}`
    : `${kdsBaseUrl}/cocina/${stationId}`
  navigator.clipboard.writeText(url)
  toast.success('Enlace KDS copiado al portapapeles')
}

// ─── Station CRUD ───
const stationColumns = [
  { key: 'name', title: 'Nombre', sortable: false },
  { key: 'monitor', title: 'Monitor', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'thresholds', title: 'Alertas', sortable: false },
  { key: 'actions', title: '', sortable: false },
]

const categoryColumns = [
  { key: 'name', title: 'Categoría', sortable: false },
  { key: 'station', title: 'Estación asignada', sortable: false },
  { key: 'assign', title: '', sortable: false },
]

const togglingStationId = ref<string | null>(null)
const stationModalOpen = ref(false)
const editingStation = ref<any>(null)
const isSavingStation = ref(false)
const isAssigningCategoryId = ref<string | null>(null)

const deactivateModalOpen = ref(false)
const deactivateModalStation = ref<any>(null)
const deactivateInfo = ref<{ active_comandas_count: number; affected_categories: { id: string; name: string }[] } | null>(null)
const isLoadingDeactivateInfo = ref(false)
const isConfirmingDeactivate = ref(false)

const openCreateStation = () => { editingStation.value = null; stationModalOpen.value = true }
const openEditStation = (st: any) => { editingStation.value = st; stationModalOpen.value = true }

const handleSaveStation = async (formData: any) => {
  isSavingStation.value = true
  try {
    if (editingStation.value) {
      await $fetch(`/api/api/stations/${editingStation.value.id}`, { method: 'PATCH', body: formData })
      toast.success('Estación actualizada', { title: 'Guardado' })
    } else {
      await $fetch('/api/api/stations', { method: 'POST', body: formData })
      toast.success('Estación creada', { title: 'Creado' })
    }
    stationModalOpen.value = false
    await refetchStations()
  } catch {
    toast.error('Error al guardar la estación', { title: 'Error' })
  } finally {
    isSavingStation.value = false
  }
}

const handleToggleStation = async (station: any) => {
  if (togglingStationId.value === station.id) return
  if (!station.is_active) {
    togglingStationId.value = station.id
    try {
      await $fetch(`/api/api/stations/${station.id}/toggle`, { method: 'PATCH', body: { is_active: true } })
      toast.success('Estación activada')
      await refetchStations()
    } catch {
      toast.error('Error al activar la estación', { title: 'Error' })
    } finally {
      togglingStationId.value = null
    }
    return
  }
  togglingStationId.value = station.id
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/api/stations/${station.id}/deactivate-info`)
    const info = res.data
    if (info.active_comandas_count > 0 || info.affected_categories.length > 0) {
      deactivateModalStation.value = station
      deactivateInfo.value = info
      deactivateModalOpen.value = true
      togglingStationId.value = null
      return
    }
    await $fetch(`/api/api/stations/${station.id}/toggle`, { method: 'PATCH', body: { is_active: false } })
    toast.success('Estación desactivada')
    await refetchStations()
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al desactivar la estación', { title: 'Error' })
  } finally {
    togglingStationId.value = null
  }
}

const confirmDeactivateStation = async () => {
  if (!deactivateModalStation.value) return
  isConfirmingDeactivate.value = true
  try {
    await $fetch(`/api/api/stations/${deactivateModalStation.value.id}/toggle`, {
      method: 'PATCH',
      body: { is_active: false },
    })
    toast.success('Estación desactivada')
    deactivateModalOpen.value = false
    await refetchStations()
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al desactivar la estación', { title: 'Error' })
  } finally {
    isConfirmingDeactivate.value = false
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
    toast.error(`Error al asignar categoría: ${detail}`, { title: 'Error' })
  } finally {
    isAssigningCategoryId.value = null
  }
}
</script>
