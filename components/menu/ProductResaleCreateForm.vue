<template>
  <div
    class="flex flex-col gap-4"
    :class="embedded
      ? ''
      : 'md:col-span-2 p-4 rounded-xl border border-border bg-surface-secondary/30'"
  >
    <div v-if="!embedded">
      <h4 class="text-sm font-semibold text-text-primary">{{ t('menu.productos.resaleInventory') }}</h4>
      <p class="text-xs text-text-secondary mt-1 leading-relaxed">
        {{ t('menu.productos.resaleModeDescription') }}
      </p>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-text-primary">{{ t('menu.productos.resaleSale') }}</span>
      <div
        class="h-10 flex items-center px-3 rounded-lg border border-border bg-surface-secondary/60 text-sm text-text-secondary select-none"
        aria-readonly="true"
      >
        {{ t('menu.productos.pieceUnit') }}
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :for="weightInputId" class="text-sm font-medium text-text-primary">
        {{ t('menu.productos.equivalence') }} <span class="text-destructive">*</span>
      </label>
      <div class="flex gap-2">
        <div class="flex rounded-lg border border-border overflow-hidden flex-shrink-0" role="group" :aria-label="t('menu.productos.equivalenceUnitAria')">
          <button
            type="button"
            class="min-h-[44px] px-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
            :class="unitWeightUnit === 'gr'
              ? 'bg-primary text-white'
              : 'bg-background text-text-tertiary hover:bg-surface-secondary'"
            :aria-pressed="unitWeightUnit === 'gr'"
            @click="unitWeightUnit = 'gr'"
          >
            gr
          </button>
          <button
            type="button"
            class="min-h-[44px] px-3 text-sm font-medium transition-colors border-l border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
            :class="unitWeightUnit === 'ml'
              ? 'bg-primary text-white'
              : 'bg-background text-text-tertiary hover:bg-surface-secondary'"
            :aria-pressed="unitWeightUnit === 'ml'"
            @click="unitWeightUnit = 'ml'"
          >
            ml
          </button>
        </div>
        <UiDecimalInput
          :id="weightInputId"
          v-model="unitWeightGr"
          :min="0"
          :precision="1"
          :placeholder="t('menu.productos.equivalenceExample')"
          :class="[
            'input-base flex-1 min-h-[44px] px-4 py-2',
            showError ? 'border-destructive focus:ring-destructive' : '',
          ]"
          @input="emit('clear-error')"
        />
      </div>
      <p v-if="showError" role="alert" class="text-xs text-destructive">
        {{ t('menu.productos.equivalenceError', { unit: unitWeightUnit }) }}
      </p>
      <p v-else class="text-xs text-text-tertiary">
        {{ t('menu.productos.oneSaleOneUnit') }}
      </p>
    </div>

    <IngredientesIngredientPurchaseUnitsField
      v-if="!linkedIngredientId"
      v-model:draft-units="draftUnits"
      mode="create"
      base-unit="und"
      :unit-weight-gr="unitWeightGr"
      :unit-weight-unit="unitWeightUnit"
    />
    <IngredientesIngredientPurchaseUnitsField
      v-else
      mode="edit"
      :ingredient-id="linkedIngredientId"
      base-unit="und"
      :unit-weight-gr="unitWeightGr"
      :unit-weight-unit="unitWeightUnit"
      :pending-suggestions="pendingPurchaseUnitSuggestions"
    />
  </div>
</template>

<script setup lang="ts">
import {
  UND_PURCHASE_UNIT_SUGGESTIONS,
  buildDualUnitPurchaseSuggestions,
  defaultUndPurchaseUnitsDraft,
  isDualUnitPurchaseConfig,
  type DraftPurchaseUnit,
} from '@/composables/useIngredientPurchaseUnitsDraft'

const unitWeightGr = defineModel<number | null>('unitWeightGr', { default: null })
const unitWeightUnit = defineModel<'gr' | 'ml'>('unitWeightUnit', { default: 'gr' })
const draftUnits = defineModel<DraftPurchaseUnit[]>('draftUnits', {
  default: () => defaultUndPurchaseUnitsDraft(),
})

const props = withDefaults(
  defineProps<{
    showError?: boolean
    linkedIngredientId?: string
    embedded?: boolean
  }>(),
  {
    showError: false,
    linkedIngredientId: '',
    embedded: false,
  },
)

const pendingPurchaseUnitSuggestions = computed(() => {
  if (isDualUnitPurchaseConfig('und', unitWeightGr.value, unitWeightUnit.value) && unitWeightGr.value) {
    return buildDualUnitPurchaseSuggestions(unitWeightUnit.value, unitWeightGr.value)
  }
  return UND_PURCHASE_UNIT_SUGGESTIONS
})

const uid = useId()
const weightInputId = `resale-weight-${uid}`

const emit = defineEmits<{
  (e: 'clear-error'): void
}>()

const { t } = useI18n({ useScope: 'global' })
</script>
