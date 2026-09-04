<script setup lang="ts">
import { inject, watch, onMounted, onUnmounted } from 'vue'
import { Printer } from 'lucide-vue-next'
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import { useStationTicketPrint } from '~/composables/useStationTicketPrint'
import { formatTableQrPayment } from '~/composables/formatTableQrPayment'
import { notifyTableSessionUpdated, storeTableQrPaymentIntent } from '~/composables/useTableSessionSync'
import { useNotifications } from '~/composables/useNotifications'
import { normalizeTimezone } from '~/utils/bogotaDate'

definePageMeta({ layout: 'dashboard', module: 'despacho' })

const { t } = useI18n({ useScope: 'global' })

useHead({ title: () => t('despacho.head.pedidoMesa') })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const cache = useQueryCache()
const { markAsRead, notifications } = useNotifications()
const requestId = computed(() => route.params.id as string)
const { formatCurrency, numberLocaleTag } = useFormatters()
const { timezone } = useTenantTimezone()
const { businessProfile, currentTenant } = useTenantReactive()

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
  tenant_timezone?: string | null
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
const requestTimezone = computed(() => normalizeTimezone(request.value?.tenant_timezone ?? timezone.value))
const tenantDateTimeFormatter = computed(() => new Intl.DateTimeFormat(numberLocaleTag.value, {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: requestTimezone.value,
}))
const formatRequestDateTime = (value: string | null | undefined) =>
  value ? tenantDateTimeFormatter.value.format(new Date(value)) : t('despacho.common.notSpecified')
const isPending = computed(() => request.value?.status === 'pending')
const isLoading = computed(() => !requestResponse.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && requestResponse.value != null)
const paymentLabel = computed(() => request.value ? formatTableQrPayment(request.value, { t }) : '—')

const isWorking = ref(false)
const actionError = ref<string | null>(null)
const rejectReason = ref('')
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

    toast.success(t('despacho.detail.acceptedToast', { table: acceptedTableName }), { title: t('despacho.detail.acceptedToastTitle') })
    if (res.data?.order_number) {
      toast.success(t('despacho.detail.sentToKitchen', { number: res.data.order_number }), { title: t('despacho.detail.sentToKitchenTitle') })
    }
    await dismissTableQrNotification(requestId.value)
    invalidateAfterAction()
    await router.replace(pendingListRoute)
  } catch (err: any) {
    const detail = err?.data?.detail
    actionError.value = typeof detail === 'string'
      ? detail
      : detail?.message ?? t('despacho.detail.acceptError')
  } finally {
    isWorking.value = false
  }
}

async function rejectRequest() {
  if (!request.value || isWorking.value || !isPending.value) return
  const reason = rejectReason.value.trim()
  if (!reason) {
    actionError.value = t('despacho.detail.rejectReasonPlaceholder')
    return
  }
  isWorking.value = true
  actionError.value = null
  try {
    await $fetch(`/api/table-qr-requests/${requestId.value}/reject`, {
      method: 'PATCH',
      body: { reason },
    })
    toast.success(t('despacho.detail.rejectedToast'), { title: t('despacho.comandas.done') })
    await dismissTableQrNotification(requestId.value)
    invalidateAfterAction()
    await router.replace(pendingListRoute)
  } catch (err: any) {
    const detail = err?.data?.detail
    actionError.value = typeof detail === 'string'
      ? detail
      : detail?.message ?? t('despacho.detail.rejectError')
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
  return item.product_name ?? t('despacho.common.productFallback')
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

const businessName = computed(() =>
  businessProfile.value?.display_name
  || currentTenant.value?.name
  || 'WARO'
)

const comandaPrintPayload = computed<ComandaPrintPayload[]>(() => {
  const req = request.value
  if (!req) return []
  return [{
    id: req.id,
    comanda_number: `QR-${req.id.slice(0, 8)}`,
    station_name: t('despacho.detail.tableQrStation'),
    table_display_name: req.table_name,
    fired_at: req.created_at,
    items: req.items.map(item => ({
      kitchen_name: itemDisplayName(item),
      quantity: itemQuantity(item),
      modifiers_snapshot: item.modifiers?.map(mod => ({
        name: mod.name,
        price: mod.price,
        quantity: modifierQuantity(mod),
      })) ?? [],
      notes: item.notes ?? null,
    })),
  }]
})

const canPrintComanda = computed(() =>
  !!request.value && comandaPrintPayload.value.some(comanda => comanda.items.length > 0),
)

const comandaPrintQueueOverride = ref<ComandaPrintPayload[] | null>(null)
const comandaTicketsForPrint = computed(
  () => comandaPrintQueueOverride.value ?? comandaPrintPayload.value,
)
const { printComandas: printComandasRouted, getCachedResolveMap } = useStationTicketPrint()

async function printQrComanda() {
  if (!canPrintComanda.value) return
  const queue = comandaPrintPayload.value
  const cached = getCachedResolveMap()
  if (typeof cached !== 'undefined') {
    const hasPrinter = cached && (cached.resolved_caja || Object.values(cached.resolved).some(Boolean))
    if (!hasPrinter) {
      document.body.classList.add('printing-comanda')
      comandaPrintQueueOverride.value = queue
      await nextTick()
      const earlyCleanup = () => {
        document.body.classList.remove('printing-comanda')
        window.removeEventListener('afterprint', earlyCleanup)
        comandaPrintQueueOverride.value = null
      }
      window.addEventListener('afterprint', earlyCleanup, { once: true })
      setTimeout(earlyCleanup, 4000)
      window.print()
      return
    }
  }
  document.body.classList.add('printing-comanda')
  void document.body.offsetHeight
  const syncBrowserPrint = typeof window !== 'undefined' ? window.print.bind(window) : () => {}
  let browserPrintFiredSync = false
  const cleanup = () => {
    document.body.classList.remove('printing-comanda')
    window.removeEventListener('afterprint', cleanup)
    comandaPrintQueueOverride.value = null
  }
  const mode = await printComandasRouted(queue, {
    setQueue: (c) => { comandaPrintQueueOverride.value = c },
    browserPrint: () => { browserPrintFiredSync = true; syncBrowserPrint() },
  })
  if (mode === 'bridge') {
    cleanup()
    return
  }
  window.addEventListener('afterprint', cleanup, { once: true })
  setTimeout(cleanup, 4000)
  if (!browserPrintFiredSync) syncBrowserPrint()
}
</script>

<template>
  <div class="page-layout">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div v-else-if="fetchError" class="text-center py-16 px-4">
      <h2 class="text-lg font-semibold text-foreground">{{ t('despacho.detail.unavailableTitle') }}</h2>
      <p class="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
        {{ t('despacho.detail.unavailableBody') }}
      </p>
      <UiButton class="mt-6" @click="goBack">
        {{ t('despacho.detail.backToList') }}
      </UiButton>
    </div>

    <div v-else-if="request" class="space-y-6">
      <div class="bg-white border border-border rounded-xl overflow-hidden">
        <div class="px-4 py-3.5 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <span class="text-base font-bold text-primary">{{ request.table_name?.[0]?.toUpperCase() || '?' }}</span>
            </div>
            <div class="min-w-0">
              <h2 class="text-lg font-bold text-text-primary truncate leading-snug">{{ request.table_name }}</h2>
              <p class="text-xs text-text-secondary leading-snug">{{ t('despacho.detail.tableQrStation') }}</p>
            </div>
          </div>
          <div class="text-end flex-shrink-0">
            <p class="text-lg font-bold text-primary tabular-nums leading-snug">{{ formatCurrency(request.total_amount) }}</p>
            <p class="text-xs text-text-secondary leading-snug">{{ t('despacho.common.total') }}</p>
          </div>
        </div>

        <dl class="grid grid-cols-2 lg:grid-cols-4 border-t border-border">
          <div class="px-4 py-3 border-b lg:border-b-0 border-e border-border min-w-0">
            <dt class="text-xs text-text-secondary mb-1">{{ t('despacho.common.table') }}</dt>
            <dd class="m-0 text-sm font-semibold text-text-primary truncate">{{ request.table_name }}</dd>
          </div>
          <div class="px-4 py-3 border-b lg:border-b-0 lg:border-e border-border min-w-0">
            <dt class="text-xs text-text-secondary mb-1">{{ t('despacho.common.date') }}</dt>
            <dd class="m-0 text-sm font-semibold text-text-primary tabular-nums">{{ formatRequestDateTime(request.created_at) }}</dd>
          </div>
          <div class="px-4 py-3 border-b lg:border-b-0 border-e border-border min-w-0">
            <dt class="text-xs text-text-secondary mb-1">{{ t('despacho.common.payment') }}</dt>
            <dd class="m-0 text-sm font-semibold text-text-primary truncate">{{ paymentLabel }}</dd>
          </div>
          <div class="px-4 py-3 border-b lg:border-b-0 min-w-0">
            <dt class="text-xs text-text-secondary mb-1">{{ t('despacho.common.items') }}</dt>
            <dd class="m-0 text-sm font-semibold text-text-primary tabular-nums">{{ request.items?.length ?? 0 }}</dd>
          </div>
        </dl>
      </div>

      <div
        v-if="request && !isPending"
        class="bg-state-warning/10 border border-state-warning-border/40 rounded-xl p-4 sm:p-6"
      >
        <p class="text-sm font-medium text-text-primary">
          {{ t('despacho.detail.alreadyProcessed') }}
        </p>
        <UiButton class="mt-4" variant="secondary" @click="goBack">
          {{ t('despacho.detail.backToList') }}
        </UiButton>
      </div>

      <div v-else-if="isPending" class="bg-surface border border-border rounded-xl p-4 sm:p-6">
        <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">{{ t('despacho.detail.actions') }}</p>
        <div class="space-y-3 mb-4">
          <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wider">{{ t('despacho.detail.rejectReason') }}</p>
          <textarea
            v-model="rejectReason"
            rows="3"
            maxlength="500"
            :placeholder="t('despacho.detail.rejectReasonPlaceholder')"
            class="w-full min-h-[88px] rounded-lg border-2 border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-status-critical-text/50"
          />
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <UiButton size="lg" :disabled="isWorking" @click="acceptRequest">
            {{ isWorking ? t('despacho.detail.processing') : t('despacho.detail.acceptOrder') }}
          </UiButton>
          <UiButton variant="destructive" size="lg" :disabled="isWorking || !rejectReason.trim()" @click="rejectRequest">
            {{ isWorking ? t('despacho.detail.processing') : t('despacho.detail.reject') }}
          </UiButton>
          <UiButton
            variant="crocus-outline"
            size="lg"
            class="gap-2"
            :disabled="isWorking || !canPrintComanda"
            :aria-label="t('despacho.common.printComanda')"
            :title="t('despacho.common.printComanda')"
            @click="printQrComanda"
          >
            <Printer class="h-4 w-4" aria-hidden="true" />
            <span>{{ t('despacho.common.print') }}</span>
          </UiButton>
        </div>
        <p v-if="actionError" role="alert" class="mt-3 text-sm text-destructive">{{ actionError }}</p>
      </div>

      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="p-6 border-b border-border">
          <h2 class="text-lg font-semibold text-text-primary">
            {{ t('despacho.detail.orderItemsTitle', { count: request.item_count }) }}
          </h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <caption class="sr-only">{{ t('despacho.detail.tableOrderItemsCaption') }}</caption>
            <thead class="bg-surface-secondary">
              <tr>
                <th class="px-6 py-3 text-start text-xs font-semibold text-text-primary uppercase tracking-wider">{{ t('despacho.common.product') }}</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-text-primary uppercase tracking-wider">{{ t('despacho.common.quantityShort') }}</th>
                <th class="px-6 py-3 text-end text-xs font-semibold text-text-primary uppercase tracking-wider">{{ t('despacho.common.price') }}</th>
                <th class="px-6 py-3 text-end text-xs font-semibold text-text-primary uppercase tracking-wider">{{ t('despacho.common.subtotal') }}</th>
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
                  <td class="px-6 py-4 text-end">
                    <span class="text-sm font-medium text-text-primary">{{ formatCurrency(itemUnitPrice(item)) }}</span>
                  </td>
                  <td class="px-6 py-4 text-end">
                    <span class="text-sm font-bold text-primary">{{ formatCurrency(itemSubtotal(item)) }}</span>
                  </td>
                </tr>

                <tr
                  v-for="mod in item.modifiers"
                  :key="`mod-${item.product_id}-${mod.id}`"
                  class="bg-surface-secondary/30"
                >
                  <td class="px-6 py-2 ps-14">
                    <div class="flex items-center gap-2">
                      <span class="text-primary text-xs">+</span>
                      <span class="text-xs text-text-secondary">{{ mod.name }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-2 text-center">
                    <span class="text-xs text-text-tertiary">x{{ formatQuantity(modifierQuantity(mod)) }}</span>
                  </td>
                  <td class="px-6 py-2 text-end">
                    <span class="text-xs text-text-secondary">{{ formatCurrency(modifierUnitPrice(mod)) }}</span>
                  </td>
                  <td class="px-6 py-2 text-end">
                    <span class="text-xs text-primary/70">{{ formatCurrency(modifierSubtotal(mod)) }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot class="bg-surface-secondary border-t-2 border-border">
              <tr>
                <td colspan="3" class="px-6 py-4 text-end text-sm font-semibold text-text-primary">
                  {{ t('despacho.common.orderTotal') }}
                </td>
                <td class="px-6 py-4 text-end">
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
        <p class="text-xs font-semibold text-info uppercase tracking-wider mb-2">{{ t('despacho.detail.customerNotes') }}</p>
        <p class="text-sm text-text-primary">{{ request.customer_notes }}</p>
      </div>
    </div>

    <PosComandaPrintTickets
      :comandas="comandaTicketsForPrint"
      :business-name="businessName"
    />
  </div>
</template>
