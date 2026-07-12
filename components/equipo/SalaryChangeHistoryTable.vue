<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { ref, onMounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
const { formatDate, formatDateTime } = useFormatters()

const props = defineProps<{
  paymentId: string
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const history = ref<any[]>([])
const expandedRows = ref<string[]>([])

const fetchHistory = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch(`/api/salaries/payments/${props.paymentId}/history`)
    history.value = response || []
  } catch (err: any) {
    console.error('Error fetching history:', err)
    error.value = err.data?.detail || t('equipo.salarios.historyLoadError')
  } finally {
    loading.value = false
  }
}

const toggleExpand = (id: string) => {
  const index = expandedRows.value.indexOf(id)
  if (index > -1) {
    expandedRows.value.splice(index, 1)
  } else {
    expandedRows.value.push(id)
  }
}

onMounted(() => {
  fetchHistory()
})

// Helper functions
function getChangeTypeText(changeType: string): string {
  const types: Record<string, string> = {
    'field_update': t('equipo.salarios.changeTypes.fieldUpdate'),
    'created': t('equipo.salarios.changeTypes.created'),
    'deleted': t('equipo.salarios.changeTypes.deleted'),
    'status_change': t('equipo.salarios.changeTypes.statusChange'),
    'attachment_added': t('equipo.salarios.changeTypes.attachmentAdded'),
    'attachment_removed': t('equipo.salarios.changeTypes.attachmentRemoved')
  }
  return types[changeType] || changeType
}

function getChangeTypeBadgeClass(changeType: string): string {
  const classes: Record<string, string> = {
    'field_update': 'bg-yellow-100 text-yellow-800',
    'created': 'bg-green-100 text-green-800',
    'deleted': 'bg-red-100 text-red-800',
    'status_change': 'bg-blue-100 text-blue-800',
    'attachment_added': 'bg-blue-100 text-blue-800',
    'attachment_removed': 'bg-red-100 text-red-800'
  }
  return classes[changeType] || 'bg-gray-100 text-gray-800'
}

function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    'payment_amount': t('equipo.salarios.changeFields.paymentAmount'),
    'payment_date': t('equipo.salarios.changeFields.paymentDate'),
    'payment_method': t('equipo.salarios.changeFields.paymentMethod'),
    'payment_reference': t('equipo.salarios.changeFields.paymentReference'),
    'notes': t('equipo.salarios.changeFields.notes'),
    'status': t('equipo.salarios.changeFields.status')
  }
  return fieldNames[field] || field
}

function formatFieldValue(field: string, value: any): string {
  if (!value) return '-'

  // Parse JSON string if needed
  let parsedValue = value
  if (typeof value === 'string') {
    try {
      parsedValue = JSON.parse(value)
    } catch {
      parsedValue = value
    }
  }

  if (field === 'payment_amount') {
    const amount = typeof parsedValue === 'object' ? parsedValue.payment_amount : parsedValue
    if (!amount || isNaN(Number(amount))) return '-'
    return new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(Number(amount))
  }

  if (field === 'payment_date') {
    const dateStr = typeof parsedValue === 'object' ? parsedValue[field] : parsedValue
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return formatDate(dateStr)
  }

  if (field === 'status') {
    const status = typeof parsedValue === 'object' ? parsedValue.status : parsedValue
    const statuses: Record<string, string> = {
      'pending': t('equipo.salarios.pending'),
      'paid': t('equipo.salarios.paid'),
      'cancelled': t('equipo.salarios.canceled')
    }
    return statuses[status] || status || '-'
  }

  if (typeof parsedValue === 'object' && parsedValue !== null) {
    return JSON.stringify(parsedValue)
  }

  return String(parsedValue)
}


</script>

<template>
  <div class="bg-surface border-2 border-border rounded-lg p-4 md:p-6">
    <h3 class="text-lg font-bold text-text-primary mb-4">{{ t('equipo.salarios.historyTitle') }}</h3>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <CommonsTheCustomLoader size="medium" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-sm text-red-500">{{ error }}</p>
      <button @click="fetchHistory" class="mt-4 text-sm text-primary hover:underline">
        {{ t('equipo.salarios.retry') }}
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="history.length === 0" class="text-center py-8">
      <p class="text-sm text-text-secondary">{{ t('equipo.salarios.noHistory') }}</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.salarios.historyDate') }}</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.salarios.historyType') }}</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.salarios.historyField') }}</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.salarios.historyBefore') }}</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.salarios.historyAfter') }}</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.salarios.historyUser') }}</th>
            <th class="text-center py-3 px-4 text-sm font-medium text-text-secondary">{{ t('equipo.salarios.historyDetails') }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(entry, index) in history" :key="entry.id">
            <!-- Main Row -->
            <tr
              class="border-b border-border hover:bg-background transition-colors cursor-pointer"
              @click="toggleExpand(entry.id)"
            >
              <td class="py-3 px-4 text-sm text-text-secondary">
                {{ formatDate(entry.changedAt) }}
              </td>
              <td class="py-3 px-4 text-sm">
                <span
                  class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="getChangeTypeBadgeClass(entry.changeType)"
                >
                  {{ getChangeTypeText(entry.changeType) }}
                </span>
              </td>
              <td class="py-3 px-4 text-sm text-text-primary">
                {{ entry.fieldChanged ? getFieldDisplayName(entry.fieldChanged) : '-' }}
              </td>
              <td class="py-3 px-4 text-sm text-red-600">
                {{ entry.oldValue ? formatFieldValue(entry.fieldChanged, entry.oldValue) : '-' }}
              </td>
              <td class="py-3 px-4 text-sm text-green-600">
                {{ entry.newValue ? formatFieldValue(entry.fieldChanged, entry.newValue) : '-' }}
              </td>
              <td class="py-3 px-4 text-sm text-text-secondary">
                {{ entry.changedByName || entry.changedByEmail || '-' }}
              </td>
              <td class="py-3 px-4 text-center">
                <button class="text-text-secondary hover:text-primary transition-colors">
                  <svg
                    class="w-5 h-5 transition-transform"
                    :class="{ 'rotate-180': expandedRows.includes(entry.id) }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </td>
            </tr>

            <!-- Expanded Row -->
            <tr v-if="expandedRows.includes(entry.id)" class="bg-surface-secondary/50 border-b border-border">
              <td colspan="7" class="py-4 px-6">
                <div class="space-y-3">
                  <!-- Full Timestamp -->
                  <div class="flex items-center gap-2 text-sm">
                    <span class="font-medium text-text-secondary">Fecha completa:</span>
                    <span class="text-text-primary">{{ formatDateTime(entry.changedAt) }}</span>
                  </div>

                  <!-- Notes -->
                  <div v-if="entry.notes" class="flex items-start gap-2 text-sm">
                    <span class="font-medium text-text-secondary">Notas:</span>
                    <span class="text-text-primary">{{ entry.notes }}</span>
                  </div>

                  <!-- Snapshot -->
                  <div v-if="entry.paymentSnapshot" class="text-sm">
                    <span class="font-medium text-text-secondary block mb-2">Snapshot completo:</span>
                    <pre class="bg-background border border-border rounded-lg p-3 text-xs text-text-secondary overflow-x-auto">{{ JSON.stringify(entry.paymentSnapshot, null, 2) }}</pre>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
