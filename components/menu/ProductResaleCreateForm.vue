<template>
  <div class="md:col-span-2 flex flex-col gap-4 p-4 rounded-xl border border-border bg-surface-secondary/30">
    <div>
      <h4 class="text-sm font-semibold text-text-primary">Stock de reventa</h4>
      <p class="text-xs text-text-secondary mt-1">
        Se vende por pieza (<span class="font-mono">und</span>). El sistema crea el insumo de abastecimiento y lo vincula al producto.
      </p>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-medium text-text-primary">Unidad de venta</span>
      <div
        class="h-10 flex items-center px-3 rounded-lg border border-border bg-surface-secondary/60 text-sm text-text-secondary select-none"
        aria-readonly="true"
      >
        Pieza (und)
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <label :for="weightInputId" class="text-sm font-medium text-text-primary">
        {{ unitWeightUnit }} por unidad
        <span class="text-destructive">*</span>
        <span class="text-xs text-text-tertiary font-normal">— equivalencia para inventario</span>
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
          :placeholder="`Ej: 400 (1 und = 400 ${unitWeightUnit})`"
          class="input-base flex-1 min-h-[44px] px-4 py-2"
          :class="showError ? 'border-destructive focus:ring-destructive' : ''"
          @input="emit('clear-error')"
        />
      </div>
      <p v-if="showError" role="alert" class="text-xs text-destructive">
        Indica cuántos {{ unitWeightUnit }} equivale cada unidad vendida.
      </p>
      <p v-else class="text-xs text-text-tertiary">
        Ejemplo: una gaseosa de 400 ml → 400 ml por unidad. Cada venta descuenta 1 und del inventario.
      </p>
    </div>

    <IngredientesIngredientPurchaseUnitsField
      v-if="draftUnits != null"
      v-model:draft-units="draftUnits"
      mode="create"
      base-unit="und"
    />
    <IngredientesIngredientPurchaseUnitsField
      v-else-if="linkedIngredientId"
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
  type DraftPurchaseUnit,
} from '@/composables/useIngredientPurchaseUnitsDraft'

const unitWeightGr = defineModel<number | null>('unitWeightGr', { default: null })
const unitWeightUnit = defineModel<'gr' | 'ml'>('unitWeightUnit', { default: 'gr' })
const draftUnits = defineModel<DraftPurchaseUnit[]>('draftUnits')

const props = withDefaults(
  defineProps<{
    showError?: boolean
    linkedIngredientId?: string
  }>(),
  {
    showError: false,
    linkedIngredientId: '',
  },
)

const undPurchaseUnitSuggestions = UND_PURCHASE_UNIT_SUGGESTIONS

const uid = useId()
const weightInputId = `resale-weight-${uid}`

const emit = defineEmits<{
  (e: 'clear-error'): void
}>()
</script>
