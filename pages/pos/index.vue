<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { toNumberLocaleTag } from '~/utils/appLocales'
import { ref, computed, nextTick, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useQueryCache } from '@pinia/colada'
import { $fetch } from 'ofetch'
import type { CachedProduct, Customer, TabItem } from '~/stores/usePOSStore'
import { usePOSStore } from '~/stores/usePOSStore'
import { useOpenSale } from '~/composables/useOpenSale'
import { registerTableSessionRefresh } from '~/composables/useTableSessionSync'
import type { ComandaPrintPayload, FireTableResponse } from '~/composables/useComandaPrint'
import {
  mapComandasForPrint,
  orderItemIdsFromComandas,
  parseFireTableResponse,
} from '~/composables/useComandaPrint'
import { useStationTicketPrint } from '~/composables/useStationTicketPrint'
import { isStarterAccessLevel, isStarterPlanSlug } from '~/composables/useBilling'
import { promoBadgeForProduct } from '~/utils/promoProductMatch'
import { usePosOrderPromoTotals } from '~/composables/usePosOrderPromoTotals'
import { buildCustomerIdentityPresentation } from '~/utils/customerIdentityPresentation'
import { tableSessionDisplayName, tableSessionHasAlias } from '~/utils/tableSessionDisplayName'

const {
  bannerActionButtonClass,
  bannerSessionFieldClass,
  categoryChipClass,
  siblingGapClass,
  sectionGapClass,
  sectionStackClass,
} = usePosToolbarControl()

definePageMeta({
  layout: 'dashboard',
  module: 'pos',
})

useHead({ title: () => t('pos.banner.pageTitle') })

const { formatCurrency } = useFormatters()

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const { singular: tableSingular, plural: tablePlural } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())
const tablePluralLower = computed(() => tablePlural.value.toLowerCase())

const router = useRouter()
const setShowBackButton = inject<(show: boolean) => void>('setShowBackButton')
const setBackHandler = inject<(handler: (() => void) | undefined) => void>('setBackHandler')
const route = useRoute()
const toast = useToast()
const queryCache = useQueryCache()
const posStore = usePOSStore()
const accessStore = useAccessStore()
const { accessStatus } = useBilling()
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
const { status: tablesStatus, data: tablesData } = useQuery({
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
const authStore = useAuthStore()
const tenantCatalogLayoutDefault = computed<'grid' | 'list'>(() => {
  const value = settingsData.value?.data?.pos_catalog_layout_default
  return value === 'list' ? 'list' : 'grid'
})
const catalogLayoutOverride = computed<'grid' | 'list' | null>(() => {
  const value = authStore.posCatalogLayoutOverride
  return value === 'grid' || value === 'list' ? value : null
})
const resolvedCatalogLayout = computed<'grid' | 'list'>(() => {
  // #2496: personal override ?? tenant default from #2495
  return catalogLayoutOverride.value ?? tenantCatalogLayoutDefault.value
})
const isSavingCatalogLayout = ref(false)

/** Single control: when grid, offer list (and reverse). Always stores explicit override. */
const catalogLayoutToggleTarget = computed<'grid' | 'list'>(() =>
  resolvedCatalogLayout.value === 'grid' ? 'list' : 'grid',
)
const catalogLayoutToggleLabel = computed(() =>
  catalogLayoutToggleTarget.value === 'list'
    ? t('pos.catalog.layoutList')
    : t('pos.catalog.layoutGrid'),
)
const catalogLayoutToggleAria = computed(() =>
  catalogLayoutToggleTarget.value === 'list'
    ? t('pos.catalog.layoutSwitchToList')
    : t('pos.catalog.layoutSwitchToGrid'),
)

const setCatalogLayoutPreference = async (choice: 'grid' | 'list') => {
  if (isSavingCatalogLayout.value) return
  if (choice === catalogLayoutOverride.value) return
  const previous = catalogLayoutOverride.value
  isSavingCatalogLayout.value = true
  authStore.patchSessionUser({ pos_catalog_layout_override: choice })
  try {
    await $fetch('/api/auth/update-profile', {
      method: 'PUT',
      body: { pos_catalog_layout_override: choice },
    })
  } catch (error: any) {
    authStore.patchSessionUser({ pos_catalog_layout_override: previous })
    toast.error(error?.data?.detail || t('pos.catalog.layoutSaveError'), {
      title: t('pos.banner.error'),
    })
  } finally {
    isSavingCatalogLayout.value = false
  }
}

const toggleCatalogLayout = () => {
  void setCatalogLayoutPreference(catalogLayoutToggleTarget.value)
}

const catalogLayoutToggleButtonClass = computed(() => [
  'relative h-9 w-9 flex-shrink-0 inline-flex items-center justify-center overflow-hidden rounded-lg border',
  'border-shell-action-border bg-shell-action-bg text-shell-action-text',
  'hover:bg-shell-action-hover-bg',
  'focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring',
  'transition-colors',
  isSavingCatalogLayout.value ? 'opacity-50 pointer-events-none' : '',
])

/** Soft filter stagger — few steps, calmer cascade. */
const catalogItemStaggerStyle = (index: number) => ({
  '--pos-stagger': `${Math.min(index, 8) * 40}ms`,
})

const posShowProductImage = computed(
  () => settingsData.value?.data?.pos_show_product_image !== false,
)
const posShowSearch = computed(
  () => settingsData.value?.data?.pos_show_search !== false,
)
/** List mode: no photos (#2499); dedicated promo chip column (#2501). */
const catalogListColumns = computed(() => [
  { key: 'name', title: t('pos.catalog.product'), sortable: false },
  { key: 'promo', title: t('pos.catalog.promo'), sortable: false },
  { key: 'price', title: t('pos.catalog.price'), sortable: false },
])
const isStarterPlan = computed(() =>
  isStarterPlanSlug(accessStore.planSlug) || isStarterAccessLevel(accessStatus.value?.level),
)
const comandaPrintEnabled = computed(() => comandasEnabled.value && !isStarterPlan.value)

// Issue #537 — expediter mode (waiter advances comanda state from POS)
const expediterEnabled = computed(() => settingsData.value?.data?.expediter_enabled === true)

// Issue #574 — waiter attribution (per-session override + auto-handoff)
const waiterAttributionEnabled = computed(() => settingsData.value?.data?.waiter_attribution_enabled === true)
const tenantMembers = computed(() => (settingsData.value?.data as any)?.members ?? [])

// Issue #2539 — mesero inline in session banner (bar/counter/mesa); cart chip disabled
const showServedByChip = computed(() => false)

const isCounterMode = computed(() =>
  !posStore.activeTableSession && !showFloorPlan.value,
)
const showCounterBanner = computed(() =>
  isCounterMode.value && !loadingProducts.value,
)
const canClearCounterCart = computed(() =>
  posStore.cart.length > 0 || storeTabItems.value.length > 0,
)
const isCounterClearing = computed(() =>
  destructiveLoading.value && destructiveFlow.value?.kind === 'clear-cart',
)

const handleCounterBack = () => {
  router.back()
}

const handleChangeCartWaiter = (event: Event) => {
  const target = event.target as HTMLSelectElement
  posStore.setCartServedBy(target.value || null)
}

// Effective waiter id for the active session — used by the banner chip.
const bannerEffectiveWaiterId = computed(() =>
  posStore.activeTableSession?.effectiveWaiterMemberId ?? null,
)
const isChangingSessionWaiter = ref(false)
const handleChangeSessionWaiter = async (event: Event) => {
  if (isChangingSessionWaiter.value) return
  if (!posStore.activeTableSession) return
  const target = event.target as HTMLSelectElement
  const newMemberId = target.value || null
  const currentMemberId = bannerEffectiveWaiterId.value || null
  if (newMemberId === currentMemberId) return
  isChangingSessionWaiter.value = true
  await nextTick()
  const startedAt = Date.now()
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
        covers: s.covers ?? posStore.activeTableSession.covers ?? null,
        capacitySnapshot: s.capacity_snapshot ?? posStore.activeTableSession.capacitySnapshot ?? null,
        customLabel: s.custom_label ?? posStore.activeTableSession.customLabel ?? null,
      })
      if (posStore.activeTableSession.isBar) {
        posStore.setCartServedBy(newMemberId)
      }
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
    await holdBannerSessionSkeleton(startedAt)
    isChangingSessionWaiter.value = false
  }
}
const isSavingSessionCovers = ref(false)
const isSavingSessionAlias = ref(false)
const isBannerSessionFieldsSaving = computed(
  () => isSavingSessionCovers.value || isSavingSessionAlias.value || isChangingSessionWaiter.value,
)
/** Keep skeleton visible long enough to paint (alias blur feels slower; covers/mesero PATCH can be instant). */
const MIN_BANNER_SKELETON_MS = 180
const holdBannerSessionSkeleton = async (startedAt: number) => {
  const remaining = MIN_BANNER_SKELETON_MS - (Date.now() - startedAt)
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining))
}
const persistSessionGuests = async (
  field: 'covers' | 'alias',
  body: { covers?: number; custom_label?: string | null },
  okMessage: string,
) => {
  const savingRef = field === 'covers' ? isSavingSessionCovers : isSavingSessionAlias
  if (savingRef.value) return
  if (!posStore.activeTableSession || posStore.activeTableSession.isBar) return
  const previousSession = posStore.activeTableSession
  savingRef.value = true
  // Optimistic — keep banner fields visible while GET /current completes
  posStore.setTableSession({
    ...previousSession,
    ...(field === 'covers' && body.covers != null ? { covers: body.covers } : {}),
    ...(field === 'alias' ? { customLabel: body.custom_label ?? null } : {}),
  })
  await nextTick()
  const startedAt = Date.now()
  try {
    await $fetch(`/api/pos/tables/${previousSession.tableId}/session-guests`, {
      method: 'PATCH',
      body,
    })
    const sessionData = await $fetch<{ success: boolean; data: any }>(
      `/api/tables/${previousSession.tableId}/current`,
    )
    applyTableSessionFromApi(sessionData?.data, tableSessionFetchGen)
    toast.success(okMessage, { title: t('pos.banner.updated') })
  } catch (error: any) {
    posStore.setTableSession(previousSession)
    toast.error(error?.data?.detail || t('pos.banner.guestsChangeError'), { title: t('pos.banner.error') })
  } finally {
    await holdBannerSessionSkeleton(startedAt)
    savingRef.value = false
  }
}
const handleBlurSessionCovers = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const covers = Number.parseInt(target.value, 10)
  if (!Number.isFinite(covers) || covers < 1) {
    target.value = String(bannerSessionCoversValue.value)
    return
  }
  const current = posStore.activeTableSession?.covers ?? bannerSessionCoversValue.value
  if (covers === current) return
  await persistSessionGuests('covers', { covers }, t('pos.banner.coversUpdated'))
}
const handleBlurSessionLabel = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const next = target.value.trim()
  const current = (posStore.activeTableSession?.customLabel || '').trim()
  if (next === current) return
  await persistSessionGuests('alias', { custom_label: next || null }, t('pos.banner.labelUpdated'))
}

/** Catalog capacity for active table (from prefetched /api/tables). */
const activeTableCatalogCapacity = computed(() => {
  const tableId = posStore.activeTableSession?.tableId
  if (!tableId) return null
  const table = (tablesData.value?.data ?? []).find((t: { id: string }) => t.id === tableId)
  const cap = table?.capacity
  return typeof cap === 'number' && cap >= 1 ? cap : null
})

/** Editable session covers — defaults to preconfigured table capacity when unset. */
const bannerSessionCoversValue = computed(() => {
  const session = posStore.activeTableSession
  if (!session) return 1
  if (session.covers != null && session.covers >= 1) return session.covers
  if (session.capacitySnapshot != null && session.capacitySnapshot >= 1) return session.capacitySnapshot
  return activeTableCatalogCapacity.value ?? 1
})

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

const activeSessionDisplayName = computed(() => {
  const session = posStore.activeTableSession
  if (!session) return ''
  return tableSessionDisplayName(session.tableName, session.customLabel)
})

const activeSessionShowsCatalogName = computed(() => {
  const session = posStore.activeTableSession
  if (!session) return false
  return tableSessionHasAlias(session.tableName, session.customLabel)
})

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
const isAnonymousPosCustomer = computed(
  () => posStore.currentCustomer?.phone_number === '0000000000',
)
const posCustomerId = computed(() => {
  if (isAnonymousPosCustomer.value) return ''
  return posStore.currentCustomer?.id ?? ''
})
const posCustomerIdentity = computed(() =>
  buildCustomerIdentityPresentation(posStore.currentCustomer),
)
const { wallet: posCustomerWallet, isLoading: isLoadingPosWallet, isRefreshing: isRefreshingPosWallet, refetch: refetchPosWallet } =
  useCustomerWallet(posCustomerId, { scope: 'pos' })
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

const onPosCustomerIdentified = async (customer: Customer) => {
  await posStore.setCustomer(customer)
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
const showMesaBannerSkeleton = computed(
  () => isLoadingTabItems.value,
)
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
const { printComandas: printComandasRouted, getCachedResolveMap } = useStationTicketPrint()
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

async function runComandaPrint(queue: ComandaPrintPayload[]) {
  if (!queue.length) return
  const cached = getCachedResolveMap()
  if (typeof cached !== 'undefined') {
    const hasPrinter = cached && (cached.resolved_caja || Object.values(cached.resolved).some(Boolean))
    if (!hasPrinter) {
      document.body.classList.add('printing-comanda')
      printQueueComandas.value = queue
      await nextTick()
      const earlyCleanup = () => {
        document.body.classList.remove('printing-comanda')
        window.removeEventListener('afterprint', earlyCleanup)
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
  }
  const mode = await printComandasRouted(queue, {
    setQueue: (c) => { printQueueComandas.value = c },
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

async function printLatestComanda() {
  if (!comandasEnabled.value || !canPrintLatestComanda.value) return
  const queue = mapComandasForPrint(lastFiredComandasRaw.value)
  if (!queue.length) return
  await runComandaPrint(queue)
}

async function printSelectedPersistedComandas() {
  if (!persistedComandasForPrintDisplay.value.length) return
  await runComandaPrint(persistedComandasForPrintDisplay.value)
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
    taxCategory: i.taxCategory ?? i.tax_category ?? null,
    taxLabel: i.taxLabel ?? i.tax_label ?? null,
    taxAmount: i.taxAmount != null || i.tax_amount != null
      ? Number(i.taxAmount ?? i.tax_amount) || 0
      : null,
    includedInPrice: i.includedInPrice ?? i.included_in_price ?? null,
    modifiers: (i.modifiers ?? []).map((m: any) => ({
      id: m.id ?? '',
      name: m.name,
      price: Number(m.price) || 0,
      quantity: Number(m.quantity) || 1,
      included_quantity: Math.max(0, Number(m.included_quantity) || 0),
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

const mergeSessionGuestFieldsFromApi = (
  apiSession: { covers?: number | null; capacity_snapshot?: number | null; custom_label?: string | null },
  prev: typeof posStore.activeTableSession,
) => {
  const apiCovers = apiSession.covers ?? null
  const apiCapacitySnapshot = apiSession.capacity_snapshot ?? null
  const apiCustomLabel = apiSession.custom_label ?? null

  return {
    covers: isSavingSessionCovers.value
      ? (prev?.covers ?? apiCovers)
      : (apiCovers ?? prev?.covers ?? null),
    capacitySnapshot: apiCapacitySnapshot ?? prev?.capacitySnapshot ?? null,
    customLabel: isSavingSessionAlias.value
      ? (prev?.customLabel ?? apiCustomLabel)
      : (apiCustomLabel ?? prev?.customLabel ?? null),
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
  const prev = posStore.activeTableSession
  const guestFields = mergeSessionGuestFieldsFromApi(s, prev)
  posStore.setTableSession({
    tableId,
    sessionId: s.id,
    tableName: tableCtx?.tableName ?? prev?.tableName ?? '',
    runningTotal: s.running_total,
    openedAt: s.opened_at,
    isBar: tableCtx?.isBar ?? prev?.isBar ?? false,
    attendedByMemberId: s.attended_by_member_id ?? null,
    attendedByMemberName: s.attended_by_member_name ?? null,
    effectiveWaiterMemberId: s.effective_waiter_member_id ?? null,
    effectiveWaiterMemberName: s.effective_waiter_member_name ?? null,
    ...guestFields,
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

const formatCurrencyPOS = (amount: number): string => formatCurrency(amount)

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
      category_color: p.category_color ?? null,
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
    category_color: p.category_color ?? null,
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
    const matchesSearch = !posShowSearch.value
      || !searchQuery.value.trim()
      || product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
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

watch(
  () => posStore.activeTableSession?.isBar && bannerEffectiveWaiterId.value,
  (id) => {
    if (!posStore.activeTableSession?.isBar || !id) return
    posStore.setCartServedBy(id)
  },
  { immediate: true },
)

watchEffect(() => {
  if (!setShowBackButton) return
  if (showFloorPlan.value) {
    setShowBackButton(true)
    setBackHandler?.(() => router.back())
  } else {
    setShowBackButton(false)
    setBackHandler?.(undefined)
  }
})

onUnmounted(() => {
  clearMobileCart()
  setRefreshHandler(undefined)
  stopSessionSyncPolling()
  stopFulfillmentPolling()
  if (readyCountInterval) clearInterval(readyCountInterval)
  setShowBackButton?.(false)
  setBackHandler?.(undefined)
})
</script>

<template>
  <!-- Settings resolving — show loader while we don't know if tables are enabled -->
  <div v-if="isResolvingSettings" class="flex items-center justify-center min-h-[70vh]">
    <CommonsTheCustomLoader size="large" />
  </div>

  <!-- Floor plan ↔ catalog transition (#2483) -->
  <template v-else>
    <Transition name="pos-view" mode="out-in">
      <div v-if="showFloorPlan" key="pos-floor">
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
      <div v-else key="pos-catalog">
    <!-- Loading State (initial page load) -->
    <div v-if="loadingProducts" class="flex items-center justify-center min-h-[70vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="productsError" />

    <!-- POS Content (shown always after loading) -->
    <div v-else>
      <!-- Main POS Container -->
      <div :class="['grid w-full grid-cols-1 items-start lg:grid-cols-[minmax(0,1fr)_24rem]', sectionGapClass]">
        <!-- Products Panel (Left) -->
        <div :class="['min-w-0 flex flex-col', sectionStackClass]">
          <div :class="['lg:sticky lg:top-0 lg:z-20 flex flex-col bg-background pt-1 pb-4', sectionGapClass]">
      <!-- Live promotion hint (warocol.com#983) -->
      <div
        v-if="hasActivePromos"
        role="status"
        class="flex items-center gap-2 h-9 px-3 rounded-lg bg-status-success-bg border border-status-success-text/25"
      >
        <div class="flex-shrink-0 bg-status-success-text/15 p-1 rounded-md">
          <svg class="h-[1em] w-[1em] text-status-success-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <p class="text-sm text-status-success-text font-medium truncate">
          {{ t('pos.banner.promoActive', { name: activePromoHint }) }}
        </p>
      </div>

      <!-- Mesa Banner skeleton (initial tab load only) -->
      <div
        v-if="showMesaBannerSkeleton"
        class="bg-surface border border-border rounded-xl p-3 shadow-sm animate-pulse flex flex-col"
        :class="siblingGapClass"
        aria-busy="true"
        aria-live="polite"
      >
        <div class="flex items-start sm:items-center min-w-0" :class="siblingGapClass">
          <div class="min-w-0 flex-1 space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <div class="h-3.5 w-24 bg-surface-secondary rounded" />
              <div class="h-3 w-14 bg-surface-secondary rounded" />
            </div>
            <div class="h-2.5 w-44 max-w-full bg-surface-secondary rounded" />
          </div>
          <div class="flex flex-shrink-0" :class="siblingGapClass">
            <div class="h-9 w-14 bg-surface-secondary rounded-lg hidden sm:block" />
            <div class="h-9 w-9 bg-surface-secondary rounded-lg" />
            <div class="h-9 w-9 bg-surface-secondary rounded-lg" />
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3" :class="siblingGapClass">
          <div class="h-9 bg-surface-secondary rounded-lg" />
          <div class="h-9 bg-surface-secondary rounded-lg" />
          <div class="h-9 bg-surface-secondary rounded-lg col-span-2 sm:col-span-1" />
        </div>
      </div>

      <!-- Bar banner (bar session — 2-row parity with mesa) -->
      <div
        v-else-if="posStore.activeTableSession?.isBar"
        class="bg-surface border border-state-warning-border/40 rounded-xl p-3 shadow-sm flex flex-col"
        :class="siblingGapClass"
      >
        <div class="flex items-start sm:items-center min-w-0" :class="siblingGapClass">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span class="inline-flex items-center gap-1.5 min-w-0">
                <span class="text-sm font-semibold text-state-warning-text">{{ t('pos.floor.bar') }}</span>
                <span class="text-[11px] font-medium text-text-secondary flex-shrink-0">
                  {{ comandasEnabled ? t('pos.banner.barHintKitchen') : t('pos.banner.barHintDirect') }}
                </span>
              </span>
              <span
                v-if="comandasEnabled && unfiredCount > 0"
                class="inline-flex items-center rounded-md border border-state-danger-border/30 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-state-danger-text whitespace-nowrap"
              >
                {{ unfiredCount === 1 ? t('pos.banner.unsentOne', { count: unfiredCount }) : t('pos.banner.unsentMany', { count: unfiredCount }) }}
              </span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-secondary tabular-nums leading-tight">
              <span>{{ t('pos.banner.accumulated', { amount: formatCurrencyPOS(posStore.activeTableSession.runningTotal) }) }}</span>
              <span class="text-text-tertiary" aria-hidden="true">·</span>
              <span>{{ formatDuration(posStore.activeTableSession.openedAt) }}</span>
            </div>
          </div>

          <div class="flex flex-shrink-0 flex-wrap items-center justify-end" :class="siblingGapClass">
            <button
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              :class="[bannerActionButtonClass, 'text-text-secondary border border-border hover:text-text-primary hover:bg-surface-secondary px-2 focus-visible:ring-ring/35']"
              :aria-label="t('pos.banner.backAria', { tables: tablePluralLower, table: tableSingularLower })"
              @click="leaveActiveTableSession"
            >
              <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              <span class="hidden sm:inline">{{ t('pos.banner.back') }}</span>
            </button>
            <button
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              :class="[bannerActionButtonClass, 'text-status-error-text border border-status-error-text/25 hover:bg-status-error-bg px-2 focus-visible:ring-status-error-text']"
              :aria-label="t('pos.banner.releaseAria', { table: tableSingularLower })"
              @click="handleReleaseMesa"
            >
              <UiLoadingDots v-if="isBannerClosing || posStore.isCancellingMesa" size="6px" />
              <template v-else>
                <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                <span class="hidden sm:inline">{{ t('pos.banner.release') }}</span>
              </template>
            </button>
          </div>
        </div>

        <div
          v-if="waiterAttributionEnabled"
          class="relative"
        >
          <div class="grid grid-cols-2" :class="siblingGapClass">
            <div :class="[bannerSessionFieldClass, 'relative col-span-2']">
              <span class="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-[11px] font-normal text-text-tertiary z-[1]">
                {{ t('pos.banner.waiterLabel') }}:
              </span>
              <select
                :value="bannerEffectiveWaiterId || ''"
                :disabled="isChangingSessionWaiter || isBannerSessionFieldsSaving"
                :aria-label="t('pos.banner.changeWaiterAria')"
                class="h-9 w-full leading-none ps-[4.25rem] pe-7 rounded-lg border-none bg-transparent text-sm font-medium outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none appearance-none bg-none cursor-pointer truncate [&::-ms-expand]:hidden"
                style="background-image: none; -webkit-appearance: none; -moz-appearance: none;"
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
              <svg
                class="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 h-[1em] w-[1em] text-text-tertiary"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                stroke="currentColor" aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
          <div
            v-if="isChangingSessionWaiter || isBannerSessionFieldsSaving"
            class="absolute inset-0 z-[2] rounded-lg bg-surface/35"
            aria-hidden="true"
          />
        </div>
      </div>

      <!-- Counter banner (mostrador — parity with mesa/bar) -->
      <div
        v-else-if="showCounterBanner"
        class="bg-surface border border-border rounded-xl p-3 shadow-sm flex flex-col"
        :class="siblingGapClass"
      >
        <div class="flex items-start sm:items-center min-w-0" :class="siblingGapClass">
          <div class="min-w-0 flex-1">
            <span class="text-sm font-semibold text-text-primary">{{ t('pos.floor.counter') }}</span>
          </div>
          <div class="flex flex-shrink-0 flex-wrap items-center justify-end" :class="siblingGapClass">
            <button
              type="button"
              :class="[bannerActionButtonClass, 'text-text-secondary border border-border hover:text-text-primary hover:bg-surface-secondary px-2 focus-visible:ring-ring/35']"
              :aria-label="t('pos.banner.back')"
              @click="handleCounterBack"
            >
              <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              <span class="hidden sm:inline">{{ t('pos.banner.back') }}</span>
            </button>
            <button
              type="button"
              :disabled="!canClearCounterCart || isCounterClearing"
              :class="[bannerActionButtonClass, 'text-status-error-text border border-status-error-text/25 hover:bg-status-error-bg px-2 focus-visible:ring-status-error-text disabled:opacity-50']"
              :aria-label="t('pos.cart.clearCart')"
              @click="clearCart"
            >
              <UiLoadingDots v-if="isCounterClearing" size="6px" />
              <template v-else>
                <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                <span class="hidden sm:inline">{{ t('pos.cart.clear') }}</span>
              </template>
            </button>
          </div>
        </div>

        <div
          v-if="waiterAttributionEnabled"
          class="relative"
        >
          <div class="grid grid-cols-2" :class="siblingGapClass">
            <div :class="[bannerSessionFieldClass, 'relative col-span-2']">
              <span class="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-[11px] font-normal text-text-tertiary z-[1]">
                {{ t('pos.banner.waiterLabel') }}:
              </span>
              <select
                :value="posStore.cartServedByMemberId || ''"
                :aria-label="t('pos.banner.changeWaiterAria')"
                class="h-9 w-full leading-none ps-[4.25rem] pe-7 rounded-lg border-none bg-transparent text-sm font-medium outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none appearance-none bg-none cursor-pointer truncate [&::-ms-expand]:hidden"
                style="background-image: none; -webkit-appearance: none; -moz-appearance: none;"
                :class="posStore.cartServedByMemberId ? 'text-text-primary' : 'text-text-secondary italic'"
                @change="handleChangeCartWaiter"
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
              <svg
                class="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 h-[1em] w-[1em] text-text-tertiary"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                stroke="currentColor" aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Mesa Banner — B: 2 fixed rows (identity+actions / session fields grid) -->
      <div
        v-else-if="posStore.activeTableSession"
        class="bg-surface border border-border rounded-xl p-3 shadow-sm flex flex-col"
        :class="siblingGapClass"
      >
        <!-- Row 1: entity + metric + actions -->
        <div class="flex items-start sm:items-center min-w-0" :class="siblingGapClass">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span class="inline-flex items-center gap-1.5 min-w-0">
                <span class="text-sm font-semibold text-text-primary truncate">{{ activeSessionDisplayName }}</span>
                <span
                  v-if="activeSessionShowsCatalogName"
                  class="text-[11px] font-normal text-text-tertiary truncate"
                >
                  {{ posStore.activeTableSession.tableName }}
                </span>
                <span class="text-[11px] font-medium text-status-success-text/80 flex-shrink-0">{{ t('pos.banner.active', { table: tableSingular }) }}</span>
              </span>
              <span
                v-if="activeMinimumStatusLabel"
                class="inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap tabular-nums"
                :class="activeMinimumStatusClass"
              >
                {{ activeMinimumStatusLabel }}
              </span>
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-secondary tabular-nums leading-tight">
              <span>{{ t('pos.banner.accumulated', { amount: formatCurrencyPOS(posStore.activeTableSession.runningTotal) }) }}</span>
              <span class="text-text-tertiary" aria-hidden="true">·</span>
              <span>{{ formatDuration(posStore.activeTableSession.openedAt) }}</span>
              <template v-if="showActiveMinimumConsumption && activeMinimumConsumption">
                <span class="text-text-tertiary" aria-hidden="true">·</span>
                <span>{{ t('pos.banner.min', { amount: formatCurrencyPOS(activeMinimumConsumption.amount) }) }}</span>
              </template>
            </div>
          </div>

          <div class="flex flex-shrink-0 flex-wrap items-center justify-end" :class="siblingGapClass">
            <button
              v-if="canPayTableAdvance"
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              :class="[bannerActionButtonClass, 'text-badge-primary-text bg-badge-primary-bg border border-badge-primary-border hover:bg-badge-primary-hover-bg focus-visible:ring-primary/35']"
              :aria-label="t('pos.banner.payAdvanceAria', { table: tableSingularLower })"
              @click="showTableAdvancePanel = true"
            >
              <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span class="hidden sm:inline">{{ t('pos.banner.payAdvance') }}</span>
            </button>
            <button
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              :class="[bannerActionButtonClass, 'text-text-secondary border border-border hover:text-text-primary hover:bg-surface-secondary px-2 focus-visible:ring-ring/35']"
              :aria-label="t('pos.banner.backAria', { tables: tablePluralLower, table: tableSingularLower })"
              @click="leaveActiveTableSession"
            >
              <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              <span class="hidden sm:inline">{{ t('pos.banner.back') }}</span>
            </button>
            <button
              type="button"
              :disabled="isBannerClosing || posStore.isCancellingMesa"
              :class="[bannerActionButtonClass, 'text-status-error-text border border-status-error-text/25 hover:bg-status-error-bg px-2 focus-visible:ring-status-error-text']"
              :aria-label="t('pos.banner.releaseAria', { table: tableSingularLower })"
              @click="handleReleaseMesa"
            >
              <UiLoadingDots v-if="isBannerClosing || posStore.isCancellingMesa" size="6px" />
              <template v-else>
                <svg class="h-[1em] w-[1em] flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                <span class="hidden sm:inline">{{ t('pos.banner.release') }}</span>
              </template>
            </button>
          </div>
        </div>

        <!-- Row 2: session fields — fixed grid (no free wrap) -->
        <div
          v-if="!posStore.activeTableSession.isBar || waiterAttributionEnabled"
          class="relative"
        >
          <div
            class="grid"
            :class="[
              siblingGapClass,
              !posStore.activeTableSession.isBar && waiterAttributionEnabled
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2',
            ]"
            :aria-busy="isBannerSessionFieldsSaving ? 'true' : undefined"
          >
          <template v-if="!posStore.activeTableSession.isBar">
            <label :class="bannerSessionFieldClass">
              <span class="text-[11px] font-normal text-text-tertiary whitespace-nowrap flex-shrink-0">
                {{ t('pos.banner.coversLabel') }}:
              </span>
              <input
                type="number"
                min="1"
                :value="bannerSessionCoversValue"
                :disabled="isSavingSessionCovers"
                :aria-label="t('pos.banner.coversAria')"
                class="banner-covers-input h-7 w-11 min-w-0 flex-shrink-0 bg-transparent text-center text-sm font-semibold tabular-nums text-text-primary border-none outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none accent-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                @blur="handleBlurSessionCovers"
              >
            </label>
            <label :class="bannerSessionFieldClass">
              <span class="text-[11px] font-normal text-text-tertiary whitespace-nowrap flex-shrink-0">
                {{ t('pos.banner.customLabelLabel') }}:
              </span>
              <input
                type="text"
                maxlength="80"
                :value="posStore.activeTableSession.customLabel || ''"
                :disabled="isSavingSessionAlias"
                :placeholder="t('pos.banner.customLabelPlaceholder')"
                :aria-label="t('pos.banner.customLabelAria')"
                class="h-8 min-w-0 flex-1 bg-transparent border-none outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none text-sm font-medium text-text-primary placeholder:text-text-tertiary/80"
                @blur="handleBlurSessionLabel"
              >
            </label>
          </template>
            <div
              v-if="waiterAttributionEnabled"
              :class="[
                bannerSessionFieldClass,
                'relative',
                !posStore.activeTableSession.isBar ? '' : 'col-span-2',
              ]"
            >
              <span class="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-[11px] font-normal text-text-tertiary z-[1]">
                {{ t('pos.banner.waiterLabel') }}:
              </span>
              <select
                :value="bannerEffectiveWaiterId || ''"
                :disabled="isBannerSessionFieldsSaving"
                :aria-label="t('pos.banner.changeWaiterAria')"
                class="h-9 w-full leading-none ps-[4.25rem] pe-7 rounded-lg border-none bg-transparent text-sm font-medium outline-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:shadow-none appearance-none bg-none cursor-pointer truncate [&::-ms-expand]:hidden"
                style="background-image: none; -webkit-appearance: none; -moz-appearance: none;"
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
              <svg
                class="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 h-[1em] w-[1em] text-text-tertiary"
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                stroke="currentColor" aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
          <div
            v-if="isBannerSessionFieldsSaving"
            class="absolute inset-0 z-[2] rounded-lg bg-surface/35"
            aria-hidden="true"
          />
        </div>

        <p v-if="tabError" class="mt-1.5 text-xs text-destructive bg-destructive/10 rounded-lg px-2.5 py-1">
          {{ tabError }}
        </p>
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
                {{ isAnonymousPosCustomer ? t('pos.banner.currentCustomer') : t('pos.customer.contactLabel') }}
              </p>
              <p class="text-base font-bold text-text-primary leading-tight truncate">
                {{ posStore.currentCustomer.name || t('pos.banner.noName') }}
              </p>
              <p class="text-xs text-text-secondary mt-0.5">
                📱 {{ posStore.currentCustomer.phone_number || t('pos.customer.noPhone') }}
              </p>
              <p
                v-if="posCustomerIdentity.hasFiscalIdentity && !posCustomerIdentity.showSeparateAcquirer && posCustomerIdentity.acquirer.fiscalId"
                class="text-xs text-text-secondary mt-0.5"
              >
                {{ [posCustomerIdentity.acquirer.fiscalIdType, posCustomerIdentity.acquirer.fiscalId].filter(Boolean).join(' ') }}
              </p>
              <div
                v-if="posCustomerIdentity.showSeparateAcquirer"
                class="mt-2 border-s-2 border-badge-primary-border ps-2"
              >
                <p class="text-[10px] font-bold text-badge-primary-text uppercase tracking-wider">
                  {{ t('pos.customer.fiscalAcquirerLabel') }}
                </p>
                <p class="text-sm font-semibold text-text-primary leading-tight break-words">
                  {{ posCustomerIdentity.acquirer.name }}
                </p>
                <p
                  v-if="posCustomerIdentity.acquirer.fiscalId"
                  class="text-xs text-text-secondary mt-0.5"
                >
                  {{ [posCustomerIdentity.acquirer.fiscalIdType, posCustomerIdentity.acquirer.fiscalId].filter(Boolean).join(' ') }}
                </p>
              </div>
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

          <!-- Catalog controls: search + category filters -->
          <div :class="['flex flex-col', sectionGapClass]">
            <div
              class="flex items-center"
              :class="siblingGapClass"
            >
              <UiSearchBar
                v-if="posShowSearch"
                v-model="searchQuery"
                :placeholder="t('pos.catalog.searchPlaceholder')"
                class="h-9 min-w-0 flex-1 px-3"
              />
            </div>

            <div
              class="flex overflow-x-auto scrollbar-hide pb-1 -mx-0.5 px-0.5"
              :class="siblingGapClass"
            >
              <button
                v-for="cat in categories"
                :key="cat"
                :class="[
                  categoryChipClass,
                  selectedCategory === cat
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-surface-secondary/50 border border-border/70 text-text-secondary hover:border-border hover:text-text-primary hover:bg-surface-secondary',
                ]"
                @click="selectedCategory = cat"
              >
                {{ cat === 'all' ? t('pos.catalog.all') : cat }}
              </button>
            </div>
          </div>
        </div>

        <!-- Products catalog — no layout swap animation; soft filter stagger on grid -->
        <div class="relative min-h-[8rem]">
          <!-- Empty State -->
          <div
            v-if="filteredProducts.length === 0"
            class="flex flex-col items-center justify-center h-64 text-text-secondary"
          >
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p class="text-lg font-medium">{{ t('pos.banner.noProducts') }}</p>
            <p class="text-sm mt-1">{{ t('pos.banner.addFromMenu') }}</p>
          </div>

          <!-- Products list — compact rows (#2499); promo chip column (#2501) -->
          <div
            v-else-if="resolvedCatalogLayout === 'list'"
            class="pos-catalog-surface"
          >
            <UiResponsiveDataView
              :columns="catalogListColumns"
              :data="filteredProducts"
              item-key="id"
              :empty-message="t('pos.banner.noProducts')"
              row-size="sm"
              @row-click="selectProduct"
            >
              <template #card="{ item }">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-data-table-row-hover-bg"
                  @click="selectProduct(item)"
                >
                  <p class="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{{ item.name }}</p>
                  <span
                    v-if="promoBadgesByProductId.get(item.id)"
                    class="inline-flex max-w-[40%] flex-shrink-0 truncate rounded-full bg-badge-success-bg px-2 py-0.5 text-[10px] font-semibold text-badge-success-text"
                    :title="promoBadgesByProductId.get(item.id)?.title || promoBadgesByProductId.get(item.id)?.label"
                  >
                    {{ promoBadgesByProductId.get(item.id)?.label }}
                  </span>
                  <span
                    v-else
                    class="inline-flex flex-shrink-0 truncate rounded-full bg-badge-neutral-bg px-2 py-0.5 text-[10px] font-semibold text-badge-neutral-text"
                  >
                    {{ t('pos.catalog.noPromo') }}
                  </span>
                  <p class="flex-shrink-0 text-sm font-semibold tabular-nums text-text-primary/80">
                    {{ formatCurrency(item.price) }}
                  </p>
                </button>
              </template>
              <template #cell-name="{ item }">
                <p class="truncate text-sm font-semibold text-text-primary">{{ item.name }}</p>
              </template>
              <template #cell-promo="{ item }">
                <span
                  v-if="promoBadgesByProductId.get(item.id)"
                  class="inline-flex max-w-full truncate rounded-full bg-badge-success-bg px-2 py-0.5 text-[10px] font-semibold text-badge-success-text"
                  :title="promoBadgesByProductId.get(item.id)?.title || promoBadgesByProductId.get(item.id)?.label"
                >
                  {{ promoBadgesByProductId.get(item.id)?.label }}
                </span>
                <span
                  v-else
                  class="inline-flex max-w-full truncate rounded-full bg-badge-neutral-bg px-2 py-0.5 text-[10px] font-semibold text-badge-neutral-text"
                >
                  {{ t('pos.catalog.noPromo') }}
                </span>
              </template>
              <template #cell-price="{ item }">
                <span class="text-sm font-semibold tabular-nums text-text-primary/80">{{ formatCurrency(item.price) }}</span>
              </template>
            </UiResponsiveDataView>
          </div>

          <!-- Products Grid — calm filter morph on search/category -->
          <TransitionGroup
            v-else
            tag="div"
            name="pos-catalog-item"
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 pb-4"
            :class="siblingGapClass"
          >
            <div
              v-for="(product, index) in filteredProducts"
              :key="product.id"
              class="pos-catalog-item flex min-h-0 min-w-0 h-full"
              :style="catalogItemStaggerStyle(index)"
            >
              <PosProductCard
                class="h-full w-full"
                :product="product"
                :promo-badge="promoBadgesByProductId.get(product.id) ?? null"
                :show-image="posShowProductImage"
                @select="selectProduct"
              />
            </div>
          </TransitionGroup>
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
        :comanda-print-enabled="comandaPrintEnabled"
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
    </Transition>
  </template>

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
    <Teleport v-if="!showFloorPlan" to="#dashboard-header-pos-tools">
      <button
        type="button"
        :class="catalogLayoutToggleButtonClass"
        :disabled="isSavingCatalogLayout"
        :aria-label="catalogLayoutToggleAria"
        :title="catalogLayoutToggleLabel"
        @click="toggleCatalogLayout"
      >
        <span class="inline-flex h-4 w-4 items-center justify-center">
          <Transition name="pos-layout-icon" mode="out-in">
            <svg
              v-if="catalogLayoutToggleTarget === 'list'"
              key="icon-list"
              class="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <svg
              v-else
              key="icon-grid"
              class="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 8.25 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
          </Transition>
        </span>
      </button>
    </Teleport>
    <Teleport to="#dashboard-header-actions">
      <button
        v-if="expediterEnabled && comandasEnabled"
        type="button"
        :aria-label="readyComandasCount > 0 ? t('pos.banner.comandasStatusReady', { count: readyComandasCount }) : t('pos.banner.comandasStatus')"
        :title="readyComandasCount > 0 ? (readyComandasCount === 1 ? t('pos.banner.comandasReadyTitleOne', { count: readyComandasCount }) : t('pos.banner.comandasReadyTitleMany', { count: readyComandasCount })) : t('pos.banner.comandasStatus')"
        class="relative inline-flex items-center gap-1.5 h-9 rounded-lg border border-shell-action-border bg-shell-action-bg text-shell-action-text text-sm font-medium hover:bg-shell-action-hover-bg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-shell-action-focus-ring px-2 xl:px-2.5"
        :class="readyComandasCount > 0 ? 'ring-1 ring-state-success-border/50' : ''"
        @click="showExpediterPanel = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
          <path d="m9 14 2 2 4-4"/>
        </svg>
        <span class="hidden xl:inline text-sm font-medium">{{ t('pos.banner.comandas') }}</span>
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
    :table-display-name="activeSessionDisplayName || null"
    @success="refreshReadyComandasCount"
  />

  <PosTableSessionAdvancePanel
    v-model="showTableAdvancePanel"
    :table-id="posStore.activeTableSession?.tableId ?? null"
    :table-name="activeSessionDisplayName || null"
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
    :table-display-name="activeSessionDisplayName || null"
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
      :comanda-print-enabled="comandaPrintEnabled"
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

<style>
@media (prefers-reduced-motion: no-preference) {
  .pos-view-enter-active,
  .pos-view-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .pos-view-enter-from,
  .pos-view-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }

  /* Search / category: slower, opacity-first — less visual noise */
  .pos-catalog-item-move {
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .pos-catalog-item-enter-active {
    transition:
      opacity 0.42s ease,
      transform 0.48s cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: var(--pos-stagger, 0ms);
  }

  .pos-catalog-item-leave-active {
    transition: opacity 0.28s ease;
  }

  .pos-catalog-item-enter-from {
    opacity: 0;
    transform: translateY(-6px);
  }

  .pos-catalog-item-leave-to {
    opacity: 0;
  }

  /* Toggle glyph morph */
  .pos-layout-icon-enter-active,
  .pos-layout-icon-leave-active {
    transition:
      opacity 0.15s ease,
      transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .pos-layout-icon-enter-from {
    opacity: 0;
    transform: rotate(-42deg) scale(0.72);
  }

  .pos-layout-icon-leave-to {
    opacity: 0;
    transform: rotate(42deg) scale(0.72);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pos-catalog-item-enter-active,
  .pos-catalog-item-leave-active,
  .pos-catalog-item-move,
  .pos-layout-icon-enter-active,
  .pos-layout-icon-leave-active {
    transition: none !important;
  }
}
</style>
