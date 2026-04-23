<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({ layout: 'dashboard' })

useHead({ title: 'Comandas — WARO' })

const { currentTenant } = useTenantReactive()

const SOURCE_LABELS: Record<string, string> = {
  table:    'Mesa',
  pos:      'Mostrador',
  delivery: 'Domicilio',
  pickup:   'Recogida',
}

const COMANDA_STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  preparing: 'En preparación',
  ready:     'Lista',
  delivered: 'Entregada',
  cancelled: 'Cancelada',
}

const columns: Column[] = [
  { key: 'comanda_number',     title: '# Comanda', sortable: false },
  { key: 'source_type',        title: 'Origen',  sortable: false },
  { key: 'table_display_name', title: 'Destino', sortable: false },
  { key: 'status',             title: 'Estado',  sortable: false },
  { key: 'items',              title: 'Items',   sortable: false },
  { key: 'elapsed_seconds',    title: 'Tiempo',  sortable: false },
]

const {
  data: comandasData,
  status: comandasStatus,
  asyncStatus: comandasAsyncStatus,
  refetch: refetchComandas,
} = useQuery({
  key: () => ['comandas-monitor', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/comandas', {
    params: { status: 'pending,preparing,ready' },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const comandas = computed(() => comandasData.value?.data ?? [])
const isLoadingComandas = computed(() => comandasStatus.value === 'loading' || (!comandasData.value && comandasStatus.value !== 'error'))
const isRefreshingComandas = computed(() => comandasAsyncStatus.value === 'loading' && comandasData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetchComandas) })
onUnmounted(() => { clearRefreshHandler(refetchComandas) })
registerProgressiveLoading(isRefreshingComandas)

const formatElapsed = (seconds: number | null): string => {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}

const getComandaStatusVariant = (status: string): string => {
  const map: Record<string, string> = {
    pending:   'warning',
    preparing: 'info',
    ready:     'success',
    delivered: 'default',
    cancelled: 'error',
  }
  return map[status] ?? 'default'
}
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <!-- Loading -->
    <div v-if="isLoadingComandas" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!comandas.length"
      class="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-surface/50 border border-border rounded-2xl"
    >
      <div class="w-16 h-16 bg-titan-100 rounded-full flex items-center justify-center mb-4 text-titan-500">
        <Icon name="lucide:check-circle-2" size="32" />
      </div>
      <h3 class="text-lg font-bold text-text-primary">Todo al día</h3>
      <p class="text-sm text-text-secondary mt-1">No hay comandas activas en este momento.</p>
    </div>

    <!-- Comanda table -->
    <HealthSemaphore v-else :is-unlocked="true" title="# Comanda">
      <template #header-actions>
        <span class="text-xs font-bold text-text-secondary bg-surface-secondary px-2 py-0.5 rounded-full">
          {{ comandas.length }} activa{{ comandas.length !== 1 ? 's' : '' }}
        </span>
      </template>
    <UiResponsiveDataView
      row-size="sm"
      :columns="columns"
      :data="comandas"
      empty-message="No hay comandas."
      variant="default"
    >
      <!-- Mobile card -->
      <template #card="{ item }">
        <div
          class="flex items-start gap-3 py-3 px-3 border-b border-border"
          :class="[
            item.alert_level >= 2 ? 'bg-destructive/5' :
            item.alert_level >= 1 ? 'bg-warning/5' :
            item.status === 'ready' ? 'bg-success/5' : ''
          ]"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-text-primary leading-tight">
              <span class="text-primary">#{{ String(item.comanda_number).padStart(3, '0') }}</span>
              <span class="text-text-secondary font-normal"> · {{ item.table_display_name }}</span>
            </p>
            <p class="text-xs text-text-secondary mt-0.5">
              {{ SOURCE_LABELS[item.source_type] ?? item.source_type }}
              · {{ item.items?.filter((i: any) => i.status !== 'cancelled').length ?? 0 }} items
            </p>
            <div class="flex items-center gap-2 mt-1.5">
              <UiStatusBadge :variant="getComandaStatusVariant(item.status)" size="sm" format="text">
                {{ COMANDA_STATUS_LABELS[item.status] ?? item.status }}
              </UiStatusBadge>
              <span
                class="text-xs font-bold"
                :class="item.alert_level >= 2 ? 'text-destructive' : item.alert_level >= 1 ? 'text-warning' : 'text-text-secondary'"
              >
                {{ formatElapsed(item.elapsed_seconds) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- Desktop cells -->
      <template #cell-comanda_number="{ value }">
        <span class="text-sm font-black text-text-primary">#{{ String(value).padStart(3, '0') }}</span>
      </template>
      <template #cell-source_type="{ value }">
        <UiStatusBadge variant="info" size="sm" format="text">
          {{ SOURCE_LABELS[value] ?? value }}
        </UiStatusBadge>
      </template>
      <template #cell-table_display_name="{ value }">
        <span class="text-sm text-text-primary font-medium">{{ value }}</span>
      </template>
      <template #cell-status="{ value }">
        <UiStatusBadge :variant="getComandaStatusVariant(value)" size="sm" format="text">
          {{ COMANDA_STATUS_LABELS[value] ?? value }}
        </UiStatusBadge>
      </template>
      <template #cell-items="{ value }">
        <span class="text-sm text-text-secondary">
          {{ value?.filter((i: any) => i.status !== 'cancelled').length ?? 0 }}
          <span v-if="value?.some((i: any) => i.notes)" class="ml-1 text-amber-500" title="Tiene notas">📝</span>
        </span>
      </template>
      <template #cell-elapsed_seconds="{ value, row }">
        <span
          class="text-sm font-bold tabular-nums"
          :class="row.alert_level >= 2 ? 'text-destructive' : row.alert_level >= 1 ? 'text-warning' : 'text-text-secondary'"
        >{{ formatElapsed(value) }}</span>
      </template>
    </UiResponsiveDataView>
    </HealthSemaphore>
  </div>
</template>
