<script setup lang="ts">
const { t } = useI18n()
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import {
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
} from '@heroicons/vue/24/outline'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({ layout: 'dashboard', module: 'facturacion' })
useHead({ title: () => t('facturacion.head.audit') })

const { currentTenant } = useTenantReactive()
const router = useRouter()
const route = useRoute()
const { formatDate } = useFormatters()
const {
  isFiscalIntegrated,
  isMatiasDian,
  isLoading: isFinancialProfileLoading,
} = useTenantFinancialProfile()

const PAGE_SIZE = 50
const currentPage = ref(1)
const resolutionFilter = ref<string | null>(
  typeof route.query.resolution_id === 'string' ? route.query.resolution_id : null,
)

watch(resolutionFilter, () => { currentPage.value = 1 })

// Available resolutions for the filter dropdown
const { data: resolutionsData } = useQuery({
  key: () => ['tenant', 'dian-resolutions', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/tenant/dian-resolutions'),
  enabled: () => !!currentTenant.value && isFiscalIntegrated.value,
  staleTime: 60_000,
})
const resolutions = computed(() => resolutionsData.value?.data ?? [])

// Summary header
const { data: summaryData, refetch: refetchSummary } = useQuery({
  key: () => ['tenant', 'dian-gaps-summary', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { last_24h: number; last_7d: number; last_30d: number; total: number } }>(
    '/api/api/tenant/dian-resolutions/gaps-summary',
  ),
  enabled: () => !!currentTenant.value && isFiscalIntegrated.value,
  staleTime: 60_000,
})
const summary = computed(() => summaryData.value?.data ?? null)

// Paginated gaps
const { data: gapsData, status: gapsStatus, asyncStatus: gapsAsync, refetch: refetchGaps } = useQuery({
  key: () => ['tenant', 'dian-gaps', currentTenant.value?.id, {
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
    resolution_id: resolutionFilter.value,
  }],
  query: () => {
    const params: Record<string, any> = {
      limit: PAGE_SIZE,
      offset: (currentPage.value - 1) * PAGE_SIZE,
    }
    if (resolutionFilter.value) params.resolution_id = resolutionFilter.value
    return $fetch<{ success: boolean; total: number; data: any[] }>('/api/api/tenant/dian-resolutions/gaps', { params })
  },
  enabled: () => !!currentTenant.value && isFiscalIntegrated.value,
  staleTime: 60_000,
})

const gaps = computed(() => gapsData.value?.data ?? [])
const gapsTotal = computed(() => gapsData.value?.total ?? 0)
const totalPages = computed(() => Math.ceil(gapsTotal.value / PAGE_SIZE) || 1)
const isLoading = computed(() =>
  isFinancialProfileLoading.value
  || (isFiscalIntegrated.value && gapsStatus.value === 'pending' && !gapsData.value),
)
const isRefreshing = computed(() => gapsAsync.value === 'loading' && gapsData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  if (!isFiscalIntegrated.value) return
  await Promise.all([refetchGaps(), refetchSummary()])
}
onMounted(() => { setRefreshHandler(handleRefresh) })
onUnmounted(() => { clearRefreshHandler() })
registerProgressiveLoading(isRefreshing)

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

const columns = computed<Column[]>(() => [
  { key: 'created_at', title: t('facturacion.audit.when'), sortable: false },
  { key: 'number', title: t('facturacion.audit.burnedNumber'), sortable: false },
  { key: 'resolution_number', title: t('facturacion.audit.resolution'), sortable: false },
  { key: 'reason', title: t('facturacion.audit.reason'), sortable: false },
  { key: 'original_order_number', title: t('facturacion.audit.order'), sortable: false },
])

const reasonLabel = (reason: string) => {
  const map: Record<string, string> = {
    matias_ya_validado: t('facturacion.audit.validatedDian'),
    matias_500: t('facturacion.audit.matias5xx'),
    network_timeout: t('facturacion.audit.networkTimeout'),
  }
  return map[reason] || reason
}

const reasonClass = (reason: string) => {
  if (reason === 'matias_ya_validado') return 'bg-state-warning-bg text-state-warning-text'
  if (reason?.startsWith('matias_')) return 'bg-state-danger-bg text-state-danger-text'
  return 'bg-surface-secondary text-text-secondary'
}
</script>

<template>
  <div v-if="isFinancialProfileLoading" class="flex justify-center py-16">
    <CommonsTheCustomLoader size="medium" />
  </div>

  <section
    v-else-if="!isMatiasDian || !isFiscalIntegrated"
    class="rounded-xl border-2 border-state-info-border bg-state-info-bg p-5"
    role="status"
  >
    <h1 class="text-lg font-semibold text-state-info-text">{{ t('facturacion.audit.unavailableTitle') }}</h1>
    <p class="mt-1 text-sm text-state-info-text/90">{{ t('facturacion.audit.unavailableBody') }}</p>
    <NuxtLink
      to="/facturacion"
      class="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-action-primary-bg px-4 py-2 text-sm font-semibold text-action-primary-text hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {{ t('facturacion.audit.back') }}
    </NuxtLink>
  </section>

  <div v-else class="space-y-4">
    <!-- Header / back -->
    <div class="flex items-center gap-2">
      <button
        @click="router.push('/facturacion')"
        class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
        :aria-label="t('facturacion.audit.back')"
      >
        <ArrowLeftIcon class="w-5 h-5 text-text-secondary" aria-hidden="true" />
      </button>
      <div class="flex-1 min-w-0">
        <h1 class="text-lg sm:text-xl font-semibold text-text-primary flex items-center gap-2">
          <DocumentTextIcon class="w-5 h-5 text-primary flex-shrink-0" />
          {{ t('facturacion.audit.title') }}
        </h1>
        <p class="text-xs text-text-secondary mt-0.5 leading-snug">
          {{ t('facturacion.audit.description') }}
        </p>
      </div>
    </div>

    <!-- Summary tiles -->
    <div v-if="summary" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="bg-surface border-2 border-border rounded-xl p-3">
        <p class="text-[11px] uppercase tracking-wide text-text-tertiary font-semibold">{{ t('facturacion.audit.last24h') }}</p>
        <p class="text-2xl font-bold text-text-primary tabular-nums mt-1">{{ summary.last_24h }}</p>
      </div>
      <div class="bg-surface border-2 border-border rounded-xl p-3">
        <p class="text-[11px] uppercase tracking-wide text-text-tertiary font-semibold">{{ t('facturacion.audit.last7d') }}</p>
        <p class="text-2xl font-bold text-text-primary tabular-nums mt-1">{{ summary.last_7d }}</p>
      </div>
      <div class="bg-surface border-2 border-border rounded-xl p-3">
        <p class="text-[11px] uppercase tracking-wide text-text-tertiary font-semibold">{{ t('facturacion.audit.last30d') }}</p>
        <p class="text-2xl font-bold text-text-primary tabular-nums mt-1">{{ summary.last_30d }}</p>
      </div>
      <div class="bg-surface border-2 border-border rounded-xl p-3">
        <p class="text-[11px] uppercase tracking-wide text-text-tertiary font-semibold">{{ t('facturacion.audit.totalHistorical') }}</p>
        <p class="text-2xl font-bold text-text-primary tabular-nums mt-1">{{ summary.total }}</p>
      </div>
    </div>

    <!-- Filter -->
    <div class="flex flex-wrap items-center gap-3">
      <select
        v-model="resolutionFilter"
        class="py-2 ps-3 pe-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
        :aria-label="t('facturacion.audit.filterResolution')"
      >
        <option :value="null">{{ t('facturacion.audit.allResolutions') }}</option>
        <option v-for="r in resolutions" :key="r.id" :value="r.id">
          {{ r.prefix }} · {{ r.resolution_number }}
        </option>
      </select>
      <span class="text-sm text-text-secondary ms-auto">
        {{ t('facturacion.audit.recordCount', { count: gapsTotal }) }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <CommonsTheCustomLoader size="medium" />
    </div>

    <!-- Empty -->
    <div v-else-if="gaps.length === 0" class="text-center py-16 space-y-3">
      <DocumentTextIcon class="w-12 h-12 mx-auto text-text-tertiary" />
      <p class="text-text-secondary">{{ t('facturacion.audit.emptyTitle') }}</p>
      <p class="text-sm text-text-tertiary">
        {{ resolutionFilter ? t('facturacion.audit.emptyForResolution') : t('facturacion.audit.emptyBody') }}
      </p>
    </div>

    <!-- Table -->
    <UiResponsiveDataView
      v-else
      :columns="columns"
      :data="gaps"
      row-key="id"
    >
      <template #cell-created_at="{ value }">
        <span class="text-sm text-text-secondary">{{ value ? formatDate(value) : '—' }}</span>
      </template>

      <template #cell-number="{ row }">
        <span class="font-bold text-text-primary tabular-nums">{{ row.prefix }}-{{ row.skipped_number }}</span>
      </template>

      <template #cell-resolution_number="{ row }">
        <span class="text-sm text-text-secondary font-mono">
          {{ row.resolution_number }}
          <span class="text-text-tertiary">
            ({{ row.from_number }}→{{ row.to_number }})
          </span>
        </span>
      </template>

      <template #cell-reason="{ value }">
        <span
          class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
          :class="reasonClass(value)"
        >
          <ExclamationTriangleIcon class="w-3 h-3" aria-hidden="true" />
          {{ reasonLabel(value) }}
        </span>
      </template>

      <template #cell-original_order_number="{ row }">
        <NuxtLink
          v-if="row.original_attempt_order_id"
          :to="`/ventas/${row.original_attempt_order_id}`"
          class="text-sm text-primary hover:underline"
          @click.stop
        >
          {{ row.original_order_number || '—' }}
        </NuxtLink>
        <span v-else class="text-sm text-text-tertiary">—</span>
      </template>

      <template #mobile-card="{ row }">
        <div class="bg-surface border border-border rounded-xl p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-text-primary tabular-nums">{{ row.prefix }}-{{ row.skipped_number }}</span>
            <span
              class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              :class="reasonClass(row.reason)"
            >
              {{ reasonLabel(row.reason) }}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs text-text-secondary">
            <span class="font-mono">{{ row.resolution_number }}</span>
            <span>{{ row.created_at ? formatDate(row.created_at) : '' }}</span>
          </div>
          <NuxtLink
            v-if="row.original_attempt_order_id"
            :to="`/ventas/${row.original_attempt_order_id}`"
            class="block text-xs text-primary hover:underline"
          >
            {{ t('facturacion.audit.orderLabel', { order: row.original_order_number || row.original_attempt_order_id.substring(0, 8) }) }}
          </NuxtLink>
        </div>
      </template>
    </UiResponsiveDataView>

    <!-- Pagination -->
    <div v-if="!isLoading && totalPages > 1" class="flex items-center justify-between pt-2">
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="min-h-[36px] px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ t('facturacion.audit.previous') }}
      </button>
      <span class="text-sm text-text-secondary tabular-nums">
        {{ t('facturacion.audit.pageOf', { page: currentPage, total: totalPages }) }}
      </span>
      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="min-h-[36px] px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ t('facturacion.audit.next') }}
      </button>
    </div>
  </div>
</template>
