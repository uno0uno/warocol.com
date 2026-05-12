<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Mesas | Operaciones' })

const { currentTenant } = useTenantReactive()

// ── Data ───────────────────────────────────────────────────────────────────
const { data: tablesData, status: tablesStatus, asyncStatus: tablesAsyncStatus, error: tablesError, refetch } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables?include_inactive=true'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Operaciones audience aggregator — gated under OPERACIONES.
// Migrated from /api/api/tenant/public-profile (now owner-only MI_NEGOCIO).
const cache = useQueryCache()
const { data: profileData, asyncStatus: profileAsyncStatus, refetch: refreshProfile } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Cross-audience cache invalidation — POS reads tables_enabled from its own
// /pos/restaurant-context aggregator; flipping the toggle here must invalidate
// that key too so /pos/index reflects the change immediately.
const invalidateContextCaches = async () => {
  await cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] })
  await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
}
const businessProfile = computed(() => profileData.value?.data ?? null)

const loadingTables = computed(() => !tablesData.value)
const isRefreshing = computed(() => (
  (tablesAsyncStatus.value === 'loading' && tablesData.value != null) ||
  (profileAsyncStatus.value === 'loading' && profileData.value != null)
))

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

const tables = computed(() => tablesData.value?.data ?? [])

// ── Search / filter ────────────────────────────────────────────────────────
const searchTerm = ref('')
const statusFilter = ref('')

const statusOptions = [
  { value: 'free', label: 'Libre' },
  { value: 'open', label: 'Ocupada' },
  { value: 'bill_requested', label: 'Pidiendo cuenta' },
]

// Active tables: is_active true, not bar
const activeTables = computed(() => {
  let result = tables.value.filter((t: any) => !t.is_bar && t.is_active)
  const q = searchTerm.value.trim().toLowerCase()
  if (q) result = result.filter((t: any) => t.name.toLowerCase().includes(q))
  if (statusFilter.value) result = result.filter((t: any) => t.status === statusFilter.value)
  return result
})

// Inactive tables: is_active false, not bar (deactivated but not deleted)
const inactiveTables = computed(() => {
  let result = tables.value.filter((t: any) => !t.is_bar && !t.is_active)
  const q = searchTerm.value.trim().toLowerCase()
  if (q) result = result.filter((t: any) => t.name.toLowerCase().includes(q))
  return result
})

// ── Table columns ──────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'name', title: 'Mesa', sortable: false },
  { key: 'capacity', title: 'Capacidad' },
  { key: 'status', title: 'Estado' },
  { key: 'actions', title: '' },
]

// ── Panel state ────────────────────────────────────────────────────────────
const showPanel = ref(false)
const panelTable = ref<any>(null)

const openPanel = (table: any = null) => {
  panelTable.value = table
  showPanel.value = true
}

const onSaved = () => { refetch() }

// ── Deactivate modal ────────────────────────────────────────────────────────
const deactivateModalOpen = ref(false)
const deactivateModalTable = ref<any>(null)
const isDeactivating = ref(false)
const deactivateError = ref('')

const openDeactivateModal = (table: any) => {
  deactivateModalTable.value = table
  deactivateError.value = ''
  deactivateModalOpen.value = true
}

const confirmDeactivate = async () => {
  if (!deactivateModalTable.value || isDeactivating.value) return
  isDeactivating.value = true
  deactivateError.value = ''
  try {
    await $fetch(`/api/tables/${deactivateModalTable.value.id}/deactivate`, { method: 'PATCH' })
    deactivateModalOpen.value = false
    await refetch()
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status
    deactivateError.value = status === 409
      ? (err?.data?.detail ?? 'Mesa con sesión abierta, ciérrala primero')
      : (err?.data?.detail ?? 'Error al desactivar')
  } finally {
    isDeactivating.value = false
  }
}

// ── Activate ────────────────────────────────────────────────────────────────
const activatingId = ref<string | null>(null)

const activateTable = async (id: string) => {
  if (activatingId.value) return
  activatingId.value = id
  try {
    await $fetch(`/api/tables/${id}/activate`, { method: 'PATCH' })
    await refetch()
  } catch (err: any) {
    // silently surface via toast if available
  } finally {
    activatingId.value = null
  }
}

// ── Delete modal ─────────────────────────────────────────────────────────
const deleteModalOpen = ref(false)
const deleteModalTable = ref<any>(null)
const isDeleting = ref(false)
const deleteError = ref('')

const openDeleteModal = (table: any) => {
  deleteModalTable.value = table
  deleteError.value = ''
  deleteModalOpen.value = true
}

const hasOpenSession = computed(() => !!deleteModalTable.value?.session)
const hasHistory = computed(() => !!deleteModalTable.value?.last_closed_session_id)

const confirmDelete = async () => {
  if (!deleteModalTable.value || isDeleting.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/tables/${deleteModalTable.value.id}`, { method: 'DELETE' })
    deleteModalOpen.value = false
    await refetch()
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status
    deleteError.value = status === 409
      ? (err?.data?.detail ?? 'No se puede eliminar esta mesa ahora')
      : (err?.data?.detail ?? 'Error al eliminar')
  } finally {
    isDeleting.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const statusLabel = (status: string) => {
  if (status === 'open') return 'Ocupada'
  if (status === 'bill_requested') return 'Pidiendo cuenta'
  return 'Libre'
}

const badgeVariant = (status: string) => {
  if (status === 'open') return 'success'
  if (status === 'bill_requested') return 'warning'
  return 'secondary'
}

// Refresh handler — fan out to both queries so the layout's manual refresh
// button updates the table list AND the tables-enabled toggle in one go.
const refreshAll = async () => {
  await Promise.all([refetch(), refreshProfile()])
}
onMounted(() => setRefreshHandler(refreshAll))
onUnmounted(() => clearRefreshHandler(refreshAll))

// ── Toggle tables module ───────────────────────────────────────────────────
const posStore = usePOSStore()
const toast = useToast()
const isTogglingTables = ref(false)
const toggleTablesEnabled = async () => {
  if (!businessProfile.value || isTogglingTables.value) return
  isTogglingTables.value = true
  const newState = !businessProfile.value.tables_enabled
  try {
    await $fetch('/api/operaciones/toggles/tables', {
      method: 'PATCH',
      body: { enabled: newState },
    })
    await invalidateContextCaches()
    posStore.tablesEnabled = newState
    toast.success(
      newState ? 'Gestión de mesas activada para el POS' : 'Gestión de mesas desactivada',
      { title: newState ? '¡Módulo activado!' : 'Módulo desactivado' }
    )
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al cambiar estado del módulo', { title: 'Error' })
  } finally {
    isTogglingTables.value = false
  }
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loadingTables" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="tablesError" />

    <!-- Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- ══════ MÓDULOS ══════ -->
      <div
        v-if="businessProfile"
        class="flex items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 transition-colors"
        :class="businessProfile.tables_enabled
          ? 'border-border bg-surface'
          : 'border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20'"
      >
        <div class="min-w-0">
          <p
            class="text-sm font-semibold leading-snug"
            :class="businessProfile.tables_enabled ? 'text-text-primary' : 'text-amber-800 dark:text-amber-300'"
          >
            {{ businessProfile.tables_enabled ? 'Gestión de mesas activa' : 'Gestión de mesas desactivada' }}
          </p>
          <p
            class="text-xs mt-0.5 leading-snug"
            :class="businessProfile.tables_enabled ? 'text-text-secondary' : 'text-amber-700 dark:text-amber-400'"
          >
            {{ businessProfile.tables_enabled ? 'El flujo de mesas está disponible en el punto de venta' : 'Actívala para usar el flujo de mesas en el punto de venta' }}
          </p>
        </div>
        <label
          class="relative inline-flex items-center cursor-pointer flex-shrink-0"
          :class="isTogglingTables ? 'opacity-50 pointer-events-none' : ''"
          :aria-label="businessProfile.tables_enabled ? 'Desactivar gestión de mesas' : 'Activar gestión de mesas'"
        >
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="businessProfile.tables_enabled"
            @change="toggleTablesEnabled"
            :disabled="isTogglingTables"
          />
          <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <!-- Filters -->
      <SharedFiltersBar
        v-model:search="searchTerm"
        v-model:status-filter="statusFilter"
        :status-options="statusOptions"
        search-placeholder="Buscar mesa..."
        status-label="Estado"
        status-placeholder="Todos los estados"
        show-status-filter
      />

      <!-- ══════ ACTIVE TABLES ══════ -->
      <HealthSemaphore :is-unlocked="true" title="Mesas configuradas">
        <template #header-actions>
          <button
            type="button"
            class="h-9 px-4 rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] transition-all shadow-sm shadow-primary/30 whitespace-nowrap"
            @click="openPanel(null)"
          >
            <span class="hidden sm:inline">+ Nueva mesa</span>
            <span class="sm:hidden">+ Nueva</span>
          </button>
        </template>

        <UiResponsiveDataView
          :columns="tableColumns"
          :data="activeTables"
          empty-message="No hay mesas configuradas"
          empty-sub-message="Crea tu primera mesa para empezar a gestionar el salón"
          variant="default"
          row-size="sm"
        >
          <!-- Mobile card -->
          <template #card="{ item }">
            <div class="flex items-center gap-3 py-2 px-3 border-b border-border transition-colors hover:bg-surface-secondary">
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                <p class="text-xs text-text-secondary mt-0.5">
                  {{ item.capacity ? `${item.capacity} persona${item.capacity !== 1 ? 's' : ''}` : 'Sin capacidad definida' }}
                </p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <UiStatusBadge :variant="badgeVariant(item.status)" size="sm">
                  {{ statusLabel(item.status) }}
                </UiStatusBadge>
                <button :aria-label="`Editar ${item.name}`" class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors" @click="openPanel(item)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button :aria-label="`Desactivar ${item.name}`" class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:bg-amber-50 hover:text-amber-600 transition-colors" @click="openDeactivateModal(item)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </button>
                <button :aria-label="`Eliminar ${item.name}`" class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors" @click="openDeleteModal(item)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </template>

          <!-- Desktop: name -->
          <template #cell-name="{ value }">
            <span class="text-sm font-medium text-text-primary">{{ value }}</span>
          </template>

          <!-- Desktop: capacity -->
          <template #cell-capacity="{ value }">
            <span class="text-sm text-text-secondary">
              {{ value ? `${value} persona${value !== 1 ? 's' : ''}` : '—' }}
            </span>
          </template>

          <!-- Desktop: status -->
          <template #cell-status="{ value }">
            <UiStatusBadge :variant="badgeVariant(value)" size="sm">
              {{ statusLabel(value) }}
            </UiStatusBadge>
          </template>

          <!-- Desktop: actions -->
          <template #cell-actions="{ row }">
            <div class="flex items-center justify-end gap-1">
              <button :aria-label="`Editar ${row.name}`" title="Editar" class="flex items-center justify-center h-9 w-9 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30" @click="openPanel(row)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button :aria-label="`Desactivar ${row.name}`" title="Desactivar" class="flex items-center justify-center h-9 w-9 rounded-lg text-text-secondary hover:bg-amber-50 hover:text-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/30" @click="openDeactivateModal(row)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </button>
              <button :aria-label="`Eliminar ${row.name}`" title="Eliminar" class="flex items-center justify-center h-9 w-9 rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30" @click="openDeleteModal(row)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </template>
        </UiResponsiveDataView>
      </HealthSemaphore>

      <!-- ══════ INACTIVE TABLES ══════ -->
      <HealthSemaphore v-if="inactiveTables.length > 0" :is-unlocked="true" title="Mesas desactivadas">
        <UiResponsiveDataView
          :columns="tableColumns"
          :data="inactiveTables"
          empty-message=""
          variant="default"
          row-size="sm"
        >
          <!-- Mobile card -->
          <template #card="{ item }">
            <div class="flex items-center gap-3 py-2 px-3 border-b border-border transition-colors hover:bg-surface-secondary opacity-60">
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-text-secondary line-through">{{ item.name }}</span>
                <p class="text-xs text-text-tertiary mt-0.5">
                  {{ item.capacity ? `${item.capacity} persona${item.capacity !== 1 ? 's' : ''}` : 'Sin capacidad definida' }}
                </p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-full bg-surface-secondary text-text-tertiary border border-border">Inactiva</span>
                <button
                  :aria-label="`Activar ${item.name}`"
                  :disabled="activatingId === item.id"
                  class="flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg text-xs font-semibold text-success border border-success/40 hover:bg-success/10 transition-colors disabled:opacity-50"
                  @click="activateTable(item.id)"
                >
                  <svg v-if="activatingId !== item.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                  <UiLoadingMatrix v-else size="4px" />
                  Activar
                </button>
                <button :aria-label="`Eliminar ${item.name}`" class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-tertiary hover:bg-destructive/10 hover:text-destructive transition-colors" @click="openDeleteModal(item)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </template>

          <!-- Desktop: name -->
          <template #cell-name="{ value }">
            <span class="text-sm font-medium text-text-tertiary line-through">{{ value }}</span>
          </template>

          <!-- Desktop: capacity -->
          <template #cell-capacity="{ value }">
            <span class="text-sm text-text-tertiary">
              {{ value ? `${value} persona${value !== 1 ? 's' : ''}` : '—' }}
            </span>
          </template>

          <!-- Desktop: status (always Inactiva) -->
          <template #cell-status>
            <span class="text-xs font-semibold text-text-tertiary uppercase tracking-tight">Inactiva</span>
          </template>

          <!-- Desktop: actions -->
          <template #cell-actions="{ row }">
            <div class="flex items-center justify-end gap-2">
              <button
                :aria-label="`Activar ${row.name}`"
                :disabled="activatingId === row.id"
                class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-success border border-success/40 hover:bg-success/10 transition-colors focus:outline-none focus:ring-2 focus:ring-success/30 disabled:opacity-50"
                @click="activateTable(row.id)"
              >
                <svg v-if="activatingId !== row.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                <UiLoadingMatrix v-else size="4px" />
                Activar
              </button>
              <button :aria-label="`Eliminar ${row.name}`" title="Eliminar" class="flex items-center justify-center h-9 w-9 rounded-lg text-text-tertiary hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30" @click="openDeleteModal(row)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </template>
        </UiResponsiveDataView>
      </HealthSemaphore>
    </div>

    <!-- Create / Edit Panel -->
    <MesasMesaPanel
      v-model="showPanel"
      :table="panelTable"
      @saved="onSaved"
    />

    <!-- ══════ DEACTIVATE MODAL ══════ -->
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
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40">
                    <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <h3 class="text-base font-bold text-text-primary leading-tight">Desactivar mesa</h3>
                    <p class="text-sm text-text-secondary mt-0.5 truncate font-medium">{{ deactivateModalTable?.name }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  class="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors"
                  @click="deactivateModalOpen = false"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div class="px-5 py-4 flex flex-col gap-3">
                <p class="text-sm text-text-secondary leading-relaxed">
                  La mesa quedará inactiva y no aparecerá en el punto de venta. Podrás reactivarla en cualquier momento desde esta pantalla.
                </p>
                <div v-if="deactivateError" class="rounded-xl bg-destructive/8 border border-destructive/20 px-4 py-3">
                  <p class="text-sm text-destructive font-medium">{{ deactivateError }}</p>
                </div>
              </div>

              <div class="px-5 pb-5 flex gap-2.5">
                <button
                  type="button"
                  class="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
                  @click="deactivateModalOpen = false"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  :disabled="isDeactivating"
                  class="flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                  @click="confirmDeactivate"
                >
                  <UiLoadingDots v-if="isDeactivating" size="8px" color="currentColor" />
                  <template v-else>Desactivar</template>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════ DELETE MODAL ══════ -->
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
          v-if="deleteModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="deleteModalOpen = false"
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
            <div v-if="deleteModalOpen" class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div class="relative px-5 pt-5 pb-4 border-b border-border/60">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-destructive/10 border border-destructive/20">
                    <svg class="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <h3 class="text-base font-bold text-text-primary leading-tight">Eliminar mesa</h3>
                    <p class="text-sm text-text-secondary mt-0.5 truncate font-medium">{{ deleteModalTable?.name }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  class="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors"
                  @click="deleteModalOpen = false"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div class="px-5 py-4 flex flex-col gap-3">
                <!-- Blocked: open session -->
                <div v-if="hasOpenSession" class="rounded-xl bg-destructive/8 border border-destructive/20 p-4">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-destructive leading-snug">No se puede eliminar ahora</p>
                      <p class="text-xs text-destructive/80 mt-1 leading-relaxed">Esta mesa tiene una sesión activa. Ciérrala antes de eliminarla.</p>
                    </div>
                  </div>
                </div>

                <!-- Archive warning: has closed history -->
                <div v-else-if="hasHistory" class="rounded-xl bg-amber-50 border border-amber-200/70 p-4 dark:bg-amber-950/20 dark:border-amber-800/40">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-amber-800 dark:text-amber-300 leading-snug">Esta mesa se archivará</p>
                      <p class="text-xs text-amber-700/80 dark:text-amber-400 mt-1 leading-relaxed">Tiene historial de sesiones. Se archivará para preservar los reportes y dejará de aparecer en el sistema.</p>
                    </div>
                  </div>
                </div>

                <!-- Safe: no history, hard delete -->
                <div v-else class="rounded-xl bg-emerald-50 border border-emerald-200/70 p-4 dark:bg-emerald-950/20 dark:border-emerald-800/40">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-300 leading-snug">Sin historial — eliminación permanente</p>
                      <p class="text-xs text-emerald-700/80 dark:text-emerald-400 mt-1 leading-relaxed">Esta mesa no tiene sesiones registradas. Se eliminará de forma definitiva.</p>
                    </div>
                  </div>
                </div>

                <div v-if="deleteError" class="rounded-xl bg-destructive/8 border border-destructive/20 px-4 py-3">
                  <p class="text-sm text-destructive font-medium">{{ deleteError }}</p>
                </div>
              </div>

              <div class="px-5 pb-5 flex gap-2.5">
                <button
                  type="button"
                  class="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors"
                  @click="deleteModalOpen = false"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  :disabled="hasOpenSession || isDeleting"
                  class="flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-destructive text-white hover:bg-destructive/90 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
                  @click="confirmDelete"
                >
                  <UiLoadingDots v-if="isDeleting" size="8px" color="currentColor" />
                  <template v-else>{{ hasHistory ? 'Archivar' : 'Eliminar' }}</template>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
