<template>
  <div
    class="flex flex-col gap-4"
    :class="embedded
      ? ''
      : 'md:col-span-2 p-4 rounded-xl border border-border bg-surface-secondary/30'"
  >
    <div v-if="!embedded">
      <h4 class="text-sm font-semibold text-text-primary">Inventario</h4>
      <p class="text-xs text-text-secondary mt-1 leading-relaxed">
        Venta por pieza (<span class="font-mono">und</span>).
      </p>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-text-primary">Venta</span>
      <div
        class="h-10 flex items-center px-3 rounded-lg border border-border bg-surface-secondary/60 text-sm text-text-secondary select-none"
        aria-readonly="true"
      >
        Pieza (und)
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :for="weightInputId" class="text-sm font-medium text-text-primary">
        Equivalencia <span class="text-destructive">*</span>
      </label>
      <div class="flex gap-2">
        <div class="flex rounded-lg border border-border overflow-hidden flex-shrink-0" role="group" aria-label="Unidad de equivalencia">
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
        <input
          :id="weightInputId"
          v-model.number="unitWeightGr"
          type="number"
          min="0"
          step="0.1"
          :placeholder="`Ej. 400`"
          class="input-base flex-1 min-h-[44px] px-4 py-2"
          :class="showError ? 'border-destructive focus:ring-destructive' : ''"
          @input="emit('clear-error')"
        />
      </div>
      <p v-if="showError" role="alert" class="text-xs text-destructive">
        Indica cuántos {{ unitWeightUnit }} equivale 1 und.
      </p>
      <p v-else class="text-xs text-text-tertiary">
        1 venta = 1 und en inventario.
      </p>
    </div>

    <IngredientesIngredientPurchaseUnitsField
      v-if="!linkedIngredientId"
      v-model:draft-units="draftUnits"
      mode="create"
      base-unit="und"
    />
    <IngredientesIngredientPurchaseUnitsField
      v-else
      mode="edit"
      :ingredient-id="linkedIngredientId"
      base-unit="und"
      :pending-suggestions="undPurchaseUnitSuggestions"
    />
  </div>
</template>

<script setup lang="ts">
import {
  UND_PURCHASE_UNIT_SUGGESTIONS,
  defaultUndPurchaseUnitsDraft,
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

const undPurchaseUnitSuggestions = UND_PURCHASE_UNIT_SUGGESTIONS

const uid = useId()
const weightInputId = `resale-weight-${uid}`

const emit = defineEmits<{
  (e: 'clear-error'): void
}>()
</script>
