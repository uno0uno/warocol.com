<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted } from 'vue'
import { formatTableQrPayment } from '~/composables/formatTableQrPayment'
import { notifyTableSessionUpdated, storeTableQrPaymentIntent } from '~/composables/useTableSessionSync'

definePageMeta({ layout: 'dashboard' })

useHead({ title: 'Pedido en mesa — WARO' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const cache = useQueryCache()
const requestId = computed(() => route.params.id as string)
const { formatDateTime, formatCurrency } = useFormatters()

interface TableQrItem {
  product_id: string
  product_name?: string
  quantity: number
  unit_price?: number
  line_total?: number
  notes?: string | null
  modifiers?: Array<{ id: string; name: string; price?: number }>
}

interface TableQrRequestDetail {
  id: string
  table_id: string
  table_name: string
  status: string
  items: TableQrItem[]
  item_count: number
  payment_method?: string
  payment_method_id?: string | null
  payment_method_group_name?: string | null
  payment_method_name?: string | null
  payment_display?: string | null
  customer_notes?: string | null
  created_at: string
  total_amount: number
}

const {
  data: requestResponse,
  asyncStatus,
  error: fetchError,
  refetch,
} = useQuery({
  key: () => ['table-qr-requests', requestId.value],
  query: () => $fetch<{ success: boolean; data: TableQrRequestDetail }>(
    `/api/table-qr-requests/${requestId.value}`,
  ),
  enabled: () => !!requestId.value,
})

const request = computed(() => requestResponse.value?.data ?? null)
const isLoading = computed(() => !requestResponse.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && requestResponse.value != null)

const isWorking = ref(false)
const actionError = ref<string | null>(null)

function invalidateAfterAction() {
  cache.invalidateQueries({ key: ['table-qr-requests'] })
  cache.invalidateQueries({ key: ['tables'] })
  cache.invalidateQueries({ key: ['pos'] })
  cache.invalidateQueries({ key: ['comandas-monitor'] })
}

async function acceptRequest() {
  if (!request.value || isWorking.value) return
  isWorking.value = true
  actionError.value = null
  try {
    const res = await $fetch<{
      success: boolean
      data: {
        order_number?: number
        table_id?: string
        payment_method?: string | null
        payment_method_id?: string | null
      }
    }>(`/api/table-qr-requests/${requestId.value}/accept`, { method: 'PATCH' })

    const tableId = res.data?.table_id ?? request.value.table_id
    if (tableId && res.data?.payment_method) {
      storeTableQrPaymentIntent(tableId, {
        payment_method: res.data.payment_method,
        payment_method_id: res.data.payment_method_id ?? null,
      })
    }
    if (tableId) {
      await notifyTableSessionUpdated(tableId)
    }

    toast.success(
      res.data?.order_number
        ? `Pedido aceptado — comanda #${res.data.order_number}`
        : 'Pedido aceptado',
      { title: 'Listo' },
    )
    invalidateAfterAction()
    await router.push('/despacho/en-mesa')
  } catch (err: any) {
    const detail = err?.data?.detail
    actionError.value = typeof detail === 'string'
      ? detail
      : detail?.message ?? 'No se pudo aceptar el pedido'
  } finally {
    isWorking.value = false
  }
}

async function rejectRequest() {
  if (!request.value || isWorking.value) return
  isWorking.value = true
  actionError.value = null
  try {
    await $fetch(`/api/table-qr-requests/${requestId.value}/reject`, { method: 'PATCH' })
    toast.success('Pedido rechazado', { title: 'Listo' })
    invalidateAfterAction()
    await router.push('/despacho/en-mesa')
  } catch (err: any) {
    const detail = err?.data?.detail
    actionError.value = typeof detail === 'string'
      ? detail
      : detail?.message ?? 'No se pudo rechazar el pedido'
  } finally {
    isWorking.value = false
  }
}

const goBack = () => router.push('/despacho/en-mesa')

const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler = inject<(handler: (() => void) | undefined) => void>('setBackHandler')

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
  setRefreshHandler(refetch)
})
registerProgressiveLoading(isRefreshing)

onUnmounted(() => {
  setShowBackButton?.(false)
  setBackHandler?.(undefined)
  clearRefreshHandler(refetch)
})

function itemDisplayName(item: TableQrItem): string {
  return item.product_name ?? 'Producto'
}
</script>

<template>
  <div class="page-layout">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div v-else-if="fetchError" class="text-center py-16 px-4">
      <h2 class="text-lg font-semibold text-foreground">Pedido no disponible</h2>
      <p class="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        El pedido ya fue aceptado, fue rechazado o no existe. Vuelve al listado para ver los pendientes.
      </p>
      <UiButton class="mt-6" @click="goBack">
        Volver al listado
      </UiButton>
    </div>

    <div v-else-if="request" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Mesa</p>
          <p class="text-lg font-bold text-text-primary">{{ request.table_name }}</p>
        </div>

        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Fecha</p>
          <p class="text-lg font-bold text-text-primary">{{ formatDateTime(request.created_at) }}</p>
        </div>

        <div class="bg-surface border border-border rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Pago</p>
          <p class="text-lg font-bold text-text-primary">{{ formatTableQrPayment(request) }}</p>
        </div>

        <div class="bg-surface border-2 border-primary rounded-xl p-4">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Total</p>
          <p class="text-2xl font-bold text-primary">{{ formatCurrency(request.total_amount) }}</p>
        </div>
      </div>

      <div class="bg-surface border border-border rounded-xl p-4 sm:p-6">
        <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Acciones</p>
        <div class="flex flex-col sm:flex-row gap-3">
          <UiButton size="lg" :disabled="isWorking" @click="acceptRequest">
            {{ isWorking ? 'Procesando...' : 'Aceptar pedido' }}
          </UiButton>
          <UiButton variant="destructive" size="lg" :disabled="isWorking" @click="rejectRequest">
            {{ isWorking ? 'Procesando...' : 'Rechazar' }}
          </UiButton>
        </div>
        <p v-if="actionError" role="alert" class="mt-3 text-sm text-destructive">{{ actionError }}</p>
      </div>

      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-text-primary">
            Items ({{ request.item_count }})
          </h2>
        </div>

        <ul class="divide-y divide-border">
          <li
            v-for="(item, idx) in request.items"
            :key="`${item.product_id}-${idx}`"
            class="px-4 sm:px-6 py-4"
          >
            <div class="flex justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-text-primary">
                  <span class="text-primary">{{ item.quantity }}×</span>
                  {{ itemDisplayName(item) }}
                </p>
                <ul v-if="item.modifiers?.length" class="mt-1 space-y-0.5">
                  <li
                    v-for="mod in item.modifiers"
                    :key="mod.id"
                    class="text-xs text-text-secondary pl-3"
                  >
                    + {{ mod.name }}
                    <span v-if="mod.price != null"> · {{ formatCurrency(mod.price) }}</span>
                  </li>
                </ul>
                <p v-if="item.notes" class="text-xs italic text-text-secondary mt-1">{{ item.notes }}</p>
              </div>
              <span class="text-sm font-bold text-primary flex-shrink-0">
                {{ formatCurrency(item.line_total ?? 0) }}
              </span>
            </div>
          </li>
        </ul>

        <div class="px-4 sm:px-6 py-4 bg-surface-secondary border-t-2 border-border flex justify-between items-center">
          <span class="text-sm font-semibold text-text-primary">Total del pedido</span>
          <span class="text-xl font-bold text-primary">{{ formatCurrency(request.total_amount) }}</span>
        </div>
      </div>

      <div
        v-if="request.customer_notes"
        class="bg-info/10 border border-info/20 rounded-xl p-4 sm:p-6"
      >
        <p class="text-xs font-semibold text-info uppercase tracking-wider mb-2">Notas del cliente</p>
        <p class="text-sm text-text-primary">{{ request.customer_notes }}</p>
      </div>
    </div>
  </div>
</template>
