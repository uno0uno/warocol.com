<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center w-full min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center w-full min-h-[60vh]">
      <div class="max-w-md p-6 bg-surface border border-border rounded-lg text-center">
        <svg class="w-16 h-16 mx-auto text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="mt-4 text-xl font-bold text-text-primary">Error</h2>
        <p class="mt-2 text-text-secondary">{{ error }}</p>
      </div>
    </div>

    <!-- Invoices Content -->
    <div v-else class="flex flex-col gap-4">
      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm border border-titan-200 p-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Document Type Filter -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Tipo de Documento
            </label>
            <select v-model="filters.documentType" @change="applyFilters"
              class="w-full px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
              <option value="">Todos</option>
              <option value="factura">Factura</option>
              <option value="remision">Remisión</option>
            </select>
          </div>

          <!-- Supplier Filter (NEW) -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Proveedor
            </label>
            <select v-model="filters.supplierId" @change="applyFilters"
              class="w-full px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
              <option value="">Todos</option>
              <option v-for="sup in uniqueSuppliers" :key="sup.id" :value="sup.id">
                {{ sup.name }}
              </option>
            </select>
          </div>

          <!-- Start Date Filter -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Fecha Desde
            </label>
            <input v-model="filters.startDate" @change="applyFilters" type="date"
              class="w-full px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500" />
          </div>

          <!-- End Date Filter -->
          <div>
            <label class="block text-sm font-medium text-text-primary mb-2">
              Fecha Hasta
            </label>
            <input v-model="filters.endDate" @change="applyFilters" type="date"
              class="w-full px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500" />
          </div>
        </div>

        <!-- Clear Filters Button -->
        <div class="mt-4 flex justify-end">
          <button @click="clearFilters"
            class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-titan-300 rounded-lg hover:border-crocus-500 transition-all">
            Limpiar Filtros
          </button>
        </div>
      </div>

      <!-- Action Bar for Selected Items -->
      <div v-if="selectedInvoices.length > 0" class="bg-primary/10 border-2 border-primary rounded-lg p-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center space-x-4">
            <span class="text-sm font-semibold text-primary">
              {{ selectedInvoices.length }} remision(es) seleccionada(s)
            </span>
            <span v-if="!canAttachLegalInvoice" class="text-xs text-warning">
              Solo se pueden agrupar remisiones del mismo proveedor
            </span>
          </div>
          <div class="flex space-x-2">
            <button @click="clearSelection"
              class="px-4 py-2 text-sm border-2 border-border rounded-lg hover:border-destructive hover:text-destructive transition-all">
              Cancelar
            </button>
            <button @click="showLegalInvoiceModal = true" :disabled="!canAttachLegalInvoice"
              class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              Adjuntar Factura Legal
            </button>
          </div>
        </div>
      </div>

      <!-- Invoices Table/Cards -->
      <UiResponsiveDataView
        :columns="invoicesTableColumns"
        :data="filteredInvoices"
        title="Mis Facturas y Remisiones"
        empty-message="No tienes facturas o remisiones"
        empty-sub-message="Las facturas aparecerán aquí cuando sean creadas"
        variant="default"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <PurchasesInvoiceCard
            :invoice="item"
            :is-selected="isSelected(item.id)"
            @view="viewInvoice"
            @toggle-selection="toggleSelection"
          />
        </template>

        <!-- Custom slots for special columns -->
        <template #cell-select="{ row }">
          <input type="checkbox" :checked="isSelected(row.id)" @change="toggleSelection(row)"
            :disabled="row.tipo !== 'Remisión'"
            class="w-4 h-4 text-primary border-border rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed" />
        </template>

        <template #cell-numero="{ value, row }">
          <div>
            <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
            <div class="text-xs text-titan-600">OC: {{ row.purchaseNumber }}</div>
            <div v-if="row.legalInvoiceNumber" class="text-xs text-success mt-1">
              Factura Legal: {{ row.legalInvoiceNumber }}
            </div>
          </div>
        </template>

        <template #cell-proveedor="{ value }">
          <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
        </template>

        <template #cell-tipo="{ value }">
          <UiStatusBadge :value="value" format="text" variant="info" size="sm" />
        </template>

        <template #cell-fecha="{ value }">
          <span class="text-sm text-ebony-800">{{ formatDate(value) }}</span>
        </template>

        <template #cell-monto="{ value, row }">
          <div>
            <div class="text-sm font-medium text-ebony-800">{{ formatCurrency(value) }}</div>
            <div class="text-xs text-titan-600">+{{ formatCurrency(row.taxAmount) }} IVA</div>
          </div>
        </template>

        <template #cell-estado="{ value }">
          <UiStatusBadge :value="getStatusText(value)" format="text" :variant="getStatusVariant(value)" size="sm" />
        </template>

      </UiResponsiveDataView>
    </div>

    <!-- Legal Invoice Modal -->
    <div v-if="showLegalInvoiceModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="closeLegalInvoiceModal"></div>

      <div class="flex min-h-full items-center justify-center p-4">
        <div class="relative w-full max-w-2xl bg-surface rounded-xl shadow-2xl border-2 border-border">
          <!-- Header -->
          <div class="border-b-2 border-border p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="bg-primary/10 p-3 rounded-lg">
                  <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-text-primary">Adjuntar Factura Legal</h2>
                  <p class="text-sm text-text-secondary">
                    Adjuntando factura legal a {{ selectedInvoices.length }} remision(es)
                  </p>
                </div>
              </div>
              <button @click="closeLegalInvoiceModal" :disabled="isSubmitting" class="text-text-secondary hover:text-text-primary transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <form @submit.prevent="submitLegalInvoice" class="p-6 space-y-6">
            <!-- Legal Invoice Number -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Número de Factura Legal *
              </label>
              <input
                v-model="legalInvoiceForm.number"
                type="text"
                required
                class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary"
                placeholder="Ej: FAC-2025-001"
              />
            </div>

            <!-- Legal Invoice Date -->
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Fecha de Factura Legal *
              </label>
              <input
                v-model="legalInvoiceForm.date"
                type="datetime-local"
                required
                class="w-full px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary focus:border-primary"
              />
            </div>

            <!-- Attachments Section -->
            <PurchasesAttachmentUploader v-model="legalInvoiceForm.files" />

            <!-- Actions -->
            <div class="flex justify-end space-x-3 pt-4 border-t-2 border-border">
              <button
                type="button"
                @click="closeLegalInvoiceModal"
                :disabled="isSubmitting"
                class="px-6 py-2 border-2 border-border rounded-lg text-text-primary hover:bg-background transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <svg v-if="isSubmitting" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{{ isSubmitting ? 'Adjuntando...' : 'Adjuntar Factura' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'supplier-portal'
})

const route = useRoute()
const token = computed(() => route.params.token as string)

// Use global state for supplier (shared with layout)
const supplier = useState<any>('supplier-portal-supplier', () => null)

// Filters
const filters = ref({
  documentType: '',
  supplierId: '',
  startDate: '',
  endDate: ''
})

// Selection state
const selectedInvoices = ref<any[]>([])
const showLegalInvoiceModal = ref(false)
const isSubmitting = ref(false)

// Legal invoice form
const legalInvoiceForm = ref({
  number: '',
  date: '',
  files: [] as File[]
})

// Fetch invoices using useAsyncData WITHOUT await to show loading state
const { data: invoicesData, pending: loading, error: fetchError, refresh } = useAsyncData(
  () => `supplier-invoices-${token.value}`,
  async () => {
    const queryParams = new URLSearchParams()

    if (filters.value.documentType) {
      queryParams.append('document_type', filters.value.documentType)
    }
    if (filters.value.startDate) {
      queryParams.append('start_date', filters.value.startDate)
    }
    if (filters.value.endDate) {
      queryParams.append('end_date', filters.value.endDate)
    }

    const queryString = queryParams.toString()
    const url = `/api/supplier-portal/${token.value}/invoices${queryString ? `?${queryString}` : ''}`

    return await $fetch(url)
  },
  {
    server: false,
    watch: [token],
    default: () => ({ data: [], total: 0 })
  }
)

const invoices = computed(() => invoicesData.value?.data || [])
const error = computed(() => {
  if (!supplier.value) return 'No se pudo verificar el acceso'
  if (fetchError.value) return fetchError.value.data?.detail || 'Error al cargar las facturas'
  return null
})

// Get unique suppliers for filter
const uniqueSuppliers = computed(() => {
  const suppliers = new Map()
  invoices.value.forEach((inv: any) => {
    if (inv.supplier_id && inv.supplier_name) {
      suppliers.set(inv.supplier_id, { id: inv.supplier_id, name: inv.supplier_name })
    }
  })
  return Array.from(suppliers.values())
})

// Table columns configuration
const invoicesTableColumns = [
  {
    key: 'select',
    title: '',
    sortable: false,
    format: 'text',
    align: 'center',
    width: '50px'
  },
  {
    key: 'numero',
    title: 'Número',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'proveedor',
    title: 'Proveedor',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'tipo',
    title: 'Tipo',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'fecha',
    title: 'Fecha',
    sortable: true,
    format: 'date',
    align: 'center'
  },
  {
    key: 'monto',
    title: 'Monto Total',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'estado',
    title: 'Estado',
    sortable: true,
    format: 'text',
    align: 'center'
  }
]

// Transform invoices data for the table
const filteredInvoices = computed(() => {
  let filtered = invoices.value.map((invoice: any) => ({
    id: invoice.id,
    numero: invoice.invoice_number,
    purchaseNumber: invoice.purchase_number,
    proveedor: invoice.supplier_name,
    supplierId: invoice.supplier_id,
    tipo: getDocumentTypeText(invoice.document_type),
    documentType: invoice.document_type,
    fecha: invoice.invoice_date,
    monto: (invoice.invoice_amount || 0) + (invoice.tax_amount || 0),
    taxAmount: invoice.tax_amount || 0,
    estado: invoice.status,
    legalInvoiceNumber: invoice.legal_invoice_number,
    legalInvoiceDate: invoice.legal_invoice_date
  }))

  // Apply supplier filter
  if (filters.value.supplierId) {
    filtered = filtered.filter((inv: any) => inv.supplierId === filters.value.supplierId)
  }

  return filtered
})

// Check if legal invoice can be attached (all selected must be remisiones and same supplier)
const canAttachLegalInvoice = computed(() => {
  if (selectedInvoices.value.length === 0) return false

  // Check all are remisiones
  const allRemisiones = selectedInvoices.value.every(inv => inv.documentType === 'remision')
  if (!allRemisiones) return false

  // Check all same supplier
  const firstSupplier = selectedInvoices.value[0].supplierId
  const sameSupplier = selectedInvoices.value.every(inv => inv.supplierId === firstSupplier)

  return sameSupplier
})

function getDocumentTypeText(type: string): string {
  const types: Record<string, string> = {
    'factura': 'Factura',
    'remision': 'Remisión',
    'factura_contado': 'Factura Contado',
    'factura_credito': 'Factura Crédito'
  }
  return types[type] || type || 'N/A'
}

// Use composables for formatters and status
const { formatDate, formatCurrency } = useFormatters()
const { getStatusText, getStatusVariant } = usePurchaseStatus()

function isSelected(invoiceId: string): boolean {
  return selectedInvoices.value.some(inv => inv.id === invoiceId)
}

function toggleSelection(row: any) {
  const index = selectedInvoices.value.findIndex(inv => inv.id === row.id)
  if (index >= 0) {
    selectedInvoices.value.splice(index, 1)
  } else {
    selectedInvoices.value.push(row)
  }
}

function clearSelection() {
  selectedInvoices.value = []
}

function viewInvoice(invoice: any) {
  // Future: Navigate to invoice detail page
  // For now, just log the invoice

}

function closeLegalInvoiceModal() {
  showLegalInvoiceModal.value = false
  legalInvoiceForm.value = {
    number: '',
    date: '',
    files: []
  }
}

async function submitLegalInvoice() {
  if (!legalInvoiceForm.value.number || !legalInvoiceForm.value.date) {
    alert('Por favor complete todos los campos requeridos')
    return
  }

  try {
    isSubmitting.value = true

    const formData = new FormData()
    formData.append('purchase_ids', selectedInvoices.value.map(inv => inv.id).join(','))
    formData.append('legal_invoice_number', legalInvoiceForm.value.number)
    formData.append('legal_invoice_date', new Date(legalInvoiceForm.value.date).toISOString())

    // Append files
    legalInvoiceForm.value.files.forEach(file => {
      formData.append('files', file)
    })

    const response = await $fetch(`/api/supplier-portal/${token.value}/invoices/attach-legal`, {
      method: 'POST',
      body: formData
    })

    // Refresh data and clear selection
    await refresh()
    clearSelection()
    closeLegalInvoiceModal()

    alert(`Factura ${legalInvoiceForm.value.number} adjuntada exitosamente a ${selectedInvoices.value.length} remision(es)`)
  } catch (err: any) {
    console.error('Error attaching legal invoice:', err)
    alert(err.data?.detail || 'Error al adjuntar la factura legal')
  } finally {
    isSubmitting.value = false
  }
}

function applyFilters() {
  refresh()
}

function clearFilters() {
  filters.value = {
    documentType: '',
    supplierId: '',
    startDate: '',
    endDate: ''
  }
  refresh()
}

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => {})

// Register refresh handler for header and mobile bottom nav
onMounted(() => {
  setRefreshHandler(refresh)
})
</script>
