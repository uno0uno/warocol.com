<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <p class="text-sm text-text-secondary leading-relaxed">
        Define turnos reutilizables para arqueos de caja por horario.
        Para ventanas únicas sin plantilla, usa
        <NuxtLink to="/finanzas/arqueo/z" class="text-primary font-medium hover:underline">
          arqueo por turno u horario
        </NuxtLink>
        en Finanzas.
      </p>

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
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors cursor-pointer hover:bg-surface-secondary"
            :class="[
              index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30',
              !item.is_active && 'opacity-60',
            ]"
            @click="openEdit(item)"
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
          <div class="flex items-center justify-end gap-1" @click.stop>
            <button
              type="button"
              class="min-h-[36px] px-2.5 text-xs font-medium rounded-lg text-text-secondary hover:bg-surface-secondary"
              @click="openEdit(row)"
            >
              Editar
            </button>
            <button
              v-if="row.is_active"
              type="button"
              class="min-h-[36px] px-2.5 text-xs font-medium rounded-lg text-destructive hover:bg-destructive/10"
              @click="requestDeactivate(row)"
            >
              Desactivar
            </button>
            <button
              v-else
              type="button"
              class="min-h-[36px] px-2.5 text-xs font-medium rounded-lg text-primary hover:bg-primary/10"
              @click="reactivate(row)"
            >
              Reactivar
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
