<template>
  <div>
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="t('menu.modificadores.createBusy')"
      :hint="t('menu.modificadores.createBusyHint')"
      variant="glass"
      indicator="matrix"
    />

    <div class="space-y-6">
      <form @submit.prevent="submitGroup" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
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
                    type="text"
                    v-model="form.name"
                    :placeholder="t('menu.modificadores.groupNamePlaceholder')"
                    class="input-base w-full px-4 py-2"
                    :class="nameError ? 'border-destructive focus:ring-destructive' : ''"
                    required
                    @input="nameError = ''"
                  />
                  <p v-if="nameError" role="alert" class="text-xs text-destructive mt-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    {{ nameError }}
                  </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.modificadores.minSelectionRequired') }}
                    </label>
                    <input
                      type="number"
                      v-model.number="form.min_qty"
                      placeholder="0"
                      min="0"
                      class="input-base w-full px-4 py-2"
                      required
                    />
                    <p class="text-xs text-text-tertiary mt-1">{{ t('menu.modificadores.minSelectionHelp') }}</p>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.modificadores.maxSelectionRequired') }}
                    </label>
                    <input
                      type="number"
                      v-model.number="form.max_qty"
                      placeholder="1"
                      min="1"
                      class="input-base w-full px-4 py-2"
                      required
                    />
                    <p class="text-xs text-text-tertiary mt-1">{{ t('menu.modificadores.maxSelectionHelp') }}</p>
                    <p class="text-xs text-text-tertiary mt-1">{{ t('menu.modificadores.groupSelectionVsOptionHelp') }}</p>
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.modificadores.displayOrder') }} <span class="text-text-tertiary font-normal">{{ t('menu.modificadores.optionalLabel') }}</span>
                  </label>
                  <input
                    type="number"
                    v-model.number="form.sort_order"
                    placeholder="0"
                    min="0"
                    class="input-base w-full px-4 py-2"
                  />
                  <p class="text-xs text-text-tertiary mt-1">{{ t('menu.modificadores.displayOrderHelp') }}</p>
                </div>

                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    v-model="form.is_required"
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
                <button
                  type="button"
                  @click="addModifier"
                  class="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-shell-icon-bg px-3 py-1.5 text-sm font-medium text-shell-icon-text transition-all hover:bg-shell-icon-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
                >
                  <Icon name="heroicons:plus" class="h-4 w-4 flex-shrink-0" />
                  {{ t('menu.modificadores.addOption') }}
                </button>
              </template>

              <MenuCatalogInlineCreateBusyOverlay
                :busy="inlineCatalogBusy"
                :label="inlineCatalogBusyLabel"
                :hint="inlineCatalogBusyHint"
              >
                <MenuIngredientProductHint class="mb-4" />

                <WarehouseCategoryIngredientSelector
                  ref="warehouseCategorySelectorRef"
                  class="mb-4"
                  input-id="modifier-create-warehouse-category-bulk"
                  :existing-ingredient-ids="existingWarehouseIngredientIds"
                  :unit-options="getIngredientUnitOptions"
                  :loading-unit-ids="loadingUnits"
                  hide-prepared-ingredient-rows
                  exclude-resale
                  @update:prepared-rows="onGroupWarehouseCategoryRows"
                />

                <div v-if="form.modifiers.length === 0" class="text-center py-10 text-text-secondary border border-dashed border-border rounded-lg">
                  <svg class="w-12 h-12 mx-auto mb-3 text-text-tertiary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
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
                <span class="text-text-secondary">{{ t('menu.modificadores.nameLabel') }}</span>
                <span class="font-semibold text-text-primary text-end truncate">{{ form.name || '—' }}</span>
              </div>

              <div class="flex justify-between text-sm items-center gap-2">
                <span class="text-text-secondary">{{ t('menu.modificadores.type') }}:</span>
                <UiStatusBadge
                  :value="form.is_required ? t('menu.modificadores.required') : t('menu.modificadores.optional')"
                  format="text"
                  :variant="form.is_required ? 'warning' : 'secondary'"
                  size="sm"
                />
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ t('menu.modificadores.selection') }}</span>
                <span class="font-semibold text-text-primary">{{ form.min_qty }} – {{ form.max_qty }} {{ t('menu.modificadores.optionsCount') }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ t('menu.modificadores.selectedProducts') }}</span>
                <span class="font-semibold text-text-primary">{{ selectedProducts.length }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ t('menu.modificadores.totalOptions') }}</span>
                <span class="font-semibold text-text-primary">{{ form.modifiers.length }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ t('menu.modificadores.withComposition') }}</span>
                <span class="font-semibold text-text-primary">{{ form.modifiers.filter(m => m.option_type !== 'NONE').length }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ t('menu.modificadores.withAdditionalCost') }}</span>
                <span class="font-semibold text-text-primary">{{ form.modifiers.filter(m => m.price > 0).length }}</span>
              </div>
            </div>

            <div class="mt-6 pt-6 border-t border-border space-y-3">
              <p v-if="submitError" role="alert" class="text-sm text-destructive flex items-center gap-1">
                <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                {{ submitError }}
              </p>
              <UiButton
                type="submit"
                variant="default"
                size="lg"
                class="w-full bg-shell-cta-bg text-shell-cta-text hover:bg-shell-cta-hover-bg focus-visible:ring-shell-cta-focus-ring"
                :disabled="isSubmitting"
              >
                <Icon v-if="!isSubmitting" name="heroicons:check" class="h-5 w-5 me-2" />
                <UiLoadingDots v-else size="8px" color="currentColor" class="me-2" />
                {{ isSubmitting ? t('menu.modificadores.createBusyButton') : t('menu.modificadores.createGroup') }}
              </UiButton>

              <UiButton
                type="button"
                variant="default"
                size="default"
                class="w-full bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
                :disabled="isSubmitting"
                @click="router.push('/menu/modificadores')"
              >
                {{ t('menu.modificadores.cancel') }}
              </UiButton>
            </div>
          </div>
        </div>
      </form>
    </div>

    <MenuInlineCatalogCreateShell
      ref="inlineCreateShell"
      v-model:busy="inlineCatalogBusy"
      v-model:busy-label="inlineCatalogBusyLabel"
      v-model:busy-hint="inlineCatalogBusyHint"
      context="modifier"
      :on-ingredient-saved="onCustomIngredientCreated"
      :on-product-saved="onInlineProductCreated"
    />

    <UiConfirmActionModal
      v-model="quotaLimitModalOpen"
      :title="t('billing.upgrade.quotaBlocked')"
      :message="quotaLimitModalMessage"
      :confirm-label="t('nav.miPlan')"
      :cancel-label="t('billing.close')"
      @confirm="goToBillingFromQuotaLimitModal"
      @cancel="closeQuotaLimitModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import {
  createEmptyModifier,
  serializeModifierForApi,
  syncWarehouseModifiersFromCategory,
  validateModifierOption,
  getRecipeBaseIngredientIds,
  type ModifierFormRow,
} from '~/composables/useModifierOptionForm'
import type { PreparedWarehouseCategoryIngredient } from '~/composables/useWarehouseCategoryIngredientSelector'
import WarehouseCategoryIngredientSelector from '~/components/ingredientes/WarehouseCategoryIngredientSelector.vue'
import { fetchIngredientPurchaseUnitsBatch } from '~/composables/useIngredientPurchaseUnitsBatch'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
  module: 'menu',
})

const { t } = useI18n({ useScope: 'global' })

useHead({ title: () => t('menu.head.modificadores') })

const router = useRouter()
const { currentTenant } = useTenantReactive()
const {
  redirectIfModifiersCreateBlocked,
  handleAddModifierOption,
  quotaLimitModalOpen,
  quotaLimitModalMessage,
  closeQuotaLimitModal,
  goToBillingFromQuotaLimitModal,
} = useMenuCatalogQuotaGate()

onMounted(async () => {
  await redirectIfModifiersCreateBlocked('/menu/modificadores')
})

const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const nameError = ref('')
const productSearchInputId = 'modifier-create-product-search'
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
  `recipe-bases-modifiers-create-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/recipe-bases', {
    query: { limit: 250, is_active: true, include_ingredients: true },
  }),
  { server: false, watch: [currentTenant], default: () => ({ data: [] }) },
)

const recipeBases = computed(() => recipeBasesData.value?.data || [])

watch(selectedProducts, (list) => {
  form.value.product_ids = list.map((p) => p.id)
}, { deep: true })

function addModifier() {
  void handleAddModifierOption(form.value.modifiers.length, () => {
    form.value.modifiers.push(createEmptyModifier(form.value.modifiers.length))
  })
}

const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnits = ref<Set<string>>(new Set())

const { getIngredientUnitOptions: buildUnitOptions, defaultUnitForIngredient } = useIngredientUnitOptions()

function getIngredientUnitOptions(ingredientId: string | null) {
  return buildUnitOptions(ingredientId || '', {
    ingredientCache: ingredientCache.value,
    purchaseUnitsCache: purchaseUnitsCache.value,
  })
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
  modifier.ingredient_name = ing.name
  modifier.name = ing.name
  modifier.unit_cost = null
  ingredientCache.value[ing.id] = ing
  modifier.ingredient_unit = defaultUnitForIngredient(ingredientCache.value[ing.id])
  loadPurchaseUnits(ing.id)
}

const existingWarehouseIngredientIds = computed(() =>
  form.value.modifiers
    .filter(m => m.option_type === 'INGREDIENT' && m.ingredient_id)
    .map(m => m.ingredient_id as string),
)

function cachePreparedIngredient(row: PreparedWarehouseCategoryIngredient) {
  ingredientCache.value[row.ingredient_id] = {
    ...ingredientCache.value[row.ingredient_id],
    id: row.ingredient_id,
    name: row.name,
    unit: ingredientCache.value[row.ingredient_id]?.unit || row.unit,
  }
}

async function loadPurchaseUnitsBatchTolerant(ids: string[]) {
  await fetchIngredientPurchaseUnitsBatch(
    ids,
    { purchaseUnitsCache: purchaseUnitsCache.value, loadingUnits: loadingUnits.value },
    (ids, add) => {
      const next = new Set(loadingUnits.value)
      ids.forEach(id => add ? next.add(id) : next.delete(id))
      loadingUnits.value = next
    },
    (updater) => { purchaseUnitsCache.value = updater(purchaseUnitsCache.value) },
  )
}

function onGroupWarehouseCategoryRows(rows: PreparedWarehouseCategoryIngredient[]) {
  form.value.modifiers = syncWarehouseModifiersFromCategory(form.value.modifiers, rows)
  const batchIds: string[] = []
  for (const row of rows) {
    cachePreparedIngredient(row)
    if (row.ingredient_id && !purchaseUnitsCache.value.has(row.ingredient_id)) batchIds.push(row.ingredient_id)
  }
  if (batchIds.length) void loadPurchaseUnitsBatchTolerant(batchIds)
}

function onResaleIngredientLinked(modifier: ModifierFormRow, ing: Record<string, unknown>) {
  ingredientCache.value[String(ing.id)] = ing
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
  ingredientCache.value[ing.id] = ing
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

const warehouseCategorySelectorRef = ref<{ dismissPreparedIngredient: (id: string) => void } | null>(null)

function removeModifier(index: number) {
  const modifier = form.value.modifiers[index]
  if (modifier?.option_type === 'INGREDIENT' && modifier.ingredient_id) {
    warehouseCategorySelectorRef.value?.dismissPreparedIngredient(modifier.ingredient_id)
  }
  form.value.modifiers.splice(index, 1)
}

async function validateForm(): Promise<boolean> {
  submitError.value = null
  nameError.value = ''

  if (selectedProducts.value.length === 0) {
    submitError.value = t('menu.modificadores.selectProductError')
    return false
  }

  if (!form.value.name.trim()) {
    nameError.value = t('menu.modificadores.nameError')
    return false
  }

  if (form.value.max_qty < form.value.min_qty) {
    submitError.value = t('menu.modificadores.maxMinError')
    return false
  }

  const res = await $fetch<{ available: boolean }>(
    `/api/menu/check-name?entity=modifier-groups&name=${encodeURIComponent(form.value.name.trim())}`,
  )
  if (!res.available) {
    nameError.value = t('menu.modificadores.duplicateNameError')
    return false
  }

  if (form.value.modifiers.length === 0) {
    submitError.value = t('menu.modificadores.createOptionError')
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

async function submitGroup() {
  if (isSubmitting.value) return
  if (!(await validateForm())) return

  isSubmitting.value = true
  submitError.value = null

  try {
    form.value.tenant_id = currentTenant.value?.id || ''

    await $fetch('/api/menu/modifier-groups', {
      method: 'POST',
      body: {
        ...form.value,
        modifiers: form.value.modifiers.map(serializeModifierForApi),
      }
    })

    // clearNuxtData()
    await router.push('/menu/modificadores')
  } catch (error: any) {
    console.error('Error creating modifier group:', error)
    submitError.value = error.data?.detail || error.message || t('menu.modificadores.createError')
  } finally {
    isSubmitting.value = false
  }
}

</script>

<style scoped>
.input-base {
  @apply border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface;
}
</style>
