<template>
  <div class="page-layout">
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="error" />

    <div v-else class="w-full mx-auto">
      <PaymentsPaymentForm
        :purchases="payables"
        :payable-kind="payableKind"
        @cancel="navigateTo('/finanzas/pagos')"
        @paid="handlePaid"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { ref, onMounted } from 'vue'
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
const payables = ref<any[]>([])
const payableKind = ref<'purchase' | 'expense'>('purchase')

const { currentTenant } = useTenantReactive()

async function loadPayables() {
  loading.value = true
  error.value = null

  const expenseIdsParam = route.query.expenseIds as string | undefined
  const idsParam = (route.query.ids as string) || ''

  if (!expenseIdsParam && !idsParam) {
    error.value = t('finanzas.pagos.noneSpecified')
    loading.value = false
    return
  }

  try {
    if (expenseIdsParam) {
      payableKind.value = 'expense'
      const ids = expenseIdsParam.split(',').filter(Boolean)
      const results = await Promise.all(
        ids.map(id =>
          $fetch(`/api/finance/expenses/${id}`).catch((err) => {
            console.error(`Error fetching expense ${id}:`, err)
            return null
          }),
        ),
      )
      const found = results.filter(r => r !== null && (r as any).data).map(r => (r as any).data)
      if (found.length === 0) {
        error.value = t('finanzas.pagos.notFound')
      } else {
        payables.value = found
        if (found.length !== ids.length) {
          useToast().warning(t('finanzas.pagos.someLoadError'), { title: t('finanzas.pagos.warning') })
        }
      }
    } else {
      payableKind.value = 'purchase'
      const ids = idsParam.split(',').filter(Boolean)
      const results = await Promise.all(
        ids.map(id =>
          $fetch(`/api/suppliers/purchases/${id}`).catch((err) => {
            console.error(`Error fetching purchase ${id}:`, err)
            return null
          }),
        ),
      )
      const found = results.filter(r => r !== null && (r as any).data).map(r => (r as any).data)
      if (found.length === 0) {
        error.value = t('finanzas.pagos.notFound')
      } else {
        payables.value = found
        if (found.length !== ids.length) {
          useToast().warning(t('finanzas.pagos.someLoadError'), { title: t('finanzas.pagos.warning') })
        }
      }
    }
  } catch (err: any) {
    console.error('Error loading payables:', err)
    error.value = err.data?.detail || err.message || t('finanzas.pagos.loadError')
  } finally {
    loading.value = false
  }
}

async function handlePaid() {
  await navigateTo('/finanzas/pagos?refresh=true')
}

const { setRefreshHandler } = useLayoutActions()

onMounted(() => {
  setRefreshHandler(loadPayables)
  loadPayables()
})
</script>
