<template>
  <div class="page-layout">

    <!-- Year selector -->
    <div class="flex items-center gap-3 mb-4">
      <button
        @click="prevYear"
        class="h-10 w-10 flex items-center justify-center rounded-lg border-2 border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
        :aria-label="t('finanzas.cierreContable.prevYear')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span class="text-lg font-bold text-text-primary min-w-[4ch] text-center">{{ selectedYear }}</span>
      <button
        @click="nextYear"
        :disabled="selectedYear >= currentYear"
        class="h-10 w-10 flex items-center justify-center rounded-lg border-2 border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :aria-label="t('finanzas.cierreContable.nextYear')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Months table -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="columns"
        :data="months"
        :empty-message="t('finanzas.cierreContable.empty')"
      >
        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border"
            :class="[
              index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30',
              item.isFuture ? 'opacity-50' : ''
            ]"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text-primary">{{ item.name }} {{ selectedYear }}</span>
              <p v-if="item.closedAt" class="text-xs text-text-secondary mt-0.5">
                {{ t('finanzas.cierreContable.closedOn', { date: formatDate(item.closedAt) }) }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <UiStatusBadge
                :value="periodStatusLabel(item)"
                format="text"
                :variant="item.status === 'closed' ? 'destructive' : 'success'"
                size="sm"
              />
              <button
                v-if="!item.isFuture && item.status === 'open'"
                @click="onOpenCloseClick(item)"
                class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors"
                :title="t('finanzas.cierreContable.closePeriod')"
                :aria-label="t('finanzas.cierreContable.closePeriod')"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-name="{ row }">
          <span class="text-sm font-semibold text-text-primary">{{ row.name }}</span>
        </template>

        <template #cell-status="{ row }">
          <UiStatusBadge
            :value="periodStatusLabel(row)"
            format="text"
            :variant="row.status === 'closed' ? 'destructive' : (row.isFuture ? 'secondary' : 'success')"
            size="sm"
          />
        </template>

        <template #cell-closedAt="{ row }">
          <span class="text-xs text-text-secondary">
            {{ row.closedAt ? formatDate(row.closedAt) : '—' }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center">
            <button
              v-if="!row.isFuture && row.status === 'open'"
              @click="onOpenCloseClick(row)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors"
              :title="t('finanzas.cierreContable.closePeriod')"
              :aria-label="t('finanzas.cierreContable.closePeriod')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
            <span v-else-if="row.status === 'closed'" class="text-xs text-text-secondary">{{ t('finanzas.cierreContable.locked') }}</span>
          </div>
        </template>
      </UiResponsiveDataView>

    <!-- Confirmation modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50" @click="closeModal" />
        <div class="relative bg-surface rounded-xl shadow-xl w-full max-w-sm p-6">
          <div class="text-center">
            <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-1">{{ t('finanzas.cierreContable.closePeriodTitle') }}</h3>
            <p class="text-sm text-text-secondary mb-4">
              {{ t('finanzas.cierreContable.closeConfirm', { period: `${selectedMonth?.name ?? ''} ${selectedYear}`.trim() }) }}
            </p>
            <textarea
              v-model="notes"
              :placeholder="t('finanzas.cierreContable.notesPlaceholder')"
              rows="2"
              class="w-full mb-4 px-3 py-2 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div class="flex gap-3">
              <button
                @click="closeModal"
                :disabled="closing"
                class="flex-1 min-h-[44px] px-4 py-2 border-2 border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                {{ t('finanzas.common.cancel') }}
              </button>
              <button
                @click="onConfirmCloseClick"
                :disabled="closing"
                class="flex-1 min-h-[44px] px-4 py-2 bg-destructive text-white rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {{ closing ? t('finanzas.cierreContable.closing') : t('finanzas.cierreContable.closePeriod') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <UiConfirmActionModal
      v-model="quotaLimitModalOpen"
      :title="t('billing.upgrade.quotaBlocked')"
      :message="quotaLimitModalMessage"
      :confirm-label="t('nav.miPlan')"
      :cancel-label="t('billing.close')"
      @confirm="goToBillingFromQuotaLimitModal"
      @cancel="closeQuotaLimitModal"
    />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, watch } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { useOperationalQuotaGate } from '~/composables/useOperationalQuotaGate'
import { useQuotaExceeded } from '~/composables/useQuotaExceeded'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: () => t('finanzas.head.cierre') })

const {
  quotaLimitModalOpen,
  quotaLimitModalMessage,
  closeQuotaLimitModal,
  goToBillingFromQuotaLimitModal,
  handleCreateClick,
} = useOperationalQuotaGate('accounting_period_closes_per_period')
const { handleQuotaError, getQuotaMessage } = useQuotaExceeded()

const { formatDateTime } = useFormatters()
const { todayISO } = useTenantTimezone()
const { fetchPeriodStatus, closePeriod } = useClosedPeriods()

const monthNames = computed(() => Array.from({ length: 12 }, (_, index) => t(`finanzas.cierreContable.months.${index + 1}`)))

const tenantToday = computed(() => todayISO())
const currentYear = computed(() => Number(tenantToday.value.slice(0, 4)))
const currentMonth = computed(() => Number(tenantToday.value.slice(5, 7)))

const selectedYear = ref(currentYear.value)
const prevYear = () => { selectedYear.value-- }
const nextYear = () => { if (selectedYear.value < currentYear.value) selectedYear.value++ }

const columns = computed(() => [
  { key: 'name',     title: t('finanzas.cierreContable.month'),            sortable: false },
  { key: 'status',   title: t('finanzas.cierreContable.status'),         sortable: false },
  { key: 'closedAt', title: t('finanzas.cierreContable.closeDate'), sortable: false },
  { key: 'actions',  title: '',               sortable: false },
])

// Per-month status cache: key = 'YYYY-M'
const statusCache = ref<Record<string, { status: string; closedAt?: string }>>({})

const loadYear = async (year: number) => {
  const promises = Array.from({ length: 12 }, (_, i) => i + 1).map(async (m) => {
    const key = `${year}-${m}`
    if (statusCache.value[key]) return
    try {
      const data: any = await $fetch(`/api/finanzas/periodos/${year}/${m}/status`)
      statusCache.value[key] = {
        status: data?.data?.status ?? 'open',
        closedAt: data?.data?.closedAt ?? undefined,
      }
    } catch {
      statusCache.value[key] = { status: 'open' }
    }
  })
  await Promise.all(promises)
}

watch(selectedYear, (y) => loadYear(y), { immediate: true })

const months = computed(() =>
  monthNames.value.map((name, i) => {
    const m = i + 1
    const key = `${selectedYear.value}-${m}`
    const cached = statusCache.value[key]
    const isFuture = selectedYear.value === currentYear.value && m > currentMonth.value
    return {
      number: m,
      name,
      status: cached?.status ?? 'open',
      closedAt: cached?.closedAt,
      isFuture,
    }
  })
)

const formatDate = (iso: string) => iso ? formatDateTime(iso) : '—'

const periodStatusLabel = (item: { status: string; isFuture?: boolean }) => {
  if (item.status === 'closed') return t('finanzas.cierreContable.closed')
  if (item.isFuture) return t('finanzas.cierreContable.future')
  return t('finanzas.cierreContable.open')
}

// Modal
const showModal = ref(false)
const selectedMonth = ref<{ number: number; name: string } | null>(null)
const notes = ref('')
const closing = ref(false)

const openModal = (m: { number: number; name: string }) => {
  selectedMonth.value = m
  notes.value = ''
  showModal.value = true
}

const onOpenCloseClick = (m: { number: number; name: string }) => {
  void handleCreateClick(() => { openModal(m) })
}

const closeModal = () => {
  if (closing.value) return
  showModal.value = false
  selectedMonth.value = null
}

const handleClose = async () => {
  if (!selectedMonth.value) return
  closing.value = true
  try {
    await closePeriod(selectedYear.value, selectedMonth.value.number, notes.value || undefined)
    const key = `${selectedYear.value}-${selectedMonth.value.number}`
    statusCache.value[key] = { status: 'closed', closedAt: new Date().toISOString() }
    showModal.value = false
    selectedMonth.value = null
  } catch (err: any) {
    if (handleQuotaError(err, { resource: 'accounting_period_closes_per_period', showInline: false })) {
      quotaLimitModalMessage.value = getQuotaMessage(err, 'accounting_period_closes_per_period')
      quotaLimitModalOpen.value = true
      return
    }
    alert(err?.data?.detail ?? err?.data?.message ?? t('finanzas.cierreContable.closeError'))
  } finally {
    closing.value = false
  }
}

const onConfirmCloseClick = () => {
  void handleCreateClick(() => { void handleClose() })
}
</script>
