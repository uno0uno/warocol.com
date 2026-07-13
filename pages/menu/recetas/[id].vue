<template>
  <div>
    <div v-if="isPageLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError || !recipeData" />

    <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
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
                  :placeholder="t('menu.recetas.form.namePlaceholder')"
                />
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
              <UiButton
                type="button"
                variant="default"
                size="sm"
                class="bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
                @click="addIngredient"
              >
                {{ t('menu.recetas.form.addLine') }}
              </UiButton>
            </template>

            <MenuCatalogInlineCreateBusyOverlay
              :busy="inlineCatalogBusy"
              :label="inlineCatalogBusyLabel"
              :hint="inlineCatalogBusyHint"
            >
              <MenuIngredientProductHint class="mb-4" />

              <div v-if="form.ingredients.length === 0" class="text-center py-10 text-text-secondary border border-dashed border-border rounded-lg">
                <Icon name="heroicons:cube" class="h-12 w-12 mx-auto mb-3 text-text-tertiary/50" />
                <p class="text-sm font-medium mb-0.5">{{ t('menu.recetas.form.emptyLines') }}</p>
                <p class="text-xs text-text-tertiary">{{ WAREHOUSE_COPY.recipeCompositionEmptyHelp }}</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(ingredient, index) in form.ingredients"
                  :key="index"
                  class="border border-border rounded-lg p-3 sm:p-4 bg-background"
                >
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div class="md:col-span-5">
                      <label class="block text-xs font-medium text-text-secondary mb-1">{{ WAREHOUSE_COPY.warehouseItemOrResaleRequired }}</label>
                      <UiIngredientSearchInput
                        :initialValue="ingredient.ingredient_name"
                        :allow-create="true"
                        @select="(ing) => selectIngredient(ing, index)"
                        @create="(name) => openCustomIngModal(name, index)"
                      />
                    </div>

                    <div class="md:col-span-3">
                      <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('menu.recetas.form.quantityRequired') }}</label>
                      <UiDecimalInput
                        v-model="ingredient.base_quantity"
                        required
                        :min="0.01"
                        :precision="6"
                        class="input-base w-full px-3 py-2 text-sm"
                        placeholder="0"
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
                          >{{ opt.label }}</option>
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
                        <Icon name="heroicons:trash" class="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div class="mt-3">
                    <label class="block text-xs font-medium text-text-secondary mb-1">{{ t('menu.recetas.form.notes') }} <span class="font-normal">{{ t('menu.recetas.form.optionalSuffix') }}</span></label>
                    <input
                      v-model="ingredient.notes"
                      type="text"
                      class="input-base w-full px-3 py-2 text-sm"
                      :placeholder="t('menu.recetas.form.notesPlaceholder')"
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
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">{{ WAREHOUSE_COPY.recipeCompositionSummary }}</span>
              <span class="font-semibold text-text-primary">{{ form.ingredients.length }}</span>
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
              {{ isSubmitting ? t('menu.recetas.form.saving') : t('menu.recetas.form.saveRecipe') }}
            </UiButton>

            <UiButton
              type="button"
              variant="default"
              size="default"
              class="w-full bg-shell-icon-bg text-shell-icon-text hover:bg-shell-icon-hover-bg focus-visible:ring-shell-action-focus-ring"
              :disabled="isSubmitting"
              @click="cancel"
            >
              {{ t('common.cancel') }}
            </UiButton>

            <UiButton
              type="button"
              variant="default"
              size="default"
              class="w-full bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:ring-destructive/30"
              :disabled="isSubmitting"
              @click="deleteRecipe"
            >
              <Icon name="heroicons:trash" class="h-5 w-5 me-2" />
              {{ t('menu.recetas.form.deleteRecipe') }}
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
      context="recipe"
      :on-ingredient-saved="onCustomIngredientCreated"
      :on-product-saved="onInlineProductCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useMenuIngredientsQuery } from '@/composables/queries/useMenuIngredients'

definePageMeta({
  pageTransition: {
    name: 'fade',
    mode: 'out-in'
  },
  middleware: defineNuxtRouteMiddleware((to, from) => {
    const backButton = useState('backButton')
    const { $i18n } = useNuxtApp()
    backButton.value = {
      label: ($i18n as { t: (key: string) => string }).t('menu.recetas.backToRecipes')
    }
  }),
  module: 'menu',
})

const { t } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()

useHead({ title: t('menu.recetas.form.editTitle') })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const cache = useQueryCache()

const recipeId = route.params.id as string

const { data: recipeData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `recipe-base-${recipeId}`,
  () => $fetch(`/api/menu/recipe-bases/${recipeId}`),
  {
    server: false,
    default: () => null
  }
)

const isPageLoading = computed(() => isLoading.value)

const { availableIngredients } = useMenuIngredientsQuery()

const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
const loadingUnits = ref<Set<string>>(new Set())

const { getIngredientUnitOptions: buildUnitOptions, defaultUnitForIngredient, mergeIngredientUnitFields, rehydrateIngredientCaches } = useIngredientUnitOptions()

function getIngredientUnitOptions(ingredientId: string) {
  return buildUnitOptions(ingredientId, {
    ingredientCache: ingredientCache.value,
    purchaseUnitsCache: purchaseUnitsCache.value,
  })
}

function cacheIngredientForUnits(ing: any) {
  const catalogRow = availableIngredients.value.find((i: any) => i.id === ing.id)
  ingredientCache.value[ing.id] = mergeIngredientUnitFields(ing, catalogRow)
}

function rehydrateRecipeIngredientCaches() {
  if (!availableIngredients.value.length) return
  const entries = form.value.ingredients
    .filter(ing => ing.ingredient_id)
    .map(ing => ({
      id: ing.ingredient_id,
      name: ing.ingredient_name || ingredientCache.value[ing.ingredient_id]?.name,
      unit: ing.unit,
      ...ingredientCache.value[ing.ingredient_id],
    }))
  rehydrateIngredientCaches(entries, availableIngredients.value, ingredientCache.value)
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

function selectIngredient(ing: any, index: number) {
  form.value.ingredients[index].ingredient_id = ing.id
  form.value.ingredients[index].ingredient_name = ing.name
  cacheIngredientForUnits(ing)
  form.value.ingredients[index].unit = defaultUnitForIngredient(ingredientCache.value[ing.id])
  loadPurchaseUnits(ing.id)
  form.value.ingredients = [...form.value.ingredients]
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

const form = ref({
  name: '',
  description: '',
  is_active: true,
  ingredients: [] as Array<{
    ingredient_id: string
    ingredient_name: string
    base_quantity: number
    unit: string
    notes: string
  }>
})

const isSubmitting = ref(false)
const submitError = ref('')

watch(recipeData, (data) => {
  if (data?.data) {
    const recipe = data.data
    form.value = {
      name: recipe.name,
      description: recipe.description || '',
      is_active: recipe.is_active,
      ingredients: recipe.ingredients.map((ing: any) => {
        if (ing.ingredient_id) {
          cacheIngredientForUnits({ id: ing.ingredient_id, name: ing.ingredient_name || '', unit: ing.unit })
          loadPurchaseUnits(ing.ingredient_id)
        }
        return {
          ingredient_id: ing.ingredient_id,
          ingredient_name: ing.ingredient_name || '',
          base_quantity: Number(ing.base_quantity),
          unit: ing.unit,
          notes: ing.notes || ''
        }
      })
    }
  }
}, { immediate: true })

watch(availableIngredients, (list) => {
  if (list.length && form.value.ingredients.some(ing => ing.ingredient_id)) {
    rehydrateRecipeIngredientCaches()
  }
})

const addIngredient = () => {
  form.value.ingredients.push({
    ingredient_id: '',
    ingredient_name: '',
    base_quantity: 0,
    unit: 'g',
    notes: ''
  })
}

const removeIngredient = (index: number) => {
  form.value.ingredients.splice(index, 1)
}

const handleSubmit = async () => {
  if (isSubmitting.value) return
  submitError.value = ''

  const hasZeroQuantity = form.value.ingredients.some(ing => !ing.base_quantity || ing.base_quantity <= 0)
  if (hasZeroQuantity) {
    submitError.value = WAREHOUSE_COPY.allRecipeCostLinesNeedQuantity
    return
  }

  const ingredientIds = form.value.ingredients
    .map(ing => ing.ingredient_id)
    .filter(id => id !== '')

  const uniqueIds = new Set(ingredientIds)
  if (ingredientIds.length !== uniqueIds.size) {
    submitError.value = WAREHOUSE_COPY.duplicateWarehouseItemInList
    return
  }

  isSubmitting.value = true

  try {
    await $fetch(`/api/menu/recipe-bases/${recipeId}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        description: form.value.description,
        is_active: form.value.is_active,
        ingredients: form.value.ingredients.map(ing => ({
          ingredient_id: ing.ingredient_id,
          ingredient_name: ing.ingredient_name,
          base_quantity: ing.base_quantity,
          unit: ing.unit,
          is_required: true,
          notes: ing.notes,
        }))
      }
    })

    cache.invalidateQueries()
    await refresh()
    toast.success(t('menu.recetas.form.updated'), { title: t('menu.common.guardado') })
  } catch (error: any) {
    console.error('Error updating recipe base:', error)
    submitError.value = error.data?.detail || error.message || t('menu.recetas.form.updateError')
  } finally {
    isSubmitting.value = false
  }
}

const cancel = () => {
  router.push('/menu/recetas')
}

const deleteRecipe = async () => {
  if (!confirm(t('menu.recetas.form.deleteConfirm'))) {
    return
  }

  isSubmitting.value = true

  try {
    await $fetch(`/api/menu/recipe-bases/${recipeId}`, {
      method: 'DELETE'
    })

    await router.push('/menu/recetas')
  } catch (error: any) {
    console.error('Error deleting recipe base:', error)
    submitError.value = error.data?.detail || error.message || t('menu.recetas.form.deleteError')
  } finally {
    isSubmitting.value = false
  }
}

const { setRefreshHandler, clearRefreshHandler } = useLayoutActions()
onMounted(() => { setRefreshHandler(refresh) })
onUnmounted(() => { clearRefreshHandler(refresh) })
</script>

<style scoped>
.input-base {
  @apply border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-primary bg-surface;
}
</style>
