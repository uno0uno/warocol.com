<template>
  <div class="border border-border rounded-lg p-3 sm:p-4 bg-background space-y-3">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
      <div class="md:col-span-3">
        <label class="block text-xs font-medium text-text-secondary mb-1">Tipo *</label>
        <select
          :value="modifier.option_type"
          class="input-base w-full px-3 py-2 text-sm"
          @change="onTypeChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="INGREDIENT">Ingrediente / reventa</option>
          <option value="RECIPE">Receta base</option>
          <option value="PRODUCT">Producto del menú</option>
          <option value="NONE">Solo precio</option>
        </select>
      </div>

      <div class="md:col-span-3">
        <label class="block text-xs font-medium text-text-secondary mb-1">Nombre *</label>
        <input
          v-model="modifier.name"
          type="text"
          placeholder="Nombre en caja"
          class="input-base w-full px-3 py-2 text-sm"
        />
      </div>

      <div class="md:col-span-2">
        <label class="block text-xs font-medium text-text-secondary mb-1">Precio venta</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
          <input
            v-model.number="modifier.price"
            type="number"
            step="100"
            class="input-base w-full pl-8 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <div class="md:col-span-1">
        <label class="block text-xs font-medium text-text-secondary mb-1">Máx</label>
        <input
          v-model.number="modifier.max_limit"
          type="number"
          min="1"
          class="input-base w-full px-3 py-2 text-sm"
        />
      </div>

      <div class="md:col-span-1">
        <label class="block text-xs font-medium text-text-secondary mb-1">Orden</label>
        <input
          v-model.number="modifier.sort_order"
          type="number"
          min="0"
          class="input-base w-full px-3 py-2 text-sm"
        />
      </div>

      <div class="md:col-span-2 flex items-end justify-end">
        <button
          type="button"
          class="flex items-center justify-center w-full h-[38px] text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
          title="Eliminar opción"
          @click="$emit('remove')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="modifier.option_type === 'INGREDIENT'" class="grid grid-cols-1 md:grid-cols-12 gap-3">
      <div class="md:col-span-5">
        <label class="block text-xs font-medium text-text-secondary mb-1">Ingrediente o reventa *</label>
        <UiIngredientSearchInput
          :allow-create="true"
          @select="(ing) => $emit('select-ingredient', ing)"
          @create="(name) => $emit('create-ingredient', name)"
        />
        <p v-if="modifier.ingredient_id" class="text-xs text-text-secondary mt-1">
          {{ modifier.ingredient_name || 'Seleccionado' }}
        </p>
      </div>
      <div class="md:col-span-2">
        <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad</label>
        <input
          v-model.number="modifier.ingredient_quantity"
          type="number"
          min="0.01"
          step="any"
          class="input-base w-full px-3 py-2 text-sm"
        />
      </div>
      <div class="md:col-span-3">
        <label class="block text-xs font-medium text-text-secondary mb-1">Unidad</label>
        <select
          v-model="modifier.ingredient_unit"
          :disabled="modifier.ingredient_id && loadingUnits.has(modifier.ingredient_id)"
          class="input-base w-full py-2 px-3 text-sm disabled:opacity-50"
        >
          <option
            v-for="opt in getIngredientUnitOptions(modifier.ingredient_id)"
            :key="opt.value"
            :value="opt.value"
          >{{ opt.label }}</option>
        </select>
      </div>
      <div class="md:col-span-2 flex items-end">
        <p class="text-xs text-text-secondary pb-2">Costo unit.: {{ ingredientCostLabel }}</p>
      </div>
    </div>

    <div v-else-if="modifier.option_type === 'RECIPE'" class="space-y-2">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div class="md:col-span-6">
          <label class="block text-xs font-medium text-text-secondary mb-1">Receta base *</label>
          <select
            v-model="modifier.recipe_base_type_id"
            class="input-base w-full px-3 py-2 text-sm"
            @change="onRecipeBaseChange"
          >
            <option value="">Elegir receta…</option>
            <option v-for="recipe in recipeBases" :key="recipe.id" :value="recipe.id">
              {{ recipe.name }}
            </option>
          </select>
        </div>
        <div class="md:col-span-3">
          <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad × receta</label>
          <input
            v-model.number="modifier.recipe_base_quantity"
            type="number"
            min="0.01"
            step="any"
            class="input-base w-full px-3 py-2 text-sm"
          />
        </div>
        <div class="md:col-span-3 flex items-end">
          <p class="text-xs text-text-secondary pb-2">Costo unit.: {{ recipeCostLabel }}</p>
        </div>
      </div>
      <div
        v-if="modifier.recipe_base_type_id && recipeBaseIngredients.length > 0"
        class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
      >
        <div class="text-xs space-y-1">
          <div
            v-for="ing in recipeBaseIngredients"
            :key="ing.id || ing.ingredient_id"
            class="flex justify-between text-text-secondary"
          >
            <span>{{ ing.ingredient_name || ing.name }}</span>
            <span>{{ scaledRecipeQty(ing) }} {{ ing.unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="modifier.option_type === 'PRODUCT'" class="grid grid-cols-1 md:grid-cols-12 gap-3">
      <div class="md:col-span-6">
        <label class="block text-xs font-medium text-text-secondary mb-1">Producto del menú *</label>
        <UiProductSearchInput
          :input-id="`modifier-option-product-${index}`"
          include-all-types
          @select="onProductSelect"
        />
        <p v-if="modifier.linked_product_id" class="text-xs text-text-secondary mt-1">
          {{ modifier.linked_product_name }}
        </p>
      </div>
      <div class="md:col-span-3">
        <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad × producto</label>
        <input
          v-model.number="modifier.linked_product_quantity"
          type="number"
          min="0.01"
          step="any"
          class="input-base w-full px-3 py-2 text-sm"
        />
      </div>
      <div class="md:col-span-3 flex items-end">
        <p class="text-xs text-text-secondary pb-2">Costo unit.: {{ productCostLabel }}</p>
      </div>
    </div>

    <p v-else-if="modifier.option_type === 'NONE'" class="text-xs text-text-tertiary">
      Opción sin composición de inventario; solo aplica el precio de venta.
    </p>

    <div class="flex flex-wrap gap-4 text-sm">
      <label class="flex items-center gap-2 cursor-pointer">
        <input v-model="modifier.is_default" type="checkbox" class="w-4 h-4 text-primary border-border rounded focus:ring-primary" />
        <span class="text-text-secondary">Por defecto</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer">
        <input v-model="modifier.is_available" type="checkbox" class="w-4 h-4 text-primary border-border rounded focus:ring-primary" />
        <span class="text-text-secondary">Disponible</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProductRow } from '~/composables/useProductSearch'
import {
  formatModifierCurrency,
  resetModifierFieldsForType,
  type ModifierFormRow,
  type ModifierOptionType,
} from '~/composables/useModifierOptionForm'

const props = defineProps<{
  modifier: ModifierFormRow
  index: number
  recipeBases: Array<Record<string, unknown>>
  loadingUnits: Set<string>
  getIngredientUnitOptions: (id: string | null) => Array<{ value: string; label: string }>
  getIngredientById: (id: string) => Record<string, unknown> | undefined
}>()

defineEmits<{
  remove: []
  'select-ingredient': [ingredient: Record<string, unknown>]
  'create-ingredient': [name: string]
}>()

function onTypeChange(raw: string) {
  resetModifierFieldsForType(props.modifier, raw.toUpperCase() as ModifierOptionType)
}

function onRecipeBaseChange() {
  if (!props.modifier.recipe_base_type_id) {
    props.modifier.recipe_base_type_id = null
    props.modifier.recipe_base_name = null
    props.modifier.unit_cost = null
    return
  }
  const recipe = props.recipeBases.find((r) => r.id === props.modifier.recipe_base_type_id)
  props.modifier.recipe_base_name = recipe ? String(recipe.name) : null
  if (recipe && !props.modifier.name.trim()) {
    props.modifier.name = String(recipe.name)
  }
  props.modifier.unit_cost = null
}

function onProductSelect(product: ProductRow) {
  props.modifier.linked_product_id = product.id
  props.modifier.linked_product_name = product.name
  if (!props.modifier.name.trim()) {
    props.modifier.name = product.name
  }
  props.modifier.unit_cost = null
}

const selectedRecipeBase = computed(() =>
  props.recipeBases.find((r) => r.id === props.modifier.recipe_base_type_id),
)

const recipeBaseIngredients = computed(() => {
  const ingredients = selectedRecipeBase.value?.ingredients
  return Array.isArray(ingredients) ? ingredients : []
})

function scaledRecipeQty(ing: Record<string, unknown>) {
  const mult = Number(props.modifier.recipe_base_quantity) || 1
  return (Number(ing.base_quantity ?? ing.quantity ?? 0) * mult).toFixed(2)
}

function estimateRecipeCost(): number | null {
  if (!props.modifier.recipe_base_type_id) return null
  let total = 0
  let hasLine = false
  for (const ing of recipeBaseIngredients.value) {
    const qty = Number(ing.base_quantity ?? ing.quantity ?? 0) * (Number(props.modifier.recipe_base_quantity) || 1)
    const unitCost = Number(ing.costo_unitario ?? ing.unit_cost ?? 0)
    if (qty > 0) hasLine = true
    total += qty * unitCost
  }
  return hasLine ? total : null
}

const ingredientCostLabel = computed(() => {
  if (props.modifier.unit_cost != null) return formatModifierCurrency(props.modifier.unit_cost)
  const ing = props.modifier.ingredient_id
    ? props.getIngredientById(props.modifier.ingredient_id)
    : undefined
  const unit = Number(ing?.costo_unitario ?? 0)
  const qty = Number(props.modifier.ingredient_quantity) || 0
  if (!unit || !qty) return '—'
  return formatModifierCurrency(unit * qty)
})

const recipeCostLabel = computed(() => {
  if (props.modifier.unit_cost != null) return formatModifierCurrency(props.modifier.unit_cost)
  const est = estimateRecipeCost()
  return est != null ? formatModifierCurrency(est) : '—'
})

const productCostLabel = computed(() => {
  if (props.modifier.unit_cost != null) return formatModifierCurrency(props.modifier.unit_cost)
  return '—'
})
</script>

<style scoped>
.input-base {
  @apply border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface;
}
</style>
