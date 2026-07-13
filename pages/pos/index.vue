<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { toNumberLocaleTag } from '~/utils/appLocales'
import { ref, computed, nextTick, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useQueryCache } from '@pinia/colada'
import { $fetch } from 'ofetch'
import type { CachedProduct, TabItem } from '~/stores/usePOSStore'
import { usePOSStore } from '~/stores/usePOSStore'
import { useOpenSale } from '~/composables/useOpenSale'
import { registerTableSessionRefresh } from '~/composables/useTableSessionSync'
import type { ComandaPrintPayload, FireTableResponse } from '~/composables/useComandaPrint'
import {
  mapComandasForPrint,
  orderItemIdsFromComandas,
  parseFireTableResponse,
  printComandaTickets,
} from '~/composables/useComandaPrint'
import { promoBadgeForProduct } from '~/utils/promoProductMatch'
import { usePosOrderPromoTotals } from '~/composables/usePosOrderPromoTotals'

definePageMeta({
  layout: 'dashboard',
  module: 'pos',
})

useHead({ title: () => t('pos.banner.pageTitle') })

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const { singular: tableSingular, plural: tablePlural } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())
const tablePluralLower = computed(() => tablePlural.value.toLowerCase())

const router = useRouter()
const route = useRoute()
const toast = useToast()
const queryCache = useQueryCache()
const posStore = usePOSStore()
const { tabItems: storeTabItems, tabTotal: storeTabTotal, activeTableSession } = storeToRefs(posStore)

const { activePromos, hasActivePromos, activePromoHint } = useActivePromotions()

// Preserve table session when returning to POS (e.g. from another module).
// Only reset on a true fresh entry — sub-page returns use posNavigation flag.
if (typeof window !== 'undefined' && sessionStorage.getItem('posNavigation') !== 'true') {
  if (!posStore.activeTableSession) {
    posStore.exitSession()
  }
}

// ── POS restaurant context (BFF aggregator) ────────────────────────────────
// Single endpoint gated under Module.POS; replaces direct /api/tenant/* reads.
// `tables_enabled` lives on tenant_public_profiles and is included in the
// aggregator payload. /api/api/tenant/public-profile is now owner-only (MI_NEGOCIO).
const { data: settingsData, asyncStatus: settingsAsyncStatus } = useQuery({
  key: () => ['pos', 'restaurant-context', currentTenant.value?.id ?? null],
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
  // Initial fetch only — background refetches must not unmount POS (that retriggers
  // restaurant-context from CartPanel/useActivePromotions and loops forever).
  if (settingsAsyncStatus.value === 'loading' && !settingsData.value) return true
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
  t('pos.banner.assigningWaiter'),
  t('pos.banner.syncing'),
  t('pos.banner.applyingChanges'),
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
      newMemberId ? t('pos.banner.waiterUpdated', { name: result.data.attended_by_member_name }) : t('pos.banner.noWaiterAssigned'),
      { title: t('pos.banner.updated') },
    )
  } catch (error: any) {
    if (error?.statusCode === 403 || error?.response?.status === 403) {
      toast.error(
        t('pos.banner.waiterChangeForbidden'),
        { title: t('pos.banner.notAllowed') },
      )
    } else {
      toast.error(error?.data?.detail || t('pos.banner.waiterChangeError'), { title: t('pos.banner.error') })
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
// Bar with tab lines is cuenta mode even before settings resolve (#1108).
const isKitchenServiceMode = computed(() => {
  const session = posStore.activeTableSession
  if (!session) return false
  if (!session.isBar) return true
  if (storeTabItems.value.length > 0) return true
  return comandasEnabled.value
})
const isMesaMode = computed(
  () => !!posStore.activeTableSession && !posStore.activeTableSession?.isBar,
)

/** Backend confirmed open session (#1105) — avoids /current and tab/add 404 spam. */
const tableSessionBackendReady = ref(false)
const shouldPollTableSession = computed(
  () =>
    isKitchenServiceMode.value
    && tableSessionBackendReady.value
    && !!posStore.activeTableSession,
)

// Customer identification on POS main screen (#1063)
const showCustomerModal = ref(false)
const posCustomerId = computed(() => posStore.currentCustomer?.id ?? '')
const isAnonymousPosCustomer = computed(
  () => posStore.currentCustomer?.phone_number === '0000000000',
)
const { wallet: posCustomerWallet, isLoading: isLoadingPosWallet, isRefreshing: isRefreshingPosWallet, refetch: refetchPosWallet } =
  useCustomerWallet(posCustomerId)
const {
  summary: posWarosSummary,
  isLoadingSummary: isLoadingPosWaros,
  fetchSummary: fetchPosWarosSummary,
  resetSummary: resetPosWarosSummary,
} = useWarosCliente()

watch(posCustomerId, (id) => {
  if (!id || isAnonymousPosCustomer.value) {
    resetPosWarosSummary()
    return
  }
  void fetchPosWarosSummary(id)
  void refetchPosWallet()
}, { immediate: true })

const onPosCustomerIdentified = async (customer: {
  id: string
  name: string | null
  phone_number: string | null
  email: string | null
}) => {
  await posStore.setCustomer(customer as any)
}

const posWarosBalance = computed(() => posWarosSummary.value?.current_balance ?? 0)
const pointsLocale = computed(() => toNumberLocaleTag(normalizeUiLocale(locale.value)))
const posWalletBalance = computed(() => posCustomerWallet.value?.balance_cop ?? 0)
const isPosWalletPending = computed(() => isLoadingPosWallet.value || isRefreshingPosWallet.value)

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
const LAST_FIRED_COMANDAS_TTL_MS = 12 * 60 * 60 * 1000
const persistedComandasRaw = ref<unknown[]>([])
const lastFiredComandasRaw = ref<unknown[]>([])
const printQueueComandas = ref<ComandaPrintPayload[]>([])
const selectedComandaIds = ref<string[]>([])
const lastFiredComandaSessionKey = ref<string | null>(null)
const persistedComandasLoading = ref(false)
const showComandasReprintPanel = ref(false)
const posBusinessName = computed(
  () => settingsData.value?.data?.business_name
    ?? settingsData.value?.data?.display_name
    ?? 'WARO',
)

const currentComandaPrintSessionKey = () => {
  const session = posStore.activeTableSession
  return session ? `${session.tableId}:${session.sessionId}` : null
}

function resetComandaPrintState() {
  persistedComandasRaw.value = []
  selectedComandaIds.value = []
  printQueueComandas.value = []
}

function clearLastFiredComandasState() {
  lastFiredComandasRaw.value = []
  lastFiredComandaSessionKey.value = null
}

const canPrintLatestComanda = computed(
  () =>
    mapComandasForPrint(lastFiredComandasRaw.value).length > 0
    && lastFiredComandaSessionKey.value === currentComandaPrintSessionKey(),
)

const lastFiredComandasStorageKey = () => {
  const tenantId = currentTenant.value?.id
  const session = posStore.activeTableSession
  if (!tenantId || !session?.tableId || !session?.sessionId) return null
  return `waro:pos:last-fired-comandas:${tenantId}:${session.tableId}:${session.sessionId}`
}

function rawComandaId(raw: unknown, index: number): string {
  const c = raw as Record<string, unknown>
  return String(c.id ?? `${c.comanda_number ?? index}:${c.station_name ?? ''}:${c.fired_at ?? ''}`)
}

const persistedComandasForPrintDisplay = computed(() => {
  const sel = selectedComandaIds.value
  if (sel.length === 0) return []
  const raw = persistedComandasRaw.value
  const selSet = new Set(sel)
  const filteredRaw = (raw as Record<string, unknown>[])
    .filter((c, index) => selSet.has(rawComandaId(c, index)))
  return mapComandasForPrint(filteredRaw)
})

const sentComandasForPanel = computed(() => (
  (persistedComandasRaw.value as Record<string, unknown>[]).map((c, index) => {
    const items = ((c.items as Record<string, unknown>[]) ?? [])
    return {
      id: rawComandaId(c, index),
      comandaNumber: String(c.comanda_number ?? '—'),
      stationName: (c.station_name as string) ?? t('pos.banner.noKitchenStation'),
      status: String(c.status ?? ''),
      firedAt: c.fired_at != null ? String(c.fired_at) : null,
      itemCount: items.length,
      itemPreview: items
        .slice(0, 2)
        .map(i => `${Number(i.quantity ?? 1)}x ${String(i.kitchen_name ?? '')}`.trim())
        .filter(Boolean)
        .join(', '),
    }
  })
))

function applyPersistedComandas(rawComandas: unknown[], preserveSelection = true) {
  const printableRaw = (rawComandas as Record<string, unknown>[])
    .filter(c => (((c.items as unknown[]) ?? []).length > 0))
  const ids = printableRaw.map((c, index) => rawComandaId(c, index))
  persistedComandasRaw.value = printableRaw

  if (preserveSelection) {
    const available = new Set(ids)
    selectedComandaIds.value = selectedComandaIds.value.filter(id => available.has(id))
  } else {
    selectedComandaIds.value = []
  }
}

async function refreshPersistedComandas(tableId?: string, fetchGen = tableSessionFetchGen, preserveSelection = true) {
  const activeTableId = tableId ?? posStore.activeTableSession?.tableId
  if (!activeTableId || !comandasEnabled.value || !isKitchenServiceMode.value) {
    resetComandaPrintState()
    return
  }
  persistedComandasLoading.value = true
  try {
    const res = await $fetch<{ success: boolean; data?: { comandas?: unknown[] } }>(`/api/tables/${activeTableId}/comandas`)
    if (fetchGen !== tableSessionFetchGen) return
    applyPersistedComandas(Array.isArray(res?.data?.comandas) ? res.data.comandas : [], preserveSelection)
  } catch (e: unknown) {
    if (isNoOpenSessionError(e)) resetComandaPrintState()
  } finally {
    if (fetchGen === tableSessionFetchGen) persistedComandasLoading.value = false
  }
}

function toggleComandaSelection(comandaId: string) {
  const idx = selectedComandaIds.value.indexOf(comandaId)
  if (idx >= 0) {
    selectedComandaIds.value = selectedComandaIds.value.filter(id => id !== comandaId)
  } else {
    selectedComandaIds.value = [...selectedComandaIds.value, comandaId]
  }
}

function selectAllPersistedComandas() {
  selectedComandaIds.value = sentComandasForPanel.value.map(c => c.id)
}

function clearPersistedComandaSelection() {
  selectedComandaIds.value = []
}

function persistLastFiredComandas(rawComandas: unknown[]) {
  if (typeof window === 'undefined') return
  const key = lastFiredComandasStorageKey()
  if (!key) return
  localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), comandas: rawComandas }))
}

function hydrateLastFiredComandas() {
  if (typeof window === 'undefined') return
  const key = lastFiredComandasStorageKey()
  clearLastFiredComandasState()
  if (!key) return
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as { savedAt?: number; comandas?: unknown[] } | null
    if (!parsed || !Array.isArray(parsed.comandas) || !parsed.savedAt) return
    if (Date.now() - parsed.savedAt > LAST_FIRED_COMANDAS_TTL_MS) {
      localStorage.removeItem(key)
      return
    }
    if (mapComandasForPrint(parsed.comandas).length === 0) return
    lastFiredComandasRaw.value = parsed.comandas
    lastFiredComandaSessionKey.value = currentComandaPrintSessionKey()
  } catch {
    localStorage.removeItem(key)
  }
}

function applyFireResult(rawComandas: unknown[], firedCount: number) {
  if (rawComandas.length > 0) {
    lastFiredComandasRaw.value = rawComandas
    lastFiredComandaSessionKey.value = currentComandaPrintSessionKey()
    persistLastFiredComandas(rawComandas)
  }
  const firedIds = orderItemIdsFromComandas(rawComandas)
  if (firedCount > 0 && posStore.activeTableSession) {
    posStore.setTabItems(
      storeTabItems.value.map((item: TabItem) => {
        const shouldMarkSent = firedIds.size > 0
          ? firedIds.has(item.orderItemId)
          : item.fulfillmentStatus === 'new'
        return shouldMarkSent
          ? { ...item, fulfillmentStatus: 'sent' as const, sentAt: item.sentAt ?? new Date().toISOString() }
          : item
      }),
    )
  }
}

async function syncTabAfterAdd(addRes: unknown, addedCount: number) {
  await refreshTableSession()
  if (!comandasEnabled.value || addedCount <= 0) return
  const { comandas, fired_items_count } = parseFireTableResponse(addRes as FireTableResponse)
  applyFireResult(comandas, fired_items_count)
  await refreshPersistedComandas(undefined, tableSessionFetchGen, false)
  if (fired_items_count > 0) {
    tabSuccess.value = t(
      fired_items_count === 1 ? 'pos.banner.itemsSentKitchenOne' : 'pos.banner.itemsSentKitchenMany',
      { count: fired_items_count },
    )
    setTimeout(() => { tabSuccess.value = null }, 3000)
  } else {
    tabError.value = t('pos.banner.itemsAddedNoKitchen')
    setTimeout(() => { tabError.value = null }, 6000)
  }
}

async function openComandasReprintPanel() {
  selectedComandaIds.value = []
  showComandasReprintPanel.value = true
  await refreshPersistedComandas(undefined, tableSessionFetchGen, false)
}

async function printLatestComanda() {
  if (!canPrintLatestComanda.value) return
  const queue = mapComandasForPrint(lastFiredComandasRaw.value)
  if (!queue.length) return
  printQueueComandas.value = queue
  await nextTick()
  printComandaTickets()
}

async function printSelectedPersistedComandas() {
  if (!persistedComandasForPrintDisplay.value.length) return
  printQueueComandas.value = persistedComandasForPrintDisplay.value
  await nextTick()
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
    productId: i.productId,
    categoryId: i.categoryId ?? null,
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    subtotal: i.subtotal,
    promotionName: i.promotionName ?? i.promotion_name ?? i.locked_promotion_name ?? null,
    promoType: i.promoType ?? i.promo_type ?? i.locked_promo_type ?? null,
    promoSavings: Number(i.promoSavings ?? i.promo_savings ?? i.locked_promo_savings) || 0,
    promoOptOut: Boolean(i.promoOptOut ?? i.promo_opt_out),
    modifiers: (i.modifiers ?? []).map((m: any) => ({
      id: m.id ?? '',
      name: m.name,
      price: Number(m.price) || 0,
      quantity: Number(m.quantity) || 1,
    })),
    notes: i.notes ?? null,
    fulfillmentStatus: i.fulfillmentStatus ?? i.fulfillment_status ?? 'new',
    sentAt: i.sentAt ?? i.sent_at ?? null,
  }))

const mapMinimumConsumptionFromApi = (raw: any) => {
  if (!raw) return null
  return {
    enabled: raw.enabled === true,
    amount: Number(raw.amount) || 0,
    restrictive: raw.restrictive === true,
    consumed: Number(raw.consumed) || 0,
    paid: Number(raw.paid) || 0,
    advance: Number(raw.advance ?? raw.advance_total) || 0,
    advanceTotal: Number(raw.advance_total ?? raw.advance) || 0,
    advance_total: Number(raw.advance_total ?? raw.advance) || 0,
    coveredAmount: Number(raw.covered_amount) || 0,
    remaining: Number(raw.remaining) || 0,
    missing: Number(raw.missing ?? raw.remaining) || 0,
    overageDue: Number(raw.overage_due) || 0,
    covered: raw.covered === true,
  }
}

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
    minimumConsumption: mapMinimumConsumptionFromApi(s.minimum_consumption),
  })
  posStore.setTabItems(mapTabItemsFromApi(data.tab_items ?? []))
  hydrateLastFiredComandas()
}

const httpStatus = (e: unknown) => {
  const err = e as { status?: number; statusCode?: number }
  return err?.status ?? err?.statusCode
}

const isNoOpenSessionError = (e: unknown) => httpStatus(e) === 404

const recoverOpenTableSession = async (tableId: string, isBar: boolean) => {
  if (isBar) {
    await queryCache.invalidateQueries({ key: ['tables', currentTenant.value?.id ?? null] })
    await $fetch<{ success: boolean; data: any[] }>('/api/tables')
  }
  try {
    await $fetch(`/api/tables/${tableId}/open`, { method: 'POST', body: {} })
  } catch (e: unknown) {
    if (httpStatus(e) !== 409) throw e
  }
}

const loadCurrentTableSession = async (
  tableId: string,
  fetchGen: number,
  tableCtx?: { tableId: string; tableName: string; isBar?: boolean },
): Promise<boolean> => {
  try {
    const session = await $fetch<{ success: boolean; data: any }>(`/api/tables/${tableId}/current`)
    if (!session?.data?.session?.id) return false
    applyTableSessionFromApi(session.data, fetchGen, tableCtx)
    tableSessionBackendReady.value = true
    await refreshPersistedComandas(tableId, fetchGen)
    return true
  } catch (e: unknown) {
    if (isNoOpenSessionError(e)) return false
    throw e
  }
}

// Handle enter-table event from floor plan component
const handleEnterTable = async (ctx: { tableId: string; sessionId: string; tableName: string; isBar?: boolean; gotoCheckout?: boolean }) => {
  isEnteringTable.value = true
  tableSessionBackendReady.value = false
  resetComandaPrintState()
  clearLastFiredComandasState()
  posStore.clearAll()
  bumpTableSessionFetchGen()
  isLoadingTabItems.value = true
  const fetchGen = tableSessionFetchGen
  const tableCtx = {
    tableId: ctx.tableId,
    tableName: ctx.tableName,
    isBar: ctx.isBar ?? false,
  }
  try {
    let ok = await loadCurrentTableSession(ctx.tableId, fetchGen, tableCtx)
    if (!ok) {
      await recoverOpenTableSession(ctx.tableId, !!ctx.isBar)
      ok = await loadCurrentTableSession(ctx.tableId, fetchGen, tableCtx)
    }
    if (!ok) {
      posStore.exitSession()
      toast.error(
        ctx.isBar
          ? t('pos.banner.noOpenBarSession')
          : t('pos.banner.noOpenTableSession', { table: tableSingularLower.value }),
        { title: t('pos.banner.session') },
      )
      return
    }
  } catch (e: unknown) {
    posStore.exitSession()
    const detail = (e as { data?: { detail?: string } })?.data?.detail
    toast.error(typeof detail === 'string' ? detail : t('pos.banner.sessionLoadError'), { title: t('pos.banner.session') })
  } finally {
    isEnteringTable.value = false
    isLoadingTabItems.value = false
    if (ctx.gotoCheckout && tableSessionBackendReady.value && posStore.activeTableSession) {
      sessionStorage.setItem('posNavigation', 'true')
      router.push('/pos/checkout')
    }
  }
}

/** Deep link from comanda-ready notification — no cache invalidation until user taps. */
const consumePosDeepLink = async () => {
  const openTable = route.query.open_table
  const openExpediter = route.query.expediter
  if (!openTable && openExpediter !== '1') return

  const nextQuery = { ...route.query }
  delete nextQuery.open_table
  delete nextQuery.expediter
  await router.replace({ path: '/pos', query: nextQuery })

  if (openExpediter === '1' && expediterEnabled.value) {
    showExpediterPanel.value = true
  }

  if (typeof openTable !== 'string' || !openTable) return

  try {
    const res = await $fetch<{ success: boolean; data: any }>(`/api/tables/${openTable}/current`)
    const session = res?.data?.session
    const table = res?.data?.table
    if (!session?.id) {
      toast.error(
        t('pos.banner.noOpenThatTable', { table: tableSingularLower.value }),
        { title: t('pos.banner.comandaReady') },
      )
      return
    }
    await handleEnterTable({
      tableId: openTable,
      sessionId: session.id,
      tableName: table?.name ?? session.table_name ?? tableSingular.value,
      isBar: table?.is_bar ?? session.is_bar ?? false,
    })
    if (expediterEnabled.value) showExpediterPanel.value = true
  } catch {
    toast.error(t('pos.banner.openSessionError', { table: tableSingularLower.value }), { title: t('pos.banner.comandaReady') })
  }
}

// Refresh session running total + tab items from the backend
const isRefreshingSession = ref(false)
const refreshTableSession = async () => {
  if (!posStore.activeTableSession || !tableSessionBackendReady.value) return
  isRefreshingSession.value = true
  const fetchGen = tableSessionFetchGen
  try {
    const ok = await loadCurrentTableSession(
      posStore.activeTableSession.tableId,
      fetchGen,
    )
    if (!ok) {
      tableSessionBackendReady.value = false
      posStore.exitSession()
    }
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

const formatCurrencyPOS = (amount: number): string =>
  `$${Math.round(amount).toLocaleString(toNumberLocaleTag(normalizeUiLocale(locale.value)))}`

const activeMinimumConsumption = computed(() => posStore.activeTableSession?.minimumConsumption ?? null)
const showActiveMinimumConsumption = computed(() =>
  !!activeMinimumConsumption.value?.enabled && activeMinimumConsumption.value.amount > 0,
)
const showTableAdvancePanel = ref(false)
const canPayTableAdvance = computed(() =>
  !!posStore.activeTableSession && !posStore.activeTableSession.isBar && showActiveMinimumConsumption.value,
)
const activeMinimumStatusLabel = computed(() => {
  const state = activeMinimumConsumption.value
  if (!state || !state.enabled || state.amount <= 0) return ''
  if (state.covered || state.remaining <= 0) return t('pos.banner.minCovered')
  return t('pos.banner.remaining', { amount: formatCurrencyPOS(state.remaining) })
})
const activeMinimumStatusClass = computed(() => {
  const state = activeMinimumConsumption.value
  return state?.covered || (state?.remaining ?? 0) <= 0
    ? 'bg-state-success-bg text-state-success-text border-state-success-border'
    : 'bg-state-warning-bg text-state-warning-text border-state-warning-border'
})

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
  void locale.value
  const flow = destructiveFlow.value
  if (!flow) return ''
  switch (flow.kind) {
    case 'remove-tab-item':
      return t('pos.destructive.removeProductTitle')
    case 'decrease-tab-item':
      return t('pos.destructive.reduceQtyTitle')
    case 'clear-cart':
      return posStore.activeTableSession ? t('pos.banner.clearAccount') : t('pos.banner.clearCartQ')
    case 'remove-cart-item':
      return t('pos.destructive.removeProductTitle')
    case 'release-table':
      return t('pos.banner.releaseTableQ', { table: tableSingularLower.value })
    case 'clear-bar-tab':
      return t('pos.destructive.clearBarTitle')
    default:
      return t('pos.destructive.confirmActionTitle')
  }
})

const destructiveModalMessage = computed(() => {
  void locale.value
  const flow = destructiveFlow.value
  if (!flow) return ''
  switch (flow.kind) {
    case 'remove-tab-item': {
      const item = storeTabItems.value.find((i: TabItem) => i.orderItemId === flow.orderItemId)
      const name = item?.productName ?? t('pos.banner.thisProduct')
      if (comandasEnabled.value && isTabItemFired(flow.orderItemId)) {
        return t('pos.destructive.firedNotifyVoid', { name })
      }
      return t('pos.destructive.removeFromTab', { name })
    }
    case 'decrease-tab-item': {
      const item = storeTabItems.value.find((i: TabItem) => i.orderItemId === flow.orderItemId)
      const name = item?.productName ?? t('pos.banner.thisProduct')
      return t('pos.destructive.firedNotifyQty', { name })
    }
    case 'clear-cart':
      return posStore.activeTableSession
        ? t('pos.destructive.clearTableAndCart', { table: tableSingularLower.value })
        : t('pos.banner.clearCartItems')
    case 'remove-cart-item': {
      const item = posStore.cart[flow.index]
      return item ? t('pos.banner.removeProduct', { name: item.product.name }) : t('pos.banner.removeProduct', { name: t('pos.banner.thisProduct') })
    }
    case 'release-table': {
      const session = posStore.activeTableSession
      if (session && session.runningTotal > 0) {
        return t('pos.destructive.releaseWithBalance', {
          table: tableSingularLower.value,
          amount: formatCurrencyPOS(session.runningTotal),
        })
      }
      return t('pos.destructive.releaseEmpty', { table: tableSingularLower.value })
    }
    case 'clear-bar-tab':
      return t('pos.destructive.clearBarMessage')
    default:
      return ''
  }
})

const destructiveModalConfirmLabel = computed(() => {
  void locale.value
  const flow = destructiveFlow.value
  if (!flow) return t('pos.destructive.confirm')
  switch (flow.kind) {
    case 'remove-tab-item':
    case 'remove-cart-item':
      return t('pos.destructive.yesDelete')
    case 'decrease-tab-item':
      return t('pos.destructive.yesReduce')
    case 'clear-cart':
      return t('pos.destructive.yesClear')
    case 'release-table':
      return t('pos.destructive.yesRelease', { table: tableSingularLower.value })
    case 'clear-bar-tab':
      return t('pos.destructive.yesClear')
    default:
      return t('pos.destructive.confirm')
  }
})

const destructiveModalVariant = computed(() =>
  destructiveFlow.value?.kind === 'release-table' ? 'warning' as const : 'destructive' as const,
)

const pendingRemoveItemId = computed(() =>
  destructiveFlow.value?.kind === 'remove-tab-item' ? destructiveFlow.value.orderItemId : null,
)

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

const removeTabItem = (orderItemId: string) => {
  if (!posStore.activeTableSession) return
  if (comandasEnabled.value && isTabItemFired(orderItemId)) {
    destructiveError.value = ''
    destructiveFlow.value = { kind: 'remove-tab-item', orderItemId }
    return
  }
  void executeRemoveTabItem(orderItemId)
}

const executeRemoveTabItem = async (orderItemId: string, reason?: string) => {
  if (!posStore.activeTableSession) return
  const previousTabItems = storeTabItems.value
  bumpTableSessionFetchGen()
  resetComandaPrintState()
  posStore.setTabItems(previousTabItems.filter((i: TabItem) => i.orderItemId !== orderItemId))
  tabItemsLoading.value = new Set([...tabItemsLoading.value, orderItemId])
  try {
    await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/items/${orderItemId}`, {
      method: 'DELETE',
      body: { reason: reason ?? null },
    })
    await refreshTableSession()
  } catch (e: unknown) {
    bumpTableSessionFetchGen()
    posStore.setTabItems(previousTabItems)
    const errText = destructiveFetchError(e, t('pos.destructive.deleteProductError'))
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
  resetComandaPrintState()
  tabItemsLoading.value = new Set([...tabItemsLoading.value, orderItemId])
  try {
    await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/items/${orderItemId}`, {
      method: 'PATCH',
      body: reason ? { quantity, reason } : { quantity },
    })
    await refreshTableSession()
  } catch (e: unknown) {
    const errText = destructiveFetchError(e, t('pos.destructive.updateQtyError'))
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
  if (comandasEnabled.value && isTabItemFired(orderItemId)) return
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
  if (
    !posStore.activeTableSession
    || !tableSessionBackendReady.value
    || !isKitchenServiceMode.value
    || posStore.cart.length === 0
    || isAddingToTab.value
  ) return
  bumpTableSessionFetchGen()
  resetComandaPrintState()
  isAddingToTab.value = true
  tabError.value = null
  try {
    const items = posStore.cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: Number(item.product.price),
      modifiers: item.modifiers.map((m) => ({
        id: m.id,
        name: m.name,
        price: m.price,
        quantity: m.quantity ?? 1,
      })),
      notes: item.notes ?? null,
    }))
    const addRes = await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/add`, {
      method: 'POST',
      body: { items },
    })
    // Clear cart — items committed to tab
    await posStore.clearCart()
    await syncTabAfterAdd(addRes, items.length)
  } catch (e: any) {
    tabError.value = e?.data?.detail ?? t('pos.banner.addToTableError', { table: tableSingularLower.value })
  } finally {
    isAddingToTab.value = false
  }
}

const requestBill = () => {
  if (!posStore.activeTableSession) return
  sessionStorage.setItem('posNavigation', 'true')
  router.push('/pos/checkout')
}



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
  queryCache.invalidateQueries({ key: ['tables', currentTenant.value?.id] })
}

// ── Liberar mesa from the active-mesa banner ───────────────────────────────
const isBannerClosing = computed(() =>
  destructiveLoading.value
  && (destructiveFlow.value?.kind === 'release-table' || destructiveFlow.value?.kind === 'clear-bar-tab'),
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
    destructiveError.value = destructiveFetchError(e, t('pos.destructive.releaseError', { table: tableSingularLower.value }))
    return
  }
  resetComandaPrintState()
  posStore.clearAll()
  queryCache.invalidateQueries({ key: ['tables', currentTenant.value?.id] })
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
    resetComandaPrintState()
    posStore.clearAll()
    queryCache.invalidateQueries({ key: ['tables', currentTenant.value?.id] })
  } catch (e: unknown) {
    destructiveError.value = destructiveFetchError(e, t('pos.destructive.clearBarError'))
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

// State
const searchQuery = ref('')
const selectedCategory = ref('all')

// Load products from API
const { data: productsData, status: productsStatus, asyncStatus: productsAsyncStatus, error: productsError, refetch } = useQuery({
  key: () => ['pos', 'products', currentTenant.value?.id],
  query: () => $fetch('/api/pos/products', {
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
watch(() => currentTenant.value?.id, () => {
  resetComandaPrintState()
  posStore.clearAll()
})

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
      category: p.category_name || p.category?.name || t('pos.banner.noCategory'),
      category_id: p.category_id ?? null,
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
    category: p.category_name || p.category?.name || t('pos.banner.noCategory'),
    category_id: p.category_id ?? null,
    image: '🍽️',
    image_url: p.image_url || null,
    available: p.is_available,
    is_resale: p.is_resale || false
  }))
})

const promoBadgesByProductId = computed(() => {
  const map = new Map<string, ReturnType<typeof promoBadgeForProduct>>()
  const promos = activePromos.value
  if (promos.length === 0) return map
  for (const product of products.value) {
    const badge = promoBadgeForProduct(promos, product.id, product.category_id)
    if (badge) map.set(product.id, badge)
  }
  return map
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
const cartTotal = computed(() => posStore.cartTotal)

const { netOrderTotal: mobileCartNetTotal } = usePosOrderPromoTotals(
  () => posStore.cart,
  () => storeTabItems.value,
  () =>
    isKitchenServiceMode.value
      ? (storeTabTotal.value ?? 0) + cartTotal.value
      : cartTotal.value,
)

// warocol.com#1032 — fixed cart bar + bottom sheet on mobile/tablet (< lg)
const showMobileCartSheet = ref(false)
const mobileCartItemCount = computed(() =>
  isKitchenServiceMode.value
    ? storeTabItems.value.length + posStore.cart.length
    : posStore.cart.length,
)
const mobileCartDisplayTotal = computed(() => mobileCartNetTotal.value)
const mobileCartFormattedTotal = computed(() => formatCurrencyPOS(mobileCartDisplayTotal.value))

const { setMobileCart, setOpenCartHandler, setMobileCartSheetOpen, clearMobileCart } = usePosMobileCart()

watchEffect(() => {
  setMobileCart(mobileCartItemCount.value, mobileCartFormattedTotal.value)
})

watch(showMobileCartSheet, (open) => {
  setMobileCartSheetOpen(open)
}, { immediate: true })

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

const tabEditBlockedOpen = ref(false)
const tabEditBlockedMessage = ref('')

const editTabItem = async (orderItemId: string, productId: string) => {
  if (!posStore.activeTableSession || !tableSessionBackendReady.value) return
  const tableId = posStore.activeTableSession.tableId
  try {
    await $fetch(
      `/api/tables/${tableId}/tab/items/${orderItemId}/edit-eligibility?record_attempt=true`,
    )
    sessionStorage.setItem('posNavigation', 'true')
    router.push(`/pos/producto/${productId}?tabItem=${orderItemId}`)
  } catch (e: any) {
    const status = e?.statusCode ?? e?.response?.status
    const detail = e?.data?.detail ?? e?.data?.message
    const message = typeof detail === 'string' ? detail : null
    if (status === 409) {
      tabEditBlockedMessage.value = message ?? t('pos.banner.editBlockedAccepted')
      tabEditBlockedOpen.value = true
      return
    }
    tabError.value = message ?? t('pos.banner.editEligibilityError')
  }
}

const handleOpenSaleClick = () => {
  if (!openSaleEnabled.value) {
    toast.warning(openSaleDisabledReason.value ?? t('pos.banner.openSaleUnavailable'), { title: t('pos.banner.openSale') })
    return
  }
  openSaleModalOpen.value = true
}

const addOpenSaleToTab = async (amount: number, description?: string) => {
  if (!posStore.activeTableSession || !tableSessionBackendReady.value || !isKitchenServiceMode.value || isAddingToTab.value) return
  bumpTableSessionFetchGen()
  resetComandaPrintState()
  isAddingToTab.value = true
  tabError.value = null
  try {
    const tabItem = buildOpenSaleTabItem(amount, description)
    const addRes = await $fetch(`/api/tables/${posStore.activeTableSession.tableId}/tab/add`, {
      method: 'POST',
      body: { items: [tabItem] },
    })
    if (comandasEnabled.value) {
      await syncTabAfterAdd(addRes, 1)
    } else {
      await refreshTableSession()
    }
  } catch (e: any) {
    tabError.value = e?.data?.detail ?? e?.data?.message ?? t('pos.banner.addToTableError', { table: tableSingularLower.value })
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
      toast.success(t('pos.banner.addedToTable', { table: tableSingularLower.value }), { title: t('pos.banner.openSale') })
      return
    }
    const line = buildOpenSaleCartLine(amount, payload.description)
    await posStore.addToCart(line)
    openSaleModalOpen.value = false
    toast.success(t('pos.banner.addedToCart'), { title: t('pos.banner.openSale') })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : t('pos.banner.openSaleAddError')
    toast.error(typeof err === 'object' && err && 'data' in err
      ? (err as any).data?.detail ?? message
      : message, { title: t('pos.banner.openSale') })
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
  const item = posStore.cart[index]
  if (item?.modifiers?.length) {
    await posStore.duplicateCartItem(index)
    return
  }
  await posStore.updateQuantity(index, 1)
}

const decrementCartItem = async (index: number) => {
  await posStore.updateQuantity(index, -1)
}

const duplicateCartItem = async (index: number) => {
  await posStore.duplicateCartItem(index)
}

const leaveActiveTableSession = () => {
  resetComandaPrintState()
  clearLastFiredComandasState()
  posStore.clearAll()
}

const exitActiveTableSession = () => {
  resetComandaPrintState()
  clearLastFiredComandasState()
  posStore.exitSession()
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
      resetComandaPrintState()
      clearLastFiredComandasState()
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
    destructiveError.value = destructiveFetchError(e, t('pos.destructive.clearCartError'))
  }
}

const processOrder = async () => {
  // Esperar a que todas las operaciones pendientes terminen (duplicar, agregar, etc.)
  await posStore.waitForPendingOperations()

  showMobileCartSheet.value = false

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
  shouldPollTableSession,
  (active) => {
    if (active) startSessionSyncPolling()
    else stopSessionSyncPolling()
  },
  { immediate: true },
)

watch(
  () => posStore.activeTableSession,
  (session, previousSession) => {
    const nextKey = session ? `${session.tableId}:${session.sessionId}` : null
    const previousKey = previousSession ? `${previousSession.tableId}:${previousSession.sessionId}` : null
    if (nextKey !== previousKey) {
      resetComandaPrintState()
      clearLastFiredComandasState()
      if (session) hydrateLastFiredComandas()
    }
    if (!session) tableSessionBackendReady.value = false
  },
)

// ── Fulfillment status polling ───────────────────────────────────────────────
let fulfillmentPollInterval: ReturnType<typeof setInterval> | null = null

const startFulfillmentPolling = () => {
  if (fulfillmentPollInterval) return
  fulfillmentPollInterval = setInterval(async () => {
    if (!shouldPollTableSession.value) return
    if (isTableSessionMutationActive()) return
    await refreshTableSession()
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
  shouldPollTableSession,
  (active) => {
    if (active) startFulfillmentPolling()
    else stopFulfillmentPolling()
  },
)

// Register contextual refresh handler:
// - mesa active → refresh tab items from backend
// - floor plan → MesasFloorPlan registers its own handler on mount
watch(
  shouldPollTableSession,
  (active) => {
    if (active) setRefreshHandler(refreshTableSession)
    // else: MesasFloorPlan will register when it mounts
  },
  { immediate: true },
)

onMounted(async () => {
  setOpenCartHandler(() => {
    showMobileCartSheet.value = true
  })

  void consumePosDeepLink()

  // Start polling if already in a comandas-enabled session on mount
  if (shouldPollTableSession.value) {
    startFulfillmentPolling()
  }

  // Re-validate persisted bar/mesa session after checkout (#1105)
  if (posStore.activeTableSession?.tableId && !tableSessionBackendReady.value) {
    const s = posStore.activeTableSession
    void (async () => {
      const fetchGen = bumpTableSessionFetchGen()
      let ok = await loadCurrentTableSession(s.tableId, fetchGen, {
        tableId: s.tableId,
        tableName: s.tableName,
        isBar: s.isBar,
      })
      if (!ok) {
        await recoverOpenTableSession(s.tableId, s.isBar)
        ok = await loadCurrentTableSession(s.tableId, fetchGen, {
          tableId: s.tableId,
          tableName: s.tableName,
          isBar: s.isBar,
        })
      }
      if (!ok) posStore.exitSession()
    })()
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
  clearMobileCart()
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
      <!-- Main POS Container -->
      <div class="grid w-full grid-cols-1 items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <!-- Products Panel (Left) -->
        <div class="min-w-0 flex flex-col space-y-4">
          <div class="lg:sticky lg:top-0 lg:z-20 flex flex-col gap-3 bg-background pt-2 pb-2">
      <!-- Live promotion hint (warocol.com#983) -->
      <div
        v-if="hasActivePromos"
        role="status"
        class="flex items-center gap-3 min-h-[44px] px-4 py-3 bg-status-success-bg border border-status-success-text/25 rounded-xl"
      >
        <div class="flex-shrink-0 bg-status-success-text/15 p-1.5 rounded-lg">
          <svg class="h-[1em] w-[1em] text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <p class="text-sm text-status-success-text font-medium">
          {{ t('pos.banner.promoActive', { name: activePromoHint }) }}
        </p>
      </div>

      <!-- Mesa Banner skeleton while loading tab items -->
      <div v-if="isLoadingTabItems || isAddingToTab" class="bg-surface border border-border rounded-xl p-2.5 shadow-sm animate-pulse">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-surface-secondary flex-shrink-0" />
          <div class="flex-1 flex items-center gap-2.5">
            <div class="h-2.5 w-20 bg-surface-secondary rounded" />
            <div class="h-2.5 w-16 bg-surface-secondary rounded" />
            <div class="h-2.5 w-32 bg-surface-secondary rounded" />
          </div>
          <div class="h-7 w-14 bg-surface-secondary rounded-lg flex-shrink-0" />
        </div>
      </div>

      <!-- Bar banner (bar session — behaves as normal POS) -->
      <div v-else-if="posStore.activeTableSession?.isBar" class="bg-surface border border-state-warning-border/40 rounded-xl p-2.5 shadow-sm">
        <div class="flex items-center gap-2.5">
          <div class="bg-state-warning-bg p-2 rounded-lg flex-shrink-0">
            <svg class="h-[1em] w-[1em] text-state-warning-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21a48.25 48.25 0 0 1-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </div>
          <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span class="text-[10px] font-bold text-state-warning-text uppercase tracking-widest flex-shrink-0">{{ t('pos.floor.bar') }}</span>
            <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
            <span class="text-xs text-text-secondary">
              {{ comandasEnabled ? t('pos.banner.barHintKitchen') : t('pos.banner.barHintDirect') }}
            </span>
            <template v-if="comandasEnabled && unfiredCount > 0">
              <span class="w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
              <span class="flex items-center gap-1 text-xs font-semibold text-state-danger-text flex-shrink-0">
                {{ unfiredCount === 1 ? t('pos.banner.unsentOne', { count: unfiredCount }) : t('pos.banner.unsentMany', { count: unfiredCount }) }}
              </span>
            </template>
          </div>
          <button
            type="button"
            class="flex-shrink-0 text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface-secondary hover:text-text-primary transition-colors"
            @click="exitActiveTableSession"
          >
            {{ t('pos.banner.exit') }}
          </button>
        </div>
      </div>

      <!-- Mesa Banner (when arriving from a table session) -->
      <div v-else-if="posStore.activeTableSession" class="bg-surface border border-border rounded-xl p-2.5 shadow-sm">
        <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2.5">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <div class="bg-status-success-bg p-2 rounded-lg flex-shrink-0">
              <svg class="h-[1em] w-[1em] text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M3 14h18M10 10V6m4 4V6m-9 8v4m14-4v4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="text-[10px] font-bold text-status-success-text uppercase tracking-widest">{{ t('pos.banner.active', { table: tableSingular }) }}</span>
                <span class="hidden sm:inline w-px h-3 bg-border flex-shrink-0" aria-hidden="true" />
                <span class="text-sm font-bold text-text-primary">{{ posStore.activeTableSession.tableName }}</span>
                <span
                  v-if="activeMinimumStatusLabel"
                  class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none whitespace-nowrap"
                  :class="activeMinimumStatusClass"
                >
                  {{ activeMinimumStatusLabel }}
                </span>
              </div>
              <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-secondary tabular-nums leading-snug">
                <span>{{ t('pos.banner.accumulated', { amount: formatCurrencyPOS(posStore.activeTableSession.runningTotal) }) }}</span>
                <span class="text-text-tertiary" aria-hidden="true">·</span>
                <span>{{ formatDuration(posStore.activeTableSession.openedAt) }}</span>
                <template v-if="showActiveMinimumConsumption && activeMinimumConsumption">
                  <span class="text-text-tertiary" aria-hidden="true">·</span>
                  <span>{{ t('pos.banner.min', { amount: formatCurrencyPOS(activeMinimumConsumption.amount) }) }}</span>
                </template>
              </div>
            </div>
          </div>
          <!-- Mesero + actions — stacked on mobile/tablet; inline on desktop -->
          <div class="grid w-full grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center xl:w-auto xl:flex-shrink-0 xl:justify-end">
            <!-- Issue #574 — Waiter loading chip — width adapts to the rotating
                 phrase so it doesn't overflow the original chip. Same pattern
                 as the dashboard header progressive-load indicator. -->
            <div
              v-if="waiterAttributionEnabled && isChangingSessionWaiter"
              class="h-8 min-w-0 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg border border-border bg-surface-secondary text-text-secondary text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
              aria-live="polite"
            >
              <UiLoadingDots size="7px" color="currentColor" />
              <span>{{ waiterChipLoadingPhrase }}</span>
            </div>
            <!-- Issue #574 — Idle waiter chip with auto-handoff dropdown -->
            <div v-else-if="waiterAttributionEnabled" class="relative min-w-0 sm:min-w-[11rem]">
              <select
                :value="bannerEffectiveWaiterId || ''"
                :aria-label="t('pos.banner.changeWaiterAria')"
                class="h-8 w-full inline-flex items-center leading-none ps-7 pe-7 rounded-lg border border-border bg-surface-secondary text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-1 appearance-none bg-none cursor-pointer truncate [&::-ms-expand]:hidden"
                style="background-image: none; -webkit-appearance: none; -moz-appearance: none; text-align-last: center;"
                :class="bannerEffectiveWaiterId ? 'text-text-primary' : 'text-text-secondary italic'"
                @change="handleChangeSessionWaiter"
              >
                <option value="">{{ t('pos.banner.noWaiter') }}</option>
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
                class="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 h-[1em] w-[1em] flex-shrink-0 text-text-secondary"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                stroke="currentColor" aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <!-- Caret (overlapping right) -->
              <svg
                class="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 h-[1em] w-[1em] text-text-tertiary"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                stroke="currentColor" aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
            <!-- warocol.com#1376 — session-scoped minimum-consumption advance -->
            <button
              v-if="canPayTableAdvance"
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              class="h-8 min-w-0 inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider px-2.5 rounded-lg border border-primary/30 hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :aria-label="t('pos.banner.payAdvanceAria', { table: tableSingularLower })"
              @click="showTableAdvancePanel = true"
            >
              <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              {{ t('pos.banner.payAdvance') }}
            </button>
            <!-- Volver — clears local activeTableSession; the showFloorPlan computed switches view. Session stays open in backend. -->
            <button
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              class="h-8 min-w-0 inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider px-2.5 rounded-lg border border-border hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :aria-label="t('pos.banner.backAria', { tables: tablePluralLower, table: tableSingularLower })"
              @click="leaveActiveTableSession"
            >
              <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              {{ t('pos.banner.back') }}
            </button>
            <!-- Liberar — destructive: closes the session via confirm modal -->
            <button
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              class="h-8 min-w-0 inline-flex items-center justify-center gap-1.5 text-[10px] font-bold text-status-error-text uppercase tracking-wider px-2.5 rounded-lg border border-status-error-text/30 hover:bg-status-error-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-status-error-text focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              :aria-label="t('pos.banner.releaseAria', { table: tableSingularLower })"
              @click="handleReleaseMesa"
            >
              <UiLoadingDots v-if="isBannerClosing || posStore.isCancellingMesa" size="6px" />
              <template v-else>
                <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                {{ t('pos.banner.release') }}
              </template>
            </button>
          </div>
        </div>

        <!-- Tab error -->
        <p v-if="tabError" class="mt-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-2.5 py-1">
          {{ tabError }}
        </p>
        <!-- Tab success (fire to kitchen) -->
        <p v-if="tabSuccess" class="mt-1.5 text-xs text-state-success-text bg-state-success-bg rounded-lg px-2.5 py-1 border border-state-success-border">
          {{ tabSuccess }}
        </p>
      </div>

      <!-- Customer Header (when customer is identified and no mesa mode) -->
      <div v-else-if="posStore.currentCustomer" class="bg-badge-primary-bg border border-badge-primary-border rounded-xl p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="bg-badge-primary-bg p-3 rounded-xl border border-badge-primary-border flex-shrink-0">
              <svg class="h-[1em] w-[1em] text-badge-primary-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-badge-primary-text uppercase tracking-widest">
                {{ t('pos.banner.currentCustomer') }}
              </p>
              <p class="text-base font-bold text-text-primary leading-tight truncate">
                {{ posStore.currentCustomer.name || t('pos.banner.noName') }}
              </p>
              <p class="text-xs text-text-secondary mt-0.5">
                📱 {{ posStore.currentCustomer.phone_number }}
              </p>
              <div
                v-if="!isAnonymousPosCustomer"
                class="flex flex-wrap gap-2 mt-2"
                aria-live="polite"
              >
                <div
                  v-if="isPosWalletPending"
                  class="h-5 w-[6.5rem] rounded-full bg-surface-secondary animate-pulse"
                  aria-label="Cargando saldo wallet"
                />
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-state-success-bg text-state-success-text border border-state-success-border"
                >
                  Wallet: {{ formatCurrency(posWalletBalance) }}
                </span>
                <div
                  v-if="isLoadingPosWaros"
                  class="h-5 w-[7.5rem] rounded-full bg-surface-secondary animate-pulse"
                  :aria-label="t('pos.wallet.loadingPointsAria')"
                />
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-state-warning-bg text-state-warning-text border border-state-warning-border"
                >
                  {{ t('pos.wallet.warosBalance', { amount: posWarosBalance.toLocaleString(pointsLocale) }) }}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="flex-shrink-0 text-xs font-semibold text-badge-primary-text hover:text-badge-primary-text px-3 py-2 rounded-lg border border-badge-primary-border hover:bg-badge-primary-bg transition-colors min-h-[44px]"
            @click="showCustomerModal = true"
          >
            {{ t('pos.banner.change') }}
          </button>
        </div>
      </div>

      <!-- Identify customer CTA (counter/bar, no table session) -->
      <div v-else>
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl border-2 border-dashed border-badge-primary-border text-badge-primary-text font-semibold text-sm hover:bg-badge-primary-bg transition-colors"
          @click="showCustomerModal = true"
        >
          <svg class="h-[1em] w-[1em]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {{ t('pos.banner.identifyCustomer') }}
        </button>
      </div>

          <!-- Search and Filters -->
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="flex-1">
              <UiSearchBar
                v-model="searchQuery"
                :placeholder="t('pos.catalog.searchPlaceholder')"
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
                ? 'bg-action-primary-bg text-action-primary-text shadow-md'
                : 'bg-surface border border-border text-text-secondary hover:border-border hover:text-text-primary hover:bg-surface-secondary'"
              @click="selectedCategory = cat"
            >
              {{ cat === 'all' ? t('pos.catalog.all') : cat }}
            </button>
          </div>
        </div>

        <!-- Products Grid — page scroll on mobile; inner scroll on desktop (#1032) -->
        <div>
          <!-- Empty State -->
          <div v-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-text-secondary">
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-lg font-medium">{{ t('pos.banner.noProducts') }}</p>
            <p class="text-sm mt-1">{{ t('pos.banner.addFromMenu') }}</p>
          </div>

          <!-- Products Grid -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-4 p-1 pb-4">
            <PosProductCard
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
              :promo-badge="promoBadgesByProductId.get(product.id) ?? null"
              @select="selectProduct"
            />
          </div>
        </div>
      </div>

      <!-- Cart Panel — desktop sidebar only; mobile uses bottom bar + sheet (#1032) -->
      <PosCartPanel
        class="hidden lg:flex lg:sticky lg:top-0"
        fit-height
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
        :can-print-latest-comanda="canPrintLatestComanda"
        :persisted-comandas-count="sentComandasForPanel.length"
        :pending-remove-item-id="pendingRemoveItemId"
        :show-served-by-chip="showServedByChip"
        :served-by-member-id="posStore.cartServedByMemberId"
        :members="tenantMembers"
        @edit-item="editCartItem"
        @edit-tab-item="editTabItem"
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
        @print-latest-comanda="printLatestComanda"
        @open-comandas-reprint="openComandasReprintPanel"
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

  <UiErrorAlertModal
    v-model="tabEditBlockedOpen"
    :title="t('pos.banner.cannotEdit')"
    :message="tabEditBlockedMessage"
  />

  <PosOpenSaleModal
    ref="openSaleModalRef"
    v-model="openSaleModalOpen"
    :shell-name="openSaleProduct?.name"
    :mesa-mode="isMesaMode"
    :table-label="tableSingularLower"
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
        :aria-label="readyComandasCount > 0 ? t('pos.banner.comandasStatusReady', { count: readyComandasCount }) : t('pos.banner.comandasStatus')"
        :title="readyComandasCount > 0 ? (readyComandasCount === 1 ? t('pos.banner.comandasReadyTitleOne', { count: readyComandasCount }) : t('pos.banner.comandasReadyTitleMany', { count: readyComandasCount })) : t('pos.banner.comandasStatus')"
        class="relative inline-flex items-center gap-2 h-11 rounded-lg border-2 border-surface-secondary bg-action-secondary-bg text-action-secondary-text text-sm font-medium hover:bg-action-secondary-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-action-secondary-focus-ring me-1.5 md:me-2 px-2.5 sm:px-3 md:px-4"
        :class="readyComandasCount > 0 ? 'ring-1 ring-state-success-border/60' : ''"
        @click="showExpediterPanel = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <path d="m9 14 2 2 4-4"/>
        </svg>
        <span class="hidden sm:inline text-sm font-medium">{{ t('pos.banner.comandas') }}</span>
        <!-- Count badge: numeric on sm+, dot indicator on mobile -->
        <span
          v-if="readyComandasCount > 0"
          class="hidden sm:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-action-success-bg text-action-success-text text-[11px] font-bold tabular-nums"
        >
          {{ readyComandasCount }}
        </span>
        <span
          v-if="readyComandasCount > 0"
          class="sm:hidden absolute -top-1 -end-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-badge-success-bg px-1 text-[10px] font-bold text-badge-success-text tabular-nums ring-2 ring-surface"
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

  <PosTableSessionAdvancePanel
    v-model="showTableAdvancePanel"
    :table-id="posStore.activeTableSession?.tableId ?? null"
    :table-name="posStore.activeTableSession?.tableName ?? null"
    :minimum-consumption="activeMinimumConsumption"
    @success="refreshTableSession"
  />

  <PosComandaPrintTickets
    v-if="comandasEnabled"
    :comandas="printQueueComandas"
    :business-name="posBusinessName"
  />

  <PosComandasReprintPanel
    v-if="comandasEnabled"
    v-model="showComandasReprintPanel"
    :comandas="sentComandasForPanel"
    :selected-ids="selectedComandaIds"
    :loading="persistedComandasLoading"
    :table-display-name="posStore.activeTableSession?.tableName ?? null"
    @toggle-comanda="toggleComandaSelection"
    @select-all="selectAllPersistedComandas"
    @clear-selection="clearPersistedComandaSelection"
    @print-selected="printSelectedPersistedComandas"
    @refresh="refreshPersistedComandas(undefined, tableSessionFetchGen, true)"
  />

  <!-- warocol.com#1032 — mobile/tablet cart sheet (bar lives in dashboard layout) -->
  <UiBottomSheetModal v-model="showMobileCartSheet" :title="t('pos.banner.currentOrder')" max-height="xl" fill-content>
    <PosCartPanel
      class="border-0 shadow-none rounded-none h-full min-h-0"
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
      :can-print-latest-comanda="canPrintLatestComanda"
      :persisted-comandas-count="sentComandasForPanel.length"
      :pending-remove-item-id="pendingRemoveItemId"
      :show-served-by-chip="showServedByChip"
      :served-by-member-id="posStore.cartServedByMemberId"
      :members="tenantMembers"
      @edit-item="editCartItem"
      @edit-tab-item="editTabItem"
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
      @print-latest-comanda="printLatestComanda"
      @open-comandas-reprint="openComandasReprintPanel"
      @update:served-by="(id) => posStore.setCartServedBy(id)"
    />
  </UiBottomSheetModal>

  <PosCustomerIdentificationModal
    v-model="showCustomerModal"
    @customer-identified="onPosCustomerIdentified"
    @fiscal-updated="onPosCustomerIdentified"
  />

</template>
