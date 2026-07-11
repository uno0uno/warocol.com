<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="error" />

    <!-- Content -->
    <div v-else class="w-full mx-auto">
      <!-- Form Container -->
      <PaymentsPaymentForm :purchases="purchases" @cancel="navigateTo('/finanzas/pagos')" @paid="handlePaid" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { ref, computed, inject, onMounted } from 'vue'
import { useRoute, navigateTo } from '#app'

definePageMeta({
  layout: 'dashboard',
  title: 'Registrar Pago',
  module: 'finanzas',
})

useHead({ title: () => t('finanzas.pagos.registerTitle') })

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
    error.value = t('finanzas.pagos.noneSpecified')
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
      error.value = t('finanzas.pagos.notFound')
    } else {
      purchases.value = foundPurchases
      
      if (foundPurchases.length !== ids.length) {
        useToast().warning(t('finanzas.pagos.someLoadError'), { title: t('finanzas.pagos.warning') })
      }
    }
    
  } catch (err: any) {
    console.error('Error loading purchases:', err)
    error.value = err.data?.detail || err.message || t('finanzas.pagos.loadError')
  } finally {
    loading.value = false
  }
}

async function handlePaid() {
  await navigateTo('/finanzas/pagos?refresh=true')
}

// Inject refresh handler setter from layout
const { setRefreshHandler } = useLayoutActions()

onMounted(() => {
  setRefreshHandler(loadPurchases)
  loadPurchases()
})
</script>
