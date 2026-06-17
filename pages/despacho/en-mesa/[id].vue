<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted } from 'vue'
import { formatTableQrPayment } from '~/composables/formatTableQrPayment'
import { notifyTableSessionUpdated, storeTableQrPaymentIntent } from '~/composables/useTableSessionSync'
import { useNotifications } from '~/composables/useNotifications'

definePageMeta({ layout: 'dashboard' })

useHead({ title: 'Pedido en mesa — WARO' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const cache = useQueryCache()
const { markAsRead, notifications } = useNotifications()
const requestId = computed(() => route.params.id as string)
const { formatDateTime, formatCurrency } = useFormatters()

interface TableQrItem {
  product_id: string
  product_name?: string
  quantity: number
  unit_price?: number
  line_total?: number
  notes?: string | null
  modifiers?: Array<{ id: string; name: string; price?: number; quantity?: number }>
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
const isPending = computed(() => request.value?.status === 'pending')
const isLoading = computed(() => !requestResponse.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && requestResponse.value != null)

const isWorking = ref(false)
const actionError = ref<string | null>(null)
const pendingListRoute = { path: '/despacho/en-mesa' }

function invalidateAfterAction() {
  cache.invalidateQueries({ key: ['table-qr-requests'] })
  cache.invalidateQueries({ key: ['notifications'] })
  cache.invalidateQueries({ key: ['tables'] })
  cache.invalidateQueries({ key: ['pos'] })
  cache.invalidateQueries({ key: ['comandas-monitor'] })
}

async function dismissTableQrNotification(reqId: string) {
  const notif = notifications.value.find(
    n => n.type === 'table_qr_request' && n.payload?.request_id === reqId,
  )
  if (notif) {
    try {
      await markAsRead(notif.id)
    } catch {
      // Server may have already marked it read on accept/reject.
    }
  }
}

async function acceptRequest() {
  if (!request.value || isWorking.value || !isPending.value) return
  const acceptedTableName = request.value.table_name
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

    toast.success(`Se agregó a ${acceptedTableName}`, { title: 'Pedido aceptado' })
    if (res.data?.order_number) {
      toast.success(`Comanda #${res.data.order_number} enviada a cocina`, { title: 'Comanda enviada' })
    }
    await dismissTableQrNotification(requestId.value)
    invalidateAfterAction()
    await router.replace(pendingListRoute)
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
  if (!request.value || isWorking.value || !isPending.value) return
  isWorking.value = true
  actionError.value = null
  try {
    await $fetch(`/api/table-qr-requests/${requestId.value}/reject`, { method: 'PATCH' })
    toast.success('Pedido rechazado', { title: 'Listo' })
    await dismissTableQrNotification(requestId.value)
    invalidateAfterAction()
    await router.replace(pendingListRoute)
  } catch (err: any) {
    const detail = err?.data?.detail
    actionError.value = typeof detail === 'string'
      ? detail
      : detail?.message ?? 'No se pudo rechazar el pedido'
  } finally {
    isWorking.value = false
  }
}

const goBack = () => router.push(pendingListRoute)

const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler = inject<(handler: (() => void) | undefined) => void>('setBackHandler')

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  setShowBackButton?.(true)
  setBackHandler?.(goBack)
  setRefreshHandler(refetch)
  refetch()
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

const itemQuantity = (item: TableQrItem) => {
  const quantity = Number(item.quantity)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

const itemUnitPrice = (item: TableQrItem) => Number(item.unit_price ?? 0)
const itemSubtotal = (item: TableQrItem) => Number(item.line_total ?? 0)

const modifierQuantity = (modifier: NonNullable<TableQrItem['modifiers']>[number]) => {
  const quantity = Number(modifier.quantity)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

const modifierUnitPrice = (modifier: NonNullable<TableQrItem['modifiers']>[number]) =>
  Number(modifier.price ?? 0)

const modifierSubtotal = (modifier: NonNullable<TableQrItem['modifiers']>[number]) =>
  modifierUnitPrice(modifier) * modifierQuantity(modifier)

const formatQuantity = (quantity: number) =>
  quantity % 1 === 0 ? quantity.toFixed(0) : String(quantity)
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

      <div
        v-if="request && !isPending"
        class="bg-state-warning/10 border border-state-warning-border/40 rounded-xl p-4 sm:p-6"
      >
        <p class="text-sm font-medium text-text-primary">
          Este pedido ya fue procesado. Vuelve al listado para ver los pendientes.
        </p>
        <UiButton class="mt-4" variant="secondary" @click="goBack">
          Volver al listado
        </UiButton>
      </div>

      <div v-else-if="isPending" class="bg-surface border border-border rounded-xl p-4 sm:p-6">
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

        <div class="overflow-x-auto">
          <table class="w-full">
            <caption class="sr-only">Items del pedido en mesa</caption>
            <thead class="bg-surface-secondary">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">Producto</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">Cant.</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Precio</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-text-primary uppercase tracking-wider">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <template
                v-for="(item, idx) in request.items"
                :key="`${item.product_id}-${idx}`"
              >
                <tr class="bg-surface hover:bg-surface-secondary/50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-lg flex-shrink-0" aria-hidden="true">
                        🍽️
                      </div>
                      <div class="min-w-0">
                        <span class="text-sm font-semibold text-text-primary">{{ itemDisplayName(item) }}</span>
                        <p v-if="item.notes" class="text-xs italic text-text-secondary mt-1">{{ item.notes }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {{ formatQuantity(itemQuantity(item)) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-medium text-text-primary">{{ formatCurrency(itemUnitPrice(item)) }}</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <span class="text-sm font-bold text-primary">{{ formatCurrency(itemSubtotal(item)) }}</span>
                  </td>
                </tr>

                <tr
                  v-for="mod in item.modifiers"
                  :key="`mod-${item.product_id}-${mod.id}`"
                  class="bg-surface-secondary/30"
                >
                  <td class="px-6 py-2 pl-14">
                    <div class="flex items-center gap-2">
                      <span class="text-primary text-xs">+</span>
                      <span class="text-xs text-text-secondary">{{ mod.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-2 text-center">
                    <span class="text-xs text-text-tertiary">x{{ formatQuantity(modifierQuantity(mod)) }}</span>
                  </td>
                  <td class="px-6 py-2 text-right">
                    <span class="text-xs text-text-secondary">{{ formatCurrency(modifierUnitPrice(mod)) }}</span>
                  </td>
                  <td class="px-6 py-2 text-right">
                    <span class="text-xs text-primary/70">{{ formatCurrency(modifierSubtotal(mod)) }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot class="bg-surface-secondary border-t-2 border-border">
              <tr>
                <td colspan="3" class="px-6 py-4 text-right text-sm font-semibold text-text-primary">
                  Total del pedido:
                </td>
                <td class="px-6 py-4 text-right">
                  <span class="text-xl font-bold text-primary">{{ formatCurrency(request.total_amount) }}</span>
                </td>
              </tr>
            </tfoot>
          </table>
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
