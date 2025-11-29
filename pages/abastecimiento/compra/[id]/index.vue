<template>
  <div>
    <!-- Loading overlay during submit/delete (always on top) -->
    <div v-if="isSubmitting || isDeleting"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 flex flex-col items-center">
        <CommonsTheCustomLoader size="large" />
        <p class="mt-4 text-lg font-semibold text-text-primary">
          {{ isSubmitting ? 'Guardando cambios...' : 'Eliminando orden...' }}
        </p>
      </div>
    </div>

    <!-- Loading State for initial data -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="text-xl font-semibold text-text-primary mb-2">Error cargando orden</div>
        <div class="text-sm text-text-secondary">{{ error }}</div>
        <button @click="refresh" class="mt-4 btn-primary px-4 py-2 rounded-lg">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Edit Form -->
    <div v-else class="page-layout">
      <!-- Order Information Card -->
      <PurchasesPurchaseOrderHeader>
        <!-- Purchase Number with Date and Payment Type -->
        <PurchasesPurchaseInfoCard
          :label="formatDate(form.purchase_date)"
          :value="form.purchase_number"
          :subtitle="form.payment_type ? `Pago: ${getPaymentTypeText(form.payment_type)}` : undefined"
          icon-path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />

        <!-- Supplier -->
        <PurchasesPurchaseInfoCard
          label="Proveedor"
          icon-path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        >
          <div class="flex items-center gap-2">
            <p class="text-lg font-semibold text-text-primary">
              {{ getSupplierName(form.supplier_id) }}
            </p>
            <button v-if="currentSupplier" @click="copyPortalLink"
              class="w-8 h-8 flex items-center justify-center bg-surface-secondary rounded-md text-primary transition-colors"
              title="Copiar enlace del portal">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
          </div>
        </PurchasesPurchaseInfoCard>

        <!-- Status Badge -->
        <PurchasesPurchaseInfoCard
          label="Estado Actual"
          icon-path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        >
          <UiStatusBadge :value="getStatusText(form.status)" format="text"
            :variant="getStatusVariant(form.status)" />
        </PurchasesPurchaseInfoCard>
      </PurchasesPurchaseOrderHeader>

      <!-- Read-only Summary + Status History (All states) -->
      <div class="space-y-4 sm:space-y-6">
        <!-- Order Summary (Read-only) -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 sm:mb-6 flex items-center space-x-2">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Resumen de la Orden</span>
          </h3>

          <!-- Items Section -->
          <div class="mb-4 sm:mb-6">
            <h4 class="font-medium text-text-primary mb-3 sm:mb-4">Items</h4>

            <!-- Mobile: Cards View -->
            <div class="md:hidden space-y-3">
              <div v-for="(item, index) in form.items" :key="index"
                class="bg-surface rounded-xl  transition-shadow border border-border">
                <div class="p-4">
                  <!-- Main Content with Dashed Border -->
                  <div class="border-2 border-dashed border-border rounded-lg p-3 mb-3">

                    <!-- Ingredient Name -->
                    <div class="mb-3">
                      <h4 class="text-sm font-bold text-text-primary">
                        {{ getIngredientName(item.ingredient_id) }}
                      </h4>
                      <p v-if="item.notes" class="text-xs text-text-secondary mt-1">
                        {{ item.notes }}
                      </p>
                    </div>

                    <!-- Value Info -->
                    <div v-if="form.status !== 'quotation'" class="flex items-end justify-between pt-2 border-t border-border">
                      <div>
                        <p class="text-xs text-muted-foreground mb-0.5">Precio Unitario</p>
                        <p class="text-base font-semibold text-text-primary">
                          {{ parseFloat(item.unit_cost).toLocaleString('es-CO', {
                            style: 'currency', currency: 'COP',
                            minimumFractionDigits: 0, maximumFractionDigits: 0
                          }) }}
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="text-xs text-muted-foreground mb-0.5">Total</p>
                        <p class="text-lg font-bold text-text-primary">
                          {{ parseFloat(item.total_cost).toLocaleString('es-CO', {
                            style: 'currency', currency: 'COP',
                            minimumFractionDigits: 0, maximumFractionDigits: 0
                          }) }}
                        </p>
                      </div>
                    </div>

                  </div>

                  <!-- Footer Stats -->
                  <div class="flex items-center justify-between">

                    <!-- Stats Icons -->
                    <div class="flex items-center gap-3">

                      <!-- Quantity -->
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span class="text-text-primary font-semibold text-xs">{{ item.purchase_quantity || item.quantity }} {{ item.purchase_unit || item.unit }}</span>
                      </div>

                      <!-- Batch Number -->
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span class="text-text-secondary text-xs">{{ item.batch_number || 'Sin lote' }}</span>
                      </div>

                    </div>

                  </div>

                </div>
              </div>
            </div>

            <!-- Desktop: Table View -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full border-2 border-border rounded-lg">
                <thead class="bg-surface-secondary">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Ingrediente
                    </th>
                    <th
                      class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Cantidad
                    </th>
                    <th v-if="form.status !== 'quotation'"
                      class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Precio Unitario
                    </th>
                    <th v-if="form.status !== 'quotation'"
                      class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Total
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider border-b-2 border-border">
                      Lote
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-surface divide-y divide-border">
                  <tr v-for="(item, index) in form.items" :key="index"
                    class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-sm text-text-primary">
                      <div>
                        <p class="font-medium">{{ getIngredientName(item.ingredient_id) }}</p>
                        <p v-if="item.notes" class="text-xs text-text-secondary mt-1">{{ item.notes }}</p>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-sm text-text-primary text-right font-medium whitespace-nowrap">
                      {{ item.purchase_quantity || item.quantity }} {{ item.purchase_unit || item.unit }}
                    </td>
                    <td v-if="form.status !== 'quotation'" class="px-4 py-3 text-sm text-text-primary text-right whitespace-nowrap">
                      {{ ((parseFloat(item.total_cost) || 0) / (item.purchase_quantity || item.quantity || 1)).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
                    </td>
                    <td v-if="form.status !== 'quotation'" class="px-4 py-3 text-sm font-bold text-text-primary text-right whitespace-nowrap">
                      {{ parseFloat(item.total_cost).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) }}
                    </td>
                    <td class="px-4 py-3 text-sm text-text-secondary text-center">
                      {{ item.batch_number || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totals Summary -->
          <!-- Mobile: Card Layout -->
          <div v-if="form.status !== 'quotation'" class="md:hidden mb-4">
            <div class="bg-surface border-2 border-border rounded-xl">
              <div class="p-6">
                <div class="space-y-3">
                  <!-- Subtotal Row -->
                  <div class="flex justify-between items-center">
                    <span class="text-[15px] font-medium text-text-primary opacity-70">Subtotal</span>
                    <span class="text-[15px] font-semibold text-text-primary">
                      {{ subtotal.toLocaleString('es-CO', {
                        style: 'currency', currency: 'COP', minimumFractionDigits:
                          0, maximumFractionDigits: 0
                      }) }}
                    </span>
                  </div>

                  <!-- IVA Row -->
                  <div class="flex justify-between items-center">
                    <span class="text-[15px] font-medium text-text-primary opacity-70">IVA (19%)</span>
                    <span class="text-[15px] font-semibold text-text-primary">
                      {{ parseFloat(form.tax_amount).toLocaleString('es-CO', {
                        style: 'currency', currency: 'COP',
                        minimumFractionDigits: 0, maximumFractionDigits: 0
                      }) }}
                    </span>
                  </div>

                  <!-- Total Row -->
                  <div class="flex justify-between items-center pt-4 mt-4 border-t border-border">
                    <span class="text-lg font-semibold text-text-primary">Total</span>
                    <span class="text-2xl font-bold text-primary">
                      {{ totalAmount.toLocaleString('es-CO', {
                        style: 'currency', currency: 'COP',
                        minimumFractionDigits: 0, maximumFractionDigits: 0
                      }) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Grid Layout (unchanged) -->
          <div v-if="form.status !== 'quotation'" class="hidden md:grid md:grid-cols-3 gap-4 mb-6">
            <!-- Subtotal Card -->
            <div class="bg-surface rounded-xl  transition-shadow border border-border">
              <div class="p-4">
                <div class="border-2 border-dashed border-border rounded-lg p-3">
                  <p class="text-xs text-muted-foreground mb-1">Subtotal</p>
                  <p class="text-xl font-bold text-text-primary">
                    {{ subtotal.toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP', minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- IVA Card -->
            <div class="bg-surface rounded-xl  transition-shadow border border-border">
              <div class="p-4">
                <div class="border-2 border-dashed border-border rounded-lg p-3">
                  <p class="text-xs text-muted-foreground mb-1">IVA</p>
                  <p class="text-xl font-bold text-text-primary">
                    {{ parseFloat(form.tax_amount).toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP',
                      minimumFractionDigits: 0, maximumFractionDigits: 0
                    }) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Total Card -->
            <div class="bg-surface rounded-xl  transition-shadow border border-border">
              <div class="p-4">
                <div class="border-2 border-dashed border-border rounded-lg p-3">
                  <p class="text-xs text-muted-foreground mb-1">Total</p>
                  <p class="text-2xl font-bold text-primary">
                    {{ totalAmount.toLocaleString('es-CO', {
                      style: 'currency', currency: 'COP', minimumFractionDigits:
                        0, maximumFractionDigits: 0
                    }) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div v-if="form.notes" class="mt-4 sm:mt-6">
            <h4 class="font-medium text-text-primary text-sm sm:text-base mb-2">Observaciones</h4>
            <p class="text-xs sm:text-sm text-text-secondary bg-background p-3 sm:p-4 rounded-lg border border-border">
              {{ form.notes }}
            </p>
          </div>
        </div>

        <!-- Action Buttons Section -->
        <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">

            <!-- Action buttons based on current status -->
            <div v-if="purchase" class="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <!-- WAITING: Quotation - Supplier must complete prices -->
              <div v-if="purchase.status === 'quotation'"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0"
                  style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Esperando cotización del proveedor</span>
              </div>

              <!-- Approve (when in pending status) - USER ACTION -->
              <NuxtLink v-if="purchase.status === 'pending'" :to="`/abastecimiento/compra/${purchaseId}/acciones`"
                class="px-3 py-2 sm:px-4 border-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm hover:opacity-60"
                style="border-color: hsl(var(--success)); color: hsl(var(--success));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Aprobar Orden</span>
              </NuxtLink>

              <!-- WAITING: Payment (for "contado" type) or Invoice (for other types) -->
              <div v-if="purchase.status === 'confirmed' || purchase.status === 'preparing'"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0"
                  style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span v-if="purchase.payment_type === 'contado'">Esperando pago antes de facturar</span>
                <span v-else>Esperando factura del proveedor</span>
              </div>

              <!-- WAITING: Invoice after payment (for "contado" type only) -->
              <div v-if="purchase.status === 'paid' && purchase.payment_type === 'contado'"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0"
                  style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pago recibido. Esperando factura del proveedor</span>
              </div>

              <!-- WAITING: Ship - Supplier must ship -->
              <div v-if="purchase.status === 'invoiced'"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 animate-pulse flex-shrink-0"
                  style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Esperando envío del proveedor</span>
              </div>

              <!-- Receive (includes quality verification) -->
              <NuxtLink v-if="purchase.status === 'shipped' || purchase.status === 'partially_received'"
                :to="`/abastecimiento/compra/${purchaseId}/acciones`"
                class="px-3 py-2 sm:px-4 border-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm hover:opacity-60"
                style="border-color: hsl(var(--success)); color: hsl(var(--success));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Recibir Orden</span>
              </NuxtLink>

              <!-- Received state - Payment reminder -->
              <div v-if="purchase.status === 'received' && shouldShowPaymentReminder"
                class="px-3 py-2 sm:px-4 border-2 border-dashed rounded-lg flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                style="border-color: hsl(var(--success)); color: hsl(var(--text-secondary));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style="color: hsl(var(--success));"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Orden recibida. Registrar pago en módulo de Pagos</span>
              </div>

              <!-- Cancel (not available in received state) -->
              <button v-if="purchase.status !== 'received' && purchase.status !== 'cancelled'" type="button"
                @click="showCancelModal = true"
                class="px-3 py-2 sm:px-4 border-2 rounded-lg transition-colors flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 text-xs sm:text-sm hover:opacity-60"
                style="border-color: hsl(var(--destructive)); color: hsl(var(--destructive));">
                <svg class="hidden sm:block w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancelar Orden</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Status History Timeline -->
        <PurchasesStatusHistoryTimeline :purchase-id="purchaseId" :current-status="purchase?.status"
          :base-transition-url="`/abastecimiento/compra/${purchaseId}/transicion`" />
      </div>
    </div>

    <!-- Cancel Modal -->
    <PurchasesCancelPurchaseModal :is-open="showCancelModal" :purchase-id="purchaseId" @close="showCancelModal = false"
      @cancelled="handleCancelled" />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { usePurchasesStore } from '~/stores/purchases'
import { storeToRefs } from 'pinia'

definePageMeta({
  layout: 'dashboard'
})

// Get order ID from route
const route = useRoute()
const router = useRouter()
const purchaseId = route.params.id as string

useHead({
  title: `Editar Orden ${purchaseId} - Abastecimiento`
})

// Use Pinia store
const purchasesStore = usePurchasesStore()
const { currentPurchase } = storeToRefs(purchasesStore)

// Fetch suppliers (NO await to show loading)
const { data: suppliersData, pending: loadingSuppliers } = useFetch('/api/suppliers/providers', {
  server: false,
  query: { limit: 250 }
})

const suppliers = computed(() => suppliersData.value?.data || [])

// Fetch ingredients (NO await to show loading)
const { data: ingredientsData, pending: loadingIngredients } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: 250 }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

const isSubmitting = ref(false)
const isDeleting = ref(false)
const error = ref<string | null>(null)

// Cancel modal state
const showCancelModal = ref(false)

// Load purchase from store
const loadingPurchase = ref(false)
const loadPurchase = async (forceRefresh = false) => {
  loadingPurchase.value = true
  error.value = null
  try {
    await purchasesStore.fetchPurchase(purchaseId, forceRefresh)
  } catch (err: any) {
    error.value = err.message || 'Error loading purchase'
  } finally {
    loadingPurchase.value = false
  }
}

// Get purchase from store (reactive) - using currentPurchase which is already set
const purchase = currentPurchase

// Form state derived from store
const form = computed(() => {
  if (!purchase.value) {
    return {
      supplier_id: '',
      purchase_number: '',
      purchase_date: '',
      delivery_date: '',
      status: 'pending',
      invoice_number: '',
      tax_amount: 0,
      total_amount: 0,
      notes: '',
      items: []
    }
  }

  return {
    supplier_id: purchase.value.supplier_id,
    purchase_number: purchase.value.purchase_number,
    purchase_date: purchase.value.purchase_date ? new Date(purchase.value.purchase_date).toISOString().slice(0, 16) : '',
    delivery_date: purchase.value.delivery_date ? new Date(purchase.value.delivery_date).toISOString().slice(0, 16) : '',
    status: purchase.value.status,
    payment_type: purchase.value.payment_type,
    credit_days: purchase.value.credit_days,
    payment_due_date: purchase.value.payment_due_date,
    payment_terms: purchase.value.payment_terms,
    consolidation_group: purchase.value.consolidation_group,
    requires_advance_payment: purchase.value.requires_advance_payment,
    invoice_number: purchase.value.invoice_number || '',
    tax_amount: purchase.value.tax_amount,
    total_amount: purchase.value.total_amount,
    notes: purchase.value.notes || '',
    items: purchase.value.items
  }
  

})

// Refresh function
const refresh = async () => {
  await loadPurchase(true)
}

// Inject refresh handler setter from layout (must be at setup level)
const setRefreshHandler = inject<(handler: (() => void | Promise<void>) | undefined) => void>('setRefreshHandler', () => {})

// Load on mount and set as current purchase
onMounted(async () => {
  // First set the current purchase ID (this will show the bar but wait for data)
  purchasesStore.setCurrentPurchase(purchaseId)

  // Check if we should force refresh on mount
  const shouldRefresh = route.query.refresh === 'true'

  // Then load the purchase data
  await loadPurchase(shouldRefresh)

  // Clean up the query param if it exists
  if (shouldRefresh) {
    const { refresh, ...restQuery } = route.query
    router.replace({ query: restQuery })
  }

  // Register refresh handler for mobile bottom nav
  setRefreshHandler(refresh)
})

// Watch route query to detect when we should reload (e.g., after completing an action)
// This handles the case when navigating within the same page
watch(() => route.query.refresh, async (newValue, oldValue) => {
  // Only trigger if the value changed to 'true' (not on initial mount)
  if (newValue === 'true' && oldValue !== 'true') {
    console.log('🔄 Refresh requested, reloading purchase data...')
    await loadPurchase(true)
    // Clean up the query param
    const { refresh, ...restQuery } = route.query
    router.replace({ query: restQuery })
  }
})

// Clean up on unmount
onUnmounted(() => {
  purchasesStore.setCurrentPurchase(null)
})

// Combined loading state
const isLoading = computed(() => loadingPurchase.value || loadingSuppliers.value || loadingIngredients.value)

// Computed totals
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0)
})

const totalAmount = computed(() => {
  return subtotal.value + (parseFloat(form.value.tax_amount) || 0)
})

// Helper functions for status
function getStatusVariant(status) {
  switch (status) {
    case 'quotation':
      return 'info'
    case 'pending':
      return 'warning'
    case 'confirmed':
      return 'info'
    case 'preparing':
      return 'info'
    case 'shipped':
      return 'info'
    case 'partially_received':
      return 'warning'
    case 'received':
      return 'success'
    case 'verified':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'paid':
      return 'success'
    case 'cancelled':
      return 'destructive'
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function getStatusText(status) {
  const texts = {
    quotation: 'Cotización',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    shipped: 'Enviado',
    partially_received: 'Parcialmente Recibido',
    received: 'Recibido',
    verified: 'Verificado',
    invoiced: 'Facturado',
    paid: 'Pagado',
    cancelled: 'Cancelado',
    overdue: 'Vencido'
  }
  return texts[status] || 'Desconocido'
}

function getSupplierName(supplierId) {
  if (!supplierId) return 'No especificado'
  const supplier = suppliers.value.find(sup => sup.id === supplierId)
  return supplier?.name || 'Proveedor desconocido'
}

// Get current supplier with access token
const currentSupplier = computed(() => {
  if (!form.value.supplier_id) return null
  const supplier = suppliers.value.find(sup => sup.id === form.value.supplier_id)

  return supplier
})

function getIngredientName(ingredientId) {
  if (!ingredientId) return 'No especificado'
  const ingredient = ingredients.value.find(ing => ing.id === ingredientId)
  return ingredient?.name || 'Ingrediente desconocido'
}

function formatDate(dateString) {
  if (!dateString) return 'No especificada'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getPaymentTypeText(paymentType) {
  const types = {
    'contado': 'Contado',
    'credito': 'Crédito',
    'contraentrega': 'Contraentrega'
  }
  return types[paymentType] || 'No especificado'
}

// Methods
const onIngredientChange = (index) => {
  const selectedIngredient = ingredients.value.find(
    ing => ing.id === form.value.items[index].ingredient_id
  )
  if (selectedIngredient) {
    form.value.items[index].unit = selectedIngredient.unit
    if (selectedIngredient.price) {
      form.value.items[index].unit_cost = parseFloat(selectedIngredient.price)
      updateItemTotal(index)
    }
  }
}

const updateItemTotal = (index) => {
  const item = form.value.items[index]
  item.total_cost = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)
  updateTotal()
}

const updateTotal = () => {
  form.value.total_amount = totalAmount.value
}

const addItem = () => {
  form.value.items.push({
    ingredient_id: '',
    quantity: 1,
    unit: '',
    unit_cost: 0,
    total_cost: 0,
    expiry_date: null,
    batch_number: '',
    notes: ''
  })
}

const removeItem = (index) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
    updateTotal()
  }
}

// Handle form submission
const handleSubmit = async () => {
  try {
    isSubmitting.value = true

    // Update total before submit
    form.value.total_amount = totalAmount.value

    await $fetch(`/api/suppliers/purchases/${purchaseId}`, {
      method: 'PUT',
      body: form.value
    })

    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')

  } catch (error) {
    console.error('Error updating purchase:', error)
    alert('Error al actualizar la orden. Por favor intente nuevamente.')
  } finally {
    isSubmitting.value = false
  }
}

// Handle order deletion
const handleDelete = async () => {
  if (!confirm('¿Está seguro de que desea eliminar esta orden? Esta acción no se puede deshacer.')) {
    return
  }

  try {
    isDeleting.value = true

    await $fetch(`/api/suppliers/purchases/${purchaseId}`, {
      method: 'DELETE'
    })

    // Redirect back to orders list
    await navigateTo('/abastecimiento/compras')

  } catch (error) {
    console.error('Error deleting purchase:', error)
    alert('Error al eliminar la orden. Por favor intente nuevamente.')
  } finally {
    isDeleting.value = false
  }
}

// Check if we should show payment reminder for received orders
// For "contado" orders, payment happens before verification, so we shouldn't show the reminder
// For "credito" orders, payment happens after verification, so we should show the reminder
const shouldShowPaymentReminder = computed(() => {
  if (!purchase.value) return false

  const paymentType = purchase.value.payment_type
  const history = purchase.value.status_history || []

  // For contado orders, check if payment already occurred (status transitioned through "paid")
  if (paymentType === 'contado') {
    const hasPaidStatus = history.some((entry: any) => entry.to_status === 'paid')
    return !hasPaidStatus // Don't show reminder if already paid
  }

  // For credit orders, show reminder (payment happens after verification)
  return true
})

// Determine if there are available actions for the current status
const hasAvailableActions = computed(() => {
  if (!purchase.value) return false

  const status = purchase.value.status

  // Has available actions if:
  // 1. Status is 'pending' (can approve)
  // 2. Status is 'shipped' or 'partially_received' (can receive)
  // 3. Status is not 'received' or 'cancelled' (can cancel)

  const canApprove = status === 'pending'
  const canReceive = status === 'shipped' || status === 'partially_received'
  const canCancel = status !== 'received' && status !== 'cancelled'

  return canApprove || canReceive || canCancel
})

// Check if current status is a waiting state (no user action required)
const hasWaitingStatus = computed(() => {
  if (!purchase.value) return false

  const status = purchase.value.status
  const waitingStatuses = ['quotation', 'confirmed', 'preparing', 'paid', 'invoiced']

  return waitingStatuses.includes(status) ||
    (status === 'received' && shouldShowPaymentReminder.value)
})

// Get waiting message based on status
const getWaitingMessage = computed(() => {
  if (!purchase.value) return ''

  const status = purchase.value.status
  const paymentType = purchase.value.payment_type

  switch (status) {
    case 'quotation':
      return 'Esperando cotización del proveedor'
    case 'confirmed':
    case 'preparing':
      return paymentType === 'contado'
        ? 'Esperando pago antes de facturar'
        : 'Esperando factura del proveedor'
    case 'paid':
      return 'Pago recibido. Esperando factura del proveedor'
    case 'invoiced':
      return 'Esperando envío del proveedor'
    case 'received':
      if (shouldShowPaymentReminder.value) {
        return 'Orden recibida. Registrar pago en módulo de Pagos'
      }
      return 'Orden completada'
    default:
      return 'Estado actual: ' + getStatusText(status)
  }
})

// Get waiting description based on status
const getWaitingDescription = computed(() => {
  if (!purchase.value) return ''

  const status = purchase.value.status
  const paymentType = purchase.value.payment_type

  switch (status) {
    case 'quotation':
      return 'El proveedor debe completar los precios en su portal'
    case 'confirmed':
    case 'preparing':
      return paymentType === 'contado'
        ? 'Debes registrar el pago en el módulo de Pagos'
        : 'El proveedor enviará la factura'
    case 'paid':
      return 'El proveedor debe enviar la factura'
    case 'invoiced':
      return 'El proveedor debe despachar la orden'
    case 'received':
      if (shouldShowPaymentReminder.value) {
        return 'Dirígete al módulo de Pagos para registrar el pago de esta orden'
      }
      return 'La orden ha sido recibida y verificada'
    default:
      return ''
  }
})

// Copy portal link to clipboard
const copyPortalLink = async () => {
  try {
    const baseUrl = window.location.origin
    const portalUrl = `${baseUrl}/proveedor/${currentSupplier.value.access_token}`

    // Try modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(portalUrl)
    } else {
      // Fallback for non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = portalUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    console.log('✅ Portal link copied:', portalUrl)
  } catch (error) {
    console.error('Error copying portal link:', error)
  }
}

// Handle cancel action
const handleCancelled = async () => {
  showCancelModal.value = false
  await refresh()
}
</script>
