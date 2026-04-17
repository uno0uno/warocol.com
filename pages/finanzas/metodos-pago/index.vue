<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Summary stats -->
    <FinanzasMetricStrip
      v-else-if="groups.length"
      class="mb-4"
      :items="[
        { label: 'Efectivo',        value: String(cashGroup?.methodCount ?? 0) },
        { label: 'Predeterminados', value: String(defaultGroups.length) },
        { label: 'Personalizables', value: String(customGroups.length) },
      ]"
    />

    <UiResponsiveDataView
      v-if="!isLoading && !fetchError"
      :columns="columns"
      :data="groups"
      empty-message="No hay grupos de pago configurados"
      empty-sub-message="Contacta a soporte para configurar grupos"
      row-size="sm"
      @row-click="(row) => row.slug !== 'cash' && navigateToGroup(row)"
    >
      <!-- Mobile card -->
      <template #card="{ item, index }">
        <div
          v-if="item"
          class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors"
          :class="[
            index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30',
            item.slug !== 'cash' ? 'cursor-pointer hover:bg-surface-secondary' : 'cursor-default opacity-60',
          ]"
          @click="item.slug !== 'cash' && navigateToGroup(item)"
        >
          <div class="flex-1 min-w-0">
            <span class="text-sm font-semibold text-text-primary">{{ item.name }}</span>
            <p class="text-xs text-text-secondary mt-0.5 font-mono">{{ item.slug }}</p>
            <div class="flex items-center gap-1.5 mt-1 flex-wrap">
              <span v-if="item.tenantId === null" class="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">predeterminado</span>
              <span v-else class="text-xs text-text-secondary">personalizable</span>
              <span v-if="item.triggersCartera" class="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5">genera cartera</span>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <span class="text-sm text-text-secondary">{{ item.methodCount }} método{{ item.methodCount !== 1 ? 's' : '' }}</span>
            <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </template>

      <!-- name -->
      <template #cell-name="{ row }">
        <span class="font-medium text-text-primary">{{ row.name }}</span>
      </template>

      <!-- slug -->
      <template #cell-slug="{ row }">
        <span class="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">{{ row.slug }}</span>
      </template>

      <!-- tipo -->
      <template #cell-tenantId="{ row }">
        <span v-if="row.tenantId === null" class="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">predeterminado</span>
        <span v-else class="text-xs text-text-secondary">personalizable</span>
      </template>

      <!-- genera cartera -->
      <template #cell-triggersCartera="{ row }">
        <span v-if="row.triggersCartera" class="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5">Sí</span>
        <span v-else class="text-xs bg-background border border-border text-text-secondary rounded px-1.5 py-0.5">No</span>
      </template>

      <!-- method count -->
      <template #cell-methodCount="{ row }">
        <span class="text-text-secondary">{{ row.methodCount }}</span>
      </template>

      <!-- arrow -->
      <template #cell-actions="{ row }">
        <svg v-if="row.slug !== 'cash'" class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </template>
    </UiResponsiveDataView>

  </div>
</template>

<script setup lang="ts">
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Métodos de pago - Warocol' })

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

interface PaymentGroup {
  id: string
  tenantId: string | null
  name: string
  slug: string
  triggersCartera: boolean
  isActive: boolean
  sortOrder: number
  methodCount: number
}

const columns: Column[] = [
  { key: 'name',            title: 'Grupo',          sortable: false },
  { key: 'slug',            title: 'Slug',           sortable: false },
  { key: 'tenantId',        title: 'Tipo',           sortable: false },
  { key: 'triggersCartera', title: 'Genera cartera', sortable: false, align: 'center' },
  { key: 'methodCount',     title: 'Métodos',        sortable: false, align: 'center' },
  { key: 'actions',         title: 'Acciones',       sortable: false, align: 'right' },
]

const {
  data: groupsData,
  status: groupsStatus,
  asyncStatus: groupsAsyncStatus,
  error: fetchError,
  refetch,
} = useQuery({
  key: () => ['payments', 'groups', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PaymentGroup[] }>('/api/finanzas/metodos-pago/grupos'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const groups = computed<PaymentGroup[]>(() =>
  (groupsData.value?.data ?? []).filter(g => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
)
const cashGroup     = computed(() => groups.value.find(g => g.slug === 'efectivo'))
const defaultGroups = computed(() => groups.value.filter(g => g.tenantId === null && g.slug !== 'efectivo'))
const customGroups  = computed(() => groups.value.filter(g => g.tenantId !== null))
const isLoading    = computed(() => groupsStatus.value === 'pending' && !groupsData.value)
const isRefreshing = computed(() => groupsAsyncStatus.value === 'loading' && groupsData.value != null)

registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler(refetch))

const navigateToGroup = (group: PaymentGroup) => {
  navigateTo(`/finanzas/metodos-pago/${group.id}`)
}
</script>
