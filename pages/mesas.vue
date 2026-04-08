<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TableCellsIcon } from '@heroicons/vue/24/outline'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Mesas' })

const { currentTenant } = useTenantReactive()

// ── Data ───────────────────────────────────────────────────────────────────
const { data: tablesData, status: tablesStatus, asyncStatus: tablesAsyncStatus, error: tablesError, refetch } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const loadingTables = computed(() => !tablesData.value)
const isRefreshing = computed(() => tablesAsyncStatus.value === 'loading' && tablesData.value != null)

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

const filteredTables = computed(() => {
  let result = tables.value
  const q = searchTerm.value.trim().toLowerCase()
  if (q) result = result.filter((t: any) => t.name.toLowerCase().includes(q))
  if (statusFilter.value) result = result.filter((t: any) => t.status === statusFilter.value)
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

// ── Deactivate with inline confirmation ────────────────────────────────────
const confirmingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const deleteErrors = ref<Record<string, string>>({})

const startConfirm = (id: string) => {
  confirmingId.value = id
  delete deleteErrors.value[id]
}

const cancelConfirm = () => { confirmingId.value = null }

const confirmDeactivate = async (id: string) => {
  deletingId.value = id
  delete deleteErrors.value[id]
  try {
    await $fetch(`/api/tables/${id}`, { method: 'DELETE' })
    confirmingId.value = null
    await refetch()
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status
    deleteErrors.value[id] = status === 409
      ? 'Mesa con sesión abierta, ciérrala primero'
      : (err?.data?.detail ?? 'Error al desactivar')
    confirmingId.value = null
  } finally {
    deletingId.value = null
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

onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler(refetch))

// ── Business profile (shared cache key with negocio.vue) ───────────────────
const { data: profileData, refetch: refreshProfile } = useQuery({
  key: () => ['tenant', 'negocio-profile', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/public-profile'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const businessProfile = computed(() => profileData.value?.data ?? null)

// ── Toggle tables module ───────────────────────────────────────────────────
const posStore = usePOSStore()
const toast = useToast()
const isTogglingTables = ref(false)
const toggleTablesEnabled = async () => {
  if (!businessProfile.value || isTogglingTables.value) return
  isTogglingTables.value = true
  const newState = !businessProfile.value.tables_enabled
  try {
    await $fetch('/api/api/tenant/public-profile', {
      method: 'PATCH',
      body: { tables_enabled: newState },
    })
    await refreshProfile()
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
      <div v-if="businessProfile" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <TableCellsIcon class="w-5 h-5 text-primary flex-shrink-0" />
          Módulos
        </h3>
        <div class="flex items-center justify-between py-1">
          <div>
            <p class="text-sm font-medium text-text-primary">Gestión de mesas</p>
            <p class="text-xs text-text-secondary mt-0.5">Activa el flujo de mesas en el punto de venta</p>
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

      <!-- Data view -->
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
          :data="filteredTables"
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
                <p v-if="deleteErrors[item.id]" class="text-xs text-destructive mt-1">{{ deleteErrors[item.id] }}</p>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <UiStatusBadge :variant="badgeVariant(item.status)" size="sm">
                  {{ statusLabel(item.status) }}
                </UiStatusBadge>
                <template v-if="confirmingId === item.id">
                  <button class="h-8 px-2.5 rounded-md border border-border text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors" @click="cancelConfirm">Cancelar</button>
                  <button :disabled="deletingId === item.id" class="h-8 px-2.5 rounded-md bg-destructive text-xs font-semibold text-white hover:bg-destructive/90 transition-colors disabled:opacity-50" @click="confirmDeactivate(item.id)">{{ deletingId === item.id ? '...' : 'Confirmar' }}</button>
                </template>
                <template v-else>
                  <button :aria-label="`Editar ${item.name}`" class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors" @click="openPanel(item)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button :aria-label="`Desactivar ${item.name}`" :disabled="deletingId === item.id" class="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40" @click="startConfirm(item.id)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  </button>
                </template>
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

          <!-- Desktop: actions — slot exposes { row, value } -->
          <template #cell-actions="{ row }">
            <div class="flex items-center justify-end gap-1">
              <span v-if="deleteErrors[row.id]" class="text-xs text-destructive mr-2 max-w-[160px] truncate">{{ deleteErrors[row.id] }}</span>
              <template v-if="confirmingId === row.id">
                <button class="h-8 px-2.5 rounded-md border border-border text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors" @click="cancelConfirm">Cancelar</button>
                <button :disabled="deletingId === row.id" class="h-8 px-2.5 rounded-md bg-destructive text-xs font-semibold text-white hover:bg-destructive/90 transition-colors disabled:opacity-50" @click="confirmDeactivate(row.id)">{{ deletingId === row.id ? 'Desactivando...' : 'Confirmar' }}</button>
              </template>
              <template v-else>
                <button :aria-label="`Editar ${row.name}`" title="Editar" class="flex items-center justify-center h-9 w-9 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30" @click="openPanel(row)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button :aria-label="`Desactivar ${row.name}`" title="Desactivar" :disabled="deletingId === row.id" class="flex items-center justify-center h-9 w-9 rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/30 disabled:opacity-40" @click="startConfirm(row.id)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </button>
              </template>
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
  </div>
</template>
