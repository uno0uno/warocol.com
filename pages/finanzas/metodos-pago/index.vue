<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <UiResponsiveDataView
      v-else
      :columns="columns"
      :data="groups"
      empty-message="No hay grupos de pago configurados"
      empty-sub-message="Contacta a soporte para configurar grupos"
      row-size="sm"
      @row-click="navigateToGroup"
    >
      <!-- Mobile card -->
      <template #card="{ item, index }">
        <div
          v-if="item"
          class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
          :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          @click="navigateToGroup(item)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-text-primary">{{ item.name }}</span>
              <span v-if="item.tenantId === null" class="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">predeterminado</span>
              <span v-if="item.triggersCartera" class="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5">genera cartera</span>
            </div>
            <p class="text-xs text-text-secondary mt-0.5 font-mono">{{ item.slug }}</p>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <span class="text-sm text-text-secondary">{{ item.methodCount }} método{{ item.methodCount !== 1 ? 's' : '' }}</span>
            <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </template>

      <!-- name + badges -->
      <template #cell-name="{ row }">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-text-primary">{{ row.name }}</span>
          <span v-if="row.tenantId === null" class="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">predeterminado</span>
          <span v-if="row.triggersCartera" class="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5">genera cartera</span>
        </div>
      </template>

      <!-- slug -->
      <template #cell-slug="{ row }">
        <span class="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 text-text-secondary">{{ row.slug }}</span>
      </template>

      <!-- method count -->
      <template #cell-methodCount="{ row }">
        <span class="text-text-secondary">{{ row.methodCount }}</span>
      </template>

      <!-- arrow -->
      <template #cell-actions>
        <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
  { key: 'name',        title: 'Grupo',    sortable: false },
  { key: 'slug',        title: 'Slug',     sortable: false },
  { key: 'methodCount', title: 'Métodos',  sortable: false, align: 'center' },
  { key: 'actions',     title: '',         sortable: false, align: 'right' },
]

const {
  data: groupsData,
  status: groupsStatus,
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
const isLoading    = computed(() => groupsStatus.value === 'pending' && !groupsData.value)
const isRefreshing = computed(() => groupsStatus.value === 'success' && false) // groups don't refresh often

registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(refetch))
onUnmounted(() => clearRefreshHandler(refetch))

const navigateToGroup = (group: PaymentGroup) => {
  navigateTo(`/finanzas/metodos-pago/${group.id}`)
}
</script>
