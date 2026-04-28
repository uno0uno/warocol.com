<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import {
  CheckIcon,
  ReceiptPercentIcon,
  DocumentTextIcon,
  SignalIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Facturación' })

const { currentTenant } = useTenantReactive()
const toast = useToast()
const { formatDate } = useFormatters()

// ── DIAN Resolutions ────────────────────────────────────────────────────────
const { data: resolutionsData, asyncStatus: resAsyncStatus, refetch: refetchResolutions } = useQuery({
  key: () => ['tenant', 'dian-resolutions', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/api/tenant/dian-resolutions'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})
const resolutions = computed(() => resolutionsData.value?.data ?? [])

// Resolution form state
const showResolutionForm = ref(false)
const editingResolutionId = ref<string | null>(null)
const isSavingResolution = ref(false)
const resolutionForm = reactive({
  resolution_number: '',
  prefix: '',
  from_number: 1,
  to_number: 1000,
  current_number: 0,
  date_from: '',
  date_to: '',
  document_type: 'invoice',
})

const resetResolutionForm = () => {
  resolutionForm.resolution_number = ''
  resolutionForm.prefix = ''
  resolutionForm.from_number = 1
  resolutionForm.to_number = 1000
  resolutionForm.current_number = 0
  resolutionForm.date_from = ''
  resolutionForm.date_to = ''
  resolutionForm.document_type = 'invoice'
  editingResolutionId.value = null
}

const openNewResolution = () => {
  resetResolutionForm()
  showResolutionForm.value = true
}

const openEditResolution = (res: any) => {
  editingResolutionId.value = res.id
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
    showResolutionForm.value = false
    resetResolutionForm()
    toast.success(editingResolutionId.value ? 'Resolución actualizada' : 'Resolución creada', { title: 'Guardado' })
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al guardar resolución', { title: 'Error' })
  } finally {
    isSavingResolution.value = false
  }
}

const toggleResolution = async (resId: string) => {
  try {
    await $fetch(`/api/api/tenant/dian-resolutions/${resId}/toggle`, { method: 'PATCH' })
    await refetchResolutions()
  } catch (e: any) {
    toast.error(e.data?.detail || 'Error al cambiar estado', { title: 'Error' })
  }
}

const resolutionDocTypes = [
  { value: 'invoice', label: 'Factura de venta' },
  { value: 'credit_note', label: 'Nota crédito' },
  { value: 'debit_note', label: 'Nota débito' },
]

// ── Facturación Status ──────────────────────────────────────────────────────
const { data: statusData, asyncStatus: statusAsyncStatus, refetch: refetchStatus } = useQuery({
  key: () => ['tenant', 'facturacion-status', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/facturacion-status'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})
const facturacionStatus = computed(() => statusData.value?.data ?? null)

// ── Progressive loading + refresh ───────────────────────────────────────────
const isRefreshing = computed(() =>
  (resAsyncStatus.value === 'loading' && resolutionsData.value != null) ||
  (statusAsyncStatus.value === 'loading' && statusData.value != null)
)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const handleRefresh = async () => {
  await Promise.all([refetchResolutions(), refetchStatus()])
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

watch(taxConfig, (cfg) => {
  if (!cfg) return
  taxForm.inc_applicable = cfg.inc_applicable
  taxForm.inc_included_in_price = cfg.inc_included_in_price
  taxForm.iva_applicable = cfg.iva_applicable
  taxForm.iva_included_in_price = cfg.iva_included_in_price
  taxForm.liquor_tax_applicable = cfg.liquor_tax_applicable
}, { immediate: true })

watch(() => taxForm.inc_applicable, (val) => { if (val) taxForm.iva_applicable = false })
watch(() => taxForm.iva_applicable, (val) => { if (val) taxForm.inc_applicable = false })

const saveTaxConfig = async () => {
  isSavingTax.value = true
  try {
    await $fetch('/api/api/tenant/tax-config', { method: 'PUT', body: { ...taxForm } })
    await refreshTaxConfig()
    toast.success('Configuración fiscal guardada correctamente', { title: 'Guardado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al guardar configuración fiscal', { title: 'Error' })
  } finally {
    isSavingTax.value = false
  }
}

const docTypeLabels: Record<string, string> = {
  invoice: 'Factura de venta',
  credit_note: 'Nota crédito',
  debit_note: 'Nota débito',
}

const progressColor = (percent: number) => {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 70) return 'bg-amber-500'
  return 'bg-green-500'
}

// ── Fiscal Data ─────────────────────────────────────────────────────────────
const { data: fiscalData, refetch: refreshFiscal } = useQuery({
  key: () => ['tenant', 'fiscal-data', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/fiscal-data'),
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
  fiscal_address: '',
  city: '',
  city_id: 149,
  phone: '',
  email: '',
})
const isSavingFiscal = ref(false)

watch(fiscal, (f) => {
  if (!f) return
  fiscalForm.nit = f.nit || ''
  fiscalForm.business_name = f.business_name || ''
  fiscalForm.type_organization_id = f.type_organization_id ?? 1
  fiscalForm.tax_regime_id = f.tax_regime_id ?? 2
  fiscalForm.tax_level_id = f.tax_level_id ?? 5
  fiscalForm.fiscal_address = f.fiscal_address || ''
  fiscalForm.city = f.city || ''
  fiscalForm.city_id = f.city_id ?? 149
  fiscalForm.phone = f.phone || ''
  fiscalForm.email = f.email || ''
}, { immediate: true })

const saveFiscalData = async () => {
  isSavingFiscal.value = true
  try {
    await $fetch('/api/api/tenant/fiscal-data', { method: 'PUT', body: { ...fiscalForm } })
    await refreshFiscal()
    toast.success('Datos fiscales guardados correctamente', { title: 'Guardado' })
  } catch (error: any) {
    toast.error(error.data?.detail || 'Error al guardar datos fiscales', { title: 'Error' })
  } finally {
    isSavingFiscal.value = false
  }
}

const orgTypes = [
  { value: 1, label: 'Persona jurídica' },
  { value: 2, label: 'Persona natural' },
]
const taxRegimes = [
  { value: 1, label: 'Responsable de IVA' },
  { value: 2, label: 'No responsable del impuesto' },
]
const taxLevels = [
  { value: 1, label: 'Gran contribuyente' },
  { value: 2, label: 'Autorretenedor' },
  { value: 3, label: 'Agente de retención' },
  { value: 4, label: 'Régimen simple' },
  { value: 5, label: 'No aplica' },
]
</script>

<template>
  <div class="space-y-6">

    <!-- ══════ RESOLUCIÓN DIAN ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center gap-2">
          <DocumentTextIcon class="w-5 h-5 text-primary flex-shrink-0" />
          Resolución DIAN
        </h3>
        <button
          @click="openNewResolution"
          class="min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Agregar
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="resolutions.length === 0 && !showResolutionForm" class="text-center py-8">
        <DocumentTextIcon class="w-10 h-10 mx-auto text-text-tertiary mb-2" />
        <p class="text-sm text-text-secondary">Sin resoluciones DIAN configuradas</p>
        <p class="text-xs text-text-tertiary mt-1">Configura la resolución que registraste en el portal de Matias (número, prefijo, rango)</p>
        <button @click="openNewResolution" class="mt-3 min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
          Configurar resolución
        </button>
      </div>

      <!-- Resolution form (inline) -->
      <div v-if="showResolutionForm" class="border border-primary/30 bg-primary/5 rounded-xl p-4 mb-4 space-y-4">
        <h4 class="text-sm font-bold text-text-primary">{{ editingResolutionId ? 'Editar resolución' : 'Nueva resolución' }}</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">Número de resolución <span class="text-red-500">*</span></label>
            <input v-model="resolutionForm.resolution_number" type="text" placeholder="18764074347312" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">Prefijo <span class="text-red-500">*</span></label>
            <input v-model="resolutionForm.prefix" type="text" placeholder="LZT" maxlength="10" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary uppercase" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">Rango desde <span class="text-red-500">*</span></label>
            <input v-model.number="resolutionForm.from_number" type="number" min="1" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">Rango hasta <span class="text-red-500">*</span></label>
            <input v-model.number="resolutionForm.to_number" type="number" min="1" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">Número actual (consecutivo)</label>
            <input v-model.number="resolutionForm.current_number" type="number" min="0" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">Tipo de documento</label>
            <select v-model="resolutionForm.document_type" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
              <option v-for="dt in resolutionDocTypes" :key="dt.value" :value="dt.value">{{ dt.label }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">Fecha desde <span class="text-red-500">*</span></label>
            <input v-model="resolutionForm.date_from" type="date" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-text-secondary">Fecha hasta <span class="text-red-500">*</span></label>
            <input v-model="resolutionForm.date_to" type="date" class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div class="flex items-center gap-2 justify-end">
          <button @click="showResolutionForm = false; resetResolutionForm()" class="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors">
            Cancelar
          </button>
          <button
            @click="saveResolution"
            :disabled="isSavingResolution || !resolutionForm.prefix || !resolutionForm.resolution_number || !resolutionForm.date_from || !resolutionForm.date_to"
            class="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckIcon v-if="!isSavingResolution" class="w-4 h-4" aria-hidden="true" />
            <span>{{ isSavingResolution ? 'Guardando...' : (editingResolutionId ? 'Actualizar' : 'Crear resolución') }}</span>
          </button>
        </div>
      </div>

      <!-- Resolution cards -->
      <div v-if="resolutions.length > 0" class="space-y-4">
        <div v-for="res in resolutions" :key="res.id" class="border border-border rounded-xl p-4 space-y-3">
          <!-- Header: prefix + status + actions -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold text-text-primary">{{ res.prefix }}</span>
              <span class="text-xs text-text-secondary font-mono">{{ res.resolution_number }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="openEditResolution(res)"
                class="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
                aria-label="Editar resolución"
              >
                <svg class="w-4 h-4 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
              </button>
              <button
                @click="toggleResolution(res.id)"
                class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer transition-colors"
                :class="res.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                :aria-label="res.is_active ? 'Desactivar resolución' : 'Activar resolución'"
              >
                <svg v-if="res.is_active" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m4.5 12.75 6 6 9-13.5" /></svg>
                {{ res.is_active ? 'Activa' : 'Inactiva' }}
              </button>
            </div>
          </div>

          <!-- Document type -->
          <p class="text-xs text-text-secondary">{{ docTypeLabels[res.document_type] || res.document_type }}</p>

          <!-- Progress bar -->
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-text-secondary">Rango: {{ res.from_number }} → {{ res.to_number }}</span>
              <span class="font-medium text-text-primary">{{ res.used }} de {{ res.total_range }} usados ({{ res.usage_percent }}%)</span>
            </div>
            <div class="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="progressColor(res.usage_percent)"
                :style="{ width: `${Math.min(res.usage_percent, 100)}%` }"
              />
            </div>
          </div>

          <!-- Dates -->
          <div class="flex items-center gap-4 text-xs text-text-secondary">
            <span>Desde: <span class="font-medium text-text-primary">{{ res.date_from }}</span></span>
            <span>Hasta: <span class="font-medium text-text-primary">{{ res.date_to }}</span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════ DATOS FISCALES ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <svg class="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" /></svg>
        Datos Fiscales del Negocio
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- NIT -->
        <div class="flex flex-col gap-1">
          <label for="fiscal-nit" class="text-sm font-medium text-text-primary">NIT <span class="text-red-500">*</span></label>
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
          <label for="fiscal-name" class="text-sm font-medium text-text-primary">Razón social <span class="text-red-500">*</span></label>
          <input
            id="fiscal-name"
            v-model="fiscalForm.business_name"
            type="text"
            placeholder="MI RESTAURANTE SAS"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        <!-- Tipo organización -->
        <div class="flex flex-col gap-1">
          <label for="fiscal-org" class="text-sm font-medium text-text-primary">Tipo de organización</label>
          <select
            id="fiscal-org"
            v-model="fiscalForm.type_organization_id"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option v-for="opt in orgTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Régimen tributario -->
        <div class="flex flex-col gap-1">
          <label for="fiscal-regime" class="text-sm font-medium text-text-primary">Régimen tributario</label>
          <select
            id="fiscal-regime"
            v-model="fiscalForm.tax_regime_id"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option v-for="opt in taxRegimes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Nivel de responsabilidad -->
        <div class="flex flex-col gap-1">
          <label for="fiscal-level" class="text-sm font-medium text-text-primary">Nivel de responsabilidad</label>
          <select
            id="fiscal-level"
            v-model="fiscalForm.tax_level_id"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option v-for="opt in taxLevels" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Dirección fiscal -->
        <div class="flex flex-col gap-1">
          <label for="fiscal-address" class="text-sm font-medium text-text-primary">Dirección fiscal</label>
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
          <label for="fiscal-city" class="text-sm font-medium text-text-primary">Ciudad</label>
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
          <label for="fiscal-phone" class="text-sm font-medium text-text-primary">Teléfono</label>
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
          <label for="fiscal-email" class="text-sm font-medium text-text-primary">Email facturación</label>
          <input
            id="fiscal-email"
            v-model="fiscalForm.email"
            type="email"
            placeholder="facturacion@mirestaurante.com"
            class="min-h-[44px] px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <!-- Save button -->
      <div class="mt-5 flex justify-end">
        <button
          @click="saveFiscalData"
          :disabled="isSavingFiscal || !fiscalForm.nit || !fiscalForm.business_name"
          class="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
        >
          <CheckIcon v-if="!isSavingFiscal" class="w-4 h-4" aria-hidden="true" />
          <span>{{ isSavingFiscal ? 'Guardando...' : 'Guardar datos fiscales' }}</span>
        </button>
      </div>
    </div>

    <!-- ══════ CONFIGURACIÓN FISCAL ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <ReceiptPercentIcon class="w-5 h-5 text-primary flex-shrink-0" />
        Configuración fiscal
      </h3>

      <div class="space-y-5">

        <!-- INC -->
        <div class="space-y-3">
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-medium text-text-primary">INC — Impoconsumo 8%</p>
              <p class="text-xs text-text-secondary mt-0.5">Restaurantes y bares sin franquicia (Art. 512-1 ET)</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
              <input v-model="taxForm.inc_applicable" type="checkbox" class="sr-only peer" />
              <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div v-if="taxForm.inc_applicable" class="grid grid-cols-2 gap-2 mt-1" role="group" aria-label="Cómo aplicar el INC">
            <button
              type="button"
              @click="taxForm.inc_included_in_price = true"
              :class="[
                'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                taxForm.inc_included_in_price
                  ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                  : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10M7 12h10M7 17h6" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
              </svg>
              <span class="text-xs font-bold leading-tight">Incluido en el precio</span>
              <span :class="['text-[10px] leading-snug', taxForm.inc_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">El 8% ya está dentro del precio. Ej: $10.800 → base $10.000 + INC $800</span>
            </button>
            <button
              type="button"
              @click="taxForm.inc_included_in_price = false"
              :class="[
                'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                !taxForm.inc_included_in_price
                  ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                  : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span class="text-xs font-bold leading-tight">Se suma al precio</span>
              <span :class="['text-[10px] leading-snug', !taxForm.inc_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">El 8% se agrega encima. Ej: $10.000 base → cobro $10.800</span>
            </button>
          </div>
        </div>

        <div class="border-t border-border/40" />

        <!-- IVA -->
        <div class="space-y-3">
          <div class="flex items-center justify-between py-1">
            <div>
              <p class="text-sm font-medium text-text-primary">IVA — 19%</p>
              <p class="text-xs text-text-secondary mt-0.5">Solo para establecimientos bajo franquicia (Form. DIAN 300)</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
              <input v-model="taxForm.iva_applicable" type="checkbox" class="sr-only peer" />
              <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          <div v-if="taxForm.iva_applicable" class="grid grid-cols-2 gap-2 mt-1" role="group" aria-label="Cómo aplicar el IVA">
            <button
              type="button"
              @click="taxForm.iva_included_in_price = true"
              :class="[
                'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                taxForm.iva_included_in_price
                  ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                  : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h10M7 12h10M7 17h6" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 6a1 1 0 011-1h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6z" />
              </svg>
              <span class="text-xs font-bold leading-tight">Incluido en el precio</span>
              <span :class="['text-[10px] leading-snug', taxForm.iva_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">El 19% ya está dentro del precio. Ej: $11.900 → base $10.000 + IVA $1.900</span>
            </button>
            <button
              type="button"
              @click="taxForm.iva_included_in_price = false"
              :class="[
                'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                !taxForm.iva_included_in_price
                  ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                  : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span class="text-xs font-bold leading-tight">Se suma al precio</span>
              <span :class="['text-[10px] leading-snug', !taxForm.iva_included_in_price ? 'text-primary/80' : 'text-text-tertiary']">El 19% se agrega encima. Ej: $10.000 base → cobro $11.900</span>
            </button>
          </div>
        </div>

        <div class="border-t border-border/40" />

        <!-- IVA Licores -->
        <div class="flex items-center justify-between py-1">
          <div>
            <p class="text-sm font-medium text-text-primary">IVA Licores para llevar — 5%</p>
            <p class="text-xs text-text-secondary mt-0.5">Si vendés botellas o licores para llevar (siempre se suma al precio base)</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
            <input v-model="taxForm.liquor_tax_applicable" type="checkbox" class="sr-only peer" />
            <div class="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-focus:ring-2 peer-focus:ring-primary/30 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

      </div>

      <!-- Save button -->
      <div class="mt-5 flex justify-end">
        <button
          @click="saveTaxConfig"
          :disabled="isSavingTax"
          class="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
        >
          <CheckIcon v-if="!isSavingTax" class="w-4 h-4" aria-hidden="true" />
          <span>{{ isSavingTax ? 'Guardando...' : 'Guardar configuración' }}</span>
        </button>
      </div>
    </div>

    <!-- ══════ MATIAS API STATUS ══════ -->
    <div class="bg-surface border-2 border-border rounded-xl p-4 sm:p-6">
      <h3 class="text-base sm:text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <SignalIcon class="w-5 h-5 text-primary flex-shrink-0" />
        Matias API
      </h3>

      <div class="space-y-3">
        <!-- Environment -->
        <div class="flex items-center justify-between py-1">
          <span class="text-sm text-text-secondary">Entorno</span>
          <span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            {{ facturacionStatus?.environment || 'No configurado' }}
          </span>
        </div>

        <!-- Last document -->
        <div class="flex items-center justify-between py-1">
          <span class="text-sm text-text-secondary">Último documento</span>
          <span v-if="facturacionStatus?.last_document" class="text-sm font-medium text-text-primary">
            {{ facturacionStatus.last_document.prefix }}-{{ facturacionStatus.last_document.invoice_number }}
            <span class="text-xs text-text-tertiary ml-1">
              · {{ facturacionStatus.last_document.created_at ? formatDate(facturacionStatus.last_document.created_at) : '' }}
            </span>
          </span>
          <span v-else class="text-sm text-text-tertiary">Sin documentos emitidos</span>
        </div>
      </div>
    </div>

  </div>
</template>
