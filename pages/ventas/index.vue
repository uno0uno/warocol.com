<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

const router = useRouter()

// Modal state
const showNewSaleModal = ref(false)
const customerPhone = ref('')
const isSearching = ref(false)
const phoneError = ref('')

// Mock sales data
const sales = ref([
  {
    id: 'V-001',
    date: '2025-11-27T10:30:00',
    customer: { name: 'Juan Pérez', phone: '+57 300 123 4567' },
    total: 45000,
    status: 'completed',
    items: 3
  },
  {
    id: 'V-002',
    date: '2025-11-27T11:15:00',
    customer: { name: 'María García', phone: '+57 301 234 5678' },
    total: 32000,
    status: 'completed',
    items: 2
  },
  {
    id: 'V-003',
    date: '2025-11-27T12:00:00',
    customer: { name: 'Cliente General', phone: 'N/A' },
    total: 15000,
    status: 'completed',
    items: 1
  },
  {
    id: 'V-004',
    date: '2025-11-27T12:30:00',
    customer: { name: 'Carlos Rodríguez', phone: '+57 302 345 6789' },
    total: 67000,
    status: 'pending',
    items: 5
  }
])

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Get status text
const getStatusText = (status: string) => {
  return status === 'completed' ? 'Completada' : 'Pendiente'
}

// Validate phone number
const validatePhone = (phone: string) => {
  // Simple validation: at least 10 digits
  const digitsOnly = phone.replace(/\D/g, '')
  return digitsOnly.length >= 10
}

// Handle new sale
const openNewSaleModal = () => {
  customerPhone.value = ''
  phoneError.value = ''
  showNewSaleModal.value = true
}

const handleStartSale = async () => {
  phoneError.value = ''

  // Validate phone
  if (!customerPhone.value.trim()) {
    phoneError.value = 'Ingresa un número de teléfono'
    return
  }

  if (!validatePhone(customerPhone.value)) {
    phoneError.value = 'Número de teléfono inválido (mínimo 10 dígitos)'
    return
  }

  // Simulate API call to find/create customer
  isSearching.value = true
  await new Promise(resolve => setTimeout(resolve, 500))
  isSearching.value = false

  // Store customer phone in session/store for POS to use
  sessionStorage.setItem('pendingSaleCustomerPhone', customerPhone.value)

  // Redirect to POS
  router.push('/ventas/pos')
}

// Stats
const totalSales = computed(() => sales.value.reduce((sum, sale) => sum + sale.total, 0))
const completedSales = computed(() => sales.value.filter(s => s.status === 'completed').length)
const pendingSales = computed(() => sales.value.filter(s => s.status === 'pending').length)

// Table columns configuration
const salesTableColumns = [
  { key: 'id', title: 'ID', sortable: true },
  { key: 'date', title: 'Fecha', sortable: true },
  { key: 'customer', title: 'Cliente', sortable: false },
  { key: 'items', title: 'Items', sortable: true },
  { key: 'total', title: 'Total', sortable: true },
  { key: 'status', title: 'Estado', sortable: true },
  { key: 'actions', title: 'Acciones', sortable: false }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
      <SharedMetricCard
        title="Total Ventas"
        :value="formatCurrency(totalSales)"
        subtitle="Ventas del día"
        variant="primary"
        :show-icon="false"
      />

      <SharedMetricCard
        title="Completadas"
        :value="completedSales"
        subtitle="Ventas finalizadas"
        variant="primary"
        :show-icon="false"
      />

      <SharedMetricCard
        title="Pendientes"
        :value="pendingSales"
        subtitle="Ventas en proceso"
        variant="primary"
        :show-icon="false"
      />
    </div>

    <!-- Sales Table -->
    <UiResponsiveDataView
      :columns="salesTableColumns"
      :data="sales"
      title="Historial de Ventas"
      empty-message="No hay ventas registradas"
      empty-sub-message="Las ventas aparecerán aquí"
      variant="default"
    >
      <!-- Mobile Actions -->
      <template #mobileActions>
        <div class="flex flex-col gap-2">
          <button
            @click="openNewSaleModal"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center"
          >
            + Nueva Venta
          </button>
        </div>
      </template>

      <!-- Desktop Header -->
      <template #header>
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h3 class="text-base sm:text-lg font-bold text-text-primary">
            Historial de Ventas
          </h3>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              @click="openNewSaleModal"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap"
            >
              <span class="hidden sm:inline">+ Nueva Venta</span>
              <span class="sm:hidden">+ Nueva</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Desktop Table Cells -->
      <template #cell-id="{ value }">
        <span class="font-semibold text-text-primary">{{ value }}</span>
      </template>

      <template #cell-date="{ value }">
        <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
      </template>

      <template #cell-customer="{ value }">
        <div>
          <p class="text-sm font-medium text-text-primary">{{ value.name }}</p>
          <p class="text-xs text-text-tertiary">{{ value.phone }}</p>
        </div>
      </template>

      <template #cell-items="{ value }">
        <span class="text-sm text-text-secondary">{{ value }}</span>
      </template>

      <template #cell-total="{ value }">
        <span class="font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
      </template>

      <template #cell-status="{ value }">
        <UiStatusBadge
          :value="getStatusText(value)"
          format="text"
          :variant="value === 'completed' ? 'success' : 'warning'"
          size="sm"
        />
      </template>

      <template #cell-actions="{ row }">
        <div class="flex justify-center space-x-2">
          <button
            class="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors text-text-secondary hover:text-primary"
            title="Ver detalles"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
          <button
            class="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors text-text-secondary hover:text-primary"
            title="Imprimir"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
          </button>
        </div>
      </template>

      <!-- Mobile Card -->
      <template #card="{ item }">
        <div class="bg-surface border border-border rounded-xl p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="font-semibold text-text-primary">{{ item.id }}</p>
              <p class="text-xs text-text-secondary mt-1">{{ formatDate(item.date) }}</p>
            </div>
            <UiStatusBadge
              :value="getStatusText(item.status)"
              format="text"
              :variant="item.status === 'completed' ? 'success' : 'warning'"
              size="sm"
            />
          </div>
          <div class="space-y-2">
            <div>
              <p class="text-sm font-medium text-text-primary">{{ item.customer.name }}</p>
              <p class="text-xs text-text-tertiary">{{ item.customer.phone }}</p>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-border">
              <span class="text-sm text-text-secondary">{{ item.items }} items</span>
              <span class="font-semibold text-text-primary">{{ formatCurrency(item.total) }}</span>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <button class="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors">
              Ver
            </button>
            <button class="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors">
              Imprimir
            </button>
          </div>
        </div>
      </template>
    </UiResponsiveDataView>

    <!-- New Sale Modal - Mobile -->
    <UiBottomSheetModal
      v-model="showNewSaleModal"
      title="Nueva Venta"
      max-height="sm"
    >
      <div class="p-6 space-y-6">
        <!-- Icon -->
        <div class="flex justify-center">
          <div class="bg-primary/10 p-4 rounded-full">
            <svg class="h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
        </div>

        <!-- Description -->
        <div class="text-center">
          <h3 class="text-lg font-semibold text-text-primary mb-2">Asociar Cliente</h3>
          <p class="text-sm text-text-secondary">
            Ingresa el número de teléfono del cliente para asociarlo a esta venta
          </p>
        </div>

        <!-- Phone Input -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-2">
            Número de Teléfono
          </label>
          <input
            v-model="customerPhone"
            type="tel"
            placeholder="+57 300 123 4567"
            class="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            :class="{ 'border-destructive': phoneError }"
            @keyup.enter="handleStartSale"
          >
          <p v-if="phoneError" class="mt-2 text-sm text-destructive">{{ phoneError }}</p>
        </div>

        <!-- Info Box -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div class="flex gap-2">
            <svg class="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <p class="text-xs text-blue-700 dark:text-blue-300">
              Si el cliente no existe, se creará automáticamente con este número
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <div class="p-4">
          <button
            @click="handleStartSale"
            :disabled="isSearching"
            class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              v-if="isSearching"
              class="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-else>Continuar al POS</span>
          </button>
        </div>
      </template>
    </UiBottomSheetModal>

    <!-- New Sale Modal - Desktop -->
    <UiModal
      v-model="showNewSaleModal"
      title="Nueva Venta"
      max-height="sm"
    >
      <div class="p-6 space-y-6">
        <!-- Icon -->
        <div class="flex justify-center">
          <div class="bg-primary/10 p-4 rounded-full">
            <svg class="h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
        </div>

        <!-- Description -->
        <div class="text-center">
          <h3 class="text-lg font-semibold text-text-primary mb-2">Asociar Cliente</h3>
          <p class="text-sm text-text-secondary">
            Ingresa el número de teléfono del cliente para asociarlo a esta venta
          </p>
        </div>

        <!-- Phone Input -->
        <div>
          <label class="block text-sm font-medium text-text-primary mb-2">
            Número de Teléfono
          </label>
          <input
            v-model="customerPhone"
            type="tel"
            placeholder="+57 300 123 4567"
            class="w-full px-4 py-3 rounded-xl border border-border bg-surface text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            :class="{ 'border-destructive': phoneError }"
            @keyup.enter="handleStartSale"
          >
          <p v-if="phoneError" class="mt-2 text-sm text-destructive">{{ phoneError }}</p>
        </div>

        <!-- Info Box -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div class="flex gap-2">
            <svg class="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <p class="text-xs text-blue-700 dark:text-blue-300">
              Si el cliente no existe, se creará automáticamente con este número
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <div class="p-4">
          <button
            @click="handleStartSale"
            :disabled="isSearching"
            class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              v-if="isSearching"
              class="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-else>Continuar al POS</span>
          </button>
        </div>
      </template>
    </UiModal>
  </div>
</template>
