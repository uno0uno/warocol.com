<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
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
      <!-- Header -->
      <div class="bg-surface border border-border rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-text-primary">Portal de Proveedor</h1>
            <p class="text-text-secondary mt-1">{{ supplier?.name }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-text-secondary">Email: {{ supplier?.email }}</p>
            <p class="text-sm text-text-secondary" v-if="supplier?.phone">Teléfono: {{ supplier?.phone }}</p>
          </div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="mb-6">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="currentTab = tab.value"
            :class="[
              'p-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-ring text-left',
              currentTab === tab.value
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 bg-surface'
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <span :class="[
                'font-medium',
                currentTab === tab.value ? 'text-text-primary' : 'text-text-secondary'
              ]">
                {{ tab.label }}
              </span>
              <span
                v-if="getTabCount(tab.value) > 0"
                :class="[
                  'px-2 py-1 text-xs font-semibold rounded-full',
                  currentTab === tab.value
                    ? 'bg-primary text-white'
                    : 'bg-surface-secondary text-text-secondary'
                ]"
              >
                {{ getTabCount(tab.value) }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Purchases List -->
      <div class="mb-4">
        <h2 class="text-xl font-bold text-text-primary">Detalles de Órdenes</h2>
      </div>

      <Transition
        enter-active-class="transition-all duration-400 ease-out"
        enter-from-class="opacity-0 transform translate-y-[-20px]"
        enter-to-class="opacity-100 transform translate-y-0"
        leave-active-class="transition-all duration-300 ease-in"
        leave-from-class="opacity-100 transform translate-y-0"
        leave-to-class="opacity-0 transform translate-y-[-20px]"
        mode="out-in"
      >
        <div :key="currentTab">
          <div v-if="filteredPurchases.length === 0" class="bg-surface border border-border rounded-lg p-12 text-center">
            <svg class="w-16 h-16 mx-auto text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="mt-4 text-text-secondary">No hay órdenes en esta categoría</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="purchase in filteredPurchases"
              :key="purchase.id"
              class="bg-surface border border-border rounded-lg cursor-pointer transition-all hover:border-primary"
              @click="openDetailsModal(purchase)"
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
      </Transition>
    </div>

    <!-- Purchase Details Modal -->
    <PurchaseDetailsModal
      :is-open="showDetailsModal"
      :purchase="selectedPurchase"
      @close="showDetailsModal = false"
      @complete-prices="handleCompletePricesFromDetails"
      @ship-purchase="handleShipFromDetails"
    />

    <!-- Complete Prices Modal -->
    <CompletePricesModalSupplier
      :is-open="showCompletePricesModal"
      :purchase="selectedPurchase"
      :token="token"
      @close="showCompletePricesModal = false"
      @completed="handlePricesCompleted"
    />

    <!-- Ship Purchase Modal -->
    <ShipPurchaseModalSupplier
      :is-open="showShipModal"
      :purchase="selectedPurchase"
      :token="token"
      @close="showShipModal = false"
      @shipped="handlePurchaseShipped"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CompletePricesModalSupplier from '~/components/purchases/CompletePricesModalSupplier.vue'
import ShipPurchaseModalSupplier from '~/components/purchases/ShipPurchaseModalSupplier.vue'
import PurchaseDetailsModal from '~/components/purchases/PurchaseDetailsModal.vue'

definePageMeta({
  layout: 'supplier-portal'
})

const route = useRoute()
const token = computed(() => route.params.token as string)

const loading = ref(true)
const error = ref<string | null>(null)
const supplier = ref<any>(null)
const purchases = ref<any[]>([])
const currentTab = ref('quotation')
const showCompletePricesModal = ref(false)
const showShipModal = ref(false)
const showDetailsModal = ref(false)
const selectedPurchase = ref<any>(null)

const tabs = [
  { label: 'Cotizaciones', value: 'quotation' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Confirmadas', value: 'confirmed' },
  { label: 'Enviadas', value: 'shipped' },
  { label: 'Completadas', value: 'paid' }
]

const filteredPurchases = computed(() => {
  return purchases.value.filter(p => p.status === currentTab.value)
})

function getTabCount(tabValue: string): number {
  return purchases.value.filter(p => p.status === tabValue).length
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

function openDetailsModal(purchase: any) {
  selectedPurchase.value = purchase
  showDetailsModal.value = true
}

function openCompletePricesModal(purchase: any) {
  selectedPurchase.value = purchase
  showCompletePricesModal.value = true
}

function openShipModal(purchase: any) {
  selectedPurchase.value = purchase
  showShipModal.value = true
}

function handleCompletePricesFromDetails(purchase: any) {
  showDetailsModal.value = false
  openCompletePricesModal(purchase)
}

function handleShipFromDetails(purchase: any) {
  showDetailsModal.value = false
  openShipModal(purchase)
}

async function handlePricesCompleted() {
  showCompletePricesModal.value = false
  await loadPurchases()
}

async function handlePurchaseShipped() {
  showShipModal.value = false
  await loadPurchases()
}

async function loadPurchases() {
  try {
    const response = await $fetch(`/api/supplier-portal/${token.value}/purchases`)
    purchases.value = response.data
  } catch (err: any) {
    console.error('Error loading purchases:', err)
  }
}

onMounted(async () => {
  try {
    // Verify token
    const verifyResponse = await $fetch(`/api/supplier-portal/${token.value}/verify`)
    supplier.value = verifyResponse.supplier

    // Load purchases
    await loadPurchases()

    loading.value = false
  } catch (err: any) {
    error.value = err.data?.detail || 'No se pudo verificar el acceso'
    loading.value = false
  }
})
</script>
