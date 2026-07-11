<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <!-- Summary stats -->
      <div class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 mb-4">
        <MetricCard title="Efectivo" :value="cashGroup?.methodCount ?? 0" format="number" variant="primary" />
        <MetricCard title="Predeterminados" :value="defaultGroups.length" format="number" variant="primary" />
        <MetricCard
          title="Personalizables"
          :value="customGroups.length"
          format="number"
          variant="primary"
          class="col-span-2 md:col-span-1"
        />
      </div>

      <UiResponsiveDataView
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
              <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <UiStatusBadge
                  :value="item.tenantId === null ? t('finanzas.metodosPago.defaultOne') : t('finanzas.metodosPago.customOne')"
                  format="text"
                  :variant="item.tenantId === null ? 'secondary' : 'primary'"
                  size="sm"
                />
                <UiStatusBadge
                  v-if="item.triggersCartera"
                  value="Genera cartera"
                  format="text"
                  variant="warning"
                  size="sm"
                />
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

        <!-- tipo -->
        <template #cell-tenantId="{ row }">
          <UiStatusBadge
            :value="row.tenantId === null ? t('finanzas.metodosPago.defaultOne') : t('finanzas.metodosPago.customOne')"
            format="text"
            :variant="row.tenantId === null ? 'secondary' : 'primary'"
            size="sm"
          />
        </template>

        <!-- genera cartera -->
        <template #cell-triggersCartera="{ row }">
          <UiStatusBadge
            v-if="row.triggersCartera"
            value="Genera cartera"
            format="text"
            variant="warning"
            size="sm"
          />
          <span v-else class="text-text-secondary text-xs">—</span>
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
    </template>

  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import MetricCard from '~/components/shared/MetricCard.vue'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: () => t('finanzas.head.metodosPago') })

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
  { key: 'name',            title: t('finanzas.metodosPago.group'),          sortable: false },
  { key: 'tenantId',        title: t('finanzas.metodosPago.type'),           sortable: false },
  { key: 'triggersCartera', title: t('finanzas.metodosPago.triggersCartera'), sortable: false, align: 'center' },
  { key: 'methodCount',     title: t('finanzas.metodosPago.methods'),        sortable: false, align: 'center' },
  { key: 'actions',         title: t('finanzas.common.actions'),       sortable: false, align: 'right' },
]

const {
  data: groupsData,
  status: groupsStatus,
  asyncStatus: groupsAsyncStatus,
  error: fetchError,
  refetch,
} = useQuery({
  key: () => ['payments', 'admin-groups', currentTenant.value?.id],
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

// First load: full-page loader + header matrix. Refetch: optimistic (content stays, matrix in header).
const hasEverLoaded = ref(false)
watch(() => groupsData.value, (v) => { if (v != null) hasEverLoaded.value = true })
watch(() => currentTenant.value?.id, () => { hasEverLoaded.value = false })

const isFetching = computed(() =>
  !!currentTenant.value &&
  (groupsStatus.value === 'pending' || groupsAsyncStatus.value === 'loading'),
)
const isLoading = computed(() => !hasEverLoaded.value && isFetching.value && !fetchError.value)

registerProgressiveLoading(isFetching)
onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler(refetch))

const navigateToGroup = (group: PaymentGroup) => {
  navigateTo(`/finanzas/metodos-pago/${group.id}`)
}
</script>
