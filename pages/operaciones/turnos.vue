<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-text-secondary">
          {{ activeCount }} activo{{ activeCount === 1 ? '' : 's' }}
          <span v-if="inactiveCount"> · {{ inactiveCount }} inactivo{{ inactiveCount === 1 ? '' : 's' }}</span>
        </p>
        <button
          type="button"
          class="btn-primary px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] whitespace-nowrap"
          @click="openCreate"
        >
          + Nuevo turno
        </button>
      </div>

      <UiResponsiveDataView
        :columns="columns"
        :data="templates"
        empty-message="No hay turnos configurados"
        empty-sub-message='Crea el primero, por ejemplo "Mañana 06:00–14:00".'
        row-size="sm"
      >
        <template #card="{ item, index }">
          <div
            v-if="item"
            class="flex items-center gap-2 py-3 px-3 border-b border-border"
            :class="[
              index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30',
              !item.is_active && 'opacity-60',
            ]"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-semibold text-text-primary">{{ item.name }}</span>
              <p class="text-xs text-text-secondary mt-0.5">{{ formatSchedule(item) }}</p>
            </div>
            <UiStatusBadge
              :value="item.is_active ? 'Activo' : 'Inactivo'"
              format="text"
              :variant="item.is_active ? 'success' : 'secondary'"
              size="sm"
            />
            <div class="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                :aria-label="`Editar ${item.name}`"
                title="Editar"
                class="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                @click="openEdit(item)"
              >
                <PencilSquareIcon class="w-4 h-4" />
              </button>
              <button
                v-if="item.is_active"
                type="button"
                :aria-label="`Desactivar ${item.name}`"
                title="Desactivar"
                class="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-colors"
                @click="requestDeactivate(item)"
              >
                <NoSymbolIcon class="w-4 h-4" />
              </button>
              <button
                v-else
                type="button"
                :aria-label="`Reactivar ${item.name}`"
                title="Reactivar"
                class="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                @click="reactivate(item)"
              >
                <ArrowPathIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </template>

        <template #cell-name="{ row }">
          <span class="font-medium text-text-primary" :class="{ 'opacity-60': !row.is_active }">{{ row.name }}</span>
        </template>

        <template #cell-schedule="{ row }">
          <span class="text-sm text-text-secondary">{{ formatSchedule(row) }}</span>
        </template>

        <template #cell-status="{ row }">
          <UiStatusBadge
            :value="row.is_active ? 'Activo' : 'Inactivo'"
            format="text"
            :variant="row.is_active ? 'success' : 'secondary'"
            size="sm"
          />
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center justify-end gap-0.5">
            <button
              type="button"
              :aria-label="`Editar ${row.name}`"
              title="Editar"
              class="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
              @click="openEdit(row)"
            >
              <PencilSquareIcon class="w-4 h-4" />
            </button>
            <button
              v-if="row.is_active"
              type="button"
              :aria-label="`Desactivar ${row.name}`"
              title="Desactivar"
              class="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-amber-600 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-colors"
              @click="requestDeactivate(row)"
            >
              <NoSymbolIcon class="w-4 h-4" />
            </button>
            <button
              v-else
              type="button"
              :aria-label="`Reactivar ${row.name}`"
              title="Reactivar"
              class="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
              @click="reactivate(row)"
            >
              <ArrowPathIcon class="w-4 h-4" />
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
    </template>

    <OperacionesShiftTemplatePanel
      v-model="panelOpen"
      :template="panelTemplate"
      @saved="onSaved"
    />

    <UiConfirmActionModal
      v-model="confirmOpen"
      title="Desactivar turno"
      :message="confirmMessage"
      confirm-label="Desactivar"
      loading-label="Desactivando..."
      variant="destructive"
      :loading="isDeactivating"
      @confirm="performDeactivate"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowPathIcon, NoSymbolIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import type { ShiftTemplate } from '~/components/operaciones/ShiftTemplatePanel.vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Turnos | Operaciones' })

const { currentTenant } = useTenantReactive()
const cache = useQueryCache()
const toast = useToast()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const columns: Column[] = [
  { key: 'name', title: 'Turno', sortable: false },
  { key: 'schedule', title: 'Horario', sortable: false },
  { key: 'status', title: 'Estado', sortable: false, align: 'center' },
  { key: 'actions', title: '', sortable: false, align: 'right' },
]

const {
  data: shiftsData,
  status: shiftsStatus,
  asyncStatus: shiftsAsyncStatus,
  error: fetchError,
  refetch,
} = useQuery({
  key: () => ['operaciones', 'shifts', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: ShiftTemplate[] }>(
    '/api/operaciones/shifts',
    { query: { include_inactive: true } },
  ),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const templates = computed(() => shiftsData.value?.data ?? [])
const isLoading = computed(() => shiftsStatus.value === 'pending' && !shiftsData.value)
const isRefreshing = computed(() => shiftsAsyncStatus.value === 'loading' && !!shiftsData.value)
const activeCount = computed(() => templates.value.filter(t => t.is_active).length)
const inactiveCount = computed(() => templates.value.filter(t => !t.is_active).length)

registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler())

const formatTime = (t: string) => (t?.length >= 5 ? t.slice(0, 5) : t)
const formatSchedule = (row: ShiftTemplate) => {
  const start = formatTime(row.start_time)
  const end = formatTime(row.end_time)
  return row.crosses_midnight ? `${start} – ${end} (día siguiente)` : `${start} – ${end}`
}

const panelOpen = ref(false)
const panelTemplate = ref<ShiftTemplate | null>(null)

const openCreate = () => {
  panelTemplate.value = null
  panelOpen.value = true
}

const openEdit = (row: ShiftTemplate) => {
  panelTemplate.value = row
  panelOpen.value = true
}

const onSaved = async () => {
  await cache.invalidateQueries({ key: ['operaciones', 'shifts'] })
  toast.success('Turno guardado correctamente')
}

const confirmOpen = ref(false)
const confirmMessage = ref('')
const pendingDeactivate = ref<ShiftTemplate | null>(null)
const isDeactivating = ref(false)

const requestDeactivate = (row: ShiftTemplate) => {
  pendingDeactivate.value = row
  confirmMessage.value = `¿Desactivar "${row.name}"? No aparecerá al cerrar caja, pero los arqueos pasados no se modifican.`
  confirmOpen.value = true
}

const performDeactivate = async () => {
  const row = pendingDeactivate.value
  if (!row) return
  isDeactivating.value = true
  try {
    await $fetch(`/api/operaciones/shifts/${row.id}`, {
      method: 'PATCH',
      body: { is_active: false },
    })
    await cache.invalidateQueries({ key: ['operaciones', 'shifts'] })
    toast.success(`Turno "${row.name}" desactivado`)
    confirmOpen.value = false
  } catch (err: any) {
    toast.error(err?.data?.detail || 'No se pudo desactivar el turno', { title: 'Error' })
  } finally {
    isDeactivating.value = false
  }
}

const reactivate = async (row: ShiftTemplate) => {
  try {
    await $fetch(`/api/operaciones/shifts/${row.id}`, {
      method: 'PATCH',
      body: { is_active: true },
    })
    await cache.invalidateQueries({ key: ['operaciones', 'shifts'] })
    toast.success(`Turno "${row.name}" reactivado`)
  } catch (err: any) {
    toast.error(err?.data?.detail || 'No se pudo reactivar el turno', { title: 'Error' })
  }
}
</script>
