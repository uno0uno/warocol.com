<template>
  <div class="flex flex-col gap-1.5">
    <p class="text-sm font-medium text-text-primary">{{ t('abastecimiento.glossary.purchaseUnits') }}</p>

    <!-- Create: draft list -->
    <template v-if="mode === 'create'">
      <div
        v-if="draftUnits.length > 0"
        class="rounded-xl border border-border divide-y divide-border overflow-hidden bg-surface-secondary/30"
      >
        <div
          v-for="(u, index) in draftUnits"
          :key="`${u.purchase_unit}-${index}`"
          class="flex items-center justify-between px-3 py-2 gap-2"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-sm text-text-primary truncate">{{ u.purchase_unit_label }}</span>
            <button
              v-if="!u.is_default"
              type="button"
              class="text-[10px] text-text-tertiary border border-border rounded px-1.5 py-0.5 hover:text-primary hover:border-primary transition-colors flex-shrink-0"
              @click="setDraftDefault(index)"
            >
              {{ t('abastecimiento.glossary.setDefault') }}
            </button>
            <span v-else class="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">{{ t('abastecimiento.glossary.default') }}</span>
          </div>
          <span class="text-xs text-text-tertiary font-mono flex-shrink-0 text-end">
            {{ formatUnitFactorLabel(u.conversion_factor) }}
          </span>
          <button
            v-if="draftUnits.length > 1"
            type="button"
            :aria-label="t('abastecimiento.glossary.removeUnit', { name: u.purchase_unit_label })"
            class="text-text-tertiary hover:text-destructive transition-colors flex-shrink-0"
            @click="removeDraftUnit(index)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div
        v-if="dualUnitActive && availableCatalogSuggestions.length > 0"
        class="flex flex-wrap gap-1.5 mt-1"
      >
        <span class="text-[10px] text-text-tertiary w-full">{{ t('abastecimiento.glossary.catalogSuggestions') }}</span>
        <button
          v-for="s in availableCatalogSuggestions"
          :key="s.purchase_unit"
          type="button"
          class="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-text-secondary hover:border-primary hover:text-primary transition-colors min-h-[36px]"
          @click="addSuggestionToDraft(s)"
        >
          {{ s.label }}
          <span class="text-text-tertiary font-mono ms-1">{{ formatUnitFactorLabel(s.conversion_factor) }}</span>
        </button>
      </div>

      <div class="flex flex-col gap-2 mt-1 rounded-xl border border-border px-3 py-3 bg-surface-secondary/20">
        <p class="text-xs font-medium text-text-secondary">{{ t('abastecimiento.glossary.addUnit') }}</p>
        <div class="flex gap-2 flex-wrap">
          <div class="flex flex-col gap-1 flex-1 min-w-[8rem]">
            <label class="text-xs text-text-tertiary font-medium">{{ t('abastecimiento.glossary.unitName') }}</label>
            <input
              v-model="newUnit.purchase_unit_label"
              type="text"
              :placeholder="namePlaceholder"
              :class="inputClass"
              @keyup.enter="addDraftUnit"
            />
          </div>
          <div v-if="dualUnitActive" class="flex flex-col gap-1">
            <span class="text-xs text-text-tertiary font-medium">{{ t('abastecimiento.glossary.quantityMode') }}</span>
            <div class="flex rounded-lg border border-border overflow-hidden h-10" role="group" :aria-label="t('abastecimiento.glossary.quantityModeAria')">
              <button
                type="button"
                class="px-2.5 text-xs font-medium transition-colors"
                :class="quantityInputMode === 'weight'
                  ? 'bg-primary text-white'
                  : 'bg-background text-text-tertiary hover:bg-surface-secondary'"
                :aria-pressed="quantityInputMode === 'weight'"
                @click="quantityInputMode = 'weight'"
              >
                {{ unitWeightUnit }}
              </button>
              <button
                type="button"
                class="px-2.5 text-xs font-medium transition-colors border-l border-border"
                :class="quantityInputMode === 'und'
                  ? 'bg-primary text-white'
                  : 'bg-background text-text-tertiary hover:bg-surface-secondary'"
                :aria-pressed="quantityInputMode === 'und'"
                @click="quantityInputMode = 'und'"
              >
                und
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1 w-32">
            <label class="text-xs text-text-tertiary font-medium">{{ quantityFieldLabel }}</label>
            <UiDecimalInput
              v-model="newUnit.conversion_factor"
              :min="0.000001"
              :precision="CONVERSION_PRECISION"
              :placeholder="factorPlaceholder"
              :class="inputClass"
              @keyup.enter="addDraftUnit"
            />
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-text-tertiary">
            <template v-if="newUnit.purchase_unit_label && newUnit.conversion_factor">
              {{ addHintPreview }}
            </template>
            <template v-else>
              {{ emptyAddHint }}
            </template>
          </p>
          <button
            type="button"
            class="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
            @click="addDraftUnit"
          >
            {{ t('abastecimiento.glossary.addUnit') }}
          </button>
        </div>
        <p v-if="formError" class="text-xs text-destructive">{{ formError }}</p>
      </div>
    </template>

    <!-- Edit: API-backed CRUD -->
    <template v-else>
      <div v-if="loading" class="rounded-xl border border-border divide-y divide-border overflow-hidden bg-surface-secondary/30 animate-pulse">
        <div v-for="i in 2" :key="i" class="flex items-center justify-between px-3 py-2 gap-2">
          <div class="h-4 bg-border/60 rounded w-28" />
          <div class="h-4 bg-border/60 rounded w-16" />
        </div>
      </div>

      <div v-else-if="existingUnits.length > 0" class="rounded-xl border border-border divide-y divide-border overflow-hidden bg-surface-secondary/30">
        <div v-for="u in existingUnits" :key="u.id" class="flex items-center justify-between px-3 py-2 gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-sm text-text-primary truncate">{{ u.purchase_unit_label }}</span>
            <span
              v-if="settingDefaultUnitId === u.id"
              class="inline-flex items-center gap-1.5 text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0 min-h-[22px]"
            >
              <CommonsInlineDots
                :size="4"
                color="currentColor"
                :aria-label="t('abastecimiento.glossary.settingDefaultAria')"
              />
            </span>
            <button
              v-else-if="!u.is_default"
              type="button"
              :disabled="listActionsLocked"
              class="text-[10px] text-text-tertiary border border-border rounded px-1.5 py-0.5 hover:text-primary hover:border-primary transition-colors flex-shrink-0 disabled:opacity-40 disabled:pointer-events-none"
              @click="setDefaultUnit(u.id)"
            >
              {{ t('abastecimiento.glossary.setDefault') }}
            </button>
            <span
              v-else
              class="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0"
            >{{ t('abastecimiento.glossary.default') }}</span>
          </div>
          <span class="text-xs text-text-tertiary font-mono flex-shrink-0 text-end">{{ formatUnitFactorLabel(u.conversion_factor) }}</span>
          <button
            type="button"
            :disabled="listActionsLocked || deletingUnitId === u.id"
            :aria-label="t('abastecimiento.glossary.removeUnit', { name: u.purchase_unit_label })"
            class="text-text-tertiary hover:text-destructive transition-colors disabled:opacity-40 flex-shrink-0"
            @click="deleteUnit(u.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div v-else-if="pendingSuggestions.length > 0" class="rounded-xl border border-primary/30 divide-y divide-border overflow-hidden bg-primary/5">
        <div v-for="(s, i) in pendingSuggestions" :key="i" class="flex items-center justify-between px-3 py-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm text-text-primary">{{ s.label }}</span>
            <span v-if="i === 0" class="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">{{ t('abastecimiento.glossary.default') }}</span>
          </div>
          <span class="text-xs text-text-tertiary font-mono flex-shrink-0 ms-2">{{ formatUnitFactorLabel(s.conversion_factor) }}</span>
        </div>
      </div>

      <div
        v-if="dualUnitActive && availableCatalogSuggestions.length > 0"
        class="flex flex-wrap gap-1.5 mt-1"
      >
        <span class="text-[10px] text-text-tertiary w-full">{{ t('abastecimiento.glossary.catalogSuggestions') }}</span>
        <button
          v-for="s in availableCatalogSuggestions"
          :key="s.purchase_unit"
          type="button"
          :disabled="savingUnit"
          class="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background text-text-secondary hover:border-primary hover:text-primary transition-colors min-h-[36px] disabled:opacity-50"
          @click="addSuggestionPurchaseUnit(s)"
        >
          {{ s.label }}
          <span class="text-text-tertiary font-mono ms-1">{{ formatUnitFactorLabel(s.conversion_factor) }}</span>
        </button>
      </div>

      <div class="flex flex-col gap-2 mt-1 rounded-xl border border-border px-3 py-3 bg-surface-secondary/20">
        <p class="text-xs font-medium text-text-secondary">{{ t('abastecimiento.glossary.newPurchaseUnit') }}</p>
        <div class="flex gap-2 flex-wrap">
          <div class="flex flex-col gap-1 flex-1 min-w-[8rem]">
            <label class="text-xs text-text-tertiary font-medium">{{ t('abastecimiento.glossary.unitName') }}</label>
            <input
              v-model="newUnit.purchase_unit_label"
              type="text"
              :placeholder="t('abastecimiento.glossary.packageNamePlaceholder')"
              :class="inputClass"
              @keyup.enter="addPurchaseUnit"
            />
          </div>
          <div v-if="dualUnitActive" class="flex flex-col gap-1">
            <span class="text-xs text-text-tertiary font-medium">{{ t('abastecimiento.glossary.quantityMode') }}</span>
            <div class="flex rounded-lg border border-border overflow-hidden h-10" role="group" :aria-label="t('abastecimiento.glossary.quantityModeAria')">
              <button
                type="button"
                class="px-2.5 text-xs font-medium transition-colors"
                :class="quantityInputMode === 'weight'
                  ? 'bg-primary text-white'
                  : 'bg-background text-text-tertiary hover:bg-surface-secondary'"
                :aria-pressed="quantityInputMode === 'weight'"
                @click="quantityInputMode = 'weight'"
              >
                {{ unitWeightUnit }}
              </button>
              <button
                type="button"
                class="px-2.5 text-xs font-medium transition-colors border-l border-border"
                :class="quantityInputMode === 'und'
                  ? 'bg-primary text-white'
                  : 'bg-background text-text-tertiary hover:bg-surface-secondary'"
                :aria-pressed="quantityInputMode === 'und'"
                @click="quantityInputMode = 'und'"
              >
                und
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1 w-32">
            <label class="text-xs text-text-tertiary font-medium">{{ quantityFieldLabel }}</label>
            <UiDecimalInput
              v-model="newUnit.conversion_factor"
              :min="0.000001"
              :precision="CONVERSION_PRECISION"
              :placeholder="t('abastecimiento.glossary.unitFactorPlaceholder')"
              :class="inputClass"
              @keyup.enter="addPurchaseUnit"
            />
          </div>
        </div>
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs text-text-tertiary">
            <template v-if="newUnit.purchase_unit_label && newUnit.conversion_factor">
              {{ addHintPreview }}
            </template>
            <template v-else>
              {{ emptyAddHint }}
            </template>
          </p>
          <button
            type="button"
            :disabled="savingUnit"
            class="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0"
            @click="addPurchaseUnit"
          >
            {{ savingUnit ? t('abastecimiento.glossary.savingUnit') : t('abastecimiento.glossary.addUnit') }}
          </button>
        </div>
        <p v-if="formError" class="text-xs text-destructive">{{ formError }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  DraftPurchaseUnit,
  PurchaseQuantityInputMode,
  PurchaseUnitSuggestion,
} from '@/composables/useIngredientPurchaseUnitsDraft'
import {
  buildDualUnitPurchaseSuggestions,
  isDualUnitPurchaseConfig,
  undFactorToWeightQuantity,
  weightQuantityToUndFactor,
} from '@/composables/useIngredientPurchaseUnitsDraft'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

const { t, locale } = useI18n({ useScope: 'global' })

const CONVERSION_PRECISION = 6

const props = withDefaults(defineProps<{
  mode: 'create' | 'edit'
  baseUnit: string
  ingredientId?: string
  pendingSuggestions?: PurchaseUnitSuggestion[]
  unitWeightGr?: number | null
  unitWeightUnit?: 'gr' | 'ml' | null
}>(), {
  ingredientId: '',
  pendingSuggestions: () => [],
  unitWeightGr: null,
  unitWeightUnit: null,
})

const draftUnits = defineModel<DraftPurchaseUnit[]>('draftUnits', { default: () => [] })

const dualUnitActive = computed(() =>
  isDualUnitPurchaseConfig(props.baseUnit, props.unitWeightGr, props.unitWeightUnit),
)

const quantityInputMode = ref<PurchaseQuantityInputMode>('und')

watch(
  dualUnitActive,
  (active) => {
    quantityInputMode.value = active ? 'weight' : 'und'
  },
  { immediate: true },
)

const catalogSuggestions = computed(() => {
  if (!dualUnitActive.value || !props.unitWeightUnit || !props.unitWeightGr) return []
  return buildDualUnitPurchaseSuggestions(props.unitWeightUnit, props.unitWeightGr)
    .filter(s => s.purchase_unit !== 'und')
})

const existingKeys = computed(() => {
  if (props.mode === 'create') {
    return new Set(draftUnits.value.map(u => u.purchase_unit))
  }
  return new Set(existingUnits.value.map((u: any) => String(u.purchase_unit || '')))
})

const availableCatalogSuggestions = computed(() =>
  catalogSuggestions.value.filter(s => !existingKeys.value.has(s.purchase_unit)),
)

const namePlaceholder = computed(() => {
  return t('abastecimiento.glossary.packageNamePlaceholder')
})

const factorPlaceholder = computed(() => t('abastecimiento.glossary.unitFactorPlaceholder'))

const emptyAddHint = computed(() => {
  return dualUnitActive.value
    ? t('abastecimiento.glossary.emptyUnitHintDual', { unit: props.unitWeightUnit })
    : t('abastecimiento.glossary.emptyUnitHint')
})

const quantityFieldLabel = computed(() => {
  if (dualUnitActive.value && quantityInputMode.value === 'weight') {
    return t('abastecimiento.glossary.quantityBaseUnit', { unit: props.unitWeightUnit })
  }
  return t('abastecimiento.glossary.quantityBaseUnit', { unit: props.baseUnit })
})

const addHintPreview = computed(() => {
  const label = newUnit.value.purchase_unit_label.trim()
  const qty = newUnit.value.conversion_factor
  if (!label || !qty) return ''
  const undFactor = resolveUndFactor(qty)
  if (!(undFactor > 0)) return ''
  if (dualUnitActive.value && props.unitWeightGr && props.unitWeightUnit) {
    const weight = undFactorToWeightQuantity(undFactor, props.unitWeightGr)
    return t('abastecimiento.glossary.unitPackageHintDual', {
      name: label,
      quantity: formatConversionFactor(undFactor),
      weight: formatConversionFactor(weight),
      weightUnit: props.unitWeightUnit,
    })
  }
  return t('abastecimiento.glossary.unitPackageHint', {
    name: label,
    quantity: formatConversionFactor(undFactor),
    unit: props.baseUnit,
  })
})

const inputClass = 'h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const existingUnits = ref<any[]>([])
const loading = ref(false)
const savingUnit = ref(false)
const deletingUnitId = ref<string | null>(null)
const settingDefaultUnitId = ref<string | null>(null)
const formError = ref('')
const newUnit = ref({ purchase_unit_label: '', conversion_factor: null as number | null })

const listActionsLocked = computed(() =>
  settingDefaultUnitId.value != null || deletingUnitId.value != null || savingUnit.value,
)

function formatConversionFactor(value: number | string | null | undefined) {
  return formatDomainQuantity(value, CONVERSION_PRECISION, normalizeUiLocale(locale.value))
}

function formatUnitFactorLabel(undFactor: number | string | null | undefined) {
  const und = Number(undFactor)
  const undLabel = `${formatConversionFactor(und)} ${props.baseUnit}`
  if (!dualUnitActive.value || !props.unitWeightGr || !props.unitWeightUnit || !(und > 0)) {
    return undLabel
  }
  const weight = undFactorToWeightQuantity(und, props.unitWeightGr)
  return `${undLabel} · ${formatConversionFactor(weight)} ${props.unitWeightUnit}`
}

function resolveUndFactor(inputQty: number): number {
  if (
    dualUnitActive.value
    && quantityInputMode.value === 'weight'
    && props.unitWeightGr
  ) {
    return weightQuantityToUndFactor(inputQty, props.unitWeightGr)
  }
  return inputQty
}

function slugifyPurchaseUnit(label: string) {
  return label.toLowerCase().replace(/\s+/g, '_')
}

function resetNewUnitForm() {
  newUnit.value = { purchase_unit_label: '', conversion_factor: null }
  formError.value = ''
}

function validateNewUnitInput(): { label: string, undFactor: number } | null {
  formError.value = ''
  const label = newUnit.value.purchase_unit_label.trim()
  if (!label) {
    formError.value = t('abastecimiento.glossary.writeLabel')
    return null
  }
  if (!newUnit.value.conversion_factor || newUnit.value.conversion_factor <= 0) {
    formError.value = t('abastecimiento.glossary.factorPositive')
    return null
  }
  const undFactor = resolveUndFactor(newUnit.value.conversion_factor)
  if (!(undFactor > 0)) {
    formError.value = t('abastecimiento.glossary.factorPositive')
    return null
  }
  return { label, undFactor }
}

function addDraftUnit() {
  const parsed = validateNewUnitInput()
  if (!parsed) return
  const units = [...draftUnits.value]
  units.push({
    purchase_unit_label: parsed.label,
    purchase_unit: slugifyPurchaseUnit(parsed.label),
    conversion_factor: parsed.undFactor,
    is_default: units.length === 0,
  })
  draftUnits.value = units
  resetNewUnitForm()
}

function addSuggestionToDraft(suggestion: PurchaseUnitSuggestion) {
  if (existingKeys.value.has(suggestion.purchase_unit)) return
  const units = [...draftUnits.value]
  units.push({
    purchase_unit_label: suggestion.label,
    purchase_unit: suggestion.purchase_unit,
    conversion_factor: suggestion.conversion_factor,
    is_default: units.length === 0,
  })
  draftUnits.value = units
}

function removeDraftUnit(index: number) {
  const units = draftUnits.value.filter((_, i) => i !== index)
  if (units.length > 0 && !units.some(u => u.is_default)) {
    units[0].is_default = true
  }
  draftUnits.value = units
}

function setDraftDefault(index: number) {
  draftUnits.value = draftUnits.value.map((u, i) => ({
    ...u,
    is_default: i === index,
  }))
}

async function refreshPurchaseUnits() {
  if (!props.ingredientId) return
  try {
    const res: any = await $fetch(`/api/suppliers/ingredient-purchase-units/ingredient/${props.ingredientId}`)
    existingUnits.value = res?.data ?? []
  } catch {
    // keep existing
  }
}

async function persistPurchaseUnit(payload: {
  purchase_unit_label: string
  purchase_unit: string
  conversion_factor: number
  is_default: boolean
}) {
  if (!props.ingredientId) return
  savingUnit.value = true
  try {
    await $fetch('/api/suppliers/ingredient-purchase-units', {
      method: 'POST',
      body: {
        ingredient_id: props.ingredientId,
        purchase_unit_label: payload.purchase_unit_label,
        purchase_unit: payload.purchase_unit,
        conversion_factor: payload.conversion_factor,
        is_default: payload.is_default,
        is_active: true,
      },
    })
    resetNewUnitForm()
    await refreshPurchaseUnits()
  } catch (err: any) {
    formError.value = err?.data?.detail ?? t('abastecimiento.glossary.saveError')
  } finally {
    savingUnit.value = false
  }
}

async function addPurchaseUnit() {
  const parsed = validateNewUnitInput()
  if (!parsed || !props.ingredientId) return
  await persistPurchaseUnit({
    purchase_unit_label: parsed.label,
    purchase_unit: slugifyPurchaseUnit(parsed.label),
    conversion_factor: parsed.undFactor,
    is_default: existingUnits.value.length === 0,
  })
}

async function addSuggestionPurchaseUnit(suggestion: PurchaseUnitSuggestion) {
  if (!props.ingredientId || existingKeys.value.has(suggestion.purchase_unit)) return
  formError.value = ''
  await persistPurchaseUnit({
    purchase_unit_label: suggestion.label,
    purchase_unit: suggestion.purchase_unit,
    conversion_factor: suggestion.conversion_factor,
    is_default: existingUnits.value.length === 0,
  })
}

async function setDefaultUnit(unitId: string) {
  if (listActionsLocked.value) return
  settingDefaultUnitId.value = unitId
  try {
    await $fetch(`/api/suppliers/ingredient-purchase-units/${unitId}`, {
      method: 'PUT',
      body: { is_default: true },
    })
    await refreshPurchaseUnits()
  } catch { /* ignore */ } finally {
    settingDefaultUnitId.value = null
  }
}

async function deleteUnit(unitId: string) {
  if (listActionsLocked.value) return
  deletingUnitId.value = unitId
  try {
    await $fetch(`/api/suppliers/ingredient-purchase-units/${unitId}`, { method: 'DELETE' })
    await refreshPurchaseUnits()
  } catch { /* ignore */ } finally {
    deletingUnitId.value = null
  }
}

watch(
  () => [props.mode, props.ingredientId] as const,
  async ([mode, ingredientId]) => {
    if (mode !== 'edit' || !ingredientId) {
      existingUnits.value = []
      return
    }
    loading.value = true
    try {
      const res: any = await $fetch(`/api/suppliers/ingredient-purchase-units/ingredient/${ingredientId}`)
      existingUnits.value = res?.data ?? []
    } catch {
      existingUnits.value = []
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)
</script>
