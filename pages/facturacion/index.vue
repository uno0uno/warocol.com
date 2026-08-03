<script setup lang="ts">
const { t } = useI18n()
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useFormatters } from '~/composables/useFormatters'
import { useInvoicingReadiness } from '~/composables/useInvoicingReadiness'
import {
  CheckIcon,
  ReceiptPercentIcon,
  DocumentTextIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'dashboard', module: 'facturacion' })
useHead({ title: () => t('facturacion.head.module') })

const { currentTenant } = useTenantReactive()
const toast = useToast()
const { formatDate } = useFormatters()
const cache = useQueryCache()
const {
  isFiscalIntegrated,
  isMatiasDian,
  isWaroCommercial,
  profile: financialProfile,
  isLoading: isFinancialProfileLoading,
} = useTenantFinancialProfile()

// Invoicing readiness banners (#450)
const { ready: isInvoicingReady, checks: readinessChecks } = useInvoicingReadiness({
  enabled: () => isFiscalIntegrated.value,
})
const invalidateReadiness = () => {
  cache.invalidateQueries({ key: ['tenant', 'invoicing-readiness'] })
}

// ── DIAN Resolutions ────────────────────────────────────────────────────────
const { data: resolutionsData, asyncStatus: resAsyncStatus, refetch: refetchResolutions } = useQuery({
  key: () => ['tenant', 'dian-resolutions', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/tenant/dian-resolutions'),
  enabled: () => !!currentTenant.value && isFiscalIntegrated.value,
  staleTime: 60_000,
})
const resolutions = computed(() => resolutionsData.value?.data ?? [])

// DIAN sequence-gap summary — drives the range-burn alert (#592)
const { data: gapsSummaryData, refetch: refetchGapsSummary } = useQuery({
  key: () => ['tenant', 'dian-gaps-summary', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { last_24h: number; last_7d: number; last_30d: number; total: number } }>(
    '/api/api/tenant/dian-resolutions/gaps-summary'
  ),
  enabled: () => !!currentTenant.value && isFiscalIntegrated.value,
  staleTime: 60_000,
})
const gapsSummary = computed(() => gapsSummaryData.value?.data ?? null)
const hasRecentGaps = computed(() => (gapsSummary.value?.last_7d ?? 0) > 0)

// Resolution form state
const showResolutionForm = ref(false)
const editingResolutionId = ref<string | null>(null)
const isSavingResolution = ref(false)
// warocol.com#592 — stored value when opening edit. DIAN forbids rewinds,
// so the form clamps `current_number` at or above this value.
const editingStoredCurrentNumber = ref<number | null>(null)
const resolutionForm = reactive<{
  resolution_number: string
  prefix: string
  from_number: number
  to_number: number
  current_number: number | null
  date_from: string
  date_to: string
  document_type: string
}>({
  resolution_number: '',
  prefix: '',
  from_number: 1,
  to_number: 1000,
  current_number: null,
  date_from: '',
  date_to: '',
  document_type: 'invoice',
})

const resetResolutionForm = () => {
  resolutionForm.resolution_number = ''
  resolutionForm.prefix = ''
  resolutionForm.from_number = 1
  resolutionForm.to_number = 1000
  resolutionForm.current_number = null
  resolutionForm.date_from = ''
  resolutionForm.date_to = ''
  resolutionForm.document_type = 'invoice'
  editingResolutionId.value = null
  editingStoredCurrentNumber.value = null
}

// Forward-only floor: when editing, clamp at the stored value (#592).
// Otherwise clamp at from_number - 1 (the allocator's initial state).
const currentNumberFloor = computed(() => {
  const fromFloor = (resolutionForm.from_number || 1) - 1
  if (editingStoredCurrentNumber.value !== null) {
    return Math.max(fromFloor, editingStoredCurrentNumber.value)
  }
  return fromFloor
})

const isCurrentNumberInvalid = computed(() => {
  if (resolutionForm.current_number === null) return false
  if (!resolutionForm.from_number || !resolutionForm.to_number) return false
  return (
    resolutionForm.current_number < currentNumberFloor.value ||
    resolutionForm.current_number > resolutionForm.to_number
  )
})

const openNewResolution = () => {
  resetResolutionForm()
  showResolutionForm.value = true
}

const openEditResolution = (res: any) => {
  editingResolutionId.value = res.id
  editingStoredCurrentNumber.value = res.current_number
  resolutionForm.resolution_number = res.resolution_number
  resolutionForm.prefix = res.prefix
  resolutionForm.from_number = res.from_number
  resolutionForm.to_number = res.to_number
  resolutionForm.current_number = res.current_number
  resolutionForm.date_from = res.date_from
  resolutionForm.date_to = res.date_to
  resolutionForm.document_type = res.document_type
  showResolutionForm.value = true
}

const saveResolution = async () => {
  isSavingResolution.value = true
  try {
    if (editingResolutionId.value) {
      await $fetch(`/api/api/tenant/dian-resolutions/${editingResolutionId.value}`, {
        method: 'PUT', body: { ...resolutionForm },
      })
    } else {
      await $fetch('/api/api/tenant/dian-resolutions', {
        method: 'POST', body: { ...resolutionForm },
      })
    }
    await refetchResolutions()
    invalidateReadiness()
    showResolutionForm.value = false
    resetResolutionForm()
    toast.success(editingResolutionId.value ? t('facturacion.toasts.resolutionUpdated') : t('facturacion.toasts.resolutionCreated'), { title: t('facturacion.common.saved') })
  } catch (e: any) {
    toast.error(e.data?.detail || t('facturacion.toasts.resolutionSaveError'), { title: t('facturacion.common.error') })
  } finally {
    isSavingResolution.value = false
  }
}

const toggleResolution = async (resId: string) => {
  try {
    await $fetch(`/api/api/tenant/dian-resolutions/${resId}/toggle`, { method: 'PATCH' })
    await refetchResolutions()
    invalidateReadiness()
  } catch (e: any) {
    toast.error(e.data?.detail || t('facturacion.toasts.toggleError'), { title: t('facturacion.common.error') })
  }
}

const resolutionDocTypes = [
  { value: 'invoice', label: t('facturacion.docTypes.invoice') },
  { value: 'credit_note', label: t('facturacion.docTypes.creditNote') },
  { value: 'debit_note', label: t('facturacion.docTypes.debitNote') },
]

// ── Facturación Status ──────────────────────────────────────────────────────
const { data: statusData, asyncStatus: statusAsyncStatus, refetch: refetchStatus } = useQuery({
  key: () => ['tenant', 'facturacion-status', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/facturacion-status'),
  enabled: () => !!currentTenant.value && isFiscalIntegrated.value,
  staleTime: 60_000,
})
const facturacionStatus = computed(() => statusData.value?.data ?? null)
const localizedMatiasEnvironment = computed(() => {
  if (!facturacionStatus.value?.environment) return t('facturacion.provider.notConfigured')
  if (facturacionStatus.value.environment_id === 1) return t('facturacion.provider.environments.production')
  if (facturacionStatus.value.environment_id === 2) return t('facturacion.provider.environments.testing')
  return facturacionStatus.value.environment
})

// ── Initial loading state ────────────────────────────────────────────────────
const isLoading = computed(() =>
  isFinancialProfileLoading.value
  || (isFiscalIntegrated.value && !resolutionsData.value && !statusData.value),
)

// ── Progressive loading + refresh ───────────────────────────────────────────
const isRefreshing = computed(() =>
  (resAsyncStatus.value === 'loading' && resolutionsData.value != null) ||
  (statusAsyncStatus.value === 'loading' && statusData.value != null)
)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  if (!isFiscalIntegrated.value) return
  await Promise.all([refetchResolutions(), refetchStatus(), refetchGapsSummary()])
}
onMounted(() => { setRefreshHandler(handleRefresh) })
onUnmounted(() => { clearRefreshHandler() })
registerProgressiveLoading(isRefreshing)

// ── Tax Config (moved from negocio.vue) ─────────────────────────────────────
const { data: taxConfigData, refetch: refreshTaxConfig } = useQuery({
  key: () => ['tenant', 'tax-config', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/tax-config'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const taxConfig = computed(() => taxConfigData.value?.data ?? null)

const taxForm = reactive({
  inc_applicable: false,
  inc_included_in_price: true,
  iva_applicable: false,
  iva_included_in_price: false,
  liquor_tax_applicable: false,
  liquor_tax_included_in_price: false,
  iva_rate_pct: 19,
  inc_rate_pct: 8,
  liquor_tax_rate_pct: 5,
})
const isSavingTax = ref(false)

type MatrixLineUi = {
  key: string
  label: string
  ratePct: number
  included_in_price: boolean
  gl_role: string
  mode?: 'primary' | 'alternate' | 'stack'
  exclusive_group?: string | null
}

type CoCustomLineUi = {
  key: string
  label: string
  ratePct: number
  included_in_price: boolean
  mode: 'alternate' | 'stack'
  gl_role: string
}

const {
  COMMERCIAL_COUNTRY_CODES,
  MAX_COMMERCIAL_TAX_LINES,
  CO_TAX_PROFILE_RESTAURANTE,
  commercialPresetForCountry,
  buildCommercialMatrixSavePayload,
  buildCoTaxSavePayload,
  buildCoTaxLinesDraft,
  buildCoRestauranteTaxLines,
  coCustomLinesFromTaxLines,
  validateCommercialMatrix,
  validateTaxLineModes,
  canRemoveTaxLine,
  suggestTaxLineKey,
  normalizeTaxLines,
  normalizeCategoryMap,
  normalizeMenuCategoryLineMap,
  normalizeExemptMenuCategoryIds,
  resolveCategoryMapValue,
  countryNeedsJurisdiction,
  shouldShowWave1CountryPicker,
  shouldShowJurisdictionPicker,
  normalizeJurisdictionOptions,
} = useTenantTaxProfile()

/** CO free tax lines beyond iva/inc/liquor (#2028). */
const coCustomLines = ref<CoCustomLineUi[]>([])
const coTaxProfileId = ref<'custom' | typeof CO_TAX_PROFILE_RESTAURANTE>('custom')

const rateToPct = (rate: unknown, fallback: number) => {
  const n = Number(rate)
  if (!Number.isFinite(n)) return fallback
  return Math.round(n * 10000) / 100
}

const showCommercialTaxUi = computed(() => isWaroCommercial.value)
const profileCountryCode = computed(
  () => financialProfile.value?.country_code?.toUpperCase() || '',
)
const storedJurisdictionCode = computed(() => {
  const raw = taxConfig.value?.tax_jurisdiction_code
  return raw ? String(raw).toUpperCase() : ''
})
const needsJurisdictionCountry = computed(() =>
  showCommercialTaxUi.value && countryNeedsJurisdiction(profileCountryCode.value),
)
/** Ask for state/province only when missing (post-#1854 capture). */
const showJurisdictionPicker = computed(() =>
  shouldShowJurisdictionPicker({
    isCommercial: showCommercialTaxUi.value,
    profileCountryCode: profileCountryCode.value,
    taxJurisdictionCode: storedJurisdictionCode.value,
  }),
)
const showJurisdictionSummary = computed(() =>
  needsJurisdictionCountry.value && Boolean(storedJurisdictionCode.value),
)
/** Commercial panel (rate fields) — not US/CA. */
const showWave1Commercial = computed(() =>
  showCommercialTaxUi.value && !needsJurisdictionCountry.value,
)
/** Second country dropdown only when profile country is unknown. */
const showWave1CountryPicker = computed(() =>
  shouldShowWave1CountryPicker({
    isCommercial: showCommercialTaxUi.value,
    profileCountryCode: profileCountryCode.value,
  }),
)
const showWave1CountryLocked = computed(() =>
  showWave1Commercial.value
  && Boolean(profileCountryCode.value)
  && COMMERCIAL_COUNTRY_CODES.includes(profileCountryCode.value),
)

const commercialPresetCountry = ref('')
const commercialJurisdictionCode = ref('')
/** Missing API field → treat as enabled until #1868 lands. */
const commercialTaxApplicable = ref(true)
const jurisdictionOptions = ref<ReturnType<typeof normalizeJurisdictionOptions>>([])
const commercialLines = ref<MatrixLineUi[]>([])
/** Legacy fiscal-tag map (standard/liquor) — dual-read seed only; not primary UX (#1884). */
const commercialCategoryMap = reactive<{
  standard: string | null
  liquor: string | null
  exempt: string | null
}>({
  standard: null,
  liquor: null,
  exempt: null,
})

/** Menu category UUID → tax line key. */
const menuCategoryLineMap = ref<Record<string, string>>({})
const exemptMenuCategoryIds = ref<string[]>([])

const categorySearchByLine = ref<Record<string, string>>({})
const categorySearchOpenKey = ref<string | null>(null)
const exemptSearch = ref('')
const exemptSearchOpen = ref(false)

type MenuCategoryOption = { id: string; name: string }

const menuCategorySearchResults = ref<MenuCategoryOption[]>([])
let menuCategorySearchSeq = 0

const { data: menuCategoriesData } = useQuery({
  key: () => ['menu', 'categories', 'tax-map', currentTenant.value?.id],
  query: () => $fetch<{ data?: MenuCategoryOption[] }>('/api/menu/categories', {
    query: { limit: 50 },
  }),
  // Commercial matrix + CO exempt chips (#1989) both need the category list.
  enabled: () => !!currentTenant.value && (showCommercialTaxUi.value || isFiscalIntegrated.value),
  staleTime: 60_000,
})

const searchMenuCategories = async (q: string) => {
  const seq = ++menuCategorySearchSeq
  try {
    const res = await $fetch<{ data?: MenuCategoryOption[] }>('/api/menu/categories', {
      query: q.trim()
        ? { search: q.trim(), limit: 50 }
        : { limit: 50 },
    })
    if (seq !== menuCategorySearchSeq) return
    menuCategorySearchResults.value = (res?.data ?? [])
      .map(row => ({ id: String(row.id || '').trim(), name: String(row.name || '').trim() }))
      .filter(row => row.id)
  } catch {
    if (seq !== menuCategorySearchSeq) return
    menuCategorySearchResults.value = []
  }
}

const menuCategoryOptions = computed<MenuCategoryOption[]>(() => {
  const byId = new Map<string, MenuCategoryOption>()
  for (const row of menuCategoriesData.value?.data ?? []) {
    const id = String(row.id || '').trim()
    if (!id) continue
    byId.set(id, { id, name: String(row.name || '').trim() })
  }
  for (const row of menuCategorySearchResults.value) {
    byId.set(row.id, row)
  }
  // Keep labels for already-mapped / exempt chips even if outside current page.
  for (const id of [
    ...Object.keys(menuCategoryLineMap.value),
    ...exemptMenuCategoryIds.value,
  ]) {
    if (!byId.has(id)) byId.set(id, { id, name: id.slice(0, 8) })
  }
  return [...byId.values()]
})

const menuCategoryLabel = (catId: string) => {
  const found = menuCategoryOptions.value.find(c => c.id === catId)
  if (found?.name) return found.name
  return catId.slice(0, 8)
}

const categoriesMappedToLine = (lineKey: string): string[] =>
  Object.entries(menuCategoryLineMap.value)
    .filter(([, mapped]) => mapped === lineKey)
    .map(([catId]) => catId)

const filteredCategoriesForLine = (lineKey: string) => {
  const q = String(categorySearchByLine.value[lineKey] || '').trim()
  const onThisLine = new Set(categoriesMappedToLine(lineKey))
  const exempt = new Set(exemptMenuCategoryIds.value)
  const pool = q ? menuCategorySearchResults.value : menuCategoryOptions.value
  return pool.filter((choice) => {
    if (onThisLine.has(choice.id)) return false
    if (q) return true // server already filtered by search=
    // Idle list: hide pure-exempt (use exempt picker); keep other-line for reassignment.
    if (exempt.has(choice.id) && !menuCategoryLineMap.value[choice.id]) return false
    return true
  })
}

const filteredExemptCategories = computed(() => {
  const q = exemptSearch.value.trim()
  const exempt = new Set(exemptMenuCategoryIds.value)
  const pool = q ? menuCategorySearchResults.value : menuCategoryOptions.value
  return pool.filter(choice => !exempt.has(choice.id))
})

const assignCategoryToLine = (catId: string, lineKey: string) => {
  menuCategoryLineMap.value = { ...menuCategoryLineMap.value, [catId]: lineKey }
  exemptMenuCategoryIds.value = exemptMenuCategoryIds.value.filter(id => id !== catId)
  categorySearchByLine.value = { ...categorySearchByLine.value, [lineKey]: '' }
  categorySearchOpenKey.value = null
}

const unassignCategory = (catId: string) => {
  const next = { ...menuCategoryLineMap.value }
  delete next[catId]
  menuCategoryLineMap.value = next
}

const assignExemptCategory = (catId: string) => {
  unassignCategory(catId)
  if (!exemptMenuCategoryIds.value.includes(catId)) {
    exemptMenuCategoryIds.value = [...exemptMenuCategoryIds.value, catId]
  }
  exemptSearch.value = ''
  exemptSearchOpen.value = false
}

const unassignExemptCategory = (catId: string) => {
  exemptMenuCategoryIds.value = exemptMenuCategoryIds.value.filter(id => id !== catId)
}

const openCategorySearch = (lineKey: string) => {
  categorySearchOpenKey.value = lineKey
  void searchMenuCategories(categorySearchByLine.value[lineKey] || '')
}

const closeCategorySearchSoon = (lineKey: string) => {
  window.setTimeout(() => {
    if (categorySearchOpenKey.value === lineKey) categorySearchOpenKey.value = null
  }, 150)
}

const onCategorySearchInput = (lineKey: string, event: Event) => {
  const value = (event.target as HTMLInputElement).value
  categorySearchByLine.value = { ...categorySearchByLine.value, [lineKey]: value }
  openCategorySearch(lineKey)
}

const openExemptSearch = () => {
  exemptSearchOpen.value = true
  void searchMenuCategories(exemptSearch.value)
}

const closeExemptSearchSoon = () => {
  window.setTimeout(() => {
    exemptSearchOpen.value = false
  }, 150)
}

const onExemptSearchInput = (event: Event) => {
  exemptSearch.value = (event.target as HTMLInputElement).value
  openExemptSearch()
}

/** CO primary (iva|inc): optional chips — empty means all unmapped categories. Liquor requires chips. */
const coPrimaryLineKey = computed(() => {
  if (taxForm.inc_applicable) return 'inc'
  if (taxForm.iva_applicable) return 'iva'
  return null
})

const coPrimaryLabel = computed(() => {
  if (taxForm.inc_applicable) return t('facturacion.tax.incShort')
  if (taxForm.iva_applicable) return t('facturacion.tax.ivaShort')
  return t('facturacion.tax.coMapPrimary')
})

const coPrimaryCategoryIds = computed(() => {
  const key = coPrimaryLineKey.value
  return key ? categoriesMappedToLine(key) : []
})

const coLiquorCategoryIds = computed(() => categoriesMappedToLine('liquor'))

const coLiquorNeedsCategories = computed(
  () => taxForm.liquor_tax_applicable && coLiquorCategoryIds.value.length === 0,
)

/** Recommended liquor rate when enabling the toggle (editable afterward). */
watch(
  () => taxForm.liquor_tax_applicable,
  (on) => {
    if (!on) return
    const rate = Number(taxForm.liquor_tax_rate_pct)
    if (!Number.isFinite(rate) || rate <= 0) {
      taxForm.liquor_tax_rate_pct = 5
    }
  },
)

const linesToUi = (lines: {
  key: string
  label: string
  rate: number
  included_in_price: boolean
  gl_role: string
  mode?: string
  exclusive_group?: string | null
}[]): MatrixLineUi[] =>
  lines.map(line => ({
    key: line.key,
    label: line.label,
    ratePct: Math.round(line.rate * 10000) / 100,
    included_in_price: line.included_in_price,
    gl_role: line.gl_role || 'iva',
    mode: (line.mode as MatrixLineUi['mode']) || 'primary',
    exclusive_group: line.exclusive_group ?? null,
  }))

const uiLinesToDraft = () => commercialLines.value.map(line => ({
  key: line.key,
  label: line.label.trim(),
  rate: Math.max(0, Number(line.ratePct) || 0) / 100,
  included_in_price: Boolean(line.included_in_price),
  gl_role: line.gl_role || 'iva',
  mode: line.mode || 'primary',
  exclusive_group: line.exclusive_group ?? null,
}))

const coCustomLinesToDraft = () => coCustomLines.value.map(line => ({
  key: line.key,
  label: line.label.trim(),
  rate: Math.max(0, Number(line.ratePct) || 0) / 100,
  included_in_price: Boolean(line.included_in_price),
  gl_role: line.gl_role || 'iva',
  mode: line.mode,
  exclusive_group: line.mode === 'alternate' ? 'vat' : null,
}))

const syncCoCustomFromConfig = (cfg: Record<string, any> | null) => {
  coCustomLines.value = coCustomLinesFromTaxLines(cfg?.tax_lines).map(line => ({
    key: line.key,
    label: line.label,
    ratePct: Math.round(line.rate * 10000) / 100,
    included_in_price: Boolean(line.included_in_price),
    mode: line.mode === 'alternate' ? 'alternate' : 'stack',
    gl_role: line.gl_role || 'iva',
  }))
  const lines = normalizeTaxLines(cfg?.tax_lines)
  const gold = buildCoRestauranteTaxLines()
  const customCount = coCustomLinesFromTaxLines(cfg?.tax_lines).length
  const looksLikeRestaurante = Boolean(
    customCount === 0
    && cfg?.iva_applicable
    && cfg?.liquor_tax_applicable
    && cfg?.iva_included_in_price
    && cfg?.liquor_tax_included_in_price
    && Math.abs(Number(cfg?.iva_rate) - gold[0]!.rate) < 1e-9
    && Math.abs(Number(cfg?.liquor_tax_rate) - gold[1]!.rate) < 1e-9
    && lines.some(l => l.key === 'iva' && l.mode === 'primary')
    && lines.some(l => l.key === 'liquor' && l.mode === 'alternate'),
  )
  coTaxProfileId.value = looksLikeRestaurante ? CO_TAX_PROFILE_RESTAURANTE : 'custom'
}

const applyCoRestaurantePreset = async () => {
  // Keep INC tenants on INC; only seed IVA path when IVA (or neither) is active.
  if (!taxForm.inc_applicable) {
    taxForm.iva_applicable = true
    taxForm.inc_applicable = false
  }
  taxForm.iva_rate_pct = 19
  taxForm.iva_included_in_price = true
  taxForm.liquor_tax_applicable = true
  taxForm.liquor_tax_rate_pct = 5
  taxForm.liquor_tax_included_in_price = true
  coCustomLines.value = []
  coTaxProfileId.value = CO_TAX_PROFILE_RESTAURANTE
  // Map Bebidas-like categories → liquor when present.
  try {
    await searchMenuCategories('bebida')
    const matches = menuCategorySearchResults.value.filter(c =>
      /bebida/i.test(String(c.name || '')),
    )
    for (const cat of matches) {
      if (cat.id) assignCategoryToLine(cat.id, 'liquor')
    }
  } catch {
    // Category search is best-effort for the preset.
  }
}

const addCoCustomLine = () => {
  const total = (taxForm.iva_applicable || taxForm.inc_applicable ? 1 : 0)
    + (taxForm.liquor_tax_applicable ? 1 : 0)
    + coCustomLines.value.length
  if (total >= MAX_COMMERCIAL_TAX_LINES) {
    toast.error(t('facturacion.tax.matrixTooMany', { max: MAX_COMMERCIAL_TAX_LINES }), {
      title: t('facturacion.common.error'),
    })
    return
  }
  const existing = [
    'iva', 'inc', 'liquor',
    ...coCustomLines.value.map(l => l.key),
  ]
  const key = suggestTaxLineKey(t('facturacion.tax.newLineLabel'), existing)
  coCustomLines.value.push({
    key,
    label: '',
    ratePct: 0,
    included_in_price: false,
    mode: 'stack',
    gl_role: 'iva',
  })
  coTaxProfileId.value = 'custom'
}

const removeCoCustomLine = (key: string) => {
  if (!canRemoveTaxLine(key, null, menuCategoryLineMap.value)) {
    toast.error(t('facturacion.tax.matrixLineInUse'), { title: t('facturacion.common.error') })
    return
  }
  coCustomLines.value = coCustomLines.value.filter(line => line.key !== key)
  coTaxProfileId.value = 'custom'
}

const setCategoryMapFrom = (map: Record<string, string | null> | null | undefined, fallbackKey?: string | null) => {
  const primary = fallbackKey || map?.standard || commercialLines.value[0]?.key || null
  // Explicit null must stick after unassign; only undefined falls back to primary.
  commercialCategoryMap.standard = resolveCategoryMapValue(map?.standard, primary)
  commercialCategoryMap.liquor = resolveCategoryMapValue(map?.liquor, primary)
  // Exempt products never map to a tax line.
  commercialCategoryMap.exempt = null
}

const setMenuCategoryMapsFrom = (cfg: Record<string, any> | null | undefined) => {
  const rawMap = normalizeMenuCategoryLineMap(cfg?.menu_category_line_map) || {}
  const next: Record<string, string> = {}
  for (const [catId, lineKey] of Object.entries(rawMap)) {
    if (lineKey) next[catId] = lineKey
  }
  menuCategoryLineMap.value = next
  exemptMenuCategoryIds.value = normalizeExemptMenuCategoryIds(cfg?.exempt_menu_category_ids)
    .filter(id => !next[id])
}

const syncCommercialFromConfig = (cfg: Record<string, any> | null) => {
  const lines = normalizeTaxLines(cfg?.tax_lines)
  const map = normalizeCategoryMap(cfg?.category_map)
  if (lines.length) {
    commercialLines.value = linesToUi(lines)
    setCategoryMapFrom(map, lines[0]?.key)
  } else {
    commercialLines.value = []
    setCategoryMapFrom(null, null)
  }
  setMenuCategoryMapsFrom(cfg)

  if (cfg?.tax_jurisdiction_code) {
    commercialJurisdictionCode.value = String(cfg.tax_jurisdiction_code).toUpperCase()
  }

  const profileCountry = profileCountryCode.value
  const primaryKey = map?.standard || lines[0]?.key
  if (profileCountry && COMMERCIAL_COUNTRY_CODES.includes(profileCountry)) {
    const preset = commercialPresetForCountry(profileCountry)
    const presetPrimary = preset?.category_map.standard || preset?.lines[0]?.key
    if (presetPrimary && presetPrimary === primaryKey) {
      commercialPresetCountry.value = profileCountry
      return
    }
  }
  const matched = COMMERCIAL_COUNTRY_CODES.find((code) => {
    const preset = commercialPresetForCountry(code)
    return preset?.category_map.standard === primaryKey
      || preset?.lines[0]?.key === primaryKey
  })
  if (matched) commercialPresetCountry.value = matched
}

const applyCommercialPreset = (countryCode: string) => {
  const preset = commercialPresetForCountry(countryCode)
  if (!preset) return
  commercialPresetCountry.value = countryCode.toUpperCase()
  commercialLines.value = linesToUi(preset.lines)
  setCategoryMapFrom(preset.category_map, preset.lines[0]?.key)
}

const commercialPresetPrimaryLabel = (countryCode: string) => {
  const preset = commercialPresetForCountry(countryCode)
  if (!preset) return ''
  const line = preset.lines.find(l => l.key === preset.category_map.standard) ?? preset.lines[0]
  return line?.label || ''
}

const onCommercialPresetChange = () => {
  if (commercialPresetCountry.value) applyCommercialPreset(commercialPresetCountry.value)
}

const applyJurisdictionOption = (code: string) => {
  const option = jurisdictionOptions.value.find(item => item.code === code)
  if (!option) return
  commercialJurisdictionCode.value = code
  const lines = option.lines.length ? option.lines : []
  if (!lines.length) return
  commercialLines.value = linesToUi(lines)
  setCategoryMapFrom({
    standard: lines[0]?.key || null,
    liquor: lines[0]?.key || null,
    exempt: null,
  }, lines[0]?.key)
}

const onJurisdictionChange = () => {
  if (commercialJurisdictionCode.value) {
    applyJurisdictionOption(commercialJurisdictionCode.value)
  }
}

const addCommercialLine = () => {
  if (commercialLines.value.length >= MAX_COMMERCIAL_TAX_LINES) {
    toast.error(t('facturacion.tax.matrixTooMany', { max: MAX_COMMERCIAL_TAX_LINES }), {
      title: t('facturacion.common.error'),
    })
    return
  }
  const key = suggestTaxLineKey(
    t('facturacion.tax.newLineLabel'),
    commercialLines.value.map(l => l.key),
  )
  commercialLines.value.push({
    key,
    label: '',
    ratePct: 0,
    included_in_price: false,
    gl_role: 'iva',
  })
  if (!commercialCategoryMap.standard) commercialCategoryMap.standard = key
  if (!commercialCategoryMap.liquor) commercialCategoryMap.liquor = key
}

const removeCommercialLine = (key: string) => {
  if (commercialLines.value.length <= 1) {
    toast.error(t('facturacion.tax.matrixNeedOne'), { title: t('facturacion.common.error') })
    return
  }
  // Gate on menu-category chips only — legacy standard/liquor map is hidden (#1884).
  if (!canRemoveTaxLine(key, null, menuCategoryLineMap.value)) {
    toast.error(t('facturacion.tax.matrixLineInUse'), { title: t('facturacion.common.error') })
    return
  }
  const remaining = commercialLines.value.filter(line => line.key !== key)
  commercialLines.value = remaining
  const fallback = remaining[0]?.key || null
  if (commercialCategoryMap.standard === key) commercialCategoryMap.standard = fallback
  if (commercialCategoryMap.liquor === key) {
    commercialCategoryMap.liquor = commercialCategoryMap.standard || fallback
  }
}

const matrixValidationMessage = (code: string | null) => {
  if (!code) return ''
  const key = `facturacion.tax.matrixError.${code}`
  const translated = t(key)
  return translated === key ? t('facturacion.tax.commercialSaveInvalid') : translated
}

const loadJurisdictionOptions = async (country: string) => {
  if (!countryNeedsJurisdiction(country)) {
    jurisdictionOptions.value = []
    return
  }
  try {
    const res = await $fetch<{ success: boolean; data: unknown }>(
      '/api/api/tenant/tax-jurisdictions',
      { query: { country } },
    )
    jurisdictionOptions.value = normalizeJurisdictionOptions(res?.data)
  } catch {
    jurisdictionOptions.value = []
  }
}

watch(taxConfig, (cfg) => {
  if (!cfg) return
  taxForm.inc_applicable = cfg.inc_applicable
  taxForm.inc_included_in_price = cfg.inc_included_in_price
  taxForm.iva_applicable = cfg.iva_applicable
  taxForm.iva_included_in_price = cfg.iva_included_in_price
  taxForm.liquor_tax_applicable = cfg.liquor_tax_applicable
  taxForm.liquor_tax_included_in_price = Boolean(cfg.liquor_tax_included_in_price)
  taxForm.iva_rate_pct = rateToPct(cfg.iva_rate, 19)
  taxForm.inc_rate_pct = rateToPct(cfg.inc_rate, 8)
  taxForm.liquor_tax_rate_pct = rateToPct(cfg.liquor_tax_rate, 5)
  commercialTaxApplicable.value = cfg.commercial_tax_applicable !== false
  syncCommercialFromConfig(cfg)
  if (!showCommercialTaxUi.value) syncCoCustomFromConfig(cfg)
}, { immediate: true })

watch(
  () => profileCountryCode.value,
  async (code) => {
    if (!showCommercialTaxUi.value || !code) return
    await loadJurisdictionOptions(code)
    if (needsJurisdictionCountry.value) {
      const stored = storedJurisdictionCode.value || commercialJurisdictionCode.value
      if (stored) {
        commercialJurisdictionCode.value = stored
        // Do not clobber a saved matrix; only seed when empty.
        if (!commercialLines.value.length) applyJurisdictionOption(stored)
      }
      return
    }
    if (COMMERCIAL_COUNTRY_CODES.includes(code)) {
      if (!commercialLines.value.length) applyCommercialPreset(code)
      else commercialPresetCountry.value = code
    }
  },
  { immediate: true },
)

watch(() => taxForm.inc_applicable, (val) => { if (val) taxForm.iva_applicable = false })
watch(() => taxForm.iva_applicable, (val) => { if (val) taxForm.inc_applicable = false })

const saveTaxConfig = async () => {
  isSavingTax.value = true
  try {
    if (showCommercialTaxUi.value) {
      const enabled = commercialTaxApplicable.value
      let tax_lines: unknown
      let category_map: unknown
      let menu_category_line_map: unknown
      let exempt_menu_category_ids: unknown

      if (enabled) {
        if (showJurisdictionPicker.value && !commercialJurisdictionCode.value) {
          toast.error(t('facturacion.tax.jurisdictionRequired'), { title: t('facturacion.common.error') })
          return
        }
        const draft = {
          lines: uiLinesToDraft(),
          category_map: {
            standard: commercialCategoryMap.standard,
            liquor: commercialCategoryMap.liquor,
            exempt: null,
          },
          menu_category_line_map: { ...menuCategoryLineMap.value },
          exempt_menu_category_ids: [...exemptMenuCategoryIds.value],
        }
        const requirePositive = !needsJurisdictionCountry.value
        const error = validateCommercialMatrix({
          ...draft,
          requirePositiveRate: requirePositive,
        })
        if (error) {
          toast.error(matrixValidationMessage(error), { title: t('facturacion.common.error') })
          return
        }
        ;({
          tax_lines,
          category_map,
          menu_category_line_map,
          exempt_menu_category_ids,
        } = buildCommercialMatrixSavePayload(draft))
      } else {
        // Keep saved rates for re-enable; do not require rate fields when off.
        tax_lines = taxConfig.value?.tax_lines ?? []
        category_map = taxConfig.value?.category_map ?? { standard: null, liquor: null, exempt: null }
        menu_category_line_map = taxConfig.value?.menu_category_line_map ?? {}
        exempt_menu_category_ids = taxConfig.value?.exempt_menu_category_ids ?? []
      }

      await $fetch('/api/api/tenant/tax-config', {
        method: 'PUT',
        body: {
          inc_applicable: false,
          inc_included_in_price: true,
          iva_applicable: false,
          iva_included_in_price: false,
          liquor_tax_applicable: false,
          commercial_tax_applicable: enabled,
          tax_lines,
          category_map,
          menu_category_line_map,
          exempt_menu_category_ids,
          ...(enabled && showJurisdictionPicker.value && commercialJurisdictionCode.value
            ? { tax_jurisdiction_code: commercialJurisdictionCode.value }
            : {}),
        },
      })
    } else {
      applySalesTaxProfile()
      if (taxForm.liquor_tax_applicable && categoriesMappedToLine('liquor').length === 0) {
        toast.error(t('facturacion.tax.liquorCategoriesRequired'), { title: t('facturacion.common.error') })
        return
      }
      for (const line of coCustomLines.value) {
        if (!String(line.label || '').trim()) {
          toast.error(t('facturacion.tax.matrixError.missing_label'), { title: t('facturacion.common.error') })
          return
        }
      }
      const tax_lines = buildCoTaxLinesDraft({
        inc_applicable: taxForm.inc_applicable,
        iva_applicable: taxForm.iva_applicable,
        liquor_tax_applicable: taxForm.liquor_tax_applicable,
        iva_rate: Math.max(0, Number(taxForm.iva_rate_pct) || 0) / 100,
        inc_rate: Math.max(0, Number(taxForm.inc_rate_pct) || 0) / 100,
        liquor_tax_rate: Math.max(0, Number(taxForm.liquor_tax_rate_pct) || 0) / 100,
        iva_included_in_price: taxForm.iva_included_in_price,
        inc_included_in_price: taxForm.inc_included_in_price,
        liquor_tax_included_in_price: taxForm.liquor_tax_included_in_price,
        custom_lines: coCustomLinesToDraft(),
      })
      const modeError = validateTaxLineModes(tax_lines)
      if (modeError) {
        toast.error(t('facturacion.tax.matrixError.stack_exclusive_group'), {
          title: t('facturacion.common.error'),
        })
        return
      }
      await $fetch('/api/api/tenant/tax-config', {
        method: 'PUT',
        body: buildCoTaxSavePayload({
          inc_applicable: taxForm.inc_applicable,
          inc_included_in_price: taxForm.inc_included_in_price,
          iva_applicable: taxForm.iva_applicable,
          iva_included_in_price: taxForm.iva_included_in_price,
          liquor_tax_applicable: taxForm.liquor_tax_applicable,
          liquor_tax_included_in_price: taxForm.liquor_tax_included_in_price,
          iva_rate: Math.max(0, Number(taxForm.iva_rate_pct) || 0) / 100,
          inc_rate: Math.max(0, Number(taxForm.inc_rate_pct) || 0) / 100,
          liquor_tax_rate: Math.max(0, Number(taxForm.liquor_tax_rate_pct) || 0) / 100,
          menu_category_line_map: { ...menuCategoryLineMap.value },
          exempt_menu_category_ids: [...exemptMenuCategoryIds.value],
          tax_lines,
        }),
      })
    }
    await refreshTaxConfig()
    invalidateReadiness()
    toast.success(t('facturacion.toasts.taxSaved'), { title: t('facturacion.common.saved') })
  } catch (error: any) {
    toast.error(error.data?.detail || t('facturacion.toasts.taxSaveError'), { title: t('facturacion.common.error') })
  } finally {
    isSavingTax.value = false
  }
}

const docTypeLabels: Record<string, string> = {
  invoice: t('facturacion.docTypes.invoice'),
  credit_note: t('facturacion.docTypes.creditNote'),
  debit_note: t('facturacion.docTypes.debitNote'),
}

const docTypeShort: Record<string, string> = {
  invoice: t('facturacion.docTypes.invoiceShort'),
  credit_note: 'NC',
  debit_note: 'ND',
}

const progressColor = (percent: number) => {
  if (percent >= 90) return 'bg-state-danger-icon'
  if (percent >= 70) return 'bg-state-warning-icon'
  return 'bg-state-success-icon'
}

const progressTextColor = (percent: number) => {
  if (percent >= 90) return 'text-state-danger-text'
  if (percent >= 70) return 'text-state-warning-text'
  return 'text-state-success-text'
}

const resolutionColumns = [
  { key: 'prefix',        title: t('facturacion.columns.prefix'),       align: 'left'   as const },
  { key: 'number',        title: t('facturacion.columns.resolutionNumber'), align: 'left'   as const },
  { key: 'document_type', title: t('facturacion.common.type'),          align: 'left'   as const },
  { key: 'range',         title: t('facturacion.common.range'),         align: 'left'   as const },
  { key: 'available',     title: t('facturacion.columns.available'),   align: 'right'  as const },
  { key: 'used',          title: t('facturacion.columns.used'),        align: 'right'  as const },
  { key: 'percent',       title: t('facturacion.columns.percentUsed'),       align: 'right'  as const },
  { key: 'validity',      title: t('facturacion.columns.validity'),      align: 'left'   as const },
  { key: 'is_active',     title: t('facturacion.common.status'),        align: 'center' as const },
  { key: 'actions',       title: '',              align: 'right'  as const },
]

// ── Fiscal Data ─────────────────────────────────────────────────────────────
const { data: fiscalData, refetch: refreshFiscal } = useQuery({
  key: () => ['tenant', 'fiscal-data', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/fiscal-data'),
  // This endpoint also stores generic POS print labels used by commercial documents.
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const fiscal = computed(() => fiscalData.value?.data ?? null)

const fiscalForm = reactive({
  nit: '',
  business_name: '',
  type_organization_id: 1,
  tax_regime_id: 2,
  tax_level_id: 5,
  sales_tax_profile: 'unconfigured',
  fiscal_address: '',
  city: '',
  city_id: 149,
  phone: '',
  email: '',
  electronic_invoicing_requested: false,
  matias_company_id: '',
  receipt_document_label: t('facturacion.defaults.prefactura'),
  receipt_tip_label: t('facturacion.defaults.propina'),
  show_logo_on_receipts: true,
})
const isSavingFiscal = ref(false)

watch(fiscal, (f) => {
  if (!f) return
  fiscalForm.nit = f.nit || ''
  fiscalForm.business_name = f.business_name || ''
  fiscalForm.type_organization_id = f.type_organization_id ?? 1
  fiscalForm.tax_regime_id = f.tax_regime_id ?? 2
  fiscalForm.tax_level_id = f.tax_level_id ?? 5
  fiscalForm.sales_tax_profile = f.sales_tax_profile || 'unconfigured'
  fiscalForm.fiscal_address = f.fiscal_address || ''
  fiscalForm.city = f.city || ''
  fiscalForm.city_id = f.city_id ?? 149
  fiscalForm.phone = f.phone || ''
  fiscalForm.email = f.email || ''
  fiscalForm.electronic_invoicing_requested = f.electronic_invoicing_requested === true
  fiscalForm.matias_company_id = f.matias_company_id || ''
  fiscalForm.receipt_document_label = f.receipt_document_label || t('facturacion.defaults.prefactura')
  fiscalForm.receipt_tip_label = f.receipt_tip_label || t('facturacion.defaults.propina')
  fiscalForm.show_logo_on_receipts = f.show_logo_on_receipts !== false
}, { immediate: true })

const savePrintSettings = async () => {
  isSavingFiscal.value = true
  try {
    await $fetch('/api/api/tenant/fiscal-data', {
      method: 'PUT',
      body: {
        ...fiscalForm,
        matias_company_id: fiscalForm.matias_company_id.trim(),
        receipt_document_label: fiscalForm.receipt_document_label.trim() || t('facturacion.defaults.prefactura'),
        receipt_tip_label: fiscalForm.receipt_tip_label.trim() || t('facturacion.defaults.propina'),
      },
    })
    await refreshFiscal()
    await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
    toast.success(t('facturacion.toasts.printSaved'), { title: t('facturacion.common.saved') })
  } catch (error: any) {
    toast.error(error.data?.detail || t('facturacion.toasts.printSaveError'), { title: t('facturacion.common.error') })
  } finally {
    isSavingFiscal.value = false
  }
}

const saveFiscalData = async () => {
  isSavingFiscal.value = true
  try {
    applySalesTaxProfile()
    // #2033 — one PUT: fiscal identity/profile + Impuestos tax_config (CO).
    let tax_config: Record<string, unknown> | undefined
    if (!isWaroCommercial.value) {
      if (taxForm.liquor_tax_applicable && categoriesMappedToLine('liquor').length === 0) {
        toast.error(t('facturacion.tax.liquorCategoriesRequired'), { title: t('facturacion.common.error') })
        return
      }
      for (const line of coCustomLines.value) {
        if (!String(line.label || '').trim()) {
          toast.error(t('facturacion.tax.matrixError.missing_label'), { title: t('facturacion.common.error') })
          return
        }
      }
      const tax_lines = buildCoTaxLinesDraft({
        inc_applicable: taxForm.inc_applicable,
        iva_applicable: taxForm.iva_applicable,
        liquor_tax_applicable: taxForm.liquor_tax_applicable,
        iva_rate: Math.max(0, Number(taxForm.iva_rate_pct) || 0) / 100,
        inc_rate: Math.max(0, Number(taxForm.inc_rate_pct) || 0) / 100,
        liquor_tax_rate: Math.max(0, Number(taxForm.liquor_tax_rate_pct) || 0) / 100,
        iva_included_in_price: taxForm.iva_included_in_price,
        inc_included_in_price: taxForm.inc_included_in_price,
        liquor_tax_included_in_price: taxForm.liquor_tax_included_in_price,
        custom_lines: coCustomLinesToDraft(),
      })
      const modeError = validateTaxLineModes(tax_lines)
      if (modeError) {
        toast.error(t('facturacion.tax.matrixError.stack_exclusive_group'), {
          title: t('facturacion.common.error'),
        })
        return
      }
      tax_config = buildCoTaxSavePayload({
        inc_applicable: taxForm.inc_applicable,
        inc_included_in_price: taxForm.inc_included_in_price,
        iva_applicable: taxForm.iva_applicable,
        iva_included_in_price: taxForm.iva_included_in_price,
        liquor_tax_applicable: taxForm.liquor_tax_applicable,
        liquor_tax_included_in_price: taxForm.liquor_tax_included_in_price,
        iva_rate: Math.max(0, Number(taxForm.iva_rate_pct) || 0) / 100,
        inc_rate: Math.max(0, Number(taxForm.inc_rate_pct) || 0) / 100,
        liquor_tax_rate: Math.max(0, Number(taxForm.liquor_tax_rate_pct) || 0) / 100,
        menu_category_line_map: { ...menuCategoryLineMap.value },
        exempt_menu_category_ids: [...exemptMenuCategoryIds.value],
        tax_lines,
      })
    }
    await $fetch('/api/api/tenant/fiscal-data', {
      method: 'PUT',
      body: {
        ...fiscalForm,
        matias_company_id: fiscalForm.matias_company_id.trim(),
        ...(tax_config ? { tax_config } : {}),
      },
    })
    await refreshFiscal()
    await refreshTaxConfig()
    invalidateReadiness()
    await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
    toast.success(t('facturacion.toasts.fiscalSaved'), { title: t('facturacion.common.saved') })
  } catch (error: any) {
    toast.error(error.data?.detail || t('facturacion.toasts.fiscalSaveError'), { title: t('facturacion.common.error') })
  } finally {
    isSavingFiscal.value = false
  }
}

const orgTypes = [
  { value: 1, label: t('facturacion.orgTypes.legal') },
  { value: 2, label: t('facturacion.orgTypes.natural') },
]
const salesTaxProfiles = [
  { value: 'iva_responsible', label: t('facturacion.salesTaxProfiles.ivaTitle'), hint: t('facturacion.salesTaxProfiles.ivaHint') },
  { value: 'inc_responsible', label: t('facturacion.salesTaxProfiles.incTitle'), hint: t('facturacion.salesTaxProfiles.incHint') },
  { value: 'non_responsible_iva_inc', label: t('facturacion.salesTaxProfiles.noIvaIncTitle'), hint: t('facturacion.salesTaxProfiles.noIvaIncHint') },
  { value: 'non_responsible_iva', label: t('facturacion.salesTaxProfiles.noIvaTitle'), hint: t('facturacion.salesTaxProfiles.noIvaHint') },
]

const applySalesTaxProfile = () => {
  const profile = fiscalForm.sales_tax_profile
  taxForm.iva_applicable = profile === 'iva_responsible'
  taxForm.inc_applicable = profile === 'inc_responsible'
  fiscalForm.tax_regime_id = profile === 'iva_responsible' ? 1 : 2
  if (profile === 'non_responsible_iva_inc') {
    fiscalForm.type_organization_id = 2
  }
}

watch(() => fiscalForm.sales_tax_profile, applySalesTaxProfile)

const taxRegimes = [
  { value: 1, label: t('facturacion.taxRegimes.iva') },
  { value: 2, label: t('facturacion.taxRegimes.noIva') },
]
const taxLevels = [
  { value: 1, label: t('facturacion.taxLevels.grand') },
  { value: 2, label: t('facturacion.taxLevels.selfWithholding') },
  { value: 3, label: t('facturacion.taxLevels.withholdingAgent') },
  { value: 4, label: t('facturacion.taxLevels.simple') },
  { value: 5, label: t('facturacion.taxLevels.na') },
]

/** Read-only Matias regime label derived from sales_tax_profile (#1988). */
const matiasRegimeLabel = computed(() => {
  const match = taxRegimes.find(opt => opt.value === fiscalForm.tax_regime_id)
  return match?.label || ''
})
</script>

<template>
  <!-- Initial loading -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
    <CommonsTheCustomLoader size="large" />
  </div>

  <div v-else class="space-y-6">

    <section
      v-if="!isMatiasDian || isWaroCommercial"
      class="rounded-xl border-2 border-state-info-border bg-state-info-bg p-4 sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div class="flex items-start gap-3">
        <InformationCircleIcon class="mt-0.5 h-5 w-5 flex-shrink-0 text-state-info-icon" aria-hidden="true" />
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-base font-semibold text-state-info-text">{{ t('facturacion.commercial.title') }}</h2>
            <span class="rounded-full bg-status-chip-bg px-2.5 py-1 text-xs font-semibold text-status-chip-text">
              {{ t('facturacion.commercial.status') }}
            </span>
          </div>
          <p class="mt-1 text-sm leading-relaxed text-state-info-text/90">
            {{ t('facturacion.commercial.notice') }}
          </p>
        </div>
      </div>
    </section>

    <!-- ══════ READINESS BANNERS (issue #450) ══════ -->
    <div v-if="isFiscalIntegrated && readinessChecks" class="space-y-3">
      <!-- Customer request missing -->
      <div
        v-if="!readinessChecks.customer_requested"
        class="flex items-start gap-3 rounded-lg border border-state-info-border bg-state-info-bg p-4"
        role="status"
      >
        <InformationCircleIcon class="w-5 h-5 text-state-info-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div class="flex-1">
          <p class="text-sm font-semibold text-state-info-text">{{ t('facturacion.readiness.requestTitle') }}</p>
        </div>
      </div>

      <!-- Dev flag disabled — only WARO team can flip this -->
      <div
        v-if="!readinessChecks.dev_flag_enabled"
        class="flex items-start gap-3 rounded-lg border border-state-warning-border bg-state-warning-bg p-4"
        role="status"
      >
        <ExclamationTriangleIcon class="w-5 h-5 text-state-warning-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div class="flex-1">
          <p class="text-sm font-semibold text-state-warning-text">{{ t('facturacion.readiness.pendingTitle') }}</p>
        </div>
      </div>

      <!-- Fiscal data incomplete -->
      <div
        v-if="!readinessChecks.fiscal_data_complete"
        class="flex items-start gap-3 rounded-lg border border-state-info-border bg-state-info-bg p-4"
        role="status"
      >
        <InformationCircleIcon class="w-5 h-5 text-state-info-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div class="flex-1">
          <p class="text-sm font-semibold text-state-info-text">{{ t('facturacion.readiness.missingFiscalTitle') }}</p>
        </div>
      </div>

      <!-- No active DIAN resolution -->
      <div
        v-if="!readinessChecks.active_resolution"
        class="flex items-start gap-3 rounded-lg border border-state-info-border bg-state-info-bg p-4"
        role="status"
      >
        <InformationCircleIcon class="w-5 h-5 text-state-info-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div class="flex-1">
          <p class="text-sm font-semibold text-state-info-text">{{ t('facturacion.readiness.noResolutionTitle') }}</p>
        </div>
      </div>

      <!-- Tax requirement not satisfied: needs IVA/INC or valid no-tax fiscal setup. -->
      <div
        v-if="!readinessChecks.tax_requirement_satisfied"
        class="flex items-start gap-3 rounded-lg border border-state-info-border bg-state-info-bg p-4"
        role="status"
      >
        <InformationCircleIcon class="w-5 h-5 text-state-info-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div class="flex-1">
          <p class="text-sm font-semibold text-state-info-text">{{ t('facturacion.readiness.taxReviewTitle') }}</p>
        </div>
      </div>

      <!-- Missing Matias Casa de Software issuer id -->
      <div
        v-if="!readinessChecks.matias_company_id_configured"
        class="flex items-start gap-3 rounded-lg border border-state-warning-border bg-state-warning-bg p-4"
        role="status"
      >
        <ExclamationTriangleIcon class="w-5 h-5 text-state-warning-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div class="flex-1">
          <p class="text-sm font-semibold text-state-warning-text">{{ t('facturacion.readiness.matiasUuidTitle') }}</p>
        </div>
      </div>

      <!-- All checks passed — ready to invoice -->
      <div
        v-if="isInvoicingReady"
        class="flex items-center gap-3 rounded-lg border border-state-success-border bg-state-success-bg p-3"
        role="status"
      >
        <CheckCircleIcon class="w-5 h-5 text-state-success-icon flex-shrink-0" aria-hidden="true" />
        <p class="text-sm font-medium text-state-success-text">{{ t('facturacion.readiness.ready') }}</p>
      </div>
    </div>

    <!-- ══════ DATOS FISCALES (CO hierarchy #1988) ══════ -->
    <div v-if="isFiscalIntegrated" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6 space-y-5">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
        <svg class="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" /></svg>
        {{ t('facturacion.fiscal.sectionTitleCombined') }}
      </h3>

      <!-- 1) Identity -->
      <section class="space-y-3" aria-labelledby="fiscal-identity-heading">
        <h4 id="fiscal-identity-heading" class="text-sm font-semibold text-text-primary">
          {{ t('facturacion.fiscal.identityTitle') }}
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label for="fiscal-nit" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.nit') }} <span class="text-form-control-error">*</span></label>
            <input
              id="fiscal-nit"
              v-model="fiscalForm.nit"
              type="text"
              placeholder="901.234.567-8"
              class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="fiscal-name" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.businessName') }} <span class="text-form-control-error">*</span></label>
            <input
              id="fiscal-name"
              v-model="fiscalForm.business_name"
              type="text"
              :placeholder="t('facturacion.fiscal.businessNamePlaceholder')"
              class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div class="flex flex-col gap-1 sm:col-span-2 sm:max-w-md">
            <label for="fiscal-org" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.orgType') }}</label>
            <select
              id="fiscal-org"
              v-model="fiscalForm.type_organization_id"
              class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option v-for="opt in orgTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>
      </section>

      <!-- 2) Sales tax profile (calc + Matias driver) -->
      <section class="space-y-2 border-t border-border/40 pt-5" aria-labelledby="fiscal-profile-heading">
        <h4 id="fiscal-profile-heading" class="text-sm font-semibold text-text-primary">
          {{ t('facturacion.salesTaxProfiles.title') }}
          <span class="text-form-control-error">*</span>
        </h4>
        <fieldset class="flex flex-col gap-2">
          <legend class="sr-only">{{ t('facturacion.salesTaxProfiles.title') }}</legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="profile in salesTaxProfiles"
              :key="profile.value"
              type="button"
              :aria-pressed="fiscalForm.sales_tax_profile === profile.value"
              @click="fiscalForm.sales_tax_profile = profile.value"
              :class="[
                'min-h-[52px] rounded-xl border-2 px-3 py-2.5 text-start transition-colors',
                fiscalForm.sales_tax_profile === profile.value
                  ? 'border-primary bg-primary/8'
                  : 'border-border bg-background hover:border-primary/40'
              ]"
            >
              <span class="block text-sm font-semibold text-text-primary leading-snug">{{ profile.label }}</span>
              <span class="block mt-0.5 text-[11px] text-text-tertiary">{{ profile.hint }}</span>
            </button>
          </div>
          <p
            v-if="fiscalForm.sales_tax_profile === 'unconfigured'"
            class="text-xs text-state-warning-text"
          >
            {{ t('facturacion.salesTaxProfiles.required') }}
          </p>
        </fieldset>
        <p
          v-if="fiscalForm.sales_tax_profile !== 'unconfigured' && matiasRegimeLabel"
          class="text-[11px] text-text-tertiary"
          role="status"
        >
          <span class="font-medium text-text-secondary">{{ t('facturacion.fiscal.taxRegime') }}:</span>
          {{ matiasRegimeLabel }}
        </p>
      </section>

      <!-- 3) Optional Matias extras -->
      <section class="space-y-3 border-t border-border/40 pt-5" aria-labelledby="fiscal-extras-heading">
        <h4 id="fiscal-extras-heading" class="text-sm font-semibold text-text-primary">
          {{ t('facturacion.fiscal.extrasTitle') }}
        </h4>
        <div class="flex flex-col gap-1 sm:max-w-md">
          <label for="fiscal-level" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.taxLevel') }}</label>
          <select
            id="fiscal-level"
            v-model="fiscalForm.tax_level_id"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option v-for="opt in taxLevels" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </section>

      <!-- 4) Contact -->
      <section class="space-y-3 border-t border-border/40 pt-5" aria-labelledby="fiscal-contact-heading">
        <h4 id="fiscal-contact-heading" class="text-sm font-semibold text-text-primary">
          {{ t('facturacion.fiscal.contactTitle') }}
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label for="fiscal-address" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.address') }}</label>
            <input
              id="fiscal-address"
              v-model="fiscalForm.fiscal_address"
              type="text"
              placeholder="Cra 7 #45-12"
              class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="fiscal-city" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.city') }}</label>
            <input
              id="fiscal-city"
              v-model="fiscalForm.city"
              type="text"
              placeholder="Bogotá"
              class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="fiscal-phone" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.phone') }}</label>
            <input
              id="fiscal-phone"
              v-model="fiscalForm.phone"
              type="tel"
              placeholder="3001234567"
              class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="fiscal-email" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.email') }}</label>
            <input
              id="fiscal-email"
              v-model="fiscalForm.email"
              type="email"
              :placeholder="t('facturacion.fiscal.emailPlaceholder')"
              class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </section>

      <section class="space-y-4 border-t border-border/40 pt-5" aria-labelledby="fiscal-tax-heading">
        <h4 id="fiscal-tax-heading" class="text-sm font-semibold text-text-primary flex items-center gap-2">
          <ReceiptPercentIcon class="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
          {{ t('facturacion.tax.title') }}
        </h4>

        <div class="space-y-2">
          <p class="text-sm font-medium text-text-primary">{{ t('facturacion.tax.coProfileTitle') }}</p>
          <p class="text-xs text-text-secondary">{{ t('facturacion.tax.coProfileBody') }}</p>
          <div class="inline-flex rounded-xl border border-border p-1 bg-surface-secondary/40 gap-1" role="group" :aria-label="t('facturacion.tax.coProfileTitle')">
            <button
              type="button"
              :aria-pressed="coTaxProfileId === CO_TAX_PROFILE_RESTAURANTE"
              class="min-h-[40px] px-3.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              :class="coTaxProfileId === CO_TAX_PROFILE_RESTAURANTE
                ? 'bg-surface text-primary shadow-sm ring-1 ring-primary/25'
                : 'text-text-secondary hover:text-text-primary'"
              @click="applyCoRestaurantePreset"
            >
              {{ t('facturacion.tax.coProfileRestaurante') }}
            </button>
            <button
              type="button"
              :aria-pressed="coTaxProfileId === 'custom'"
              class="min-h-[40px] px-3.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              :class="coTaxProfileId === 'custom'
                ? 'bg-surface text-primary shadow-sm ring-1 ring-primary/25'
                : 'text-text-secondary hover:text-text-primary'"
              @click="coTaxProfileId = 'custom'"
            >
              {{ t('facturacion.tax.coProfileCustom') }}
            </button>
          </div>
        </div>

        <!-- INC — only when sales profile is INC -->
        <template v-if="taxForm.inc_applicable && coPrimaryLineKey === 'inc'">
          <div class="rounded-xl border border-border bg-surface p-4 space-y-4" role="group" :aria-label="t('facturacion.tax.incTitle')">
            <p class="text-sm font-semibold text-text-primary">{{ t('facturacion.tax.incShort') }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-3 sm:gap-4 items-end">
              <div class="space-y-1.5">
                <label for="co-inc-rate" class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.ratePercent') }}</label>
                <div class="flex items-center gap-1.5">
                  <input
                    id="co-inc-rate"
                    v-model.number="taxForm.inc_rate_pct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-full min-h-[40px] rounded-lg border border-border bg-background px-2 text-sm text-text-primary tabular-nums text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                  <span class="text-xs text-text-tertiary shrink-0" aria-hidden="true">%</span>
                </div>
              </div>
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.howInc') }}</p>
                <div class="inline-flex w-full sm:w-auto rounded-lg border border-border overflow-hidden" role="group" :aria-label="t('facturacion.tax.howInc')">
                  <button
                    type="button"
                    :aria-pressed="taxForm.inc_included_in_price"
                    @click="taxForm.inc_included_in_price = true"
                    :class="[
                      'flex-1 sm:flex-none min-h-[40px] px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                      taxForm.inc_included_in_price
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-secondary hover:bg-surface-secondary/60'
                    ]"
                  >
                    {{ t('facturacion.tax.includedShort') }}
                  </button>
                  <button
                    type="button"
                    :aria-pressed="!taxForm.inc_included_in_price"
                    @click="taxForm.inc_included_in_price = false"
                    :class="[
                      'flex-1 sm:flex-none min-h-[40px] px-4 text-sm font-semibold border-s border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                      !taxForm.inc_included_in_price
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-secondary hover:bg-surface-secondary/60'
                    ]"
                  >
                    {{ t('facturacion.tax.addedShort') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="space-y-2 pt-3 border-t border-border/50">
              <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.primaryCategoriesTitle', { tax: coPrimaryLabel }) }}</p>
              <div class="relative">
                <label class="sr-only" for="co-tax-line-cat-search-inc">
                  {{ t('facturacion.tax.searchCategory') }} — {{ coPrimaryLabel }}
                </label>
                <input
                  id="co-tax-line-cat-search-inc"
                  type="search"
                  autocomplete="off"
                  :value="categorySearchByLine.inc || ''"
                  :placeholder="t('facturacion.tax.searchCategory')"
                  class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  @focus="openCategorySearch('inc')"
                  @blur="closeCategorySearchSoon('inc')"
                  @input="onCategorySearchInput('inc', $event)"
                >
                <ul
                  v-if="categorySearchOpenKey === 'inc' && filteredCategoriesForLine('inc').length"
                  class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg p-1"
                  role="listbox"
                >
                  <li v-for="choice in filteredCategoriesForLine('inc')" :key="`co-inc-${choice.id}`">
                    <button
                      type="button"
                      class="w-full text-start rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none"
                      @mousedown.prevent="assignCategoryToLine(choice.id, 'inc')"
                    >
                      {{ choice.name }}
                      <span
                        v-if="menuCategoryLineMap[choice.id] && menuCategoryLineMap[choice.id] !== 'inc'"
                        class="ms-1 text-xs text-text-tertiary"
                      >
                        · {{ t('facturacion.tax.categoryReassignHint') }}
                      </span>
                      <span
                        v-else-if="exemptMenuCategoryIds.includes(choice.id)"
                        class="ms-1 text-xs text-text-tertiary"
                      >
                        · {{ t('facturacion.tax.mapExempt') }}
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
              <ul
                v-if="coPrimaryCategoryIds.length"
                class="flex flex-wrap gap-2"
                role="list"
                :aria-label="coPrimaryLabel"
              >
                <li
                  v-for="catId in coPrimaryCategoryIds"
                  :key="`co-inc-chip-${catId}`"
                  class="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 font-medium"
                >
                  <span>{{ menuCategoryLabel(catId) }}</span>
                  <button
                    type="button"
                    class="hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center"
                    :aria-label="t('facturacion.tax.removeCategory', { name: menuCategoryLabel(catId) })"
                    @click="unassignCategory(catId)"
                  >
                    ×
                  </button>
                </li>
              </ul>
              <p v-else class="text-xs text-text-tertiary">{{ t('facturacion.tax.coPrimaryAllDefault') }}</p>
            </div>
          </div>
        </template>

        <!-- IVA — only when sales profile is IVA -->
        <template v-if="taxForm.iva_applicable && coPrimaryLineKey === 'iva'">
          <div class="rounded-xl border border-border bg-surface p-4 space-y-4" role="group" :aria-label="t('facturacion.tax.ivaTitle')">
            <p class="text-sm font-semibold text-text-primary">{{ t('facturacion.tax.ivaShort') }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-3 sm:gap-4 items-end">
              <div class="space-y-1.5">
                <label for="co-iva-rate" class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.ratePercent') }}</label>
                <div class="flex items-center gap-1.5">
                  <input
                    id="co-iva-rate"
                    v-model.number="taxForm.iva_rate_pct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-full min-h-[40px] rounded-lg border border-border bg-background px-2 text-sm text-text-primary tabular-nums text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @input="coTaxProfileId = 'custom'"
                  >
                  <span class="text-xs text-text-tertiary shrink-0" aria-hidden="true">%</span>
                </div>
              </div>
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.howIva') }}</p>
                <div class="inline-flex w-full sm:w-auto rounded-lg border border-border overflow-hidden" role="group" :aria-label="t('facturacion.tax.howIva')">
                  <button
                    type="button"
                    :aria-pressed="taxForm.iva_included_in_price"
                    @click="taxForm.iva_included_in_price = true; coTaxProfileId = 'custom'"
                    :class="[
                      'flex-1 sm:flex-none min-h-[40px] px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                      taxForm.iva_included_in_price
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-secondary hover:bg-surface-secondary/60'
                    ]"
                  >
                    {{ t('facturacion.tax.includedShort') }}
                  </button>
                  <button
                    type="button"
                    :aria-pressed="!taxForm.iva_included_in_price"
                    @click="taxForm.iva_included_in_price = false; coTaxProfileId = 'custom'"
                    :class="[
                      'flex-1 sm:flex-none min-h-[40px] px-4 text-sm font-semibold border-s border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                      !taxForm.iva_included_in_price
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-secondary hover:bg-surface-secondary/60'
                    ]"
                  >
                    {{ t('facturacion.tax.addedShort') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="space-y-2 pt-3 border-t border-border/50">
              <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.primaryCategoriesTitle', { tax: coPrimaryLabel }) }}</p>
              <div class="relative">
                <label class="sr-only" for="co-tax-line-cat-search-iva">
                  {{ t('facturacion.tax.searchCategory') }} — {{ coPrimaryLabel }}
                </label>
                <input
                  id="co-tax-line-cat-search-iva"
                  type="search"
                  autocomplete="off"
                  :value="categorySearchByLine.iva || ''"
                  :placeholder="t('facturacion.tax.searchCategory')"
                  class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  @focus="openCategorySearch('iva')"
                  @blur="closeCategorySearchSoon('iva')"
                  @input="onCategorySearchInput('iva', $event)"
                >
                <ul
                  v-if="categorySearchOpenKey === 'iva' && filteredCategoriesForLine('iva').length"
                  class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg p-1"
                  role="listbox"
                >
                  <li v-for="choice in filteredCategoriesForLine('iva')" :key="`co-iva-${choice.id}`">
                    <button
                      type="button"
                      class="w-full text-start rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none"
                      @mousedown.prevent="assignCategoryToLine(choice.id, 'iva')"
                    >
                      {{ choice.name }}
                      <span
                        v-if="menuCategoryLineMap[choice.id] && menuCategoryLineMap[choice.id] !== 'iva'"
                        class="ms-1 text-xs text-text-tertiary"
                      >
                        · {{ t('facturacion.tax.categoryReassignHint') }}
                      </span>
                      <span
                        v-else-if="exemptMenuCategoryIds.includes(choice.id)"
                        class="ms-1 text-xs text-text-tertiary"
                      >
                        · {{ t('facturacion.tax.mapExempt') }}
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
              <ul
                v-if="coPrimaryCategoryIds.length"
                class="flex flex-wrap gap-2"
                role="list"
                :aria-label="coPrimaryLabel"
              >
                <li
                  v-for="catId in coPrimaryCategoryIds"
                  :key="`co-iva-chip-${catId}`"
                  class="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 font-medium"
                >
                  <span>{{ menuCategoryLabel(catId) }}</span>
                  <button
                    type="button"
                    class="hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center"
                    :aria-label="t('facturacion.tax.removeCategory', { name: menuCategoryLabel(catId) })"
                    @click="unassignCategory(catId)"
                  >
                    ×
                  </button>
                </li>
              </ul>
              <p v-else class="text-xs text-text-tertiary">{{ t('facturacion.tax.coPrimaryAllDefault') }}</p>
            </div>
          </div>
        </template>

        <!-- IVA Licores: rate + categories (rate 0 still allows mapping) -->
        <div
          class="rounded-xl border bg-surface p-4 space-y-4"
          :class="coLiquorNeedsCategories ? 'border-primary/50' : 'border-border'"
          role="group"
          :aria-label="t('facturacion.tax.liquorTitle')"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-text-primary">{{ t('facturacion.tax.liquorShort') }}</p>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <span class="sr-only">{{ t('facturacion.tax.liquorTitle') }}</span>
              <input v-model="taxForm.liquor_tax_applicable" type="checkbox" class="sr-only peer" @change="coTaxProfileId = 'custom'" />
              <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <template v-if="taxForm.liquor_tax_applicable">
            <div class="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-3 sm:gap-4 items-end">
              <div class="space-y-1.5">
                <label for="co-liquor-rate" class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.ratePercent') }}</label>
                <div class="flex items-center gap-1.5">
                  <input
                    id="co-liquor-rate"
                    v-model.number="taxForm.liquor_tax_rate_pct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-full min-h-[40px] rounded-lg border border-border bg-background px-2 text-sm text-text-primary tabular-nums text-center focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @input="coTaxProfileId = 'custom'"
                  >
                  <span class="text-xs text-text-tertiary shrink-0" aria-hidden="true">%</span>
                </div>
              </div>
              <div class="space-y-1.5">
                <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.howLiquor') }}</p>
                <div class="inline-flex w-full sm:w-auto rounded-lg border border-border overflow-hidden" role="group" :aria-label="t('facturacion.tax.howLiquor')">
                  <button
                    type="button"
                    :aria-pressed="taxForm.liquor_tax_included_in_price"
                    @click="taxForm.liquor_tax_included_in_price = true; coTaxProfileId = 'custom'"
                    :class="[
                      'flex-1 sm:flex-none min-h-[40px] px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                      taxForm.liquor_tax_included_in_price
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-secondary hover:bg-surface-secondary/60'
                    ]"
                  >
                    {{ t('facturacion.tax.includedShort') }}
                  </button>
                  <button
                    type="button"
                    :aria-pressed="!taxForm.liquor_tax_included_in_price"
                    @click="taxForm.liquor_tax_included_in_price = false; coTaxProfileId = 'custom'"
                    :class="[
                      'flex-1 sm:flex-none min-h-[40px] px-4 text-sm font-semibold border-s border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                      !taxForm.liquor_tax_included_in_price
                        ? 'bg-primary text-white'
                        : 'bg-background text-text-secondary hover:bg-surface-secondary/60'
                    ]"
                  >
                    {{ t('facturacion.tax.addedShort') }}
                  </button>
                </div>
              </div>
            </div>
          </template>

          <div
            v-if="taxForm.liquor_tax_applicable"
            class="space-y-2 pt-3 border-t border-border/50"
            :class="coLiquorNeedsCategories ? 'rounded-lg bg-primary/5 px-2 py-2' : ''"
          >
            <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.liquorCategoriesTitle') }}</p>
            <p
              v-if="coLiquorNeedsCategories"
              class="text-xs text-primary"
            >
              {{ t('facturacion.tax.liquorCategoriesRequired') }}
            </p>

            <div class="relative">
              <label class="sr-only" for="co-tax-line-cat-search-liquor">
                {{ t('facturacion.tax.searchCategory') }} — {{ t('facturacion.tax.mapLiquor') }}
              </label>
              <input
                id="co-tax-line-cat-search-liquor"
                type="search"
                autocomplete="off"
                :value="categorySearchByLine.liquor || ''"
                :placeholder="t('facturacion.tax.searchCategory')"
                class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                @focus="openCategorySearch('liquor')"
                @blur="closeCategorySearchSoon('liquor')"
                @input="onCategorySearchInput('liquor', $event)"
              >
              <ul
                v-if="categorySearchOpenKey === 'liquor' && filteredCategoriesForLine('liquor').length"
                class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg p-1"
                role="listbox"
              >
                <li v-for="choice in filteredCategoriesForLine('liquor')" :key="`co-liquor-${choice.id}`">
                  <button
                    type="button"
                    class="w-full text-start rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none"
                    @mousedown.prevent="assignCategoryToLine(choice.id, 'liquor')"
                  >
                    {{ choice.name }}
                    <span
                      v-if="exemptMenuCategoryIds.includes(choice.id)"
                      class="ms-1 text-xs text-text-tertiary"
                    >
                      · {{ t('facturacion.tax.mapExempt') }}
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            <ul
              v-if="coLiquorCategoryIds.length"
              class="flex flex-wrap gap-2"
              role="list"
              :aria-label="t('facturacion.tax.mapLiquor')"
            >
              <li
                v-for="catId in coLiquorCategoryIds"
                :key="`co-liquor-chip-${catId}`"
                class="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 font-medium"
              >
                <span>{{ menuCategoryLabel(catId) }}</span>
                <button
                  type="button"
                  class="hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center"
                  :aria-label="t('facturacion.tax.removeCategory', { name: menuCategoryLabel(catId) })"
                  @click="unassignCategory(catId)"
                >
                  ×
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- CO free custom tax lines (#2028) -->
        <div class="rounded-xl border border-border bg-surface p-4 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1 min-w-0">
              <p class="text-sm font-semibold text-text-primary">{{ t('facturacion.tax.coCustomTitle') }}</p>
              <p class="text-xs text-text-secondary">{{ t('facturacion.tax.coCustomBody') }}</p>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 shrink-0 min-h-[40px] px-3 rounded-lg border border-border bg-background text-text-primary text-sm font-semibold hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              @click="addCoCustomLine"
            >
              <PlusIcon class="w-4 h-4" aria-hidden="true" />
              {{ t('facturacion.tax.addLine') }}
            </button>
          </div>

          <div
            v-for="line in coCustomLines"
            :key="line.key"
            class="rounded-xl border border-border bg-surface-secondary/25 p-4 space-y-4"
          >
            <div class="grid grid-cols-1 sm:grid-cols-[1fr_7rem_auto] gap-3 items-end">
              <div class="space-y-1.5 min-w-0">
                <label :for="`co-custom-label-${line.key}`" class="text-xs font-medium text-text-secondary">
                  {{ t('facturacion.tax.lineLabel') }}
                </label>
                <input
                  :id="`co-custom-label-${line.key}`"
                  v-model="line.label"
                  type="text"
                  class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm font-medium text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  @input="coTaxProfileId = 'custom'"
                >
              </div>
              <div class="space-y-1.5">
                <label :for="`co-custom-rate-${line.key}`" class="text-xs font-medium text-text-secondary">
                  {{ t('facturacion.tax.ratePercent') }}
                </label>
                <input
                  :id="`co-custom-rate-${line.key}`"
                  v-model.number="line.ratePct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm font-medium text-text-primary tabular-nums focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  @input="coTaxProfileId = 'custom'"
                >
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-state-danger-text hover:bg-state-danger-bg/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-state-danger-text/30"
                :aria-label="t('facturacion.tax.removeLine')"
                @click="removeCoCustomLine(line.key)"
              >
                <TrashIcon class="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1.5 min-w-0">
                <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.howCommercial') }}</p>
                <div
                  class="grid grid-cols-2 w-full rounded-lg border border-border overflow-hidden"
                  role="group"
                  :aria-label="t('facturacion.tax.howCommercial')"
                >
                  <button
                    type="button"
                    class="min-h-[40px] px-2 text-sm font-semibold transition-colors"
                    :class="line.included_in_price ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:bg-surface-secondary/60'"
                    :aria-pressed="line.included_in_price"
                    @click="line.included_in_price = true; coTaxProfileId = 'custom'"
                  >
                    {{ t('facturacion.tax.includedShort') }}
                  </button>
                  <button
                    type="button"
                    class="min-h-[40px] px-2 text-sm font-semibold border-s border-border transition-colors"
                    :class="!line.included_in_price ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:bg-surface-secondary/60'"
                    :aria-pressed="!line.included_in_price"
                    @click="line.included_in_price = false; coTaxProfileId = 'custom'"
                  >
                    {{ t('facturacion.tax.addedShort') }}
                  </button>
                </div>
              </div>
              <div class="space-y-1.5 min-w-0">
                <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.modeLabel') }}</p>
                <div
                  class="grid grid-cols-2 w-full rounded-lg border border-border overflow-hidden"
                  role="group"
                  :aria-label="t('facturacion.tax.modeLabel')"
                >
                  <button
                    type="button"
                    class="min-h-[40px] px-2 text-sm font-semibold transition-colors"
                    :class="line.mode === 'alternate' ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:bg-surface-secondary/60'"
                    :aria-pressed="line.mode === 'alternate'"
                    @click="line.mode = 'alternate'; coTaxProfileId = 'custom'"
                  >
                    {{ t('facturacion.tax.modeAlternate') }}
                  </button>
                  <button
                    type="button"
                    class="min-h-[40px] px-2 text-sm font-semibold border-s border-border transition-colors"
                    :class="line.mode === 'stack' ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:bg-surface-secondary/60'"
                    :aria-pressed="line.mode === 'stack'"
                    @click="line.mode = 'stack'; coTaxProfileId = 'custom'"
                  >
                    {{ t('facturacion.tax.modeStack') }}
                  </button>
                </div>
              </div>
            </div>
            <p class="text-xs text-text-tertiary">
              {{ line.mode === 'alternate'
                ? t('facturacion.tax.modeAlternateHelp')
                : t('facturacion.tax.modeStackHelp') }}
            </p>

            <div class="space-y-2 pt-3 border-t border-border/50">
              <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.lineCategories') }}</p>
              <div class="relative">
                <input
                  :id="`co-custom-cat-search-${line.key}`"
                  type="search"
                  autocomplete="off"
                  :value="categorySearchByLine[line.key] || ''"
                  :placeholder="t('facturacion.tax.searchCategory')"
                  class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  @focus="openCategorySearch(line.key)"
                  @blur="closeCategorySearchSoon(line.key)"
                  @input="onCategorySearchInput(line.key, $event)"
                >
                <ul
                  v-if="categorySearchOpenKey === line.key && filteredCategoriesForLine(line.key).length"
                  class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg p-1"
                  role="listbox"
                >
                  <li v-for="choice in filteredCategoriesForLine(line.key)" :key="`co-custom-${line.key}-${choice.id}`">
                    <button
                      type="button"
                      class="w-full text-start rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none"
                      @mousedown.prevent="assignCategoryToLine(choice.id, line.key); coTaxProfileId = 'custom'"
                    >
                      {{ choice.name }}
                    </button>
                  </li>
                </ul>
              </div>
              <ul
                v-if="categoriesMappedToLine(line.key).length"
                class="flex flex-wrap gap-2"
                role="list"
              >
                <li
                  v-for="catId in categoriesMappedToLine(line.key)"
                  :key="`co-custom-chip-${line.key}-${catId}`"
                  class="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 font-medium"
                >
                  <span>{{ menuCategoryLabel(catId) }}</span>
                  <button
                    type="button"
                    class="hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center"
                    :aria-label="t('facturacion.tax.removeCategory', { name: menuCategoryLabel(catId) })"
                    @click="unassignCategory(catId); coTaxProfileId = 'custom'"
                  >
                    ×
                  </button>
                </li>
              </ul>
              <p v-else class="text-xs text-text-tertiary">{{ t('facturacion.tax.noCategoriesYet') }}</p>
            </div>
          </div>
        </div>

        <!-- CO exempt — title + search + chips -->
        <div class="rounded-xl border border-border bg-surface p-4 space-y-3">
          <p class="text-sm font-semibold text-text-primary">{{ t('facturacion.tax.exemptTitle') }}</p>
          <div class="relative">
            <label class="sr-only" for="co-tax-exempt-cat-search">
              {{ t('facturacion.tax.searchExemptCategory') }}
            </label>
            <input
              id="co-tax-exempt-cat-search"
              type="search"
              autocomplete="off"
              :value="exemptSearch"
              :placeholder="t('facturacion.tax.searchExemptCategory')"
              class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              @focus="openExemptSearch"
              @blur="closeExemptSearchSoon"
              @input="onExemptSearchInput"
            >
            <ul
              v-if="exemptSearchOpen && filteredExemptCategories.length"
              class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg p-1"
              role="listbox"
            >
              <li v-for="choice in filteredExemptCategories" :key="`co-exempt-${choice.id}`">
                <button
                  type="button"
                  class="w-full text-start rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none"
                  @mousedown.prevent="assignExemptCategory(choice.id)"
                >
                  {{ choice.name }}
                </button>
              </li>
            </ul>
          </div>
          <ul
            v-if="exemptMenuCategoryIds.length"
            class="flex flex-wrap gap-2"
            role="list"
            :aria-label="t('facturacion.tax.exemptTitle')"
          >
            <li
              v-for="catId in exemptMenuCategoryIds"
              :key="`co-exempt-chip-${catId}`"
              class="text-xs bg-surface-secondary text-text-secondary px-2.5 py-1 rounded-full flex items-center gap-1 font-medium border border-border"
            >
              <span>{{ menuCategoryLabel(catId) }}</span>
              <button
                type="button"
                class="hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center"
                :aria-label="t('facturacion.tax.removeCategory', { name: menuCategoryLabel(catId) })"
                @click="unassignExemptCategory(catId)"
              >
                ×
              </button>
            </li>
          </ul>
        </div>

      </section>

      <div class="flex justify-end pt-1">
        <button
          @click="saveFiscalData"
          :disabled="isSavingFiscal || !fiscalForm.nit || !fiscalForm.business_name || fiscalForm.sales_tax_profile === 'unconfigured'"
          class="px-4 py-2 text-sm font-medium bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
        >
          <CheckIcon v-if="!isSavingFiscal" class="w-4 h-4" aria-hidden="true" />
          <span>{{ isSavingFiscal ? t('facturacion.common.saving') : t('facturacion.fiscal.saveCombined') }}</span>
        </button>
      </div>
    </div>

    <!-- ══════ IMPUESTOS (commercial / non-DIAN) ══════ -->
    <div v-if="showCommercialTaxUi" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <ReceiptPercentIcon class="w-5 h-5 text-primary flex-shrink-0" />
        {{ t('facturacion.tax.title') }}
      </h3>
      <!-- Commercial / non-DIAN: enable toggle + tax lines matrix + category map -->
      <div v-if="showCommercialTaxUi" class="space-y-5">
        <div class="flex items-start justify-between gap-3 py-1">
          <div class="min-w-0 flex-1 space-y-1">
            <p class="text-sm font-medium text-text-primary">{{ t('facturacion.tax.commercialEnableTitle') }}</p>
            <p class="text-xs text-text-secondary leading-snug">{{ t('facturacion.tax.commercialEnableBody') }}</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ms-2 mt-0.5">
            <input v-model="commercialTaxApplicable" type="checkbox" class="sr-only peer" />
            <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <div
          v-if="showWave1CountryLocked"
          class="rounded-lg border border-border bg-surface-secondary px-3 py-2.5 space-y-1"
          role="status"
        >
          <p class="text-xs text-text-secondary">{{ t('facturacion.tax.wave1Preset') }}</p>
          <p
            :class="commercialTaxApplicable
              ? 'text-sm font-semibold text-text-primary'
              : 'text-sm text-text-secondary'"
          >
            {{ profileCountryCode }}
            <span v-if="commercialTaxApplicable && commercialPresetPrimaryLabel(profileCountryCode)">
              — {{ commercialPresetPrimaryLabel(profileCountryCode) }}
            </span>
          </p>
        </div>

        <div
          v-else-if="showJurisdictionSummary"
          class="rounded-lg border border-border bg-surface-secondary px-3 py-2.5 space-y-1"
          role="status"
        >
          <p class="text-xs text-text-secondary">
            {{ profileCountryCode === 'CA'
              ? t('facturacion.tax.provinceLabel')
              : t('facturacion.tax.stateLabel') }}
          </p>
          <p
            :class="commercialTaxApplicable
              ? 'text-sm font-semibold text-text-primary'
              : 'text-sm text-text-secondary'"
          >
            {{ storedJurisdictionCode }}
          </p>
        </div>

        <template v-if="commercialTaxApplicable">
          <div v-if="showJurisdictionPicker" class="space-y-2">
            <label for="tax-jurisdiction" class="text-sm font-medium text-text-primary">
              {{ profileCountryCode === 'CA'
                ? t('facturacion.tax.provinceLabel')
                : t('facturacion.tax.stateLabel') }}
            </label>
            <select
              id="tax-jurisdiction"
              v-model="commercialJurisdictionCode"
              class="w-full min-h-[44px] rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary"
              @change="onJurisdictionChange"
            >
              <option value="">{{ t('facturacion.tax.jurisdictionPlaceholder') }}</option>
              <option
                v-for="option in jurisdictionOptions"
                :key="option.code"
                :value="option.code"
              >
                {{ option.code }} — {{ option.label }} ({{ Math.round(option.rate * 10000) / 100 }}%)
              </option>
            </select>
          </div>

          <div v-else-if="showWave1CountryPicker" class="space-y-2">
            <label for="wave1-tax-preset" class="text-sm font-medium text-text-primary">
              {{ t('facturacion.tax.wave1Preset') }}
            </label>
            <select
              id="wave1-tax-preset"
              v-model="commercialPresetCountry"
              class="w-full min-h-[44px] rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary"
              @change="onCommercialPresetChange"
            >
              <option value="">{{ t('facturacion.tax.wave1PresetPlaceholder') }}</option>
              <option v-for="code in COMMERCIAL_COUNTRY_CODES" :key="code" :value="code">
                {{ code }} — {{ commercialPresetPrimaryLabel(code) }}
              </option>
            </select>
          </div>

          <div class="space-y-3">
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm font-semibold text-text-primary tracking-tight">{{ t('facturacion.tax.matrixTitle') }}</p>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 shrink-0 min-h-[40px] px-3 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:pointer-events-none transition-opacity"
                :disabled="commercialLines.length >= MAX_COMMERCIAL_TAX_LINES"
                @click="addCommercialLine"
              >
                <PlusIcon class="w-4 h-4" aria-hidden="true" />
                {{ t('facturacion.tax.addLine') }}
              </button>
            </div>

            <div
              v-for="(line, lineIndex) in commercialLines"
              :key="line.key"
              class="rounded-xl border border-border bg-surface p-3 space-y-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  {{ t('facturacion.tax.lineLabel') }} {{ lineIndex + 1 }}
                </p>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg text-sm font-medium text-state-danger-text hover:bg-state-danger-bg/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-state-danger-text/30 disabled:opacity-35 disabled:pointer-events-none transition-colors"
                  :disabled="commercialLines.length <= 1"
                  :aria-label="t('facturacion.tax.removeLine')"
                  @click="removeCommercialLine(line.key)"
                >
                  <TrashIcon class="w-4 h-4" aria-hidden="true" />
                  <span class="hidden sm:inline">{{ t('facturacion.tax.removeLine') }}</span>
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-[1fr_7.5rem] gap-3">
                <div class="flex flex-col gap-1.5">
                  <label :for="`tax-line-label-${line.key}`" class="text-xs font-medium text-text-secondary">
                    {{ t('facturacion.tax.lineLabel') }}
                  </label>
                  <input
                    :id="`tax-line-label-${line.key}`"
                    v-model="line.label"
                    type="text"
                    class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm font-medium text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                </div>
                <div class="flex flex-col gap-1.5">
                  <label :for="`tax-line-rate-${line.key}`" class="text-xs font-medium text-text-secondary">
                    {{ t('facturacion.tax.ratePercent') }}
                  </label>
                  <input
                    :id="`tax-line-rate-${line.key}`"
                    v-model.number="line.ratePct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm font-medium text-text-primary tabular-nums focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                </div>
              </div>

              <div class="space-y-1.5">
                <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.howCommercial') }}</p>
                <div class="grid grid-cols-2 gap-2" role="group" :aria-label="t('facturacion.tax.howCommercial')">
                  <button
                    type="button"
                    :aria-pressed="line.included_in_price"
                    @click="line.included_in_price = true"
                    :class="[
                      'inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-lg border-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      line.included_in_price
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-text-secondary hover:border-primary/40 hover:bg-surface-secondary/50'
                    ]"
                  >
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10M7 12h10M7 17h6" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
                    </svg>
                    <span>{{ t('facturacion.tax.included') }}</span>
                  </button>
                  <button
                    type="button"
                    :aria-pressed="!line.included_in_price"
                    @click="line.included_in_price = false"
                    :class="[
                      'inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-lg border-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      !line.included_in_price
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-text-secondary hover:border-primary/40 hover:bg-surface-secondary/50'
                    ]"
                  >
                    <PlusIcon class="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{{ t('facturacion.tax.added') }}</span>
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                <p class="text-xs font-medium text-text-secondary">{{ t('facturacion.tax.lineCategories') }}</p>

                <div class="relative">
                  <input
                    :id="`tax-line-cat-search-${line.key}`"
                    type="search"
                    autocomplete="off"
                    :value="categorySearchByLine[line.key] || ''"
                    :placeholder="t('facturacion.tax.searchCategory')"
                    class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @focus="openCategorySearch(line.key)"
                    @blur="closeCategorySearchSoon(line.key)"
                    @input="onCategorySearchInput(line.key, $event)"
                  >
                  <ul
                    v-if="categorySearchOpenKey === line.key && filteredCategoriesForLine(line.key).length"
                    class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg p-1"
                    role="listbox"
                  >
                    <li v-for="choice in filteredCategoriesForLine(line.key)" :key="`${line.key}-${choice.id}`">
                      <button
                        type="button"
                        class="w-full text-start rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none"
                        @mousedown.prevent="assignCategoryToLine(choice.id, line.key)"
                      >
                        {{ choice.name }}
                        <span
                          v-if="menuCategoryLineMap[choice.id] && menuCategoryLineMap[choice.id] !== line.key"
                          class="ms-1 text-xs text-text-tertiary"
                        >
                          · {{ t('facturacion.tax.categoryReassignHint') }}
                        </span>
                        <span
                          v-else-if="exemptMenuCategoryIds.includes(choice.id)"
                          class="ms-1 text-xs text-text-tertiary"
                        >
                          · {{ t('facturacion.tax.mapExempt') }}
                        </span>
                      </button>
                    </li>
                  </ul>
                </div>

                <ul v-if="categoriesMappedToLine(line.key).length" class="flex flex-wrap gap-2" role="list">
                  <li
                    v-for="catId in categoriesMappedToLine(line.key)"
                    :key="`${line.key}-chip-${catId}`"
                    class="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 font-medium"
                  >
                    <span>{{ menuCategoryLabel(catId) }}</span>
                    <button
                      type="button"
                      class="hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center"
                      :aria-label="t('facturacion.tax.removeCategory', { name: menuCategoryLabel(catId) })"
                      @click="unassignCategory(catId)"
                    >
                      ×
                    </button>
                  </li>
                </ul>
                <p v-else class="text-xs text-text-tertiary">{{ t('facturacion.tax.noCategoriesYet') }}</p>
              </div>
            </div>
          </div>

          <div class="space-y-2 rounded-xl border border-border bg-surface-secondary/30 p-4">
            <p class="text-sm font-medium text-text-primary">{{ t('facturacion.tax.exemptTitle') }}</p>
            <div class="relative">
              <input
                id="tax-exempt-cat-search"
                type="search"
                autocomplete="off"
                :value="exemptSearch"
                :placeholder="t('facturacion.tax.searchExemptCategory')"
                class="w-full min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                @focus="openExemptSearch"
                @blur="closeExemptSearchSoon"
                @input="onExemptSearchInput"
              >
              <ul
                v-if="exemptSearchOpen && filteredExemptCategories.length"
                class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg p-1"
                role="listbox"
              >
                <li v-for="choice in filteredExemptCategories" :key="`exempt-${choice.id}`">
                  <button
                    type="button"
                    class="w-full text-start rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none"
                    @mousedown.prevent="assignExemptCategory(choice.id)"
                  >
                    {{ choice.name }}
                    <span
                      v-if="menuCategoryLineMap[choice.id]"
                      class="ms-1 text-xs text-text-tertiary"
                    >
                      · {{ t('facturacion.tax.categoryReassignHint') }}
                    </span>
                  </button>
                </li>
              </ul>
            </div>
            <ul v-if="exemptMenuCategoryIds.length" class="flex flex-wrap gap-2" role="list">
              <li
                v-for="catId in exemptMenuCategoryIds"
                :key="`exempt-chip-${catId}`"
                class="text-xs bg-surface-secondary text-text-secondary px-2.5 py-1 rounded-full flex items-center gap-1 font-medium border border-border"
              >
                <span>{{ menuCategoryLabel(catId) }}</span>
                <button
                  type="button"
                  class="hover:opacity-70 min-h-[24px] min-w-[24px] flex items-center justify-center"
                  :aria-label="t('facturacion.tax.removeCategory', { name: menuCategoryLabel(catId) })"
                  @click="unassignExemptCategory(catId)"
                >
                  ×
                </button>
              </li>
            </ul>
            <p v-else class="text-xs text-text-tertiary">{{ t('facturacion.tax.noExemptYet') }}</p>
          </div>
        </template>
      </div>

      <!-- Save button -->
      <div class="mt-5 flex justify-end">
        <button
          @click="saveTaxConfig"
          :disabled="isSavingTax"
          class="px-4 py-2 text-sm font-medium bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
        >
          <CheckIcon v-if="!isSavingTax" class="w-4 h-4" aria-hidden="true" />
          <span>{{ isSavingTax ? t('facturacion.common.saving') : t('facturacion.tax.save') }}</span>
        </button>
      </div>

    </div>

    <!-- ══════ RESOLUCIÓN DIAN ══════ -->
    <div v-if="isFiscalIntegrated" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
          <DocumentTextIcon class="w-5 h-5 text-primary flex-shrink-0" />
          {{ t('facturacion.resolutions.title') }}
        </h3>
        <button
          @click="openNewResolution"
          class="min-h-[44px] px-3 py-2 text-sm font-semibold rounded-lg bg-action-primary-bg text-action-primary-text hover:bg-action-primary-hover-bg transition-colors flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          {{ t('common.add') }}
        </button>
      </div>

      <!-- Range-burn alert (#592) -->
      <NuxtLink
        v-if="hasRecentGaps"
        to="/facturacion/audit"
        class="block mb-4 rounded-lg border border-state-warning-border bg-state-warning-bg p-3 hover:bg-state-warning-bg/80 transition-colors"
      >
        <div class="flex items-start gap-3">
          <ExclamationTriangleIcon class="w-5 h-5 text-state-warning-icon flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-state-warning-text">
              {{ t('facturacion.resolutions.gapsTitle') }}
            </p>
            <p class="text-xs text-state-warning-text/90 mt-0.5 leading-snug">
              <span class="font-semibold tabular-nums">{{ gapsSummary?.last_24h ?? 0 }}</span> {{ t('facturacion.resolutions.in24h') }} ·
              <span class="font-semibold tabular-nums">{{ gapsSummary?.last_7d ?? 0 }}</span> {{ t('facturacion.resolutions.in7d') }} ·
              <span class="font-semibold tabular-nums">{{ gapsSummary?.last_30d ?? 0 }}</span> {{ t('facturacion.resolutions.in30d') }}.
              {{ t('facturacion.resolutions.gapsHint') }}
            </p>
          </div>
          <svg class="w-4 h-4 text-state-warning-icon flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </NuxtLink>

      <!-- Empty state -->
      <div v-if="resolutions.length === 0 && !showResolutionForm" class="text-center py-8">
        <DocumentTextIcon class="w-10 h-10 mx-auto text-text-tertiary mb-2" />
        <p class="text-sm text-text-secondary">{{ t('facturacion.resolutions.emptyTitle') }}</p>
        <button @click="openNewResolution" class="mt-3 min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-action-primary-bg text-action-primary-text hover:bg-action-primary-hover-bg transition-colors">
          {{ t('facturacion.resolutions.configure') }}
        </button>
      </div>

      <!-- Resolution form (inline) -->
      <div v-if="showResolutionForm" class="border border-primary/30 bg-primary/5 rounded-xl p-4 mb-4 space-y-4">
        <h4 class="text-sm font-bold text-text-primary">{{ editingResolutionId ? t('facturacion.resolutions.edit') : t('facturacion.resolutions.new') }}</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">{{ t('facturacion.resolutions.number') }} <span class="text-form-control-error">*</span></label>
            <input v-model="resolutionForm.resolution_number" type="text" placeholder="18764074347312" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">{{ t('facturacion.resolutions.prefix') }} <span class="text-form-control-error">*</span></label>
            <input v-model="resolutionForm.prefix" type="text" placeholder="LZT" maxlength="10" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary uppercase" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">{{ t('facturacion.resolutions.rangeFrom') }} <span class="text-form-control-error">*</span></label>
            <input v-model.number="resolutionForm.from_number" type="number" min="1" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">{{ t('facturacion.resolutions.rangeTo') }} <span class="text-form-control-error">*</span></label>
            <input v-model.number="resolutionForm.to_number" type="number" min="1" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <!-- warocol.com#589 — `current_number` solo visible al editar.
               Al crear se omite del payload → backend lo siembra como
               `from_number - 1` automáticamente, evitando colisiones con
               la historia cruzada de Matias. -->
          <div v-if="editingResolutionId" class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">{{ t('facturacion.resolutions.currentNumber') }}</label>
            <input
              v-model.number="resolutionForm.current_number"
              type="number"
              :min="currentNumberFloor"
              :max="resolutionForm.to_number"
              :class="[
                'min-h-[44px] px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2',
                isCurrentNumberInvalid ? 'border-destructive focus:ring-destructive/30' : 'border-border focus:ring-primary',
              ]"
            />
            <p v-if="isCurrentNumberInvalid" class="text-xs text-destructive leading-snug">
              {{ t('facturacion.resolutions.currentNumberInvalid', { from: currentNumberFloor, to: resolutionForm.to_number }) }}
            </p>
            <p v-else class="text-xs text-text-tertiary leading-snug">
              {{ t('facturacion.resolutions.nextIssueUses', { number: (resolutionForm.current_number ?? currentNumberFloor) + 1 }) }}
            </p>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">{{ t('facturacion.resolutions.docType') }}</label>
            <select v-model="resolutionForm.document_type" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
              <option v-for="dt in resolutionDocTypes" :key="dt.value" :value="dt.value">{{ dt.label }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">{{ t('facturacion.resolutions.dateFrom') }} <span class="text-form-control-error">*</span></label>
            <input v-model="resolutionForm.date_from" type="date" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">{{ t('facturacion.resolutions.dateTo') }} <span class="text-form-control-error">*</span></label>
            <input v-model="resolutionForm.date_to" type="date" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div class="flex items-center gap-2 justify-end">
          <button @click="showResolutionForm = false; resetResolutionForm()" class="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors">
            {{ t('common.cancel') }}
          </button>
          <button
            @click="saveResolution"
            :disabled="isSavingResolution || !resolutionForm.prefix || !resolutionForm.resolution_number || !resolutionForm.date_from || !resolutionForm.date_to || isCurrentNumberInvalid"
            class="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-action-primary-bg text-action-primary-text hover:bg-action-primary-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckIcon v-if="!isSavingResolution" class="w-4 h-4" aria-hidden="true" />
            <span>{{ isSavingResolution ? t('facturacion.common.saving') : (editingResolutionId ? t('facturacion.common.update') : t('facturacion.resolutions.create')) }}</span>
          </button>
        </div>
      </div>

      <!-- Resolutions list — desktop table + mobile card via UiResponsiveDataView (#621) -->
      <UiResponsiveDataView
        v-if="resolutions.length > 0"
        :columns="resolutionColumns"
        :data="resolutions"
        row-size="sm"
        item-key="id"
      >
        <!-- Desktop cells -->
        <template #cell-prefix="{ row }">
          <span class="text-base font-bold text-text-primary">{{ row.prefix }}</span>
        </template>

        <template #cell-number="{ row }">
          <span class="text-xs text-text-secondary font-mono">{{ row.resolution_number }}</span>
        </template>

        <template #cell-document_type="{ row }">
          <span
            class="text-xs text-text-secondary"
            :title="docTypeLabels[row.document_type] || row.document_type"
          >
            {{ docTypeShort[row.document_type] ?? row.document_type }}
          </span>
        </template>

        <template #cell-range="{ row }">
          <span class="text-xs tabular-nums text-text-primary">
            {{ row.from_number }} → {{ row.to_number }}
          </span>
        </template>

        <template #cell-available="{ row }">
          <span class="text-xs tabular-nums text-text-primary">
            {{ Math.max(0, row.total_range - row.used) }}
          </span>
        </template>

        <template #cell-used="{ row }">
          <span class="text-xs tabular-nums text-text-primary">{{ row.used }}</span>
        </template>

        <template #cell-percent="{ row }">
          <span class="text-xs font-semibold tabular-nums" :class="progressTextColor(row.usage_percent)">
            {{ row.usage_percent }}%
          </span>
        </template>

        <template #cell-validity="{ row }">
          <span class="text-xs tabular-nums text-text-secondary">
            {{ row.date_from }} → {{ row.date_to }}
          </span>
        </template>

        <template #cell-is_active="{ row }">
          <div class="inline-flex items-center gap-2 justify-center">
            <span
              class="text-xs font-semibold"
              :class="row.is_active ? 'text-state-success-text' : 'text-text-secondary'"
            >
              {{ row.is_active ? t('facturacion.common.active') : t('facturacion.common.inactive') }}
            </span>
            <label
              class="relative inline-flex items-center cursor-pointer flex-shrink-0 min-h-[44px]"
              :aria-label="row.is_active ? t('facturacion.resolutions.deactivate') : t('facturacion.resolutions.activate')"
              @click.stop
            >
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="row.is_active"
                @change="toggleResolution(row.id)"
              />
              <div class="relative w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <button
            type="button"
            @click.stop="openEditResolution(row)"
            class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
            :aria-label="t('facturacion.resolutions.edit')"
          >
            <svg class="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
          </button>
        </template>

        <!-- Mobile card -->
        <template #card="{ item: row }">
          <div class="border border-border rounded-xl p-4 space-y-3 bg-surface">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-lg font-bold text-text-primary">{{ row.prefix }}</span>
                <span class="text-xs text-text-secondary font-mono truncate">{{ row.resolution_number }}</span>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  @click="openEditResolution(row)"
                  class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                  :aria-label="t('facturacion.resolutions.edit')"
                >
                  <svg class="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                </button>
                <span
                  class="text-xs font-semibold"
                  :class="row.is_active ? 'text-state-success-text' : 'text-text-secondary'"
                >
                  {{ row.is_active ? t('facturacion.common.active') : t('facturacion.common.inactive') }}
                </span>
                <label
                  class="relative inline-flex items-center cursor-pointer flex-shrink-0"
                  :aria-label="row.is_active ? t('facturacion.resolutions.deactivate') : t('facturacion.resolutions.activate')"
                >
                  <input
                    type="checkbox"
                    class="sr-only peer"
                    :checked="row.is_active"
                    @change="toggleResolution(row.id)"
                  />
                  <div class="relative w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            </div>
            <p class="text-xs text-text-secondary">{{ docTypeLabels[row.document_type] || row.document_type }}</p>
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-text-secondary">{{ t('facturacion.resolutions.rangeLabel', { from: row.from_number, to: row.to_number }).split(':')[0] }}: {{ row.from_number }} → {{ row.to_number }}</span>
                <span class="font-medium text-text-primary">{{ t('facturacion.resolutions.usedOfTotal', { used: row.used, total: row.total_range, percent: row.usage_percent }) }}</span>
              </div>
              <div class="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="progressColor(row.usage_percent)"
                  :style="{ width: `${Math.min(row.usage_percent, 100)}%` }"
                />
              </div>
            </div>
            <div class="flex items-center gap-4 text-xs text-text-secondary">
              <span>{{ t('facturacion.resolutions.fromLabel') }} <span class="font-medium text-text-primary">{{ row.date_from }}</span></span>
              <span>{{ t('facturacion.resolutions.toLabel') }} <span class="font-medium text-text-primary">{{ row.date_to }}</span></span>
            </div>
          </div>
        </template>
      </UiResponsiveDataView>
    </div>

    <!-- ══════ MATIAS API STATUS ══════ -->
    <div v-if="isFiscalIntegrated" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <SignalIcon class="w-5 h-5 text-primary flex-shrink-0" />
        {{ t('facturacion.provider.title') }}
      </h3>

      <div class="space-y-3">
        <!-- Customer self-service request -->
        <div class="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
          <label for="electronic-invoicing-request" class="text-sm font-medium text-text-primary">
            {{ t('facturacion.provider.requestLabel') }}
          </label>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              id="electronic-invoicing-request"
              v-model="fiscalForm.electronic_invoicing_requested"
              type="checkbox"
              class="sr-only peer"
            />
            <span class="w-11 h-6 bg-form-control-border rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></span>
          </label>
        </div>

        <!-- Casa de Software companyId -->
        <div class="flex flex-col gap-1 pb-2">
          <label for="matias-company-id" class="text-sm font-medium text-text-primary">
            {{ t('facturacion.provider.matiasUuid') }}
            <span class="text-xs font-normal text-text-tertiary">{{ t('facturacion.provider.requiredToIssue') }}</span>
          </label>
          <input
            id="matias-company-id"
            v-model="fiscalForm.matias_company_id"
            type="text"
            inputmode="text"
            autocomplete="off"
            placeholder="8d4f2f79-4a4e-4d7d-bf07-7bd61c9e4f37"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <div class="mt-2 flex justify-end">
            <button
              type="button"
              @click="saveFiscalData"
              :disabled="isSavingFiscal || !fiscalForm.nit || !fiscalForm.business_name"
              class="px-4 py-2 text-sm font-medium bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
            >
              <CheckIcon v-if="!isSavingFiscal" class="w-4 h-4" aria-hidden="true" />
              <span>{{ isSavingFiscal ? t('facturacion.common.saving') : t('facturacion.fiscal.save') }}</span>
            </button>
          </div>
        </div>

        <!-- Environment -->
        <div class="flex items-center justify-between py-1">
          <span class="text-sm text-text-secondary">{{ t('facturacion.provider.environment') }}</span>
          <span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-badge-warning-bg text-badge-warning-text">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            {{ localizedMatiasEnvironment }}
          </span>
        </div>

        <!-- Last document -->
        <div class="flex items-center justify-between py-1">
          <span class="text-sm text-text-secondary">{{ t('facturacion.provider.lastDocument') }}</span>
          <span v-if="facturacionStatus?.last_document" class="text-sm font-medium text-text-primary">
            {{ facturacionStatus.last_document.prefix }}-{{ facturacionStatus.last_document.invoice_number }}
            <span class="text-xs text-text-tertiary ms-1">
              · {{ facturacionStatus.last_document.created_at ? formatDate(facturacionStatus.last_document.created_at) : '' }}
            </span>
          </span>
          <span v-else class="text-sm text-text-tertiary">{{ t('facturacion.provider.noDocuments') }}</span>
        </div>
      </div>
    </div>

    <!-- ══════ PERSONALIZAR TICKETS POS ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <DocumentTextIcon class="w-5 h-5 text-primary flex-shrink-0" />
        {{ t('facturacion.print.title') }}
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1 sm:col-span-2">
          <label for="receipt-document-label" class="text-sm font-medium text-text-primary">
            {{ t('facturacion.print.documentLabel') }}
          </label>
          <input
            id="receipt-document-label"
            v-model="fiscalForm.receipt_document_label"
            type="text"
            maxlength="40"
            :placeholder="t('facturacion.print.docPlaceholder')"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div class="flex flex-col gap-1 sm:col-span-2">
          <label for="receipt-tip-label" class="text-sm font-medium text-text-primary">
            {{ t('facturacion.print.tipLabel') }}
          </label>
          <input
            id="receipt-tip-label"
            v-model="fiscalForm.receipt_tip_label"
            type="text"
            maxlength="40"
            :placeholder="t('facturacion.print.tipPlaceholder')"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <div class="flex items-center justify-between py-2 sm:col-span-2">
          <p class="text-sm font-medium text-text-primary">{{ t('facturacion.print.showLogo') }}</p>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ms-4">
            <input v-model="fiscalForm.show_logo_on_receipts" type="checkbox" class="sr-only peer" />
            <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
      </div>

      <div class="mt-5 flex justify-end">
        <button
          type="button"
          @click="savePrintSettings"
          :disabled="isSavingFiscal"
          class="px-4 py-2 text-sm font-medium bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
        >
          <CheckIcon v-if="!isSavingFiscal" class="w-4 h-4" aria-hidden="true" />
          <span>{{ isSavingFiscal ? t('facturacion.common.saving') : t('facturacion.print.save') }}</span>
        </button>
      </div>
    </div>

  </div>
</template>
