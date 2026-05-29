<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="page-layout">
      <div class="flex flex-col gap-3 md:gap-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p class="text-sm text-text-secondary">
            Configura descuentos y promociones con horario y alcance en el menú.
          </p>
          <NuxtLink
            to="/gestion/promociones/nuevo"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap min-h-[44px] inline-flex items-center justify-center"
          >
            + Nueva promoción
          </NuxtLink>
        </div>

        <label class="flex items-center gap-2 text-sm text-text-secondary min-h-[44px]">
          <input v-model="showInactive" type="checkbox" class="rounded border-border" />
          Mostrar promociones desactivadas
        </label>

        <UiResponsiveDataView
          :columns="columns"
          :data="promotions"
          empty-message="No hay promociones"
          empty-sub-message="Crea la primera para aplicarla en el POS (batch siguiente)."
          variant="default"
          row-size="sm"
        >
          <template #card="{ item }">
            <NuxtLink
              :to="`/gestion/promociones/${item.id}`"
              class="flex flex-col gap-1 py-3 px-3 border-b border-border hover:bg-surface-secondary transition-colors"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  :class="statusBadgeClass(item)"
                >
                  {{ statusBadgeLabel(item) }}
                </span>
              </div>
              <p class="text-xs text-text-secondary">{{ rowPreview(item) }}</p>
              <p class="text-xs text-text-tertiary">{{ formatPromoTypeLabel(item.promo_type) }}</p>
            </NuxtLink>
          </template>

          <template #cell-name="{ value }">
            <span class="text-sm font-medium text-text-primary">{{ value }}</span>
          </template>

          <template #cell-preview="{ item }">
            <span class="text-sm text-text-secondary">{{ rowPreview(item) }}</span>
          </template>

          <template #cell-status="{ item }">
            <span
              class="text-xs font-medium px-2 py-0.5 rounded-full"
              :class="statusBadgeClass(item)"
            >
              {{ statusBadgeLabel(item) }}
            </span>
          </template>

          <template #cell-actions="{ item }">
            <NuxtLink
              :to="`/gestion/promociones/${item.id}`"
              class="text-sm font-medium text-primary hover:underline min-h-[44px] inline-flex items-center"
            >
              Editar
            </NuxtLink>
          </template>
        </UiResponsiveDataView>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import {
  buildPromotionPreview,
  formatPromoTypeLabel,
  type PromotionScheduleRow,
} from '~/utils/promotionPreview'

definePageMeta({ layout: 'dashboard', module: 'mi_negocio' })
useHead({ title: 'Promociones' })

interface PromotionRow {
  id: string
  name: string
  promo_type: string
  scope_type: string
  is_active: boolean
  is_currently_active?: boolean | null
  schedules: PromotionScheduleRow[]
  category_ids: string[]
  product_ids: string[]
}

const { currentTenant } = useTenantReactive()
const showInactive = ref(true)

const columns: Column[] = [
  { key: 'name', title: 'Nombre' },
  { key: 'preview', title: 'Vista previa' },
  { key: 'status', title: 'Estado' },
  { key: 'actions', title: '', align: 'right' as const },
]

const {
  data: listData,
  error: fetchError,
  asyncStatus: queryAsyncStatus,
} = useQuery({
  key: () => ['tenant', 'promotions', currentTenant.value?.id, { inactive: showInactive.value }],
  query: () =>
    $fetch<{ success: boolean; total: number; data: PromotionRow[] }>('/api/api/promotions', {
      query: {
        include_inactive: showInactive.value,
        at: new Date().toISOString(),
      },
    }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const promotions = computed(() => listData.value?.data ?? [])
const isLoading = computed(
  () => queryAsyncStatus.value === 'loading' && !listData.value,
)

const rowPreview = (item: PromotionRow) =>
  buildPromotionPreview({
    isActive: item.is_active,
    isCurrentlyActive: item.is_currently_active,
    schedules: item.schedules ?? [],
    scopeType: item.scope_type,
  })

const statusBadgeLabel = (item: PromotionRow) => {
  if (!item.is_active) return 'Desactivada'
  if (item.is_currently_active === true) return 'Activa ahora'
  if (item.is_currently_active === false) return 'Fuera de horario'
  return 'Activa'
}

const statusBadgeClass = (item: PromotionRow) => {
  if (!item.is_active) return 'bg-text-secondary/10 text-text-secondary'
  if (item.is_currently_active === true) return 'bg-status-success-bg text-status-success-text'
  if (item.is_currently_active === false) return 'bg-status-warning-bg text-status-warning-text'
  return 'bg-primary/10 text-primary'
}
</script>
