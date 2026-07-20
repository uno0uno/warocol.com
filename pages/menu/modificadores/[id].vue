<template>
  <div>
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="t('menu.modificadores.editBusy')"
      :hint="t('menu.modificadores.editBusyHint')"
      variant="glass"
      indicator="matrix"
    />

    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
          <UiFormSection :title="t('menu.modificadores.groupData')">
            <div class="space-y-4">
              <div>
                <label :for="productSearchInputId" class="block text-sm font-medium text-text-primary mb-1">
                  {{ t('menu.modificadores.productsRequired') }}
                </label>
                <UiProductMultiSelect
                  v-model="selectedProducts"
                  :input-id="productSearchInputId"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
                  {{ t('menu.modificadores.groupNameRequired') }}
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  :placeholder="t('menu.modificadores.groupNamePlaceholder')"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.modificadores.minSelectionRequired') }}
                  </label>
                  <input
                    v-model.number="form.min_qty"
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    class="input-base w-full px-4 py-2"
                  />
                  <p class="text-xs text-text-tertiary mt-1">{{ t('menu.modificadores.minSelectionHelp') }}</p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.modificadores.maxSelectionRequired') }}
                  </label>
                  <input
                    v-model.number="form.max_qty"
                    type="number"
                    required
                    min="1"
                    placeholder="1"
                    class="input-base w-full px-4 py-2"
                  />
                  <p class="text-xs text-text-tertiary mt-1">{{ t('menu.modificadores.maxSelectionHelp') }}</p>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
                  {{ t('menu.modificadores.displayOrder') }}
                </label>
                <input
                  v-model.number="form.sort_order"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="input-base w-full px-4 py-2"
                />
                <p class="text-xs text-text-tertiary mt-1">{{ t('menu.modificadores.displayOrderHelp') }}</p>
              </div>

              <div class="flex items-start gap-3">
                <input
                  v-model="form.is_required"
                  type="checkbox"
                  id="is_required"
                  class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <label for="is_required" class="text-sm font-medium text-text-primary cursor-pointer">
                    {{ t('menu.modificadores.requiredToggle') }}
                  </label>
                  <p class="text-xs text-text-tertiary mt-0.5">
                    {{ t('menu.modificadores.requiredHelp') }}
                  </p>
                </div>
              </div>
            </div>
          </UiFormSection>

          <UiFormSection :title="t('menu.modificadores.opciones')">
            <template #actions>
              <UiButton
                type="button"
                variant="default"
                size="sm"
                class="gap-1.5 bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
                @click="addModifier"
              >
                <Icon name="heroicons:plus" class="h-4 w-4 flex-shrink-0" />
                {{ t('menu.modificadores.addOption') }}
              </UiButton>
            </template>

            <MenuCatalogInlineCreateBusyOverlay
              :busy="inlineCatalogBusy"
              :label="inlineCatalogBusyLabel"
              :hint="inlineCatalogBusyHint"
            >
              <MenuIngredientProductHint class="mb-4" />

              <WarehouseCategoryIngredientSelector
                class="mb-4"
                :input-id="`modifier-edit-warehouse-category-bulk-${groupId}`"
                :existing-ingredient-ids="existingWarehouseIngredientIds"
                :unit-options="getIngredientUnitOptions"
                :loading-unit-ids="loadingUnits"
                exclude-resale
                @update:prepared-rows="onGroupWarehouseCategoryRows"
              />

              <div v-if="form.modifiers.length === 0" class="text-center py-10 text-text-secondary border border-dashed border-border rounded-lg">
                <Icon name="heroicons:tag" class="h-12 w-12 mx-auto mb-3 text-text-tertiary/50" />
                <p class="text-sm font-medium mb-0.5">{{ t('menu.modificadores.emptyOptions') }}</p>
                <p class="text-xs text-text-tertiary">{{ t('menu.modificadores.emptyOptionsHelp') }}</p>
              </div>

              <div v-else class="space-y-3">
                <MenuModifierOptionEditor
                  v-for="(modifier, index) in form.modifiers"
                  :key="index"
                  :modifier="modifier"
                  :index="index"
                  :recipe-bases="recipeBases"
                  :loading-units="loadingUnits"
                  :get-ingredient-unit-options="getIngredientUnitOptions"
                  :get-ingredient-by-id="getIngredientById"
                  @remove="removeModifier(index)"
                  @select-ingredient="(ing) => selectIngredient(modifier, ing)"
                  @create-ingredient="(name) => openCustomIngModal(name, index)"
                  @select-recipe-line="(lineIndex, ing) => selectRecipeLineIngredient(modifier, lineIndex, ing)"
                  @create-recipe-line="(lineIndex, name) => openCustomRecipeLineModal(name, index, lineIndex)"
                  @select-resale-ingredient="(ing) => onResaleIngredientLinked(modifier, ing)"
                />
              </div>
            </MenuCatalogInlineCreateBusyOverlay>
          </UiFormSection>
        </div>
      </div>

      <div class="xl:col-span-1 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">{{ t('menu.modificadores.groupSummary') }}</h3>

          <div class="space-y-3">
            <div class="flex justify-between text-sm gap-2">
              <span class="text-text-secondary">{{ t('menu.modificadores.groupSummaryLabel') }}</span>
              <span class="font-semibold text-text-primary text-end truncate">{{ form.name || '—' }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">{{ t('menu.modificadores.selectedProducts') }}</span>
              <span class="font-semibold text-text-primary">{{ getSelectedProductsText() }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">{{ t('menu.modificadores.optionCount') }}</span>
              <span class="font-semibold text-text-primary">{{ form.modifiers.length }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">{{ t('menu.modificadores.selection') }}</span>
              <span class="font-semibold text-text-primary">{{ form.min_qty }} – {{ form.max_qty }}</span>
            </div>

            <div class="flex justify-between text-sm items-center gap-2">
              <span class="text-text-secondary">Tipo:</span>
              <UiStatusBadge
                :value="form.is_required ? t('menu.modificadores.required') : t('menu.modificadores.optional')"
                format="text"
                :variant="form.is_required ? 'warning' : 'secondary'"
                size="sm"
              />
            </div>
          </div>

          <div class="mt-6 pt-6 border-t border-border space-y-3">
            <p v-if="submitError" role="alert" class="text-sm text-destructive">{{ submitError }}</p>

            <UiButton
              type="submit"
              variant="default"
              size="lg"
              class="w-full bg-shell-cta-bg text-shell-cta-text hover:bg-shell-cta-hover-bg focus-visible:ring-shell-cta-focus-ring"
              :disabled="isSubmitting"
            >
              <Icon v-if="!isSubmitting" name="heroicons:check" class="h-5 w-5 me-2" />
              <Icon v-else name="heroicons:arrow-path" class="h-5 w-5 me-2 animate-spin" />
              {{ isSubmitting ? t('menu.modificadores.saveBusy') : t('menu.modificadores.saveGroup') }}
            </UiButton>

            <UiButton
              type="button"
              variant="default"
              size="default"
              class="w-full bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
              :disabled="isSubmitting"
              @click="cancel"
            >
              {{ t('menu.modificadores.cancel') }}
            </UiButton>
          </div>
        </div>
      </div>
    </form>

    <MenuInlineCatalogCreateShell
      ref="inlineCreateShell"
      v-model:busy="inlineCatalogBusy"
      v-model:busy-label="inlineCatalogBusyLabel"
      v-model:busy-hint="inlineCatalogBusyHint"
      context="modifier"
      :on-ingredient-saved="onCustomIngredientCreated"
      :on-product-saved="onInlineProductCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useMenuIngredientsQuery } from '@/composables/queries/useMenuIngredients'
import {
  appendWarehouseModifiersFromCategory,
  createEmptyModifier,
  mapModifierFromApi,
  serializeModifierForApi,
  validateModifierOption,
  getRecipeBaseIngredientIds,
  type ModifierFormRow,
} from '~/composables/useModifierOptionForm'
import type { PreparedWarehouseCategoryIngredient } from '~/composables/useWarehouseCategoryIngredientSelector'
import WarehouseCategoryIngredientSelector from '~/components/ingredientes/WarehouseCategoryIngredientSelector.vue'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
  module: 'menu',
})

const { t } = useI18n({ useScope: 'global' })

useHead({ title: () => t('menu.head.modificadores') })

const router = useRouter()
const route = useRoute()
const toast = useToast()
const cache = useQueryCache()
const { currentTenant } = useTenantReactive()

const isSubmitting = ref(false)
const submitError = ref('')
const productSearchInputId = 'modifier-edit-product-search'
const selectedProducts = ref<{ id: string; name: string }[]>([])

const form = ref({
  product_ids: [] as string[],
  name: '',
  min_qty: 0,
  max_qty: 1,
  is_required: false,
  sort_order: 0,
  modifiers: [] as ModifierFormRow[],
  tenant_id: currentTenant.value?.id || ''
})

const { data: recipeBasesData } = useAsyncData(
  `recipe-bases-modifiers-edit-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/recipe-bases', {
    query: { limit: 250, is_active: true, include_ingredients: true },
  }),
  { server: false, watch: [currentTenant], default: () => ({ data: [] }) },
)

const recipeBases = computed(() => recipeBasesData.value?.data || [])

const groupId = route.params.id as string

const { data: groupData, pending: isLoadingGroup, refresh: refreshGroup } = useAsyncData(
  `modifier-group-${groupId}`,
  () => $fetch(`/api/menu/modifier-groups/${groupId}`),
  {
    server: false
  }
)

const { availableIngredients } = useMenuIngredientsQuery()

const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnits = ref<Set<string>>(new Set())

const { getIngredientUnitOptions: buildUnitOptions, defaultUnitForIngredient, mergeIngredientUnitFields, rehydrateIngredientCaches } = useIngredientUnitOptions()

function getIngredientUnitOptions(ingredientId: string | null) {
  return buildUnitOptions(ingredientId || '', {
    ingredientCache: ingredientCache.value,
    purchaseUnitsCache: purchaseUnitsCache.value,
  })
}

function cacheIngredientForUnits(ing: any) {
  const catalogRow = availableIngredients.value.find((i: any) => i.id === ing.id)
  ingredientCache.value[ing.id] = mergeIngredientUnitFields(ing, catalogRow)
}

function rehydrateModifierIngredientCaches() {
  if (!availableIngredients.value.length) return
  for (const m of form.value.modifiers) {
    if (!m.ingredient_id) continue
    const catalogRow = availableIngredients.value.find((i: any) => i.id === m.ingredient_id)
    if (!m.ingredient_name && catalogRow?.name) {
      m.ingredient_name = catalogRow.name
    }
    for (const line of m.recipe_lines) {
      const recipeCatalogRow = availableIngredients.value.find((i: any) => i.id === line.ingredient_id)
      if (!line.ingredient_name && recipeCatalogRow?.name) {
        line.ingredient_name = recipeCatalogRow.name
      }
    }
  }
  const entries = form.value.modifiers
    .flatMap(m => [
      ...(m.ingredient_id ? [{
      id: m.ingredient_id!,
      name: m.ingredient_name || ingredientCache.value[m.ingredient_id!]?.name,
      unit: ingredientCache.value[m.ingredient_id!]?.unit ?? m.ingredient_unit ?? undefined,
      ...ingredientCache.value[m.ingredient_id!],
      }] : []),
      ...m.recipe_lines.map(line => ({
        id: line.ingredient_id,
        name: line.ingredient_name,
        unit: line.unit ?? undefined,
        ...ingredientCache.value[line.ingredient_id],
      })),
    ])
  rehydrateIngredientCaches(entries, availableIngredients.value, ingredientCache.value)
}

function getIngredientById(id: string) {
  return ingredientCache.value[id]
}

async function loadPurchaseUnits(ingredientId: string) {
  if (!ingredientId || purchaseUnitsCache.value.has(ingredientId)) return
  loadingUnits.value = new Set([...loadingUnits.value, ingredientId])
  try {
    const res = await $fetch<any>(`/api/suppliers/ingredient-purchase-units/ingredient/${ingredientId}`)
    const updated = new Map(purchaseUnitsCache.value)
    updated.set(ingredientId, res.data || [])
    purchaseUnitsCache.value = updated
  } catch {
    const updated = new Map(purchaseUnitsCache.value)
    updated.set(ingredientId, [])
    purchaseUnitsCache.value = updated
  } finally {
    const next = new Set(loadingUnits.value)
    next.delete(ingredientId)
    loadingUnits.value = next
  }
}

function selectIngredient(modifier: ModifierFormRow, ing: any) {
  modifier.option_type = 'INGREDIENT'
  modifier.ingredient_mode = 'warehouse'
  modifier.ingredient_id = ing.id
  modifier.name = ing.name
  modifier.ingredient_name = ing.name
  modifier.unit_cost = null
  cacheIngredientForUnits(ing)
  modifier.ingredient_unit = defaultUnitForIngredient(ingredientCache.value[ing.id])
  loadPurchaseUnits(ing.id)
}

const existingWarehouseIngredientIds = computed(() =>
  form.value.modifiers
    .filter(m => m.option_type === 'INGREDIENT' && m.ingredient_mode === 'warehouse' && m.ingredient_id)
    .map(m => m.ingredient_id as string),
)

function onGroupWarehouseCategoryRows(rows: PreparedWarehouseCategoryIngredient[]) {
  form.value.modifiers = appendWarehouseModifiersFromCategory(form.value.modifiers, rows)
  for (const row of rows) {
    cacheIngredientForUnits({
      id: row.ingredient_id,
      name: row.name,
      unit: ingredientCache.value[row.ingredient_id]?.unit || row.unit || undefined,
    })
    void loadPurchaseUnits(row.ingredient_id)
  }
}

function onResaleIngredientLinked(modifier: ModifierFormRow, ing: Record<string, unknown>) {
  cacheIngredientForUnits(ing)
  modifier.ingredient_unit = defaultUnitForIngredient(ingredientCache.value[String(ing.id)])
  if (modifier.ingredient_quantity == null || modifier.ingredient_quantity <= 0) {
    modifier.ingredient_quantity = 1
  }
  void loadPurchaseUnits(String(ing.id))
}

function selectRecipeLineIngredient(modifier: ModifierFormRow, lineIndex: number, ing: any) {
  const line = modifier.recipe_lines[lineIndex]
  if (!line) return
  line.ingredient_id = ing.id
  line.ingredient_name = ing.name
  cacheIngredientForUnits(ing)
  line.unit = defaultUnitForIngredient(ingredientCache.value[ing.id])
  void loadPurchaseUnits(ing.id)
}

const inlineCreateShell = ref<{ openFromSearch: (name: string) => void } | null>(null)
const customIngModalModIndex = ref(-1)
const customIngModalRecipeLineIndex = ref(-1)
const inlineCatalogBusy = ref(false)
const inlineCatalogBusyLabel = ref('')
const inlineCatalogBusyHint = ref('')

function openCustomIngModal(name: string, index: number) {
  customIngModalModIndex.value = index
  customIngModalRecipeLineIndex.value = -1
  inlineCreateShell.value?.openFromSearch(name)
}

function openCustomRecipeLineModal(name: string, modifierIndex: number, lineIndex: number) {
  customIngModalModIndex.value = modifierIndex
  customIngModalRecipeLineIndex.value = lineIndex
  inlineCreateShell.value?.openFromSearch(name)
}

function onCustomIngredientCreated(ingredient: any) {
  const index = customIngModalModIndex.value
  if (index < 0 || index >= form.value.modifiers.length) return
  const modifier = form.value.modifiers[index]
  if (customIngModalRecipeLineIndex.value >= 0) {
    selectRecipeLineIngredient(modifier, customIngModalRecipeLineIndex.value, ingredient)
  } else {
    selectIngredient(modifier, ingredient)
  }
  customIngModalModIndex.value = -1
  customIngModalRecipeLineIndex.value = -1
}

const { linkCreatedProductToRow } = useInlineCatalogProductLink()

async function onInlineProductCreated(product: Record<string, unknown>) {
  const index = customIngModalModIndex.value
  if (index < 0 || index >= form.value.modifiers.length) return
  await linkCreatedProductToRow(product, async (ingredient) => {
    const modifier = form.value.modifiers[index]
    if (customIngModalRecipeLineIndex.value >= 0) {
      selectRecipeLineIngredient(modifier, customIngModalRecipeLineIndex.value, ingredient)
    } else {
      selectIngredient(modifier, ingredient)
    }
    customIngModalModIndex.value = -1
    customIngModalRecipeLineIndex.value = -1
  })
}

const isLoadingData = computed(() => isLoadingGroup.value)

watch(selectedProducts, (list) => {
  form.value.product_ids = list.map((p) => p.id)
}, { deep: true })

watch(groupData, (data) => {
  if (data?.data) {
    const group = data.data
    form.value = {
      product_ids: group.products?.map((p: any) => p.id) || [],
      name: group.name,
      min_qty: group.min_qty,
      max_qty: group.max_qty,
      is_required: group.is_required,
      sort_order: group.sort_order,
      modifiers: group.modifiers.map((m: any) => {
        const row = mapModifierFromApi(m)
        if (row.ingredient_id && m.ingredient) {
          cacheIngredientForUnits({
            id: row.ingredient_id,
            name: m.ingredient.name,
            unit: m.ingredient.unit,
            costo_unitario: m.ingredient.costo_unitario,
          })
          loadPurchaseUnits(row.ingredient_id)
        }
        for (const line of row.recipe_lines) {
          const sourceLine = Array.isArray(m.recipe_lines)
            ? m.recipe_lines.find((candidate: any) => candidate.ingredient_id === line.ingredient_id)
            : null
          cacheIngredientForUnits({
            id: line.ingredient_id,
            name: line.ingredient_name,
            unit: line.unit,
            ...(sourceLine?.ingredient || {}),
          })
          loadPurchaseUnits(line.ingredient_id)
        }
        return row
      }),
      tenant_id: currentTenant.value?.id || ''
    }
    selectedProducts.value = (group.products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
    }))
  }
}, { immediate: true })

watch(availableIngredients, (list) => {
  if (list.length && form.value.modifiers.some(m => m.ingredient_id || m.recipe_lines.length)) {
    rehydrateModifierIngredientCaches()
  }
})

function getSelectedProductsText() {
  if (selectedProducts.value.length === 0) return t('menu.modificadores.none')
  if (selectedProducts.value.length === 1) {
    return selectedProducts.value[0].name
  }
  return t('menu.modificadores.productsCount', { count: selectedProducts.value.length })
}

function addModifier() {
  form.value.modifiers.push(createEmptyModifier(form.value.modifiers.length))
}

function removeModifier(index: number) {
  form.value.modifiers.splice(index, 1)
}

function validateForm(): boolean {
  submitError.value = ''

  if (selectedProducts.value.length === 0) {
    submitError.value = t('menu.modificadores.selectProductError')
    return false
  }

  if (!form.value.name.trim()) {
    submitError.value = t('menu.modificadores.nameRequiredError')
    return false
  }

  if (form.value.max_qty < form.value.min_qty) {
    submitError.value = t('menu.modificadores.maxMinError')
    return false
  }

  if (form.value.modifiers.length === 0) {
    submitError.value = t('menu.modificadores.optionRequiredError')
    return false
  }

  for (const m of form.value.modifiers) {
    if (m.option_type === 'RECIPE') {
      const unitError = validateMenuCompositionRows(
        [...m.recipe_lines, ...m.prepared_recipe_lines],
        ingredientId => getIngredientUnitOptions(ingredientId).map(option => option.value),
      )
      if (unitError === 'incompatible-unit') {
        submitError.value = t('menu.common.incompatibleUnitError')
        return false
      }
    }
    const err = validateModifierOption(m, {
      recipeBaseIngredientIds: getRecipeBaseIngredientIds(m.recipe_base_type_id, recipeBases.value),
    })
    if (err) {
      submitError.value = err
      return false
    }
  }

  return true
}

async function handleSubmit() {
  if (isSubmitting.value) return
  if (!validateForm()) return

  isSubmitting.value = true
  submitError.value = ''

  try {
    form.value.tenant_id = currentTenant.value?.id || ''

    await $fetch(`/api/menu/modifier-groups/${groupId}`, {
      method: 'PUT',
      body: {
        ...form.value,
        modifiers: form.value.modifiers.map(serializeModifierForApi),
      },
    })

    cache.invalidateQueries()
    await refreshGroup()
    toast.success(t('menu.modificadores.updatedSuccess'), { title: t('menu.modificadores.saved') })
  } catch (error: any) {
    console.error('Error updating modifier group:', error)
    submitError.value = error.data?.detail || error.message || t('menu.modificadores.updateError')
  } finally {
    isSubmitting.value = false
  }
}

function cancel() {
  router.push('/menu/modificadores')
}

</script>

<style scoped>
.input-base {
  @apply border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface;
}
</style>
