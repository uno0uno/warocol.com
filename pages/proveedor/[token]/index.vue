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
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="mt-4 text-xl font-bold text-text-primary">Acceso Denegado</h2>
        <p class="mt-2 text-text-secondary">{{ error }}</p>
      </div>
    </div>

    <!-- Portal Content -->
    <div v-else class="container mx-auto px-4 py-8">
      <div>
        <div v-if="purchases.length === 0" class="bg-surface border border-border rounded-lg p-12 text-center">
          <svg class="w-16 h-16 mx-auto text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-4 text-text-secondary">No tienes órdenes de compra</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="purchase in purchases"
            :key="purchase.id"
            class="bg-surface border border-border rounded-lg cursor-pointer transition-all hover:border-primary"
            @click="navigateToPurchase(purchase.id)"
          >
            <div class="p-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Purchase Number with Date and Total -->
                <div class="flex items-start space-x-3">
                  <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                    <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div class="space-y-1">
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                      {{ formatDate(purchase.purchase_date) }}
                    </p>
                    <p v-if="purchase.status !== 'quotation'" class="text-xl font-bold text-primary">
                      {{ formatCurrency(purchase.total_amount + purchase.tax_amount) }}
                    </p>
                    <p class="text-base font-semibold text-text-primary">
                      {{ purchase.purchase_number }}
                    </p>
                  </div>
                </div>

                <!-- Items Count -->
                <div class="flex items-start space-x-3">
                  <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                    <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div class="space-y-1">
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Items
                    </p>
                    <p class="text-lg font-semibold text-text-primary">
                      {{ purchase.items.length }} producto(s)
                    </p>
                  </div>
                </div>

                <!-- Status Badge -->
                <div class="flex items-start space-x-3">
                  <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
                    <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="space-y-1">
                    <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
                      Estado Actual
                    </p>
                    <div class="pt-1">
                      <span :class="getStatusBadgeClass(purchase.status)">
                        {{ getStatusText(purchase.status) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="purchase.notes" class="px-6 pb-6">
              <div class="p-4 bg-background border border-border rounded-lg">
                <p class="text-xs text-text-secondary font-medium mb-2">Observaciones</p>
                <p class="text-sm text-text-primary">{{ purchase.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'supplier-portal'
})

const route = useRoute()
const token = computed(() => route.params.token as string)

const loading = ref(true)
const error = ref<string | null>(null)
const purchases = ref<any[]>([])

// Use global state for supplier (shared with layout)
const supplier = useState<any>('supplier-portal-supplier', () => null)

function navigateToPurchase(purchaseId: string) {
  navigateTo(`/proveedor/${token.value}/${purchaseId}`)
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    quotation: 'Cotización',
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    preparing: 'En Preparación',
    shipped: 'Enviado',
    received: 'Recibido',
    verified: 'Verificado',
    invoiced: 'Facturado',
    paid: 'Pagado',
    cancelled: 'Cancelado'
  }
  return statusMap[status] || status
}

function getStatusBadgeClass(status: string): string {
  const baseClasses = 'px-3 py-1 text-sm font-medium rounded border-2'
  const statusClasses: Record<string, string> = {
    quotation: 'border-accent text-accent',
    pending: 'border-warning text-warning',
    confirmed: 'border-success text-success',
    preparing: 'border-info text-info',
    shipped: 'border-primary text-primary',
    received: 'border-secondary text-secondary',
    verified: 'border-info text-info',
    invoiced: 'border-warning text-warning',
    paid: 'border-success text-success',
    cancelled: 'border-destructive text-destructive'
  }
  return `${baseClasses} ${statusClasses[status] || 'border-border text-text-secondary'}`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'No especificada'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '$0'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
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

onMounted(async () => {
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
