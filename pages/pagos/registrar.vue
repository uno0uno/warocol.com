<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
      <div class="max-w-md p-6 bg-surface border border-border rounded-lg text-center">
        <svg class="w-16 h-16 mx-auto text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 class="mt-4 text-xl font-bold text-text-primary">Error</h2>
        <p class="mt-2 text-text-secondary">{{ error }}</p>
        <button @click="navigateTo('/pagos')"
          class="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
          Volver a Pagos
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="w-full mx-auto">


      <!-- Form Container -->
      <PaymentsPaymentForm :purchases="purchases" @cancel="navigateTo('/pagos')" @paid="handlePaid" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import { useRoute, navigateTo } from '#app'

definePageMeta({
  layout: 'dashboard',
  title: 'Registrar Pago'
})

useHead({ title: 'Registrar Pago' })

const route = useRoute()
const loading = ref(true)
const error = ref<string | null>(null)
const purchases = ref<any[]>([])

// Tenant reactivity
const { currentTenant } = useTenantReactive()

async function loadPurchases() {
  loading.value = true
  error.value = null
  
  const idsParam = route.query.ids as string
  if (!idsParam) {
    error.value = 'No se especificaron órdenes para pagar'
    loading.value = false
    return
  }

  const ids = idsParam.split(',').filter(Boolean)
  
  try {
    // Fetch purchases individually to avoid API limits and ensure we get specific records
    const fetchPromises = ids.map(id => 
      $fetch(`/api/suppliers/purchases/${id}`)
        .catch(err => {
          console.error(`Error fetching purchase ${id}:`, err)
          return null
        })
    )

    const results = await Promise.all(fetchPromises)
    const foundPurchases = results
      .filter(r => r !== null && r.data)
      .map(r => r.data)

    if (foundPurchases.length === 0) {
      error.value = 'No se encontraron las órdenes especificadas'
    } else {
      purchases.value = foundPurchases
      
      if (foundPurchases.length !== ids.length) {
        useToast().warning('Algunas órdenes no pudieron ser cargadas', { title: 'Advertencia' })
      }
    }
    
  } catch (err: any) {
    console.error('Error loading purchases:', err)
    error.value = err.data?.detail || err.message || 'Error al cargar las órdenes'
  } finally {
    loading.value = false
  }
}

async function handlePaid() {
  await navigateTo('/pagos?refresh=true')
}

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => {})

onMounted(() => {
  setRefreshHandler(loadPurchases)
  loadPurchases()
})
</script>
