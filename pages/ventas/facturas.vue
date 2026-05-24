<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Facturas Electrónicas' })

const { currentTenant } = useTenantReactive()
const router = useRouter()
const { formatDate } = useFormatters()
const cache = useQueryCache()

const statusFilter = ref<string | null>(null)
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

const PAGE_SIZE = 50
const currentPage = ref(1)

const hasActiveFilters = computed(
  () => !!statusFilter.value || !!dateRangeDates.value,
)

const clearFilters = () => {
  statusFilter.value = null
  clearDateRange()
  currentPage.value = 1
}

// Reset page on filter change
watch([statusFilter, dateRangeDates], () => { currentPage.value = 1 })

// Query
const { data: invoicesData, status: queryStatus, asyncStatus, refetch } = useQuery({
  key: () => ['invoices', currentTenant.value?.id, {
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
    status: statusFilter.value,
    date_from: dateRange.value.from,
    date_to: dateRange.value.to,
  }],
  query: async () => {
    const params: Record<string, any> = {
      limit: PAGE_SIZE,
      offset: (currentPage.value - 1) * PAGE_SIZE,
    }
    if (statusFilter.value) params.status = statusFilter.value
    if (dateRange.value.from) params.date_from = dateRange.value.from
    if (dateRange.value.to) params.date_to = dateRange.value.to
    return await $fetch<any>('/api/documents', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const invoices = computed(() => invoicesData.value?.items ?? [])
const invoicesTotal = computed(() => invoicesData.value?.total ?? 0)
const totalPages = computed(() => Math.ceil(invoicesTotal.value / PAGE_SIZE) || 1)
const isLoading = computed(() => queryStatus.value === 'pending' && !invoicesData.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && invoicesData.value != null)

const { registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) currentPage.value = page
}

// Table columns
const columns = computed<Column[]>(() => [
  { key: 'invoice_number', title: 'Nº Factura', sortable: false },
  { key: 'order_id', title: 'Orden', sortable: false },
  { key: 'created_at', title: 'Fecha', sortable: false },
  { key: 'status', title: 'Estado', sortable: false },
  { key: 'cufe', title: 'CUFE', sortable: false },
  { key: 'actions', title: '', sortable: false, width: '100px' },
])

// Actions
const downloadingPdf = ref<string | null>(null)
const retryingId = ref<string | null>(null)

const openPdf = async (invoiceId: string) => {
  downloadingPdf.value = invoiceId
  try {
    const result = await $fetch<any>(`/api/documents/${invoiceId}/pdf`)
    if (result.pdf_url) window.open(result.pdf_url, '_blank')
  } catch {
    // silent
  } finally {
    downloadingPdf.value = null
  }
}

const retryInvoice = async (orderId: string) => {
  retryingId.value = orderId
  try {
    await $fetch(`/api/orders/${orderId}/invoice`, { method: 'POST' })
    cache.invalidateQueries({ key: ['invoices'] })
  } catch {
    // silent
  } finally {
    retryingId.value = null
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
</script>

<template>
  <div class="space-y-4">
    <UiAdvancedFiltersBar
      v-model:date-range="dateRangeDates"
      :search-fields="[]"
      :show-search="false"
      :preset-dates="presetDates"
      :format-date-range="formatDateRange"
      :show-clear="hasActiveFilters"
      @clear="clearFilters"
    >
      <template #additional-filters>
        <select
          v-model="statusFilter"
          :class="filterSelectClass"
          aria-label="Filtrar por estado"
          @change="currentPage = 1"
        >
          <option :value="null">Estado</option>
          <option value="accepted">Aceptada</option>
          <option value="pending">Pendiente</option>
          <option value="rejected">Rechazada</option>
        </select>
      </template>
      <template #trailing>
        <span class="text-sm text-text-secondary whitespace-nowrap">
          {{ invoicesTotal }} {{ invoicesTotal === 1 ? 'factura' : 'facturas' }}
        </span>
      </template>
    </UiAdvancedFiltersBar>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <CommonsTheCustomLoader size="medium" />
    </div>

    <!-- Empty state -->
    <div v-else-if="invoices.length === 0" class="text-center py-16 space-y-3">
      <svg class="w-12 h-12 mx-auto text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
      <p class="text-text-secondary">No hay facturas electrónicas</p>
      <p class="text-sm text-text-tertiary">Las facturas aparecerán aquí cuando se emitan desde el POS o el detalle de venta</p>
    </div>

    <!-- Table -->
    <UiResponsiveDataView
      v-else
      :columns="columns"
      :data="invoices"
      row-key="id"
      @row-click="(row: any) => router.push(`/ventas/${row.order_id}`)"
      class="cursor-pointer"
    >
      <!-- Invoice number -->
      <template #cell-invoice_number="{ value, row }">
        <span class="font-bold text-text-primary">{{ row.prefix }}-{{ value }}</span>
      </template>

      <!-- Order link -->
      <template #cell-order_id="{ value }">
        <span class="text-sm text-text-secondary font-mono">{{ value?.substring(0, 8) }}...</span>
      </template>

      <!-- Date -->
      <template #cell-created_at="{ value }">
        <span class="text-sm text-text-secondary">{{ value ? formatDate(value) : '—' }}</span>
      </template>

      <!-- Status badge -->
      <template #cell-status="{ value }">
        <span
          class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
          :class="{
            'bg-green-100 text-green-700': value === 'accepted',
            'bg-amber-100 text-amber-700': value === 'pending',
            'bg-red-100 text-red-700': value === 'rejected',
          }"
        >
          <svg v-if="value === 'accepted'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5" /></svg>
          <svg v-else-if="value === 'pending'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          {{ value === 'accepted' ? 'Aceptada' : value === 'pending' ? 'Pendiente' : 'Rechazada' }}
        </span>
      </template>

      <!-- CUFE truncated -->
      <template #cell-cufe="{ value }">
        <span v-if="value" class="text-xs text-text-tertiary font-mono">{{ value.substring(0, 20) }}...</span>
        <span v-else class="text-xs text-text-tertiary">—</span>
      </template>

      <!-- Actions -->
      <template #cell-actions="{ row }">
        <div class="flex items-center gap-1">
          <!-- PDF download -->
          <button
            v-if="row.status === 'accepted'"
            @click.stop="openPdf(row.id)"
            :disabled="downloadingPdf === row.id"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors disabled:opacity-50"
            aria-label="Descargar PDF"
          >
            <svg v-if="downloadingPdf === row.id" class="w-4 h-4 animate-spin text-primary" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <svg v-else class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          </button>

          <!-- Retry for rejected -->
          <button
            v-if="row.status === 'rejected'"
            @click.stop="retryInvoice(row.order_id)"
            :disabled="retryingId === row.order_id"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors disabled:opacity-50"
            aria-label="Reintentar emisión"
          >
            <svg v-if="retryingId === row.order_id" class="w-4 h-4 animate-spin text-amber-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <svg v-else class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          </button>
        </div>
      </template>

      <!-- Mobile card -->
      <template #mobile-card="{ row }">
        <div
          class="bg-surface border border-border rounded-xl p-4 space-y-2"
          @click="router.push(`/ventas/${row.order_id}`)"
        >
          <div class="flex items-center justify-between">
            <span class="font-bold text-text-primary">{{ row.prefix }}-{{ row.invoice_number }}</span>
            <span
              class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
              :class="{
                'bg-green-100 text-green-700': row.status === 'accepted',
                'bg-amber-100 text-amber-700': row.status === 'pending',
                'bg-red-100 text-red-700': row.status === 'rejected',
              }"
            >
              {{ row.status === 'accepted' ? 'Aceptada' : row.status === 'pending' ? 'Pendiente' : 'Rechazada' }}
            </span>
          </div>
          <div class="text-sm text-text-secondary">{{ row.created_at ? formatDate(row.created_at) : '—' }}</div>
          <div v-if="row.cufe" class="text-xs text-text-tertiary font-mono truncate">{{ row.cufe }}</div>
          <div class="flex items-center gap-2 pt-1">
            <button
              v-if="row.status === 'accepted'"
              @click.stop="openPdf(row.id)"
              class="min-h-[44px] px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              PDF
            </button>
            <button
              v-if="row.status === 'rejected'"
              @click.stop="retryInvoice(row.order_id)"
              class="min-h-[44px] px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        </div>
      </template>
    </UiResponsiveDataView>

    <!-- Pagination -->
    <div v-if="invoices.length > 0" class="flex items-center justify-between py-2">
      <span class="text-sm text-text-secondary">
        {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, invoicesTotal) }} de {{ invoicesTotal }}
      </span>
      <div class="flex items-center gap-1">
        <button
          :disabled="currentPage <= 1"
          @click="goToPage(1)"
          class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Primera página"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
        <button
          :disabled="currentPage <= 1"
          @click="goToPage(currentPage - 1)"
          class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
        <button
          :disabled="currentPage >= totalPages"
          @click="goToPage(currentPage + 1)"
          class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button
          :disabled="currentPage >= totalPages"
          @click="goToPage(totalPages)"
          class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Última página"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>
