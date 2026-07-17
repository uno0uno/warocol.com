<template>
  <div>
    <UiSubmitBusyOverlay
      :busy="isSubmitting"
      :label="t('menu.recetas.form.creatingBase')"
      :hint="WAREHOUSE_COPY.recipeCompositionSavingHint"
      variant="glass"
      indicator="matrix"
    />

    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div v-else class="space-y-6">
      <form @submit.prevent="submitRecipe" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
        <div class="xl:col-span-2 space-y-6">
          <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
            <UiFormSection :title="t('menu.recetas.form.dataTitle')">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.recetas.form.nameRequired') }}
                  </label>
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    class="input-base w-full px-4 py-2"
                    :class="nameError ? 'border-destructive focus:ring-destructive' : ''"
                    :placeholder="t('menu.recetas.form.namePlaceholder')"
                    @input="nameError = ''"
                  />
                  <p v-if="nameError" role="alert" class="text-xs text-destructive mt-1 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    {{ nameError }}
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">
                    {{ t('menu.recetas.form.description') }} <span class="text-text-tertiary font-normal">{{ t('menu.recetas.form.optionalSuffix') }}</span>
                  </label>
                  <textarea
                    v-model="form.description"
                    rows="3"
                    class="input-base w-full px-4 py-2 resize-y min-h-[5.5rem]"
                    :placeholder="t('menu.recetas.form.descriptionPlaceholder')"
                  />
                </div>

                <div class="flex items-start gap-3">
                  <input
                    v-model="form.is_active"
                    type="checkbox"
                    id="is_active"
                    class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
                  />
                  <div>
                    <label for="is_active" class="text-sm font-medium text-text-primary cursor-pointer">
                      {{ t('menu.recetas.form.activeRecipe') }}
                    </label>
                    <p class="text-xs text-text-tertiary mt-0.5">
                      {{ t('menu.recetas.form.activeHelp') }}
                    </p>
                  </div>
                </div>
              </div>
            </UiFormSection>

            <UiFormSection :title="WAREHOUSE_COPY.recipeCompositionSection">
              <template #actions>
                <button
                  type="button"
                  @click="addIngredient"
                  class="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-shell-icon-bg px-3 py-1.5 text-sm font-medium text-shell-icon-text transition-all hover:bg-shell-icon-hover-bg focus:outline-none focus:ring-2 focus:ring-shell-action-focus-ring"
                >
                  <Icon name="heroicons:plus" class="h-4 w-4 flex-shrink-0" />
                  {{ t('menu.recetas.form.addLine') }}
                </button>
              </template>

              <MenuCatalogInlineCreateBusyOverlay
                :busy="inlineCatalogBusy"
                :label="inlineCatalogBusyLabel"
                :hint="inlineCatalogBusyHint"
              >
                <MenuIngredientProductHint class="mb-4" />

                <div v-if="duplicateIngredientError" class="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                  {{ duplicateIngredientError }}
                </div>

                <WarehouseCategoryIngredientSelector
                  class="mb-4"
                  input-id="recipe-create-category-ingredients"
                  :existing-ingredient-ids="existingIngredientIds"
                  :unit-options="getIngredientUnitOptions"
                  :loading-unit-ids="loadingUnits"
                  @update:prepared-rows="onCategoryPreparedRows"
                />

                <div v-if="form.ingredients.length === 0 && categoryPreparedRows.length === 0" class="text-center py-10 text-text-secondary border border-dashed border-border rounded-lg">
                  <svg class="w-12 h-12 mx-auto mb-3 text-text-tertiary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p class="text-sm font-medium mb-0.5">{{ t('menu.recetas.form.emptyLines') }}</p>
                  <p class="text-xs text-text-tertiary">{{ WAREHOUSE_COPY.recipeCompositionEmptyHelp }}</p>
                </div>

                <div v-else class="space-y-3">
                  <div
                    v-if="categoryPreparedRows.length && form.ingredients.length"
                    class="flex items-center gap-3 pt-1"
                  >
                    <span class="h-px flex-1 bg-border" aria-hidden="true" />
                    <h4 class="text-xs font-medium text-text-secondary">
                      {{ t('abastecimiento.glossary.categoryIngredientsManualLabel') }}
                    </h4>
                    <span class="h-px flex-1 bg-border" aria-hidden="true" />
                  </div>
                  <div
                    v-for="(ingredient, index) in form.ingredients"
                    :key="index"
                    class="border border-border rounded-lg p-3 sm:p-4 bg-background"
                  >
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div class="md:col-span-5">
                        <label class="block text-xs font-medium text-text-secondary mb-1">{{ WAREHOUSE_COPY.warehouseItemOrResaleRequired }}</label>
                        <UiIngredientSearchInput
                          :allow-create="true"
                          @select="(ing) => selectIngredient(ing, index)"
                          @create="(name) => openCustomIngModal(name, index)"
                        />
                      </div>

                      <div class="md:col-span-3">
                        <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('menu.recetas.form.quantityRequired') }}</label>
                        <UiDecimalInput
                          v-model="ingredient.base_quantity"
                          placeholder="0"
                          :min="0.01"
                          :precision="6"
                          class="input-base w-full px-3 py-2 text-sm"
                          required
                        />
                      </div>

                      <div class="md:col-span-3">
                        <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('menu.recetas.form.unit') }}</label>
                        <div class="relative">
                          <select
                            v-model="ingredient.unit"
                            :disabled="loadingUnits.has(ingredient.ingredient_id)"
                            class="input-base w-full py-2 pe-3 text-sm disabled:opacity-50"
                            :class="loadingUnits.has(ingredient.ingredient_id) ? 'ps-7' : 'ps-3'"
                          >
                            <option
                              v-for="opt in getIngredientUnitOptions(ingredient.ingredient_id)"
                              :key="opt.value"
                              :value="opt.value"
                            >
                              {{ opt.label }}
                            </option>
                          </select>
                          <span v-if="loadingUnits.has(ingredient.ingredient_id)" class="absolute start-2 top-2.5 pointer-events-none text-text-secondary">
                            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                          </span>
                        </div>
                      </div>

                      <div class="md:col-span-1">
                        <label class="block text-xs font-medium text-text-secondary mb-1 invisible select-none" aria-hidden="true">&nbsp;</label>
                        <button
                          type="button"
                          @click="removeIngredient(index)"
                          class="flex items-center justify-center w-full h-[38px] text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                          :title="WAREHOUSE_COPY.removeWarehouseItemLine"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div class="mt-3">
                      <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('menu.recetas.form.notes') }} <span class="font-normal">{{ t('menu.recetas.form.optionalSuffix') }}</span></label>
                      <input
                        v-model="ingredient.notes"
                        type="text"
                        :placeholder="t('menu.recetas.form.notesPlaceholder')"
                        class="input-base w-full px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </MenuCatalogInlineCreateBusyOverlay>
            </UiFormSection>
          </div>
        </div>

        <div class="xl:col-span-1 space-y-6">
          <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
            <h3 class="text-lg font-semibold text-text-primary mb-4">{{ t('menu.recetas.form.summary') }}</h3>

            <div class="space-y-3">
              <div class="flex justify-between text-sm gap-2">
                <span class="text-text-secondary">{{ t('menu.recetas.form.nameSummary') }}</span>
                <span class="font-semibold text-text-primary text-end truncate">{{ form.name || '—' }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-text-secondary">{{ WAREHOUSE_COPY.recipeCompositionSummary }}</span>
                <span class="font-semibold text-text-primary">{{ combinedIngredients.length }}</span>
              </div>

              <div class="flex justify-between text-sm items-center gap-2">
                <span class="text-text-secondary">{{ t('menu.recetas.form.status') }}</span>
                <UiStatusBadge
                  :value="form.is_active ? t('menu.common.active') : t('menu.common.inactive')"
                  format="text"
                  :variant="form.is_active ? 'success' : 'secondary'"
                  size="sm"
                />
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
                <Icon v-else name="heroicons:arrow-path" class="h-5 w-5 me-2 animate-spin" />
                {{ isSubmitting ? t('menu.recetas.form.creating') : t('menu.recetas.form.createRecipe') }}
              </UiButton>

              <UiButton
                type="button"
                variant="default"
                size="default"
                class="w-full bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
                :disabled="isSubmitting"
                @click="router.push('/menu/recetas')"
              >
                {{ t('common.cancel') }}
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
      context="recipe"
      :on-ingredient-saved="onCustomIngredientCreated"
      :on-product-saved="onInlineProductCreated"
    />
  </div>
</template>

<script setup lang="ts">
import WarehouseCategoryIngredientSelector from '~/components/ingredientes/WarehouseCategoryIngredientSelector.vue'
import type { PreparedWarehouseCategoryIngredient } from '~/composables/useWarehouseCategoryIngredientSelector'
import { ref } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
  module: 'menu',
})

const { t } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()

useHead({ title: t('menu.recetas.form.createTitle') })

const router = useRouter()
const { currentTenant } = useTenantReactive()

const isSubmitting = ref(false)
const nameError = ref('')
const duplicateIngredientError = ref('')
const submitError = ref('')

const form = ref({
  name: '',
  description: '',
  is_active: true,
  ingredients: [] as Array<{
    ingredient_id: string
    base_quantity: number
    unit: string
    notes: string
  }>,
  tenant_id: currentTenant.value?.id || ''
})

const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnits = ref<Set<string>>(new Set())
const categoryPreparedRows = ref<PreparedWarehouseCategoryIngredient[]>([])

const { getIngredientUnitOptions: buildUnitOptions, defaultUnitForIngredient } = useIngredientUnitOptions()

function getIngredientUnitOptions(ingredientId: string) {
  return buildUnitOptions(ingredientId, {
    ingredientCache: ingredientCache.value,
    purchaseUnitsCache: purchaseUnitsCache.value,
  })
}

const existingIngredientIds = computed(() =>
  form.value.ingredients.map(row => row.ingredient_id).filter(Boolean),
)
const combinedIngredients = computed(() => [
  ...form.value.ingredients,
  ...mapPreparedRowsToRecipe(categoryPreparedRows.value),
])

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

async function onIngredientChange(index: number, ingredientId: string) {
  if (!ingredientId) return
  const ingredient = ingredientCache.value[ingredientId]
  form.value.ingredients[index].unit = defaultUnitForIngredient(ingredient)
  await loadPurchaseUnits(ingredientId)
}

function onCategoryPreparedRows(rows: PreparedWarehouseCategoryIngredient[]) {
  categoryPreparedRows.value = rows
  for (const row of rows) {
    ingredientCache.value[row.ingredient_id] = {
      ...ingredientCache.value[row.ingredient_id],
      id: row.ingredient_id,
      name: row.name,
      unit: ingredientCache.value[row.ingredient_id]?.unit || row.unit,
    }
    void loadPurchaseUnits(row.ingredient_id)
  }
}

function selectIngredient(ingredient: any, index: number) {
  form.value.ingredients[index].ingredient_id = ingredient.id
  ingredientCache.value[ingredient.id] = ingredient
  onIngredientChange(index, ingredient.id)
}

const inlineCreateShell = ref<{ openFromSearch: (name: string) => void } | null>(null)
const customIngModalIndex = ref(-1)
const inlineCatalogBusy = ref(false)
const inlineCatalogBusyLabel = ref('')
const inlineCatalogBusyHint = ref('')

function openCustomIngModal(name: string, index: number) {
  customIngModalIndex.value = index
  inlineCreateShell.value?.openFromSearch(name)
}

function onCustomIngredientCreated(ingredient: any) {
  const index = customIngModalIndex.value
  if (index < 0 || index >= form.value.ingredients.length) return
  selectIngredient(ingredient, index)
  customIngModalIndex.value = -1
}

const { linkCreatedProductToRow } = useInlineCatalogProductLink()

async function onInlineProductCreated(product: Record<string, unknown>) {
  const index = customIngModalIndex.value
  if (index < 0 || index >= form.value.ingredients.length) return
  await linkCreatedProductToRow(product, async (ingredient) => {
    selectIngredient(ingredient, index)
    customIngModalIndex.value = -1
  })
}

const isLoadingData = ref(false)

function addIngredient() {
  form.value.ingredients.push({
    ingredient_id: '',
    base_quantity: 0,
    unit: 'g',
    notes: ''
  })
}

function removeIngredient(index: number) {
  form.value.ingredients.splice(index, 1)
}

async function validateForm(): Promise<boolean> {
  submitError.value = ''
  nameError.value = ''
  duplicateIngredientError.value = ''

  if (!form.value.name.trim()) {
    nameError.value = t('menu.recetas.form.nameRequiredError')
    return false
  }

  const res = await $fetch<{ available: boolean }>(
    `/api/menu/check-name?entity=recipe-bases&name=${encodeURIComponent(form.value.name.trim())}`,
  )
  if (!res.available) {
    nameError.value = t('menu.recetas.form.nameExistsError')
    return false
  }

  if (combinedIngredients.value.length === 0) {
    submitError.value = WAREHOUSE_COPY.addWarehouseItemToRecipe
    return false
  }

  const validationError = validateMenuCompositionRows(
    combinedIngredients.value.map(row => ({
      ingredient_id: row.ingredient_id,
      quantity: row.base_quantity,
      unit: row.unit,
    })),
    ingredientId => getIngredientUnitOptions(ingredientId).map(option => option.value),
  )
  if (validationError === 'incomplete') {
    submitError.value = WAREHOUSE_COPY.completeRecipeCostLinesError
    return false
  }
  if (validationError === 'duplicate') {
    duplicateIngredientError.value = WAREHOUSE_COPY.duplicateWarehouseItemInList
    return false
  }
  if (validationError === 'incompatible-unit') {
    submitError.value = t('menu.common.incompatibleUnitError')
    return false
  }

  return true
}

async function submitRecipe() {
  if (isSubmitting.value) return
  if (!(await validateForm())) return

  isSubmitting.value = true
  submitError.value = ''

  try {
    form.value.tenant_id = currentTenant.value?.id || ''

    await $fetch('/api/menu/recipe-bases', {
      method: 'POST',
      body: {
        name: form.value.name,
        description: form.value.description,
        is_active: form.value.is_active,
        ingredients: combinedIngredients.value.map(ing => ({
          ingredient_id: ing.ingredient_id,
          base_quantity: ing.base_quantity,
          unit: ing.unit,
          is_required: true,
          notes: ing.notes
        })),
        tenant_id: form.value.tenant_id
      }
    })

    clearNuxtData()
    await router.push('/menu/recetas')
  } catch (error: any) {
    const detail = error.data?.detail || error.message || t('menu.recetas.form.unexpectedError')
    if (error.status === 400 && typeof detail === 'string' && detail.toLowerCase().includes('nombre')) {
      nameError.value = detail
    } else {
      submitError.value = typeof detail === 'string' ? detail : t('menu.recetas.form.unexpectedError')
    }
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
