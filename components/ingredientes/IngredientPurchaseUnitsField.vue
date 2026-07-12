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
          <span class="text-xs text-text-tertiary font-mono flex-shrink-0">
            {{ formatConversionFactor(u.conversion_factor) }} {{ baseUnit }}
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

      <div class="flex flex-col gap-2 mt-1 rounded-xl border border-border px-3 py-3 bg-surface-secondary/20">
        <p class="text-xs font-medium text-text-secondary">{{ t('abastecimiento.glossary.addUnit') }}</p>
        <div class="flex gap-2">
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-xs text-text-tertiary font-medium">{{ t('abastecimiento.glossary.unitName') }}</label>
            <input
              v-model="newUnit.purchase_unit_label"
              type="text"
              :placeholder="namePlaceholder"
              :class="inputClass"
              @keyup.enter="addDraftUnit"
            />
          </div>
          <div class="flex flex-col gap-1 w-32">
            <label class="text-xs text-text-tertiary font-medium">{{ t('abastecimiento.glossary.quantityBaseUnit', { unit: baseUnit }) }}</label>
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
              {{ t('abastecimiento.glossary.unitPackageHint', { name: newUnit.purchase_unit_label, quantity: newUnit.conversion_factor, unit: baseUnit }) }}
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
            <button
              v-if="!u.is_default"
              type="button"
              class="text-[10px] text-text-tertiary border border-border rounded px-1.5 py-0.5 hover:text-primary hover:border-primary transition-colors flex-shrink-0"
              @click="setDefaultUnit(u.id)"
            >
              {{ t('abastecimiento.glossary.setDefault') }}
            </button>
            <span v-else class="text-[10px] text-primary bg-primary/10 rounded px-1.5 py-0.5 flex-shrink-0">{{ t('abastecimiento.glossary.default') }}</span>
          </div>
          <span class="text-xs text-text-tertiary font-mono flex-shrink-0">{{ formatConversionFactor(u.conversion_factor) }} {{ baseUnit }}</span>
          <button
            type="button"
            :disabled="deletingUnitId === u.id"
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
          <span class="text-xs text-text-tertiary font-mono flex-shrink-0 ml-2">{{ formatConversionFactor(s.conversion_factor) }} {{ baseUnit }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2 mt-1 rounded-xl border border-border px-3 py-3 bg-surface-secondary/20">
        <p class="text-xs font-medium text-text-secondary">{{ t('abastecimiento.glossary.newPurchaseUnit') }}</p>
        <div class="flex gap-2">
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-xs text-text-tertiary font-medium">{{ t('abastecimiento.glossary.unitName') }}</label>
            <input
              v-model="newUnit.purchase_unit_label"
              type="text"
              :placeholder="t('abastecimiento.glossary.packageNamePlaceholder')"
              :class="inputClass"
              @keyup.enter="addPurchaseUnit"
            />
          </div>
          <div class="flex flex-col gap-1 w-32">
            <label class="text-xs text-text-tertiary font-medium">{{ t('abastecimiento.glossary.quantityBaseUnit', { unit: baseUnit }) }}</label>
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
              {{ t('abastecimiento.glossary.unitPackageHint', { name: newUnit.purchase_unit_label, quantity: newUnit.conversion_factor, unit: baseUnit }) }}
            </template>
            <template v-else>
              {{ t('abastecimiento.glossary.emptyUnitHint') }}
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
import type { DraftPurchaseUnit, PurchaseUnitSuggestion } from '@/composables/useIngredientPurchaseUnitsDraft'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

const { t } = useI18n({ useScope: 'global' })

const CONVERSION_PRECISION = 6

const props = withDefaults(defineProps<{
  mode: 'create' | 'edit'
  baseUnit: string
  ingredientId?: string
  pendingSuggestions?: PurchaseUnitSuggestion[]
}>(), {
  ingredientId: '',
  pendingSuggestions: () => [],
})

const draftUnits = defineModel<DraftPurchaseUnit[]>('draftUnits', { default: () => [] })

const namePlaceholder = computed(() => {
  return t('abastecimiento.glossary.packageNamePlaceholder')
})

const factorPlaceholder = computed(() => t('abastecimiento.glossary.unitFactorPlaceholder'))

const emptyAddHint = computed(() => {
  return t('abastecimiento.glossary.emptyUnitHint')
})

const inputClass = 'h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const existingUnits = ref<any[]>([])
const loading = ref(false)
const savingUnit = ref(false)
const deletingUnitId = ref<string | null>(null)
const formError = ref('')
const newUnit = ref({ purchase_unit_label: '', conversion_factor: null as number | null })

function formatConversionFactor(value: number | string | null | undefined) {
  return formatDomainQuantity(value, CONVERSION_PRECISION)
}

function slugifyPurchaseUnit(label: string) {
  return label.toLowerCase().replace(/\s+/g, '_')
}

function resetNewUnitForm() {
  newUnit.value = { purchase_unit_label: '', conversion_factor: null }
  formError.value = ''
}

function addDraftUnit() {
  formError.value = ''
  const label = newUnit.value.purchase_unit_label.trim()
  if (!label) {
    formError.value = t('abastecimiento.glossary.writeLabel')
    return
  }
  if (!newUnit.value.conversion_factor || newUnit.value.conversion_factor <= 0) {
    formError.value = t('abastecimiento.glossary.factorPositive')
    return
  }
  const units = [...draftUnits.value]
  units.push({
    purchase_unit_label: label,
    purchase_unit: slugifyPurchaseUnit(label),
    conversion_factor: newUnit.value.conversion_factor,
    is_default: units.length === 0,
  })
  draftUnits.value = units
  resetNewUnitForm()
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

async function addPurchaseUnit() {
  formError.value = ''
  const label = newUnit.value.purchase_unit_label.trim()
  if (!label) {
    formError.value = t('abastecimiento.glossary.writeLabel')
    return
  }
  if (!newUnit.value.conversion_factor || newUnit.value.conversion_factor <= 0) {
    formError.value = t('abastecimiento.glossary.factorPositive')
    return
  }
  if (!props.ingredientId) return

  savingUnit.value = true
  try {
    await $fetch('/api/suppliers/ingredient-purchase-units', {
      method: 'POST',
      body: {
        ingredient_id: props.ingredientId,
        purchase_unit_label: label,
        purchase_unit: slugifyPurchaseUnit(label),
        conversion_factor: newUnit.value.conversion_factor,
        is_default: existingUnits.value.length === 0,
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

async function setDefaultUnit(unitId: string) {
  try {
    await $fetch(`/api/suppliers/ingredient-purchase-units/${unitId}`, {
      method: 'PUT',
      body: { is_default: true },
    })
    await refreshPurchaseUnits()
  } catch { /* ignore */ }
}

async function deleteUnit(unitId: string) {
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
