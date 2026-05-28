<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { $fetch } from 'ofetch'
import type { CachedProduct, TabItem } from '~/stores/usePOSStore'
import { usePOSStore } from '~/stores/usePOSStore'
import { useOpenSale } from '~/composables/useOpenSale'
import { registerTableSessionRefresh } from '~/composables/useTableSessionSync'
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import {
  mapComandasForPrint,
  orderItemIdsFromComandas,
  parseFireTableResponse,
  printComandaTickets,
} from '~/composables/useComandaPrint'

definePageMeta({
  layout: 'dashboard',
  module: 'pos',
})

useHead({ title: 'Punto de Venta' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const { singular: tableSingular, plural: tablePlural } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())
const tablePluralLower = computed(() => tablePlural.value.toLowerCase())

const router = useRouter()
const toast = useToast()
const posStore = usePOSStore()
const { tabItems: storeTabItems, tabTotal: storeTabTotal, activeTableSession } = storeToRefs(posStore)

// Clear session at setup time (before first render) so showFloorPlan is correct immediately.
// If navigating from a POS sub-page (checkout, producto), posNavigation flag preserves the session.
if (typeof window !== 'undefined' && sessionStorage.getItem('posNavigation') !== 'true') {
  posStore.exitSession()
}

// ── POS restaurant context (BFF aggregator) ────────────────────────────────
// Single endpoint gated under Module.POS; replaces direct /api/tenant/* reads.
// `tables_enabled` lives on tenant_public_profiles and is included in the
// aggregator payload. /api/api/tenant/public-profile is now owner-only (MI_NEGOCIO).
const { data: settingsData, asyncStatus: settingsAsyncStatus } = useQuery({
  key: () => ['pos', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/pos/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// localStorage persistence — instant view decision on tenant switch, no loader flash
const tablesStorageKey = (tenantId: string) => `waro_pos_tables_${tenantId}`

// On tenant change: reset tablesEnabled and re-read from localStorage for the new tenant.
// Without the reset, a stale value from the previous tenant blocks the floor plan from showing.
watch(() => currentTenant.value?.id, (tenantId) => {
  if (!tenantId) return
  posStore.tablesEnabled = null // reset so isResolvingSettings shows loader while re-resolving
  const stored = localStorage.getItem(tablesStorageKey(tenantId))
  if (stored !== null) posStore.tablesEnabled = stored === '1'
}, { immediate: true })

// Sync from fresh query data — also saves to localStorage for next visit
// immediate: true so that if the cache is already 'idle' when POS mounts (e.g. after
// toggling tables in mesas.vue which calls refreshProfile()), we still overwrite any
// stale localStorage value instead of leaving tablesEnabled at the old cached state.
watch(settingsAsyncStatus, (status) => {
  if (status !== 'idle') return
  const enabled = settingsData.value?.data?.tables_enabled
  // When profile is missing (null response) or tables_enabled is unset, default to false.
  // Without this, posStore.tablesEnabled stays null → isResolvingSettings = true forever.
  const resolved = (enabled === undefined || enabled === null) ? false : enabled
  posStore.tablesEnabled = resolved
  if (currentTenant.value?.id) {
    localStorage.setItem(tablesStorageKey(currentTenant.value.id), resolved ? '1' : '0')
  }
}, { immediate: true })

// ── Tables prefetch — same key as MesasFloorPlan so they share the cache entry ──
// Fetching here (parent) ensures data is ready before MesasFloorPlan mounts,
// eliminating the empty-grid flash caused by the child's query starting cold.
const { status: tablesStatus } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables'),
  enabled: () => posStore.tablesEnabled === true && !!currentTenant.value,
  staleTime: 0,
})

// isEnteringTable blocks showFloorPlan while the session fetch is in flight
// (prevents the floor plan from remounting between clearAll() and setTableSession())
const isEnteringTable = ref(false)
// noTablesConfigured: set when MesasFloorPlan emits 'no-tables' (feature enabled but 0 tables).
// Reset on tenant change so a fresh check runs for the new tenant.
const noTablesConfigured = ref(false)
watch(() => currentTenant.value?.id, () => { noTablesConfigured.value = false })

const showFloorPlan = computed(() =>
  posStore.tablesEnabled === true &&
  !noTablesConfigured.value &&
  !posStore.activeTableSession &&
  !isEnteringTable.value &&
  tablesStatus.value !== 'pending'
)
const isResolvingSettings = computed(() => {
  if (!currentTenant.value) return false
  if (posStore.tablesEnabled === null) return true
  // While settings are still fetching we don't know the final value of tablesEnabled —
  // show loader instead of the products grid to avoid a flash of the wrong view
  if (settingsAsyncStatus.value === 'loading') return true
  if (posStore.tablesEnabled === true && tablesStatus.value === 'pending' && !posStore.activeTableSession) return true
  return false
})

// ── KDS / Comandas feature flag ─────────────────────────────────────────────
const comandasEnabled = computed(() => settingsData.value?.data?.comandas_enabled === true)

// Issue #537 — expediter mode (waiter advances comanda state from POS)
const expediterEnabled = computed(() => settingsData.value?.data?.expediter_enabled === true)

// Issue #574 — waiter attribution (per-session override + auto-handoff)
const waiterAttributionEnabled = computed(() => settingsData.value?.data?.waiter_attribution_enabled === true)
const tenantMembers = computed(() => (settingsData.value?.data as any)?.members ?? [])

// Issue #575 — per-order chip in cart (bar + counter only; mesa uses #574 session override)
const showServedByChip = computed(() =>
  waiterAttributionEnabled.value && !isMesaMode.value,
)

// Effective waiter id for the active session — used by the banner chip.
const bannerEffectiveWaiterId = computed(() =>
  posStore.activeTableSession?.effectiveWaiterMemberId ?? null,
)
const isChangingSessionWaiter = ref(false)
// Rotating "Asignando mesero..." copy while the PATCH is in flight —
// same UX pattern as the progressive-load indicator in the dashboard
// header (UiLoadingDots + cycling phrase).
const {
  currentPhrase: waiterChipLoadingPhrase,
  start: startWaiterChipPhrases,
  stop: stopWaiterChipPhrases,
} = useLoadingPhrases([
  'Asignando mesero...',
  'Sincronizando...',
  'Aplicando cambios...',
])
watch(isChangingSessionWaiter, (loading) => {
  if (loading) startWaiterChipPhrases()
  else stopWaiterChipPhrases()
})
const handleChangeSessionWaiter = async (event: Event) => {
  if (isChangingSessionWaiter.value) return
  if (!posStore.activeTableSession) return
  const target = event.target as HTMLSelectElement
  const newMemberId = target.value || null
  isChangingSessionWaiter.value = true
  try {
    const result = await $fetch<{ success: boolean; data: { attended_by_member_id: string | null; attended_by_member_name: string | null } }>(
      `/api/pos/tables/${posStore.activeTableSession.tableId}/session-waiter`,
      { method: 'PATCH', body: { member_id: newMemberId } },
    )
    // Refresh session info so banner reflects the new effective waiter
    const sessionData = await $fetch<{ success: boolean; data: any }>(
      `/api/tables/${posStore.activeTableSession.tableId}/current`,
    )
    const s = sessionData?.data?.session
    if (s && posStore.activeTableSession) {
      posStore.setTableSession({
        ...posStore.activeTableSession,
        attendedByMemberId: s.attended_by_member_id ?? null,
        attendedByMemberName: s.attended_by_member_name ?? null,
        effectiveWaiterMemberId: s.effective_waiter_member_id ?? null,
        effectiveWaiterMemberName: s.effective_waiter_member_name ?? null,
      })
    }
    toast.success(
      newMemberId ? `Mesero: ${result.data.attended_by_member_name}` : 'Sin mesero asignado',
      { title: 'Actualizado' },
    )
  } catch (error: any) {
    if (error?.statusCode === 403 || error?.response?.status === 403) {
      toast.error(
        'Solo el mesero actual o un supervisor pueden cambiar la asignación',
        { title: 'No permitido' },
      )
    } else {
      toast.error(error?.data?.detail || 'Error al cambiar mesero', { title: 'Error' })
    }
    // Reset the select to current value to avoid showing stale selection
    target.value = posStore.activeTableSession?.effectiveWaiterMemberId ?? ''
  } finally {
    isChangingSessionWaiter.value = false
  }
}
const showExpediterPanel = ref(false)
const readyComandasCount = ref(0)
let readyCountInterval: ReturnType<typeof setInterval> | null = null
const refreshReadyComandasCount = async () => {
  if (!expediterEnabled.value || !comandasEnabled.value) {
    readyComandasCount.value = 0
    return
  }
  try {
    const res = await $fetch<{ success: boolean; data: any[] }>(
      '/api/api/comandas?status=ready&source_type=table,pos',
    )
    readyComandasCount.value = (res?.data ?? []).length
  } catch {
    // silent — non-critical
  }
}
watch(
  () => expediterEnabled.value && comandasEnabled.value,
  (on) => {
    if (on) {
      refreshReadyComandasCount()
      readyCountInterval = setInterval(refreshReadyComandasCount, 30_000)
    } else if (readyCountInterval) {
      clearInterval(readyCountInterval)
      readyCountInterval = null
    }
  },
  { immediate: true },
)

// ── Kitchen service mode (mesa + barra with comandas) ─────────────────────
// Bar without comandas stays cart-only (“venta directa”). #799
const isKitchenServiceMode = computed(
  () =>
    !!posStore.activeTableSession
    && (!posStore.activeTableSession?.isBar || comandasEnabled.value),
)
const isMesaMode = computed(
  () => !!posStore.activeTableSession && !posStore.activeTableSession?.isBar,
)

// ── Unfired counts — tab vs cart (#807) ───────────────────────────────────
// Banner uses tab + cart; kitchen send is only via Agregar y enviar (tab/add auto-fires).
const tabUnfiredCount = computed(() => {
  if (!isKitchenServiceMode.value) return 0
  return storeTabItems.value.filter((i: TabItem) => i.fulfillmentStatus === 'new').length
})

const unfiredCount = computed(() => {
  if (!comandasEnabled.value) return 0
  if (!posStore.activeTableSession) {
    return posStore.cart.length
  }
  if (isKitchenServiceMode.value) {
    return tabUnfiredCount.value + posStore.cart.length
  }
  return 0
})

const openSaleModalOpen = ref(false)
const openSaleModalRef = ref<{ clearSubmitting: () => void } | null>(null)
const {
  openSaleProduct,
  showOpenSaleButton,
  showOpenSaleOnMesa,
  openSaleEnabled,
  openSaleDisabledReason,
  validateOpenSaleAmount,
  buildOpenSaleCartLine,
  buildOpenSaleTabItem,
} = useOpenSale({
  settingsData,
  isMesaMode,
  activeTableSession,
})

/** Carrito/tab vacíos con venta libre activa → CTA primario (#806). */
const openSalePrimaryIdle = computed(
  () =>
    openSaleEnabled.value
    && posStore.cart.length === 0
    && (!isKitchenServiceMode.value || storeTabItems.value.length === 0),
)

const showBarProcessOrder = computed(
  () =>
    isKitchenServiceMode.value
    && !!posStore.activeTableSession?.isBar
    && !openSaleEnabled.value
    && posStore.cart.length > 0,
)

const showOpenSaleInPanel = computed(
  () => showOpenSaleButton.value || showOpenSaleOnMesa.value,
)
const isAddingToTab = ref(false)
const isLoadingTabItems = ref(false)
const isClearingTab = ref(false)
const tabError = ref<string | null>(null)
const tabSuccess = ref<string | null>(null)

// #753 — kitchen ticket print after fire
const lastFiredComandasRaw = ref<unknown[]>([])
const comandasForPrint = ref<ComandaPrintPayload[]>([])
const selectedTabItemIds = ref<string[]>([])
const posBusinessName = computed(
  () => settingsData.value?.data?.business_name
    ?? settingsData.value?.data?.display_name
    ?? 'WARO',
)
const canPrintComandas = computed(() => comandasForPrint.value.length > 0)

/** Tab lines from the last fire batch — checkboxes select tickets to re-print (#812). */
const printableOrderItemIds = computed(
  () => orderItemIdsFromComandas(lastFiredComandasRaw.value),
)

const showPrintItemSelection = computed(
  () =>
    comandasEnabled.value
    && isKitchenServiceMode.value
    && canPrintComandas.value
    && printableOrderItemIds.value.size > 0,
)

const comandasForPrintDisplay = computed(() => {
  const sel = selectedTabItemIds.value
  const raw = lastFiredComandasRaw.value
  if (!Array.isArray(raw) || sel.length === 0) {
    return comandasForPrint.value
  }
  const selSet = new Set(sel)
  const filteredRaw = (raw as Record<string, unknown>[])
    .map((c) => {
      const items = ((c.items as Record<string, unknown>[]) ?? []).filter(
        (i) => i.order_item_id != null && selSet.has(String(i.order_item_id)),
      )
      return { ...c, items }
    })
    .filter((c) => ((c.items as unknown[]) ?? []).length > 0)
  return mapComandasForPrint(filteredRaw)
})

function toggleTabItemSelection(orderItemId: string) {
  const idx = selectedTabItemIds.value.indexOf(orderItemId)
  if (idx >= 0) {
    selectedTabItemIds.value = selectedTabItemIds.value.filter(id => id !== orderItemId)
  } else {
    selectedTabItemIds.value = [...selectedTabItemIds.value, orderItemId]
  }
}

function applyFireResult(rawComandas: unknown[], firedCount: number) {
  if (rawComandas.length > 0) {
    lastFiredComandasRaw.value = rawComandas
    comandasForPrint.value = mapComandasForPrint(rawComandas)
  }
  const firedIds = orderItemIdsFromComandas(rawComandas)
  if (firedCount > 0 && posStore.activeTableSession) {
    posStore.setTabItems(
      storeTabItems.value.map((item: TabItem) => {
        const shouldMarkSent = firedIds.size > 0
          ? firedIds.has(item.orderItemId)
          : item.fulfillmentStatus === 'new'
        return shouldMarkSent
          ? { ...item, fulfillmentStatus: 'sent' as const, sentAt: new Date().toISOString() }
          : item
      }),
    )
    selectedTabItemIds.value = []
  }
}

function handlePrintComandas() {
  if (!comandasForPrintDisplay.value.length) return
  printComandaTickets()
}

// Issue warocol.com#708 — invalidate in-flight GET /current responses after tab mutations.
let tableSessionFetchGen = 0
const bumpTableSessionFetchGen = () => {
  tableSessionFetchGen += 1
  return tableSessionFetchGen
}

const mapTabItemsFromApi = (rows: any[]): TabItem[] =>
  rows.map((i: any) => ({
    orderItemId: i.id,
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.subtotal,
    notes: i.notes ?? null,
    fulfillmentStatus: i.fulfillmentStatus ?? 'new',
    sentAt: i.sentAt ?? null,
  }))

const applyTableSessionFromApi = (
  data: { session?: any; tab_items?: any[] } | undefined,
  fetchGen: number,
  tableCtx?: { tableId: string; tableName: string; isBar?: boolean },
) => {
  if (fetchGen !== tableSessionFetchGen || !data?.session) return
  const tableId = tableCtx?.tableId ?? posStore.activeTableSession?.tableId
  if (!tableId) return
  const s = data.session
  posStore.setTableSession({
    tableId,
    sessionId: s.id,
    tableName: tableCtx?.tableName ?? posStore.activeTableSession?.tableName ?? '',
    runningTotal: s.running_total,
    openedAt: s.opened_at,
    isBar: tableCtx?.isBar ?? posStore.activeTableSession?.isBar ?? false,
    attendedByMemberId: s.attended_by_member_id ?? null,
    attendedByMemberName: s.attended_by_member_name ?? null,
    effectiveWaiterMemberId: s.effective_waiter_member_id ?? null,
    effectiveWaiterMemberName: s.effective_waiter_member_name ?? null,
  })
  posStore.setTabItems(mapTabItemsFromApi(data.tab_items ?? []))
}

// Handle enter-table event from floor plan component
const handleEnterTable = async (ctx: { tableId: string; sessionId: string; tableName: string; isBar?: boolean; gotoCheckout?: boolean }) => {
  isEnteringTable.value = true
  posStore.clearAll()
  posStore.setTableSession({
    tableId: ctx.tableId,
    sessionId: ctx.sessionId,
    tableName: ctx.tableName,
    runningTotal: 0,
    openedAt: '',
    isBar: ctx.isBar ?? false,
  })
  bumpTableSessionFetchGen()
  isLoadingTabItems.value = true
  const fetchGen = tableSessionFetchGen
  try {
    const session = await $fetch<{ success: boolean; data: any }>(
      `/api/tables/${ctx.tableId}/current`
    )
    applyTableSessionFromApi(session?.data, fetchGen, {
      tableId: ctx.tableId,
      tableName: ctx.tableName,
      isBar: ctx.isBar ?? false,
    })
  } catch {
    // Session may have closed — enter normal POS mode
  } finally {
    isEnteringTable.value = false
    isLoadingTabItems.value = false
    if (ctx.gotoCheckout && posStore.activeTableSession) {
      sessionStorage.setItem('posNavigation', 'true')
      router.push('/pos/checkout')
    }
  }
}

// Refresh session running total + tab items from the backend
const isRefreshingSession = ref(false)
const refreshTableSession = async () => {
  if (!posStore.activeTableSession) return
  isRefreshingSession.value = true
  const fetchGen = tableSessionFetchGen
  try {
    const session = await $fetch<{ success: boolean; data: any }>(
      `/api/tables/${posStore.activeTableSession.tableId}/current`
    )
    applyTableSessionFromApi(session?.data, fetchGen)
  } catch {
    // Non-critical — banner will just show stale data
  } finally {
    isRefreshingSession.value = false
  }
}

const tabItemsLoading = ref<Set<string>>(new Set())

const isTableSessionMutationActive = () =>
  isAddingToTab.value
  || isRefreshingSession.value
  || isClearingTab.value
  || tabItemsLoading.value.size > 0

registerTableSessionRefresh(
  () => refreshTableSession(),
  { isMutationActive: isTableSessionMutationActive },
)

// Issue #956 — unified destructive-action confirmation with required motivo
type DestructiveFlow =
  | { kind: 'remove-tab-item'; orderItemId: string }
  | { kind: 'decrease-tab-item'; orderItemId: string; quantity: number }
  | { kind: 'clear-cart' }
  | { kind: 'remove-cart-item'; index: number }
  | { kind: 'release-table' }
  | { kind: 'clear-bar-tab' }

const destructiveFlow = ref<DestructiveFlow | null>(null)
const destructiveLoading = ref(false)
const destructiveError = ref('')

const destructiveModalOpen = computed({
  get: () => destructiveFlow.value !== null,
  set: (open: boolean) => {
    if (!open && !destructiveLoading.value) {
      destructiveFlow.value = null
      destructiveError.value = ''
    }
  },
})

const isTabItemFired = (orderItemId: string) => {
  const item = storeTabItems.value.find((i: TabItem) => i.orderItemId === orderItemId)
  return !!(item && item.fulfillmentStatus && item.fulfillmentStatus !== 'new')
}

const destructiveModalTitle = computed(() => {
  const flow = destructiveFlow.value
  if (!flow) return ''
  switch (flow.kind) {
    case 'remove-tab-item':
      return '¿Eliminar producto?'
    case 'decrease-tab-item':
      return '¿Reducir cantidad?'
    case 'clear-cart':
      return posStore.activeTableSession ? '¿Limpiar la cuenta?' : '¿Limpiar carrito?'
    case 'remove-cart-item':
      return '¿Eliminar producto?'
    case 'release-table':
      return `¿Liberar la ${tableSingularLower.value}?`
    case 'clear-bar-tab':
      return '¿Limpiar la barra?'
    default:
      return '¿Confirmar acción?'
  }
})

const destructiveModalMessage = computed(() => {
  const flow = destructiveFlow.value
  if (!flow) return ''
  switch (flow.kind) {
    case 'remove-tab-item': {
      const item = storeTabItems.value.find((i: TabItem) => i.orderItemId === flow.orderItemId)
      const name = item?.productName ?? 'Este producto'
      if (comandasEnabled.value && isTabItemFired(flow.orderItemId)) {
        return `${name} ya fue enviado a cocina. Se notificará al cocinero que lo anule.`
      }
      return `Se eliminará ${name} de la cuenta.`
    }
    case 'decrease-tab-item': {
      const item = storeTabItems.value.find((i: TabItem) => i.orderItemId === flow.orderItemId)
      const name = item?.productName ?? 'Este producto'
      return `${name} ya fue enviado a cocina. Se notificará al cocinero del cambio de cantidad.`
    }
    case 'clear-cart':
      return posStore.activeTableSession
        ? `Se borrarán todos los ítems pendientes de la ${tableSingularLower.value} y del carrito.`
        : 'Se borrarán todos los productos del carrito actual.'
    case 'remove-cart-item': {
      const item = posStore.cart[flow.index]
      return item ? `Se eliminará ${item.product.name} del carrito.` : 'Se eliminará este producto del carrito.'
    }
    case 'release-table': {
      const session = posStore.activeTableSession
      if (session && session.runningTotal > 0) {
        return `Esta ${tableSingularLower.value} tiene ${formatCurrencyPOS(session.runningTotal)} en consumo. Si la liberas ahora, se cerrará sin cobrar.`
      }
      return `Se cerrará la ${tableSingularLower.value} sin cobrar.`
    }
    case 'clear-bar-tab':
      return 'Se borrarán todos los ítems pendientes de la barra. La sesión permanece abierta.'
    default:
      return ''
  }
})

const destructiveModalConfirmLabel = computed(() => {
  const flow = destructiveFlow.value
  if (!flow) return 'Confirmar'
  switch (flow.kind) {
    case 'remove-tab-item':
    case 'remove-cart-item':
      return 'Sí, eliminar'
    case 'decrease-tab-item':
      return 'Sí, reducir'
    case 'clear-cart':
      return 'Sí, limpiar'
    case 'release-table':
      return `Sí, liberar ${tableSingularLower.value}`
    case 'clear-bar-tab':
      return 'Sí, limpiar'
    default:
      return 'Confirmar'
  }
})

const destructiveModalVariant = computed(() =>
  destructiveFlow.value?.kind === 'release-table' ? 'warning' as const : 'destructive' as const,
)

const pendingRemoveItemId = computed(() =>
  destructiveFlow.value?.kind === 'remove-tab-item' ? destructiveFlow.value.orderItemId : null,
)

const removeTabItem = (orderItemId: string) => {
  if (!posStore.activeTableSession) return
  if (comandasEnabled.value && isTabItemFired(orderItemId)) {
    destructiveError.value = ''
    destructiveFlow.value = { kind: 'remove-tab-item', orderItemId }
    return
  }
  void executeRemoveTabItem(orderItemId)
}

const destructiveFetchError = (e: unknown, fallback: string): string => {
  const err = e as { data?: { message?: string; detail?: string | unknown } }
  const detail = err?.data?.detail
  return err?.data?.message
    ?? (typeof detail === 'string' ? detail : null)
    ?? (typeof detail === 'object' && detail ? String(detail) : null)
    ?? fallback
}

const cancelDestructiveFlow = () => {
  if (destructiveLoading.value) return
  destructiveFlow.value = null
  destructiveError.value = ''
}

const confirmDestructiveFlow = async (reason: string) => {
  const flow = destructiveFlow.value
  if (!flow) return
  destructiveLoading.value = true
  destructiveError.value = ''
  try {
    switch (flow.kind) {
      case 'remove-tab-item':
        await executeRemoveTabItem(flow.orderItemId, reason)
        break
      case 'decrease-tab-item':
        await updateTabItemQuantity(flow.orderItemId, flow.quantity, reason)
        break
      case 'clear-cart':
        await executeClearCart(reason)
        break
      case 'remove-cart-item':
        await executeRemoveFromCart(flow.index, reason)
        break
      case 'release-table':
        await executeBannerClose(reason)
        break
      case 'clear-bar-tab':
        await executeClearBarTab(reason)
        break
    }
    if (!destructiveError.value) {
      destructiveFlow.value = null
    }
  } finally {
    destructiveLoading.value = false
  }
}

const executeRemoveTabItem = async (orderItemId: string, reason?: string) => {
  if (!posStore.activeTableSession) return
  const previousTabItems = storeTabItems.value
  bumpTableSessionFetchGen()
  posStore.setTabItems(previousTabItems.filter((i: TabItem) => i.orderItemId !== orderItemId))
  tabItemsLoading.value = new Set([...tabItemsLoading.value, orderItemId])
  try {
    await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/items/${orderItemId}`, {
      method: 'DELETE',
      body: { reason: reason ?? null },
    })
    await refreshTableSession()
  } catch (e: any) {
    bumpTableSessionFetchGen()
    posStore.setTabItems(previousTabItems)
    const beMessage = e?.data?.message
      ?? (typeof e?.data?.detail === 'string' ? e.data.detail : null)
      ?? e?.data?.detail
    const errText = beMessage ?? 'Error al eliminar el producto'
    if (destructiveFlow.value?.kind === 'remove-tab-item') {
      destructiveError.value = errText
    } else {
      tabError.value = errText
    }
  } finally {
    const next = new Set(tabItemsLoading.value)
    next.delete(orderItemId)
    tabItemsLoading.value = next
  }
}

const updateTabItemQuantity = async (orderItemId: string, quantity: number, reason?: string) => {
  if (!posStore.activeTableSession) return
  bumpTableSessionFetchGen()
  tabItemsLoading.value = new Set([...tabItemsLoading.value, orderItemId])
  try {
    await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/items/${orderItemId}`, {
      method: 'PATCH',
      body: reason ? { quantity, reason } : { quantity },
    })
    await refreshTableSession()
  } catch (e: any) {
    const errText = e?.data?.detail ?? 'Error al actualizar la cantidad'
    if (destructiveFlow.value?.kind === 'decrease-tab-item') {
      destructiveError.value = errText
    } else {
      tabError.value = errText
    }
  } finally {
    const next = new Set(tabItemsLoading.value)
    next.delete(orderItemId)
    tabItemsLoading.value = next
  }
}

const incrementTabItem = (orderItemId: string) => {
  const item = storeTabItems.value.find(t => t.orderItemId === orderItemId)
  if (item) updateTabItemQuantity(orderItemId, item.quantity + 1)
}

const decrementTabItem = (orderItemId: string) => {
  const item = storeTabItems.value.find(t => t.orderItemId === orderItemId)
  if (!item || item.quantity <= 1) return
  const newQuantity = item.quantity - 1
  if (comandasEnabled.value && isTabItemFired(orderItemId)) {
    destructiveError.value = ''
    destructiveFlow.value = { kind: 'decrease-tab-item', orderItemId, quantity: newQuantity }
    return
  }
  void updateTabItemQuantity(orderItemId, newQuantity)
}

const addToTab = async () => {
  if (!posStore.activeTableSession || posStore.cart.length === 0 || isAddingToTab.value) return
  bumpTableSessionFetchGen()
  isAddingToTab.value = true
  tabError.value = null
  try {
    const items = posStore.cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: Number(item.product.price),
      modifiers: item.modifiers.map((m) => ({ id: m.id, name: m.name, price: m.price })),
      notes: item.notes ?? null,
    }))
    const addRes = await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/add`, {
      method: 'POST',
      body: { items },
    })
    // Clear cart — items committed to tab
    await posStore.clearCart()
    // tab/add already auto-fires when comandas enabled; use its payload for print (#753)
    if (comandasEnabled.value) {
      const { comandas, fired_items_count } = parseFireTableResponse(addRes as any)
      if (comandas.length > 0 || fired_items_count > 0) {
        applyFireResult(comandas, fired_items_count)
        if (fired_items_count > 0) {
          tabSuccess.value = `${fired_items_count} ${fired_items_count === 1 ? 'ítem enviado' : 'ítems enviados'} a cocina`
          setTimeout(() => { tabSuccess.value = null }, 3000)
        }
      }
    }
    // Refresh session + tab items
    await refreshTableSession()
  } catch (e: any) {
    tabError.value = e?.data?.detail ?? `Error al agregar a la ${tableSingularLower.value}`
  } finally {
    isAddingToTab.value = false
  }
}

const requestBill = () => {
  if (!posStore.activeTableSession) return
  sessionStorage.setItem('posNavigation', 'true')
  router.push('/pos/checkout')
}

const cache = useQueryCache()


// ── Move table ─────────────────────────────────────────────────────────────
const moveTableSource = ref<{ tableId: string; sessionId: string; tableName: string } | null>(null)
const showMoveModal = ref(false)

const { data: tablesQueryData } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables'),
  enabled: () => posStore.tablesEnabled === true && !!currentTenant.value,
  staleTime: 0,
})

const tablesForModal = computed(() =>
  (tablesQueryData.value?.data ?? []).filter((t: any) => !t.is_bar),
)

const handleMoveTable = (ctx: { tableId: string; sessionId: string; tableName: string }) => {
  moveTableSource.value = ctx
  showMoveModal.value = true
}

const handleMoveDone = async (result: { targetTableId: string; targetSessionId: string; targetTableName: string }) => {
  showMoveModal.value = false
  // If the user is inside the moved table's session, update posStore so the banner reflects the new table
  if (posStore.activeTableSession?.tableId === moveTableSource.value?.tableId) {
    posStore.setTableSession({
      ...posStore.activeTableSession,
      tableId: result.targetTableId,
      sessionId: result.targetSessionId,
      tableName: result.targetTableName,
    })
  }
  moveTableSource.value = null
  // Invalidate tables cache so floor plan reflects source → free, target → open
  cache.invalidateQueries({ key: ['tables', currentTenant.value?.id] })
}

// ── Liberar mesa from the active-mesa banner ───────────────────────────────
const isBannerClosing = computed(() =>
  destructiveLoading.value && destructiveFlow.value?.kind === 'release-table',
)

const handleBannerCerrar = () => {
  if (!posStore.activeTableSession) return
  destructiveError.value = ''
  destructiveFlow.value = { kind: 'release-table' }
}

const executeBannerClose = async (reason: string) => {
  const session = posStore.activeTableSession
  if (!session) return
  try {
    await $fetch(`/api/tables/${session.tableId}/close`, {
      method: 'POST',
      body: { reason: reason.trim() || null },
    })
  } catch (e: unknown) {
    destructiveError.value = destructiveFetchError(e, `Error al liberar la ${tableSingularLower.value}`)
    return
  }
  posStore.clearAll()
  cache.invalidateQueries({ key: ['tables', currentTenant.value?.id] })
}

const executeClearBarTab = async (reason: string) => {
  const session = posStore.activeTableSession
  if (!session || posStore.isCancellingMesa) return
  posStore.isCancellingMesa = true
  try {
    await $fetch(`/api/tables/${session.tableId}/tab`, {
      method: 'DELETE',
      body: { reason: reason.trim() || null },
    })
    posStore.clearAll()
    cache.invalidateQueries({ key: ['tables', currentTenant.value?.id] })
  } catch (e: unknown) {
    destructiveError.value = destructiveFetchError(e, 'Error al limpiar la barra')
  } finally {
    posStore.isCancellingMesa = false
  }
}

const handleReleaseMesa = () => {
  const session = posStore.activeTableSession
  if (!session) return
  destructiveError.value = ''
  destructiveFlow.value = session.isBar
    ? { kind: 'clear-bar-tab' }
    : { kind: 'release-table' }
}

const formatDuration = (openedAt: string): string => {
  const diffMs = Date.now() - new Date(openedAt).getTime()
  const totalMins = Math.floor(diffMs / 60_000)
  if (totalMins < 60) return `${totalMins}m`
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const formatCurrencyPOS = (amount: number): string =>
  `$${Math.round(amount).toLocaleString('es-CO')}`

// State
const searchQuery = ref('')
const selectedCategory = ref('all')

// Load products from API
const { data: productsData, status: productsStatus, asyncStatus: productsAsyncStatus, error: productsError, refetch } = useQuery({
  key: () => ['pos', 'products', currentTenant.value?.id],
  query: () => $fetch('/api/menu/products', {
    params: {
      is_available: true,
      limit: 250,
      include_modifiers: true  // POS context - includes resale products
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const loadingProducts = computed(() => productsStatus.value === 'pending')
const isRefreshing = computed(() => productsAsyncStatus.value === 'loading' && productsData.value != null)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)
registerProgressiveLoading(isRefreshingSession)

// Clear POS state when tenant changes
watch(() => currentTenant.value?.id, () => { posStore.clearAll() })

// Cachear productos con modificadores cuando cargan
watch(() => productsData.value, (data) => {
  if (data?.data) {
    const productsToCache: CachedProduct[] = data.data
      .filter((p: any) => !p.open_priced)
      .map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price) || 0,
      image: '🍽️',  // Emoji fallback shown when image_url is missing/empty
      image_url: p.image_url || null,  // Issue #465 — real image when uploaded
      category: p.category_name || p.category?.name || 'Sin categoría',
      is_available: p.is_available,
      is_resale: p.is_resale || false,
      modifier_groups: p.modifier_groups || []
    }))
    posStore.setProducts(productsToCache)
  }
}, { immediate: true })

// Map products to POS format
const products = computed(() => {
  if (!productsData.value?.data) return []

  return productsData.value.data
    .filter((p: any) => !p.open_priced)
    .map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category_name || p.category?.name || 'Sin categoría',
    image: '🍽️',
    image_url: p.image_url || null,
    available: p.is_available,
    is_resale: p.is_resale || false
  }))
})

const categories = computed(() => {
  const cats = new Set(products.value.map(p => p.category))
  return ['all', ...Array.from(cats)]
})

const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'all' || product.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

// Use store for cart data
const cartItemsCount = computed(() => posStore.cartItemsCount)
const cartTotal = computed(() => posStore.cartTotal)

// Navigate to product customization page or add directly to cart
const selectProduct = async (product: any) => {
  // Resale products don't need modifiers - add directly to cart
  if (product.is_resale) {
    await posStore.addToCart({
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category
      },
      quantity: 1,
      modifiers: [],
      is_resale: true
    })
    return
  }

  // Regular products - navigate to customization page
  sessionStorage.setItem('posNavigation', 'true')
  router.push(`/pos/producto/${product.id}`)
}

// Navigate to edit cart item
const editCartItem = (cartIndex: number, productId: string) => {
  const item = posStore.cart[cartIndex]
  if (item?.is_open_sale) return
  sessionStorage.setItem('posNavigation', 'true')
  router.push(`/pos/producto/${productId}?edit=${cartIndex}`)
}

const handleOpenSaleClick = () => {
  if (!openSaleEnabled.value) {
    toast.warning(openSaleDisabledReason.value ?? 'Venta libre no disponible', { title: 'Venta libre' })
    return
  }
  openSaleModalOpen.value = true
}

const addOpenSaleToTab = async (amount: number, description?: string) => {
  if (!posStore.activeTableSession || isAddingToTab.value) return
  bumpTableSessionFetchGen()
  isAddingToTab.value = true
  tabError.value = null
  try {
    const tabItem = buildOpenSaleTabItem(amount, description)
    const addRes = await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/add`, {
      method: 'POST',
      body: { items: [tabItem] },
    })
    if (comandasEnabled.value) {
      const { comandas, fired_items_count } = parseFireTableResponse(addRes as any)
      if (comandas.length > 0 || fired_items_count > 0) {
        applyFireResult(comandas, fired_items_count)
        if (fired_items_count > 0) {
          tabSuccess.value = `${fired_items_count} ${fired_items_count === 1 ? 'ítem enviado' : 'ítems enviados'} a cocina`
          setTimeout(() => { tabSuccess.value = null }, 3000)
        }
      }
    }
    await refreshTableSession()
  } catch (e: any) {
    tabError.value = e?.data?.detail ?? e?.data?.message ?? `Error al agregar a la ${tableSingularLower.value}`
    throw e
  } finally {
    isAddingToTab.value = false
  }
}

const handleOpenSaleConfirm = async (payload: { amount: number; description?: string }) => {
  try {
    const amount = validateOpenSaleAmount(payload.amount)
    if (isKitchenServiceMode.value) {
      await addOpenSaleToTab(amount, payload.description)
      openSaleModalOpen.value = false
      toast.success(`Agregado a la ${tableSingularLower.value}`, { title: 'Venta libre' })
      return
    }
    const line = buildOpenSaleCartLine(amount, payload.description)
    await posStore.addToCart(line)
    openSaleModalOpen.value = false
    toast.success('Agregado al carrito', { title: 'Venta libre' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'No se pudo agregar la venta libre'
    toast.error(typeof err === 'object' && err && 'data' in err
      ? (err as any).data?.detail ?? message
      : message, { title: 'Venta libre' })
    openSaleModalRef.value?.clearSubmitting()
  }
}

const removeFromCart = async (index: number) => {
  await posStore.removeFromCart(index)
}

const executeRemoveFromCart = async (index: number, reason: string) => {
  await posStore.removeFromCart(index, reason)
}

const incrementCartItem = async (index: number) => {
  await posStore.updateQuantity(index, 1)
}

const decrementCartItem = async (index: number) => {
  const item = posStore.cart[index]
  if (item && item.quantity <= 1) {
    await removeFromCart(index)
    return
  }
  await posStore.updateQuantity(index, -1)
}

const duplicateCartItem = async (index: number) => {
  await posStore.duplicateCartItem(index)
}

const clearCart = () => {
  destructiveError.value = ''
  destructiveFlow.value = { kind: 'clear-cart' }
}

const executeClearCart = async (reason: string) => {
  const session = posStore.activeTableSession
  if (session) {
    bumpTableSessionFetchGen()
    isClearingTab.value = true
    try {
      await $fetch(`/api/tables/${session.tableId}/tab`, {
        method: 'DELETE',
        body: { reason: reason.trim() || null },
      })
      posStore.setTabItems([])
      if (posStore.activeTableSession) {
        posStore.setTableSession({
          ...posStore.activeTableSession,
          runningTotal: 0,
          isBar: posStore.activeTableSession.isBar,
        })
      }
    } catch (e: unknown) {
      destructiveError.value = destructiveFetchError(
        e,
        posStore.activeTableSession
          ? `Error al limpiar la ${tableSingularLower.value}`
          : 'Error al limpiar la cuenta',
      )
      return
    } finally {
      isClearingTab.value = false
    }
  }
  try {
    await posStore.clearCart(reason)
  } catch (e: unknown) {
    destructiveError.value = destructiveFetchError(e, 'Error al limpiar el carrito')
  }
}

const processOrder = async () => {
  // Esperar a que todas las operaciones pendientes terminen (duplicar, agregar, etc.)
  await posStore.waitForPendingOperations()

  // Mark that we're navigating within POS
  sessionStorage.setItem('posNavigation', 'true')

  // Navigate to checkout page (cliente se pide al finalizar)
  router.push('/pos/checkout')
}

// ── Table session sync (QR accept / cross-device updates, warocol.com#715) ───
const SESSION_SYNC_MS = 15_000
let sessionSyncInterval: ReturnType<typeof setInterval> | null = null

const startSessionSyncPolling = () => {
  if (sessionSyncInterval) return
  sessionSyncInterval = setInterval(async () => {
    if (!posStore.activeTableSession) return
    if (isTableSessionMutationActive()) return
    await refreshTableSession()
  }, SESSION_SYNC_MS)
}

const stopSessionSyncPolling = () => {
  if (sessionSyncInterval) {
    clearInterval(sessionSyncInterval)
    sessionSyncInterval = null
  }
}

watch(
  () => !!posStore.activeTableSession,
  (active) => {
    if (active) startSessionSyncPolling()
    else stopSessionSyncPolling()
  },
  { immediate: true },
)

// ── Fulfillment status polling ───────────────────────────────────────────────
let fulfillmentPollInterval: ReturnType<typeof setInterval> | null = null

const startFulfillmentPolling = () => {
  if (fulfillmentPollInterval) return
  fulfillmentPollInterval = setInterval(async () => {
    if (!comandasEnabled.value || !posStore.activeTableSession) return
    if (isTableSessionMutationActive()) return
    const fetchGen = tableSessionFetchGen
    try {
      const session = await $fetch<{ success: boolean; data: any }>(
        `/api/tables/${posStore.activeTableSession.tableId}/current`
      )
      applyTableSessionFromApi(session?.data, fetchGen)
    } catch {
      // Non-critical — polling fails silently
    }
  }, 10_000)
}

const stopFulfillmentPolling = () => {
  if (fulfillmentPollInterval) {
    clearInterval(fulfillmentPollInterval)
    fulfillmentPollInterval = null
  }
}

// Start/stop polling when comandas session becomes active/inactive
watch(
  () => comandasEnabled.value && !!posStore.activeTableSession,
  (active) => {
    if (active) startFulfillmentPolling()
    else stopFulfillmentPolling()
  }
)

// Register contextual refresh handler:
// - mesa active → refresh tab items from backend
// - floor plan → MesasFloorPlan registers its own handler on mount
watch(
  () => posStore.activeTableSession,
  (session) => {
    if (session) setRefreshHandler(refreshTableSession)
    // else: MesasFloorPlan will register when it mounts
  },
  { immediate: true }
)

// Provide cart data to layout
onMounted(async () => {
  provide('posCartItemsCount', cartItemsCount)

  // Start polling if already in a comandas-enabled session on mount
  if (comandasEnabled.value && posStore.activeTableSession) {
    startFulfillmentPolling()
  }

  // posNavigation flag: set when navigating to POS sub-pages (checkout, producto)
  // exitSession() was already called at setup time for fresh entries
  if (sessionStorage.getItem('posNavigation') === 'true') {
    sessionStorage.removeItem('posNavigation')
  } else {
    // Check for pending customer from /ventas page (only on fresh entry)
    const pendingCustomer = sessionStorage.getItem('pendingSaleCustomer')
    if (pendingCustomer) {
      try {
        posStore.setCustomer(JSON.parse(pendingCustomer))
        sessionStorage.removeItem('pendingSaleCustomer')
      } catch {
        // ignore
      }
    }
  }
})

onUnmounted(() => {
  setRefreshHandler(undefined)
  stopSessionSyncPolling()
  stopFulfillmentPolling()
  if (readyCountInterval) clearInterval(readyCountInterval)
})
</script>

<template>
  <!-- Settings resolving — show loader while we don't know if tables are enabled -->
  <div v-if="isResolvingSettings" class="flex items-center justify-center min-h-[70vh]">
    <CommonsTheCustomLoader size="large" />
  </div>

  <!-- Floor plan view -->
  <div v-else-if="showFloorPlan">
    <PosMesasFloorPlan
      :comandas-enabled="comandasEnabled"
      :waiter-attribution-enabled="waiterAttributionEnabled"
      @enter-table="handleEnterTable"
      @no-tables="noTablesConfigured = true"
      @move-table="handleMoveTable"
    />
    <!-- Modal uses Teleport to="body" internally — safe to nest here -->
    <PosMoveTableModal
      v-if="showMoveModal && moveTableSource"
      :show="showMoveModal"
      :source-table="moveTableSource"
      :tables="tablesForModal"
      @close="showMoveModal = false; moveTableSource = null"
      @moved="handleMoveDone"
    />
  </div>

  <!-- POS sales view -->
  <div v-else>
    <!-- Loading State (initial page load) -->
    <div v-if="loadingProducts" class="flex items-center justify-center min-h-[70vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="productsError" />

    <!-- POS Content (shown always after loading) -->
    <div v-else>
      <!-- Mesa Banner skeleton while loading tab items -->
      <div v-if="isLoadingTabItems || isAddingToTab" class="bg-surface border border-border rounded-2xl mb-4 p-3.5 shadow-sm animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-surface-secondary flex-shrink-0" />
          <div class="flex-1 flex items-center gap-3">
            <div class="h-2.5 w-20 bg-surface-secondary rounded" />
            <div class="h-2.5 w-16 bg-surface-secondary rounded" />
            <div class="h-2.5 w-32 bg-surface-secondary rounded" />
          </div>
          <div class="h-7 w-16 bg-surface-secondary rounded-lg flex-shrink-0" />
        </div>
      </div>

      <!-- Barra Banner (bar session — behaves as normal POS) -->
      <div v-else-if="posStore.activeTableSession?.isBar" class="bg-surface border border-amber-300/40 rounded-2xl mb-4 p-3.5 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="bg-amber-50 p-2.5 rounded-xl flex-shrink-0">
            <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21a48.25 48.25 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span class="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex-shrink-0">Barra</span>
            <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
            <span class="text-xs text-text-secondary">
              {{ comandasEnabled ? 'Agregar y enviar a cocina antes de cobrar' : 'Venta directa en barra' }}
            </span>
            <template v-if="comandasEnabled && unfiredCount > 0">
              <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
              <span class="flex items-center gap-1 text-xs font-semibold text-red-600 flex-shrink-0">
                {{ unfiredCount }} {{ unfiredCount === 1 ? 'ítem' : 'ítems' }} sin enviar
              </span>
            </template>
          </div>
          <button
            type="button"
            class="flex-shrink-0 text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-secondary hover:text-text-primary transition-colors"
            @click="posStore.exitSession()"
          >
            Salir
          </button>
        </div>
      </div>

      <!-- Mesa Banner (when arriving from a table session) -->
      <div v-else-if="posStore.activeTableSession" class="bg-surface border border-border rounded-2xl mb-4 p-3.5 shadow-sm">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="bg-status-success-bg p-2.5 rounded-xl flex-shrink-0">
            <svg class="w-4 h-4 text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M3 14h18M10 10V6m4 4V6m-9 8v4m14-4v4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span class="text-[10px] font-bold text-status-success-text uppercase tracking-widest flex-shrink-0">{{ tableSingular }} Activa</span>
            <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
            <span class="text-sm font-bold text-text-primary flex-shrink-0">{{ posStore.activeTableSession.tableName }}</span>
            <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
            <span class="text-xs text-text-secondary tabular-nums truncate">{{ formatCurrencyPOS(posStore.activeTableSession.runningTotal) }} acumulado · {{ formatDuration(posStore.activeTableSession.openedAt) }}</span>
            <template v-if="comandasEnabled && unfiredCount > 0">
              <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
              <span class="flex items-center gap-1 text-xs font-semibold text-red-600 flex-shrink-0">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                {{ unfiredCount }} {{ unfiredCount === 1 ? 'ítem' : 'ítems' }} sin enviar
              </span>
            </template>
          </div>
          <!-- Action buttons: [Mesero ▾ (#574)] · Volver (back to floor plan, keeps session) · Liberar (destructive) -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <!-- Issue #574 — Waiter loading chip — width adapts to the rotating
                 phrase so it doesn't overflow the original chip. Same pattern
                 as the dashboard header progressive-load indicator. -->
            <div
              v-if="waiterAttributionEnabled && isChangingSessionWaiter"
              class="h-9 inline-flex items-center gap-2 px-3 rounded-lg border border-border bg-surface-secondary text-text-secondary text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
              aria-live="polite"
            >
              <UiLoadingDots size="7px" color="currentColor" />
              <span>{{ waiterChipLoadingPhrase }}</span>
            </div>
            <!-- Issue #574 — Idle waiter chip with auto-handoff dropdown -->
            <div v-else-if="waiterAttributionEnabled" class="relative">
              <select
                :value="bannerEffectiveWaiterId || ''"
                aria-label="Cambiar mesero de la sesión activa"
                class="h-9 inline-flex items-center leading-none pl-7 pr-7 rounded-lg border border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-1 appearance-none bg-none cursor-pointer [&::-ms-expand]:hidden"
                style="background-image: none; -webkit-appearance: none; -moz-appearance: none; text-align-last: center;"
                :class="bannerEffectiveWaiterId ? 'text-text-primary' : 'text-text-secondary italic'"
                @change="handleChangeSessionWaiter"
              >
                <option value="">Sin mesero</option>
                <option
                  v-for="m in tenantMembers"
                  :key="m.id"
                  :value="m.id"
                >
                  {{ m.name }}
                </option>
              </select>
              <!-- User icon (overlapping left) -->
              <svg
                class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 flex-shrink-0 text-text-secondary"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                stroke="currentColor" aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <!-- Caret (overlapping right) -->
              <svg
                class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                stroke="currentColor" aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
            <!-- Volver — clears local activeTableSession; the showFloorPlan computed switches view. Session stays open in backend. -->
            <button
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              class="h-9 inline-flex items-center gap-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2.5 rounded-lg border border-border hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :aria-label="`Volver al plano de ${tablePluralLower} (la ${tableSingularLower} sigue abierta)`"
              @click="posStore.clearAll()"
            >
              <svg class="h-3.5 w-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              Volver
            </button>
            <!-- Liberar — destructive: closes the session via confirm modal -->
            <button
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              class="h-9 inline-flex items-center gap-1.5 text-[10px] font-bold text-status-error-text uppercase tracking-wider px-2.5 rounded-lg border border-status-error-text/30 hover:bg-status-error-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-status-error-text focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :aria-label="`Liberar la ${tableSingularLower}`"
              @click="handleReleaseMesa"
            >
              <UiLoadingDots v-if="isBannerClosing || posStore.isCancellingMesa" size="6px" />
              <template v-else>
                <svg class="h-3.5 w-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Liberar
              </template>
            </button>
          </div>
        </div>

        <!-- Tab error -->
        <p v-if="tabError" class="mt-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-1.5">
          {{ tabError }}
        </p>
        <!-- Tab success (fire to kitchen) -->
        <p v-if="tabSuccess" class="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5 border border-emerald-200">
          {{ tabSuccess }}
        </p>
      </div>

      <!-- Customer Header (when customer is identified and no mesa mode) -->
      <div v-else-if="posStore.currentCustomer" class="bg-crocus-600/5 border border-crocus-500/25 rounded-xl mb-4 p-4">
        <div class="flex items-center gap-3">
          <div class="bg-crocus-600/10 p-3 rounded-xl border border-crocus-500/20 flex-shrink-0">
            <svg class="w-5 h-5 text-crocus-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p class="text-[10px] font-bold text-crocus-600 uppercase tracking-widest">
              Cliente Actual
            </p>
            <p class="text-base font-bold text-text-primary leading-tight">
              {{ posStore.currentCustomer.name || 'Sin nombre' }}
            </p>
            <p class="text-xs text-text-secondary mt-0.5">
              📱 {{ posStore.currentCustomer.phone_number }}
            </p>
          </div>
        </div>
      </div>


      <!-- Main POS Container -->
    <div class="flex flex-col lg:flex-row gap-4 md:gap-6 lg:max-h-[calc(100vh-10rem)]">
      <!-- Products Panel (Left) -->
      <div class="flex-1 flex flex-col space-y-4 lg:overflow-hidden">
        <!-- Search and Filters -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1">
            <UiSearchBar
              v-model="searchQuery"
              placeholder="Buscar productos..."
            />
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            v-for="cat in categories"
            :key="cat"
            class="px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap theme-transition"
            :class="selectedCategory === cat
              ? 'bg-text-primary text-white shadow-md'
              : 'bg-surface border border-border text-text-secondary hover:border-border hover:text-text-primary hover:bg-surface-secondary'"
            @click="selectedCategory = cat"
          >
            {{ cat === 'all' ? 'Todos' : cat }}
          </button>
        </div>

        <!-- Products Grid -->
        <div class="flex-1 overflow-y-auto">
          <!-- Empty State -->
          <div v-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-text-secondary">
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-lg font-medium">No hay productos disponibles</p>
            <p class="text-sm mt-1">Agrega productos desde el menú</p>
          </div>

          <!-- Products Grid -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-2 md:gap-4 p-1 pb-4">
            <PosProductCard
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
              @select="selectProduct"
            />
          </div>
        </div>
      </div>

      <!-- Cart Panel (Right on Desktop, Below on Mobile/Tablet) -->
      <PosCartPanel
        :items="posStore.cart"
        :total="cartTotal"
        :mesa-mode="isKitchenServiceMode"
        :show-open-sale="showOpenSaleInPanel"
        :open-sale-enabled="openSaleEnabled"
        :open-sale-primary-idle="openSalePrimaryIdle"
        :open-sale-tooltip="openSaleDisabledReason"
        :show-bar-process-order="showBarProcessOrder"
        :is-adding-to-tab="isAddingToTab"
        :is-loading-tab-items="isLoadingTabItems"
        :is-clearing-tab="isClearingTab"
        :tab-items="storeTabItems"
        :tab-total="storeTabTotal"
        :tab-items-loading="tabItemsLoading"
        :comandas-enabled="comandasEnabled"
        :unfired-count="unfiredCount"
        :show-print-item-selection="showPrintItemSelection"
        :printable-order-item-ids="[...printableOrderItemIds]"
        :can-print-comandas="canPrintComandas"
        :selected-tab-item-ids="selectedTabItemIds"
        :pending-remove-item-id="pendingRemoveItemId"
        :show-served-by-chip="showServedByChip"
        :served-by-member-id="posStore.cartServedByMemberId"
        :members="tenantMembers"
        @edit-item="editCartItem"
        @remove-item="removeFromCart"
        @increment-item="incrementCartItem"
        @decrement-item="decrementCartItem"
        @duplicate-item="duplicateCartItem"
        @process-order="processOrder"
        @open-sale="handleOpenSaleClick"
        @clear-cart="clearCart"
        @add-to-tab="addToTab"
        @request-bill="requestBill"
        @remove-tab-item="removeTabItem"
        @increment-tab-item="incrementTabItem"
        @decrement-tab-item="decrementTabItem"
        @print-comandas="handlePrintComandas"
        @toggle-tab-selection="toggleTabItemSelection"
        @update:served-by="(id) => posStore.setCartServedBy(id)"
      />
      </div>
    </div>
  </div>

  <!-- Issue #956 — destructive POS actions (motivo required) -->
  <PosDestructiveReasonModal
    v-model="destructiveModalOpen"
    :title="destructiveModalTitle"
    :message="destructiveModalMessage"
    :confirm-label="destructiveModalConfirmLabel"
    :variant="destructiveModalVariant"
    :loading="destructiveLoading"
    :error="destructiveError"
    @confirm="confirmDestructiveFlow"
    @cancel="cancelDestructiveFlow"
  />

  <PosOpenSaleModal
    ref="openSaleModalRef"
    v-model="openSaleModalOpen"
    :shell-name="openSaleProduct?.name"
    :confirm-label="isMesaMode ? `Agregar a la ${tableSingularLower}` : 'Agregar al carrito'"
    @confirm="handleOpenSaleConfirm"
  />

  <!-- Issue #537 — Expediter chip teleported into the dashboard header so it
       never overlaps content. Icon-only on mobile, icon + label on sm+.
       Sits just left of the refresh button (header-actions portal renders
       before the refresh in the layout). -->
  <ClientOnly>
    <Teleport to="#dashboard-header-actions">
      <button
        v-if="expediterEnabled && comandasEnabled"
        type="button"
        :aria-label="readyComandasCount > 0 ? `Estado de comandas — ${readyComandasCount} listas` : 'Estado de comandas'"
        :title="readyComandasCount > 0 ? `${readyComandasCount} comanda${readyComandasCount === 1 ? '' : 's'} lista${readyComandasCount === 1 ? '' : 's'}` : 'Estado de comandas'"
        class="relative inline-flex items-center gap-2 h-11 rounded-lg border-2 border-surface-secondary bg-white text-text-primary text-sm font-medium hover:bg-surface-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary mr-1.5 md:mr-2 px-2.5 sm:px-3 md:px-4"
        :class="readyComandasCount > 0 ? 'ring-1 ring-emerald-300/60' : ''"
        @click="showExpediterPanel = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <path d="m9 14 2 2 4-4"/>
        </svg>
        <span class="hidden sm:inline text-sm font-medium">Comandas</span>
        <!-- Count badge: numeric on sm+, dot indicator on mobile -->
        <span
          v-if="readyComandasCount > 0"
          class="hidden sm:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold tabular-nums"
        >
          {{ readyComandasCount }}
        </span>
        <span
          v-if="readyComandasCount > 0"
          class="sm:hidden absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-surface"
          aria-hidden="true"
        >
          {{ readyComandasCount > 9 ? '9+' : readyComandasCount }}
        </span>
      </button>
    </Teleport>
  </ClientOnly>

  <PosComandasEstadoPanel
    v-if="expediterEnabled && comandasEnabled"
    v-model="showExpediterPanel"
    :table-session-id="posStore.activeTableSession?.tableId ?? null"
    :table-display-name="posStore.activeTableSession?.tableName ?? null"
    @success="refreshReadyComandasCount"
  />

  <PosComandaPrintTickets
    v-if="comandasEnabled"
    :comandas="comandasForPrintDisplay"
    :business-name="posBusinessName"
  />

</template>
