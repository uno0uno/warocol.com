<template>
  <div class="bg-surface border-2 border-border rounded-lg p-4 md:p-6">
    <h3 class="text-lg font-bold text-text-primary mb-4">Historial de Cambios</h3>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <CommonsTheCustomLoader size="medium" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-sm text-red-500">{{ error }}</p>
      <button @click="fetchHistory" class="mt-4 text-sm text-primary hover:underline">
        Reintentar
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="history.length === 0" class="text-center py-8">
      <p class="text-sm text-text-secondary">No hay cambios registrados</p>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Fecha</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Tipo</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Campo</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Antes</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Después</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Usuario</th>
            <th class="text-center py-3 px-4 text-sm font-medium text-text-secondary">Detalles</th>
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
                  <div v-if="entry.expenseSnapshot" class="text-sm">
                    <span class="font-medium text-text-secondary block mb-2">Snapshot completo:</span>
                    <pre class="bg-background border border-border rounded-lg p-3 text-xs text-text-secondary overflow-x-auto">{{ JSON.stringify(entry.expenseSnapshot, null, 2) }}</pre>
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

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
const { formatDate, formatDateTime } = useFormatters()

const props = defineProps<{
  expenseId: string
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const history = ref<any[]>([])
const expandedRows = ref<string[]>([])

const fetchHistory = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch(`/api/finance/expenses/${props.expenseId}/history`)
    history.value = response || []
  } catch (err: any) {
    console.error('Error fetching history:', err)
    error.value = err.data?.detail || 'Error al cargar el historial'
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
    'field_update': 'Actualización',
    'created': 'Creado',
    'deleted': 'Eliminado',
    'attachment_added': 'Archivo +',
    'attachment_removed': 'Archivo -'
  }
  return types[changeType] || changeType
}

function getChangeTypeBadgeClass(changeType: string): string {
  const classes: Record<string, string> = {
    'field_update': 'bg-yellow-100 text-yellow-800',
    'created': 'bg-green-100 text-green-800',
    'deleted': 'bg-red-100 text-red-800',
    'attachment_added': 'bg-blue-100 text-blue-800',
    'attachment_removed': 'bg-red-100 text-red-800'
  }
  return classes[changeType] || 'bg-gray-100 text-gray-800'
}

function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    'amount': 'Monto',
    'description': 'Descripción',
    'expense_category_id': 'Categoría',
    'transaction_date': 'Fecha',
    'is_recurring': 'Recurrencia',
    'frequency': 'Frecuencia',
    'recurring_end_date': 'Fecha Fin'
  }
  return fieldNames[field] || field
}

function formatFieldValue(field: string, value: any): string {
  if (!value) return '-'

  if (field === 'amount') {
    // Handle different value formats
    let amountValue: number
    if (typeof value === 'object' && value.amount !== undefined) {
      amountValue = Number(value.amount)
    } else {
      amountValue = Number(value)
    }

    // Check if we got a valid number
    if (isNaN(amountValue)) {
      console.error('Invalid amount value:', value)
      return '-'
    }

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amountValue)
  }

  if (field === 'transaction_date' || field === 'recurring_end_date') {
    const dateStr = value[field] || value
    return formatDate(dateStr)
  }

  if (field === 'is_recurring') {
    return value.is_recurring || value ? 'Sí' : 'No'
  }

  if (field === 'frequency') {
    const frequencies: Record<string, string> = {
      'weekly': 'Semanal',
      'biweekly': 'Quincenal',
      'monthly': 'Mensual',
      'quarterly': 'Trimestral',
      'yearly': 'Anual'
    }
    return frequencies[value.frequency || value] || value
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }

  return String(value)
}

</script>
