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
})
const isSavingTax = ref(false)

const {
  WAVE1_COUNTRY_CODES,
  primaryTaxLine,
  wave1PresetForCountry,
} = useTenantTaxProfile()

const showCommercialTaxUi = computed(() => isWaroCommercial.value)

const commercialPresetCountry = ref('')
const commercialLine = reactive({
  key: 'standard',
  label: '',
  ratePct: 0,
  included_in_price: false,
  gl_role: 'iva',
})

const syncCommercialFromConfig = (cfg: Record<string, any> | null) => {
  const line = primaryTaxLine(cfg)
  if (!line) {
    commercialLine.key = 'standard'
    commercialLine.label = ''
    commercialLine.ratePct = 0
    commercialLine.included_in_price = false
    commercialLine.gl_role = 'iva'
    return
  }
  commercialLine.key = line.key
  commercialLine.label = line.label
  commercialLine.ratePct = Math.round(line.rate * 10000) / 100
  commercialLine.included_in_price = line.included_in_price
  commercialLine.gl_role = line.gl_role || 'iva'
  const profileCountry = financialProfile.value?.country_code?.toUpperCase() || ''
  if (profileCountry && WAVE1_COUNTRY_CODES.includes(profileCountry)) {
    const preset = wave1PresetForCountry(profileCountry)
    if (preset?.lines[0]?.key === line.key) {
      commercialPresetCountry.value = profileCountry
      return
    }
  }
  const matched = WAVE1_COUNTRY_CODES.find((code) => {
    const preset = wave1PresetForCountry(code)
    return preset?.lines[0]?.key === line.key
      && Math.abs((preset?.lines[0]?.rate || 0) - line.rate) < 1e-9
  })
  if (matched) commercialPresetCountry.value = matched
}

const applyWave1Preset = (countryCode: string) => {
  const preset = wave1PresetForCountry(countryCode)
  if (!preset) return
  commercialPresetCountry.value = countryCode.toUpperCase()
  const line = preset.lines[0]
  commercialLine.key = line.key
  commercialLine.label = line.label
  commercialLine.ratePct = Math.round(line.rate * 10000) / 100
  commercialLine.included_in_price = line.included_in_price
  commercialLine.gl_role = line.gl_role
}

const onCommercialPresetChange = () => {
  if (commercialPresetCountry.value) applyWave1Preset(commercialPresetCountry.value)
}

watch(taxConfig, (cfg) => {
  if (!cfg) return
  taxForm.inc_applicable = cfg.inc_applicable
  taxForm.inc_included_in_price = cfg.inc_included_in_price
  taxForm.iva_applicable = cfg.iva_applicable
  taxForm.iva_included_in_price = cfg.iva_included_in_price
  taxForm.liquor_tax_applicable = cfg.liquor_tax_applicable
  syncCommercialFromConfig(cfg)
}, { immediate: true })

watch(
  () => financialProfile.value?.country_code,
  (code) => {
    if (!showCommercialTaxUi.value || !code) return
    if (commercialLine.label) return
    if (WAVE1_COUNTRY_CODES.includes(code.toUpperCase())) {
      applyWave1Preset(code)
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
      const ratePct = Number(commercialLine.ratePct) || 0
      if (ratePct <= 0 || !commercialLine.label.trim()) {
        toast.error(t('facturacion.tax.commercialSaveInvalid'), { title: t('facturacion.common.error') })
        return
      }
      const rate = Math.max(0, ratePct) / 100
      const label = commercialLine.label.trim()
      const tax_lines = [{
        key: commercialLine.key || 'standard',
        label,
        rate,
        included_in_price: commercialLine.included_in_price,
        gl_role: commercialLine.gl_role || 'iva',
      }]
      const category_map = {
        standard: tax_lines[0].key,
        liquor: tax_lines[0].key,
        exempt: null,
      }
      await $fetch('/api/api/tenant/tax-config', {
        method: 'PUT',
        body: {
          inc_applicable: false,
          inc_included_in_price: true,
          iva_applicable: false,
          iva_included_in_price: false,
          liquor_tax_applicable: false,
          tax_lines,
          category_map,
        },
      })
    } else {
      applySalesTaxProfile()
      await $fetch('/api/api/tenant/tax-config', { method: 'PUT', body: { ...taxForm } })
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
    await $fetch('/api/api/tenant/fiscal-data', {
      method: 'PUT',
      body: {
        ...fiscalForm,
        matias_company_id: fiscalForm.matias_company_id.trim(),
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
          <p class="text-xs text-state-info-text/90 mt-0.5">{{ t('facturacion.readiness.requestBody') }}</p>
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
          <p class="text-xs text-state-warning-text/90 mt-0.5">{{ t('facturacion.readiness.pendingBody') }}</p>
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
          <p class="text-xs text-state-info-text/90 mt-0.5">{{ t('facturacion.readiness.missingFiscalBody') }}</p>
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
          <p class="text-xs text-state-info-text/90 mt-0.5">{{ t('facturacion.readiness.noResolutionBody') }}</p>
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
          <p class="text-xs text-state-info-text/90 mt-0.5">{{ t('facturacion.readiness.taxReviewBody') }}</p>
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
          <p class="text-xs text-state-warning-text/90 mt-0.5">{{ t('facturacion.readiness.matiasUuidBody') }}</p>
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
        <p class="text-xs text-text-tertiary mt-1">{{ t('facturacion.resolutions.emptySub') }}</p>
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

    <!-- ══════ DATOS FISCALES ══════ -->
    <div v-if="isFiscalIntegrated" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
        <svg class="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" /></svg>
        {{ t('facturacion.fiscal.sectionTitle') }}
      </h3>
      <p class="text-xs text-text-secondary mb-4">
        {{ t('facturacion.fiscal.body') }}
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- NIT -->
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

        <!-- Razón social -->
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

        <!-- Tipo organización -->
        <div class="flex flex-col gap-1">
          <label for="fiscal-org" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.orgType') }}</label>
          <select
            id="fiscal-org"
            v-model="fiscalForm.type_organization_id"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option v-for="opt in orgTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <p class="text-[11px] text-text-tertiary leading-snug">{{ t('facturacion.fiscal.orgHint') }}</p>
        </div>

        <!-- Régimen tributario -->
        <fieldset class="flex flex-col gap-2 sm:col-span-2">
          <legend class="text-sm font-medium text-text-primary">
            {{ t('facturacion.salesTaxProfiles.title') }}
            <span class="text-form-control-error">*</span>
          </legend>
          <p class="text-[11px] text-text-tertiary leading-snug">
            {{ t('facturacion.salesTaxProfiles.hint') }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              v-for="profile in salesTaxProfiles"
              :key="profile.value"
              type="button"
              :aria-pressed="fiscalForm.sales_tax_profile === profile.value"
              @click="fiscalForm.sales_tax_profile = profile.value"
              :class="[
                'min-h-[76px] rounded-xl border-2 p-3 text-start transition-colors',
                fiscalForm.sales_tax_profile === profile.value
                  ? 'border-primary bg-primary/8'
                  : 'border-border bg-background hover:border-primary/40'
              ]"
            >
              <span class="block text-sm font-semibold text-text-primary">{{ profile.label }}</span>
              <span class="block mt-1 text-[11px] leading-snug text-text-secondary">{{ profile.hint }}</span>
            </button>
          </div>
          <p
            v-if="fiscalForm.sales_tax_profile === 'unconfigured'"
            class="text-xs text-state-warning-text"
          >
            {{ t('facturacion.salesTaxProfiles.required') }}
          </p>
        </fieldset>

        <!-- Régimen Matias derivado del perfil -->
        <div class="flex flex-col gap-1">
          <label for="fiscal-regime" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.taxRegime') }}</label>
          <select
            id="fiscal-regime"
            v-model="fiscalForm.tax_regime_id"
            disabled
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-secondary bg-surface-secondary cursor-not-allowed"
          >
            <option v-for="opt in taxRegimes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <p class="text-[11px] text-text-tertiary leading-snug">{{ t('facturacion.fiscal.taxRegimeHint') }}</p>
        </div>

        <!-- Nivel de responsabilidad -->
        <div class="flex flex-col gap-1">
          <label for="fiscal-level" class="text-sm font-medium text-text-primary">{{ t('facturacion.fiscal.taxLevel') }}</label>
          <select
            id="fiscal-level"
            v-model="fiscalForm.tax_level_id"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option v-for="opt in taxLevels" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <p class="text-[11px] text-text-tertiary leading-snug">{{ t('facturacion.fiscal.taxLevelHint') }}</p>
        </div>

        <!-- Dirección fiscal -->
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

        <!-- Ciudad -->
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

        <!-- Teléfono -->
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

        <!-- Email facturación -->
        <div class="flex flex-col gap-1 sm:col-span-2">
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

      <!-- Save button -->
      <div class="mt-5 flex justify-end">
        <button
          @click="saveFiscalData"
          :disabled="isSavingFiscal || !fiscalForm.nit || !fiscalForm.business_name || fiscalForm.sales_tax_profile === 'unconfigured'"
          class="px-4 py-2 text-sm font-medium bg-action-primary-bg text-action-primary-text rounded-lg hover:bg-action-primary-hover-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
        >
          <CheckIcon v-if="!isSavingFiscal" class="w-4 h-4" aria-hidden="true" />
          <span>{{ isSavingFiscal ? t('facturacion.common.saving') : t('facturacion.fiscal.save') }}</span>
        </button>
      </div>
    </div>

    <!-- ══════ PERSONALIZAR TICKETS POS ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
        <DocumentTextIcon class="w-5 h-5 text-primary flex-shrink-0" />
        {{ t('facturacion.print.title') }}
      </h3>
      <p class="text-xs text-text-secondary mb-4">
        {{ t('facturacion.print.bodyPrefix') }}
        <NuxtLink to="/negocio" class="text-primary font-medium hover:underline">{{ t('facturacion.fiscal.miNegocio') }}</NuxtLink>.
      </p>

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
          <p class="text-[11px] text-text-tertiary leading-snug">
            {{ t('facturacion.print.docHint') }}
          </p>
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
          <p class="text-[11px] text-text-tertiary leading-snug">
            {{ t('facturacion.print.tipHint') }}
          </p>
        </div>

        <div class="flex items-center justify-between py-2 sm:col-span-2">
          <div>
            <p class="text-sm font-medium text-text-primary">{{ t('facturacion.print.showLogo') }}</p>
            <p class="text-xs text-text-secondary mt-0.5">{{ t('facturacion.print.showLogoHint') }}</p>
          </div>
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

    <!-- ══════ CONFIGURACIÓN FISCAL ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
        <ReceiptPercentIcon class="w-5 h-5 text-primary flex-shrink-0" />
        {{ t('facturacion.tax.title') }}
      </h3>
      <p class="text-xs text-text-secondary mb-4">
        {{ showCommercialTaxUi ? t('facturacion.tax.commercialBody') : t('facturacion.tax.body') }}
      </p>

      <!-- Commercial / non-DIAN: tax_lines preset + rate override -->
      <div v-if="showCommercialTaxUi" class="space-y-5">
        <div class="space-y-2">
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
            <option v-for="code in WAVE1_COUNTRY_CODES" :key="code" :value="code">
              {{ code }} — {{ wave1PresetForCountry(code)?.lines[0]?.label }}
            </option>
          </select>
          <p class="text-xs text-text-secondary">{{ t('facturacion.tax.wave1PresetHint') }}</p>
        </div>

        <div class="space-y-2">
          <label for="commercial-tax-label" class="text-sm font-medium text-text-primary">
            {{ t('facturacion.tax.lineLabel') }}
          </label>
          <input
            id="commercial-tax-label"
            v-model="commercialLine.label"
            type="text"
            class="w-full min-h-[44px] rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary"
          >
        </div>

        <div class="space-y-2">
          <label for="commercial-tax-rate" class="text-sm font-medium text-text-primary">
            {{ t('facturacion.tax.ratePercent') }}
          </label>
          <input
            id="commercial-tax-rate"
            v-model.number="commercialLine.ratePct"
            type="number"
            min="0"
            max="100"
            step="0.01"
            class="w-full min-h-[44px] rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary tabular-nums"
          >
        </div>

        <div class="grid grid-cols-2 gap-2" role="group" :aria-label="t('facturacion.tax.howCommercial')">
          <button
            type="button"
            @click="commercialLine.included_in_price = true"
            :class="[
              'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
              commercialLine.included_in_price
                ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
            ]"
          >
            <span class="text-xs font-bold leading-tight">{{ t('facturacion.tax.included') }}</span>
            <span class="text-[10px] leading-snug">{{ t('facturacion.tax.commercialIncludedHint') }}</span>
          </button>
          <button
            type="button"
            @click="commercialLine.included_in_price = false"
            :class="[
              'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
              !commercialLine.included_in_price
                ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
            ]"
          >
            <span class="text-xs font-bold leading-tight">{{ t('facturacion.tax.added') }}</span>
            <span class="text-[10px] leading-snug">{{ t('facturacion.tax.commercialAddedHint') }}</span>
          </button>
        </div>
      </div>

      <!-- CO fiscal-integrated: INC / IVA / liquor -->
      <div v-else class="space-y-5">

        <!-- INC -->
        <!-- tax toggles (i18n chrome) -->
        <div class="space-y-3">
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-medium text-text-primary" v-text="t('facturacion.tax.incTitle')"></p>
              <p class="text-xs text-text-secondary mt-0.5" v-text="t('facturacion.tax.incBody')"></p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ms-4">
              <input v-model="taxForm.inc_applicable" type="checkbox" disabled class="sr-only peer" />
              <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div v-if="taxForm.inc_applicable" class="grid grid-cols-2 gap-2 mt-1" role="group" :aria-label="t('facturacion.tax.howInc')">
            <button
              type="button"
              @click="taxForm.inc_included_in_price = true"
              :class="[
                'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                taxForm.inc_included_in_price
                  ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                  : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10M7 12h10M7 17h6" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
              </svg>
              <span class="text-xs font-bold leading-tight">{{ t('facturacion.tax.included') }}</span>
              <span :class="['text-[10px] leading-snug', taxForm.inc_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">{{ t('facturacion.tax.incIncludedHint') }}</span>
            </button>
            <button
              type="button"
              @click="taxForm.inc_included_in_price = false"
              :class="[
                'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                !taxForm.inc_included_in_price
                  ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                  : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span class="text-xs font-bold leading-tight">{{ t('facturacion.tax.added') }}</span>
              <span :class="['text-[10px] leading-snug', !taxForm.inc_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">{{ t('facturacion.tax.incAddedHint') }}</span>
            </button>
          </div>
        </div>

        <div class="border-t border-border/40" />

        <!-- IVA -->
        <div class="space-y-3">
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-medium text-text-primary" v-text="t('facturacion.tax.ivaTitle')"></p>
              <p class="text-xs text-text-secondary mt-0.5" v-text="t('facturacion.tax.ivaBody')"></p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ms-4">
              <input v-model="taxForm.iva_applicable" type="checkbox" disabled class="sr-only peer" />
              <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div v-if="taxForm.iva_applicable" class="grid grid-cols-2 gap-2 mt-1" role="group" :aria-label="t('facturacion.tax.howIva')">
            <button
              type="button"
              @click="taxForm.iva_included_in_price = true"
              :class="[
                'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                taxForm.iva_included_in_price
                  ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                  : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10M7 12h10M7 17h6" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
              </svg>
              <span class="text-xs font-bold leading-tight">{{ t('facturacion.tax.included') }}</span>
              <span :class="['text-[10px] leading-snug', taxForm.iva_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">{{ t('facturacion.tax.ivaIncludedHint') }}</span>
            </button>
            <button
              type="button"
              @click="taxForm.iva_included_in_price = false"
              :class="[
                'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-start',
                !taxForm.iva_included_in_price
                  ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                  : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span class="text-xs font-bold leading-tight">{{ t('facturacion.tax.added') }}</span>
              <span :class="['text-[10px] leading-snug', !taxForm.iva_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">{{ t('facturacion.tax.ivaAddedHint') }}</span>
            </button>
          </div>
        </div>

        <div class="border-t border-border/40" />

        <!-- IVA Licores -->
        <div class="flex items-center justify-between py-1">
          <div>
            <p class="text-sm font-medium text-text-primary" v-text="t('facturacion.tax.liquorTitle')"></p>
            <p class="text-xs text-text-secondary mt-0.5" v-text="t('facturacion.tax.liquorBody')"></p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ms-4">
            <input v-model="taxForm.liquor_tax_applicable" type="checkbox" class="sr-only peer" />
            <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

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

    <!-- ══════ MATIAS API STATUS ══════ -->
    <div v-if="isFiscalIntegrated" class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <SignalIcon class="w-5 h-5 text-primary flex-shrink-0" />
        {{ t('facturacion.provider.title') }}
      </h3>

      <div class="space-y-3">
        <!-- Customer self-service request -->
        <div class="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-3">
          <div class="min-w-0">
            <label for="electronic-invoicing-request" class="text-sm font-medium text-text-primary">
              {{ t('facturacion.provider.requestLabel') }}
            </label>
            <p class="text-xs text-text-secondary leading-snug mt-0.5">
              {{ t('facturacion.provider.requestBody') }}
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
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
          <p class="text-xs text-text-secondary leading-snug">
            {{ t('facturacion.provider.matiasUuidHint') }}
          </p>
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

  </div>
</template>
