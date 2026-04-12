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
        <h2 class="mt-4 text-xl font-bold text-text-primary">Acceso Denegado</h2>
        <p class="mt-2 text-text-secondary">{{ error }}</p>
      </div>
    </div>

    <!-- Portal Content -->
    <div v-else class="w-full">
      <UiResponsiveDataView
        row-size="sm"
        :columns="purchasesTableColumns"
        :data="formattedPurchases"
        title="Mis Órdenes de Compra"
        empty-message="No tienes órdenes de compra"
        empty-sub-message="Las órdenes aparecerán aquí cuando sean creadas"
        variant="default"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <PurchasesPurchaseOrderCard :order="item" @edit="navigateToPurchase" />
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-numero="{ value, row }">
          <div>
            <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
            <div class="text-xs text-titan-600">{{ row.invoice_number || 'Sin factura' }}</div>
          </div>
        </template>

        <template #cell-proveedor="{ value }">
          <div class="text-sm font-bold text-ebony-800">{{ value }}</div>
        </template>

        <template #cell-fecha="{ value }">
          <span class="text-sm text-ebony-800">{{ formatDate(value) }}</span>
        </template>

        <template #cell-valorTotal="{ value, row }">
          <div>
            <div class="text-sm font-medium text-ebony-800">{{ formatCurrency(value) }}</div>
            <div class="text-xs text-titan-600">+{{ formatCurrency(row.impuestos) }} IVA</div>
          </div>
        </template>

        <template #cell-totalItems="{ value }">
          <UiStatusBadge :value="`${value} items`" format="text" variant="secondary" size="sm" />
        </template>

        <template #cell-estado="{ value }">
          <UiStatusBadge :value="getStatusText(value)" format="text" :variant="getStatusVariant(value)" size="sm" />
        </template>

        <template #cell-fechaEntrega="{ value }">
          <div class="text-sm text-ebony-800">
            <div v-if="value">{{ formatDate(value) }}</div>
            <div v-else class="text-ebony-800">Sin programar</div>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <button @click="navigateToPurchase(row)" class="text-crocus-600 hover:text-crocus-900 transition-colors"
              title="Ver orden">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'supplier-portal'
})

useHead({ title: 'Portal Proveedor' })

const route = useRoute()
const token = computed(() => route.params.token as string)

const loading = ref(true)
const error = ref<string | null>(null)
const purchases = ref<any[]>([])

// Use global state for supplier (shared with layout)
const supplier = useState<any>('supplier-portal-supplier', () => null)

// Use composables for formatters and status
const { formatDate, formatCurrency } = useFormatters()
const { getStatusText, getStatusVariant } = usePurchaseStatus()

// Table columns configuration
const purchasesTableColumns = [
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
    key: 'fecha',
    title: 'Fecha',
    sortable: true,
    format: 'date',
    align: 'center'
  },
  {
    key: 'valorTotal',
    title: 'Valor Total',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'totalItems',
    title: 'Items',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'estado',
    title: 'Estado',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'fechaEntrega',
    title: 'Entrega',
    sortable: true,
    format: 'date',
    align: 'center'
  },
  {
    key: 'actions',
    title: 'Acciones',
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

// Format purchases for PurchaseOrderCard component and table
const formattedPurchases = computed(() => {
  return purchases.value.map(purchase => ({
    id: purchase.id,
    numero: purchase.purchase_number,
    proveedor: supplier.value?.name || 'Proveedor',
    fecha: purchase.purchase_date,
    fechaEntrega: purchase.delivery_date,
    valorTotal: purchase.total_amount || 0,
    impuestos: purchase.tax_amount || 0,
    totalItems: purchase.items?.length || 0,
    estado: purchase.status,
    invoice_number: purchase.invoice_number
  }))
})

function navigateToPurchase(order: any) {
  const purchaseId = typeof order === 'string' ? order : order.id
  navigateTo(`/proveedor/${token.value}/${purchaseId}`)
}

async function loadPurchases() {
  try {
    const response = await $fetch(`/api/supplier-portal/${token.value}/purchases`)
    purchases.value = response.data
  } catch (err: any) {
    console.error('Error loading purchases:', err)
  }
}

// Refresh function
const refresh = async () => {
  loading.value = true
  await loadPurchases()
  loading.value = false
}

// Inject refresh handler setter from layout
const { setRefreshHandler } = useLayoutActions()

// Register refresh handler for header and mobile bottom nav
onMounted(async () => {
  // Register refresh handler
  setRefreshHandler(refresh)
  try {
    // Supplier is loaded by middleware
    // Check if supplier is available (middleware might have failed)
    if (!supplier.value) {
      error.value = 'No se pudo verificar el acceso'
      loading.value = false
      return
    }

    // Load purchases
    await loadPurchases()
    loading.value = false
  } catch (err: any) {
    error.value = err.data?.detail || 'Error al cargar las órdenes'
    loading.value = false
  }
})
</script>
