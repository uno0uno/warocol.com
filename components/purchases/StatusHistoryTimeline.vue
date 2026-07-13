<template>
  <div class="bg-surface border-2 border-border rounded-lg p-6">
    <h3 class="text-lg font-semibold text-text-primary mb-6 flex items-center space-x-2">
      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ t('abastecimiento.compraDirectaDetalle.history') }}</span>
    </h3>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <CommonsTheCustomLoader size="medium" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-sm text-red-500">{{ error }}</p>
      <button @click="fetchHistory" class="mt-4 text-sm text-primary hover:underline">
        {{ t('abastecimiento.compraDirectaDetalle.retry') }}
      </button>
    </div>

    <!-- Timeline -->
    <div v-else-if="history.length > 0" class="space-y-6">
      <div
        v-for="(entry, index) in history"
        :key="entry.id"
        class="relative"
      >
        <!-- Timeline line -->
        <div
          v-if="index !== history.length - 1"
          class="absolute start-[19px] top-10 bottom-0 w-0.5 bg-border"
        ></div>

        <!-- Timeline entry -->
        <div class="flex space-x-4">
          <!-- Icon -->
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 z-10"
            :class="index === 0 ? getStatusIconClasses(entry.to_status, entry) : 'bg-gray-500/10 border-gray-500 text-gray-500'"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="getStatusIcon(entry.to_status, entry)"
              />
            </svg>
          </div>

          <!-- Content -->
          <div class="flex-1 pb-8">
            <div
              class="bg-background border border-border rounded-lg p-4 transition-colors"
              :class="props.baseTransitionUrl ? 'cursor-pointer hover:bg-surface-secondary/50' : ''"
              @click="navigateToTransitionDetail(entry)"
            >
              <!-- Status and Date -->
              <div class="mb-2">
                <h4 class="font-semibold text-text-primary">
                  {{ getEntryTitle(entry) }}
                </h4>
                <p v-if="entry.from_status && entry.metadata?.action !== 'items_edited'" class="text-xs text-text-secondary">
                  {{ t('abastecimiento.compraDirectaDetalle.fromStatus', { status: getStatusText(entry.from_status) }) }}
                </p>
              </div>

              <!-- Timestamp -->
              <p class="text-sm text-text-secondary mb-3">
                <svg class="w-4 h-4 inline me-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatDateTime(entry.changed_at) }}
              </p>

              <!-- Items Edited - Special display for edit audit trail -->
              <div v-if="entry.metadata?.action === 'items_edited'" class="space-y-3">
                <!-- Added Items -->
                <div v-if="entry.metadata.changes_summary?.added?.length" class="space-y-1">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span class="text-sm font-medium text-green-600">{{ t('abastecimiento.compraDirectaDetalle.added') }}</span>
                  </div>
                  <ul class="ms-6 text-sm text-text-secondary space-y-0.5">
                    <li v-for="item in entry.metadata.changes_summary.added" :key="item" class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      {{ item }}
                    </li>
                  </ul>
                </div>

                <!-- Removed Items -->
                <div v-if="entry.metadata.changes_summary?.removed?.length" class="space-y-1">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                    <span class="text-sm font-medium text-red-600">{{ t('abastecimiento.compraDirectaDetalle.removed') }}</span>
                  </div>
                  <ul class="ms-6 text-sm text-text-secondary space-y-0.5">
                    <li v-for="item in entry.metadata.changes_summary.removed" :key="item" class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      {{ item }}
                    </li>
                  </ul>
                </div>

                <!-- Modified Items -->
                <div v-if="entry.metadata.changes_summary?.modified?.length" class="space-y-1">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span class="text-sm font-medium text-yellow-600">{{ t('abastecimiento.compraDirectaDetalle.modified') }}</span>
                  </div>
                  <ul class="ms-6 text-sm text-text-secondary space-y-0.5">
                    <li v-for="item in entry.metadata.changes_summary.modified" :key="item" class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                      {{ item }}
                    </li>
                  </ul>
                </div>

                <!-- Totals Difference -->
                <div v-if="entry.metadata.totals" class="pt-2 border-t border-border">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-text-secondary">
                      {{ t('abastecimiento.compraDirectaDetalle.total') }}: ${{ formatNumber(entry.metadata.totals.before) }} → ${{ formatNumber(entry.metadata.totals.after) }}
                    </span>
                    <span
                      class="font-medium"
                      :class="entry.metadata.totals.difference >= 0 ? 'text-green-600' : 'text-red-600'"
                    >
                      {{ entry.metadata.totals.difference >= 0 ? '+' : '' }}${{ formatNumber(entry.metadata.totals.difference) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Regular Metadata (for non-edit entries) -->
              <div v-else-if="entry.metadata && Object.keys(entry.metadata).length > 0 && !isInternalMetadata(entry.metadata)" class="space-y-2">
                <div
                  v-for="(value, key) in getDisplayableMetadata(entry.metadata)"
                  :key="key"
                  class="text-sm"
                >
                  <span class="font-medium text-text-primary">{{ formatMetadataKey(key) }}:</span>
                  <span class="text-text-secondary ms-2">{{ formatMetadataValue(key, value) }}</span>
                </div>
              </div>

              <!-- Notes -->
              <div v-if="entry.notes" class="mt-3 pt-3 border-t border-border">
                <p class="text-sm text-text-secondary">
                  <svg class="w-4 h-4 inline me-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  {{ entry.notes }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <svg class="w-12 h-12 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm text-text-secondary">{{ t('abastecimiento.compraDirectaDetalle.noHistory') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useFormatters } from '~/composables/useFormatters'

const props = defineProps<{
  purchaseId: string
  currentStatus?: string
  baseTransitionUrl?: string // Optional base URL for transition detail navigation
}>()
const { t, locale } = useI18n({ useScope: 'global' })

const loading = ref(false)
const error = ref<string | null>(null)
const history = ref<any[]>([])

const fetchHistory = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch(`/api/suppliers/purchases/${props.purchaseId}/history`)
    if (response.success && response.data) {
      history.value = response.data
    }
  } catch (err: any) {
    console.error('Error fetching history:', err)
    error.value = err.data?.detail || t('common.error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchHistory()
})

// Watch for status changes to refresh history
watch(() => props.currentStatus, (newStatus, oldStatus) => {
  if (newStatus && newStatus !== oldStatus) {
    fetchHistory()
  }
})

// Helper functions
function getEntryTitle(entry: any): string {
  if (entry.metadata?.action === 'items_edited') {
    return t('abastecimiento.compraDirectaDetalle.itemsEdited')
  }
  return getStatusText(entry.to_status)
}

function formatNumber(value: number): string {
  if (value === null || value === undefined) return '0'
  return Math.abs(value).toLocaleString(toNumberLocaleTag(locale.value), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

function isInternalMetadata(metadata: any): boolean {
  if (!metadata) return true
  // Check if metadata only contains internal fields
  const internalKeys = ['action', 'items_before', 'items_after', 'changes_summary', 'totals', 'direct_entry', 'updated_via']
  const keys = Object.keys(metadata)
  return keys.every(k => internalKeys.includes(k))
}

function getDisplayableMetadata(metadata: any): Record<string, any> {
  if (!metadata) return {}
  const internalKeys = ['action', 'items_before', 'items_after', 'changes_summary', 'totals', 'direct_entry', 'updated_via']
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!internalKeys.includes(key)) {
      result[key] = value
    }
  }
  return result
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: t('abastecimiento.common.pendiente'),
    confirmed: t('abastecimiento.common.confirmado'),
    preparing: t('abastecimiento.common.preparando'),
    shipped: t('abastecimiento.common.enviado'),
    partially_received: t('abastecimiento.common.recibidoParcial'),
    received: t('abastecimiento.common.recibida'),
    verified: t('abastecimiento.common.verificado'),
    invoiced: t('abastecimiento.common.facturada'),
    paid: t('abastecimiento.common.pagada'),
    cancelled: t('abastecimiento.common.cancelado'),
    overdue: t('abastecimiento.common.vencido')
  }
  return texts[status] || status
}

function getStatusVariant(status: string): string {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'confirmed':
    case 'preparing':
    case 'shipped':
      return 'info'
    case 'partially_received':
      return 'warning'
    case 'received':
    case 'verified':
    case 'paid':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'cancelled':
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function getStatusIconClasses(status: string, entry?: any): string {
  // Special case for items_edited
  if (entry?.metadata?.action === 'items_edited') {
    return 'bg-yellow-500/10 border-yellow-500 text-yellow-500'
  }

  const variant = getStatusVariant(status)
  const colorMap: Record<string, string> = {
    success: 'bg-green-500/10 border-green-500 text-green-500',
    info: 'bg-blue-500/10 border-blue-500 text-blue-500',
    warning: 'bg-yellow-500/10 border-yellow-500 text-yellow-500',
    destructive: 'bg-red-500/10 border-red-500 text-red-500',
    secondary: 'bg-gray-500/10 border-gray-500 text-gray-500'
  }
  return colorMap[variant] || colorMap.secondary
}

function getStatusIcon(status: string, entry?: any): string {
  // Special case for items_edited
  if (entry?.metadata?.action === 'items_edited') {
    return 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
  }

  const icons: Record<string, string> = {
    pending: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    confirmed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    preparing: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    shipped: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
    partially_received: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    received: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    verified: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    invoiced: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    paid: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    cancelled: 'M6 18L18 6M6 6l12 12',
    overdue: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  }
  return icons[status] || icons.pending
}

const { formatDateTime } = useFormatters()

function formatMetadataKey(key: string): string {
  const keyMap: Record<string, string> = {
    confirmation_number: t('abastecimiento.compraDirectaDetalle.metadata.confirmation_number'),
    estimated_delivery_date: t('abastecimiento.compraDirectaDetalle.metadata.estimated_delivery_date'),
    tracking_number: t('abastecimiento.compraDirectaDetalle.metadata.tracking_number'),
    carrier: t('abastecimiento.compraDirectaDetalle.metadata.carrier'),
    package_count: t('abastecimiento.compraDirectaDetalle.metadata.package_count'),
    items_count: t('abastecimiento.compraDirectaDetalle.metadata.items_count'),
    received_items: t('abastecimiento.compraDirectaDetalle.metadata.received_items'),
    discrepancies: t('abastecimiento.compraDirectaDetalle.metadata.discrepancies'),
    quality_status: t('abastecimiento.compraDirectaDetalle.metadata.quality_status'),
    defects_found: t('abastecimiento.compraDirectaDetalle.metadata.defects_found'),
    invoice_number: t('abastecimiento.compraDirectaDetalle.metadata.invoice_number'),
    invoice_date: t('abastecimiento.compraDirectaDetalle.metadata.invoice_date'),
    invoice_amount: t('abastecimiento.compraDirectaDetalle.metadata.invoice_amount'),
    payment_method: t('abastecimiento.compraDirectaDetalle.metadata.payment_method'),
    payment_reference: t('abastecimiento.compraDirectaDetalle.metadata.payment_reference'),
    payment_amount: t('abastecimiento.compraDirectaDetalle.metadata.payment_amount'),
    payment_date: t('abastecimiento.compraDirectaDetalle.metadata.payment_date'),
    cancellation_reason: t('abastecimiento.compraDirectaDetalle.metadata.cancellation_reason')
  }
  return keyMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function formatMetadataValue(key: string, value: any): string {
  if (value === null || value === undefined) return t('abastecimiento.compraDirectaDetalle.notAvailable')

  // Date fields
  if (key.includes('date') || key.includes('_at')) {
    try { return formatDateTime(value) } catch { return value }
  }

  // Money fields
  if (key.includes('amount') || key.includes('price') || key.includes('cost')) {
    try {
      return parseFloat(value).toLocaleString(toNumberLocaleTag(locale.value), {
        style: 'currency',
        currency: 'COP'
      })
    } catch {
      return value
    }
  }

  // Array or object
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function navigateToTransitionDetail(entry: any) {
  // Only navigate if baseTransitionUrl is provided
  if (!props.baseTransitionUrl) {
    return
  }

  // Open transition detail in a new window/tab using Nuxt's navigateTo
  navigateTo(`${props.baseTransitionUrl}/${entry.id}`, { open: { target: '_blank' } })
}
</script>
