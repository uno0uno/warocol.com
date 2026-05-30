<template>
  <div>
    <div v-if="isPageLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError || !recipeData" />

    <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
          <UiFormSection title="Datos de la receta">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
                  Nombre *
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  placeholder="Ej. pizza italiana clásica"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-1">
                  Descripción <span class="text-text-tertiary font-normal">(opcional)</span>
                </label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  class="input-base w-full px-4 py-2 resize-y min-h-[5.5rem]"
                  placeholder="Breve descripción de la receta base"
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
                    Receta activa
                  </label>
                  <p class="text-xs text-text-tertiary mt-0.5">
                    Disponible para asignar a productos nuevos
                  </p>
                </div>
              </div>
            </div>
          </UiFormSection>

          <UiFormSection title="Ingredientes">
            <template #actions>
              <UiButton
                type="button"
                variant="outline"
                size="sm"
                @click="addIngredient"
              >
                + Agregar
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
                <p class="text-sm font-medium mb-0.5">Sin líneas en la receta</p>
                <p class="text-xs text-text-tertiary">Agrega ingredientes o productos de reventa</p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(ingredient, index) in form.ingredients"
                  :key="index"
                  class="flex items-start gap-3 p-4 bg-background rounded-lg border border-border"
                >
                  <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div class="md:col-span-5">
                      <label class="block text-xs font-medium text-text-secondary mb-1">Ingrediente o reventa *</label>
                      <UiIngredientSearchInput
                        :initialValue="ingredient.ingredient_name"
                        :allow-create="true"
                        @select="(ing) => selectIngredient(ing, index)"
                        @create="(name) => openCustomIngModal(name, index)"
                      />
                    </div>

                    <div class="md:col-span-3">
                      <label class="block text-xs font-medium text-text-secondary mb-1">Cantidad *</label>
                      <input
                        v-model.number="ingredient.base_quantity"
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        class="input-base w-full px-3 py-2 text-sm"
                        placeholder="0"
                      />
                    </div>

                    <div class="md:col-span-3">
                      <label class="block text-xs font-medium text-text-secondary mb-1">Unidad</label>
                      <div class="relative">
                        <select
                          v-model="ingredient.unit"
                          :disabled="loadingUnits.has(ingredient.ingredient_id)"
                          class="input-base w-full py-2 pr-3 text-sm disabled:opacity-50"
                          :class="loadingUnits.has(ingredient.ingredient_id) ? 'pl-7' : 'pl-3'"
                        >
                          <option
                            v-for="opt in getIngredientUnitOptions(ingredient.ingredient_id)"
                            :key="opt.value"
                            :value="opt.value"
                          >{{ opt.label }}</option>
                        </select>
                        <span v-if="loadingUnits.has(ingredient.ingredient_id)" class="absolute left-2 top-2.5 pointer-events-none text-text-secondary">
                          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div class="md:col-span-1 flex items-end">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          v-model="ingredient.is_required"
                          type="checkbox"
                          class="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span class="text-xs font-medium text-text-primary whitespace-nowrap">Requerido</span>
                      </label>
                    </div>

                    <div class="md:col-span-12">
                      <label class="block text-xs font-medium text-text-secondary mb-1">Notas <span class="font-normal">(opcional)</span></label>
                      <input
                        v-model="ingredient.notes"
                        type="text"
                        class="input-base w-full px-3 py-2 text-sm"
                        placeholder="Ej. mozzarella de búfala"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    @click="removeIngredient(index)"
                    class="px-3 py-2 text-destructive hover:bg-destructive/5 rounded-lg transition-colors flex-shrink-0"
                    title="Eliminar línea"
                  >
                    <Icon name="heroicons:trash" class="h-5 w-5" />
                  </button>
                </div>
              </div>
            </MenuCatalogInlineCreateBusyOverlay>
          </UiFormSection>
        </div>
      </div>

      <div class="xl:col-span-1 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen</h3>

          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Ingredientes:</span>
              <span class="font-semibold text-text-primary">{{ form.ingredients.length }}</span>
            </div>

            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Requeridos:</span>
              <span class="font-semibold text-text-primary">
                {{ form.ingredients.filter(i => i.is_required).length }}
              </span>
            </div>

            <div class="flex justify-between text-sm items-center gap-2">
              <span class="text-text-secondary">Estado:</span>
              <UiStatusBadge
                :value="form.is_active ? 'Activa' : 'Inactiva'"
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
              class="w-full"
              :disabled="isSubmitting"
            >
              <Icon v-if="!isSubmitting" name="heroicons:check" class="h-5 w-5 mr-2" />
              <Icon v-else name="heroicons:arrow-path" class="h-5 w-5 mr-2 animate-spin" />
              {{ isSubmitting ? 'Guardando...' : 'Guardar receta' }}
            </UiButton>

            <UiButton
              type="button"
              variant="outline"
              size="default"
              class="w-full"
              :disabled="isSubmitting"
              @click="cancel"
            >
              Cancelar
            </UiButton>

            <UiButton
              type="button"
              variant="destructive"
              size="default"
              class="w-full"
              :disabled="isSubmitting"
              @click="deleteRecipe"
            >
              <Icon name="heroicons:trash" class="h-5 w-5 mr-2" />
              Eliminar receta
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
    backButton.value = {
      label: 'Volver a Recetas'
    }
  })
})

useHead({ title: 'Editar Receta' })

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
    is_required: boolean
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
          is_required: ing.is_required,
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
    is_required: true,
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
    submitError.value = 'Todos los ingredientes deben tener cantidad mayor a 0.'
    return
  }

  const ingredientIds = form.value.ingredients
    .map(ing => ing.ingredient_id)
    .filter(id => id !== '')

  const uniqueIds = new Set(ingredientIds)
  if (ingredientIds.length !== uniqueIds.size) {
    submitError.value = 'No puedes agregar el mismo ingrediente más de una vez.'
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
        ingredients: form.value.ingredients
      }
    })

    cache.invalidateQueries()
    await refresh()
    toast.success('Receta actualizada correctamente', { title: 'Guardado' })
  } catch (error: any) {
    console.error('Error updating recipe base:', error)
    submitError.value = error.data?.detail || error.message || 'Error al actualizar. Intenta de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}

const cancel = () => {
  router.push('/menu/recetas')
}

const deleteRecipe = async () => {
  if (!confirm('¿Estás seguro de que deseas eliminar esta receta base? Esta acción no se puede deshacer.')) {
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
    submitError.value = error.data?.detail || error.message || 'Error al eliminar. Intenta de nuevo.'
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
