<template>
  <div>
    <!-- Loading State -->
    <div v-if="isPageLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError || !recipeData" />

    <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
      <!-- Left Column: Form Content -->
      <div class="xl:col-span-2 space-y-6">
        <div class="bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm">
          <!-- Información Básica -->
          <div>
            <h3 class="text-lg font-semibold text-text-primary mb-6">Información General</h3>
            <div class="grid grid-cols-1 gap-6">
              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Nombre del Tipo Base *
                </label>
                <input
                  v-model="form.name"
                  type="text"
                  required
                  class="input-base w-full px-4 py-2"
                  placeholder="Ej: Pizza Italiana Clásica"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-text-primary mb-2">
                  Descripción
                </label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  class="input-base w-full px-4 py-2"
                  placeholder="Describe la receta base..."
                ></textarea>
              </div>

              <div class="flex items-start space-x-3">
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
                  <p class="text-xs text-text-secondary mt-1">
                    Las recetas activas pueden ser asignadas a nuevos productos
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Ingredientes -->
          <div class="mt-8">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-semibold text-text-primary">Ingredientes de la Receta Base</h3>
              <UiButton
                type="button"
                variant="outline"
                size="sm"
                @click="addIngredient"
              >
                + Agregar Ingrediente
              </UiButton>
            </div>

            <!-- Empty State -->
            <div v-if="form.ingredients.length === 0" class="text-center py-12 text-text-secondary border border-border rounded-lg">
              <Icon name="heroicons:cube" class="h-16 w-16 mx-auto mb-4 text-titan-300" />
              <p class="text-base font-medium mb-1">No hay ingredientes agregados</p>
              <p class="text-sm">Agrega los ingredientes que componen esta receta base</p>
            </div>

            <!-- Lista de ingredientes -->
            <div class="space-y-3 mb-4">
              <div
                v-for="(ingredient, index) in form.ingredients"
                :key="index"
                class="flex items-start gap-3 p-4 bg-surface-secondary rounded-lg border border-border"
              >
                <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3">
                  <!-- Ingrediente -->
                  <div class="md:col-span-5">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Ingrediente *</label>
                    <UiIngredientSearchInput
                      :initialValue="ingredient.ingredient_name"
                      :allow-create="true"
                      @select="(ing) => selectIngredient(ing, index)"
                      @create="(name) => openCustomIngModal(name, index)"
                    />
                  </div>

                  <!-- Cantidad -->
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

                  <!-- Unidad -->
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

                  <!-- Requerido -->
                  <div class="md:col-span-1 flex items-end">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        v-model="ingredient.is_required"
                        class="h-4 w-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span class="text-xs font-medium text-text-primary whitespace-nowrap">Requerido</span>
                    </label>
                  </div>

                  <!-- Notas -->
                  <div class="md:col-span-12">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Notas (opcional)</label>
                    <input
                      v-model="ingredient.notes"
                      type="text"
                      class="input-base w-full px-3 py-2 text-sm"
                      placeholder="Ej: Usar mozzarella de búfala, temperatura ambiente..."
                    />
                  </div>
                </div>

                <!-- Delete Button -->
                <button
                  type="button"
                  @click="removeIngredient(index)"
                  class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Eliminar ingrediente"
                >
                  <Icon name="heroicons:trash" class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Actions Card -->
      <div class="xl:col-span-1">
        <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6 space-y-4">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Acciones</h3>

          <UiButton
            type="submit"
            variant="default"
            size="lg"
            class="w-full"
            :disabled="isSubmitting"
          >
            <Icon v-if="!isSubmitting" name="heroicons:check" class="h-5 w-5 mr-2" />
            <Icon v-else name="heroicons:arrow-path" class="h-5 w-5 mr-2 animate-spin" />
            {{ isSubmitting ? 'Guardando...' : 'Actualizar Receta' }}
          </UiButton>

          <UiButton
            type="button"
            variant="outline"
            size="default"
            class="w-full"
            @click="cancel"
            :disabled="isSubmitting"
          >
            Cancelar
          </UiButton>

          <UiButton
            type="button"
            variant="destructive"
            size="default"
            class="w-full"
            @click="deleteRecipe"
            :disabled="isSubmitting"
          >
            <Icon name="heroicons:trash" class="h-5 w-5 mr-2" />
            Eliminar Receta
          </UiButton>

          <!-- Info Card -->
          <div class="mt-6 p-4 bg-background rounded-lg border border-border">
            <h4 class="text-sm font-semibold text-text-primary mb-3">Información</h4>
            <div class="space-y-2 text-xs text-text-secondary">
              <div class="flex justify-between">
                <span>Total Ingredientes:</span>
                <span class="font-semibold text-text-primary">{{ form.ingredients.length }}</span>
              </div>
              <div class="flex justify-between">
                <span>Ingredientes Requeridos:</span>
                <span class="font-semibold text-text-primary">
                  {{ form.ingredients.filter(i => i.is_required).length }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span>Estado:</span>
                <UiStatusBadge
                  :value="form.is_active ? 'Activa' : 'Inactiva'"
                  format="text"
                  :variant="form.is_active ? 'success' : 'secondary'"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>

    <UiCreateCustomIngredientModal
      v-model="showCustomIngModal"
      :initial-name="customIngModalName"
      @created="onCustomIngredientCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
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
const { currentTenant } = useTenantReactive()

// Get recipe base ID from route
const recipeId = route.params.id as string

// Fetch recipe base data from backend
const { data: recipeData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `recipe-base-${recipeId}`,
  () => $fetch(`/api/menu/recipe-bases/${recipeId}`),
  {
    server: false,
    default: () => null
  }
)

const isPageLoading = computed(() => isLoading.value)

// Ingredient cache: populated from API response on load or when user selects via UiIngredientSearchInput
const ingredientCache = ref<Record<string, any>>({})

// Purchase units cache for dynamic unit options
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())

// Tracks which ingredient IDs are currently fetching purchase units
const loadingUnits = ref<Set<string>>(new Set())

const unitLabels: Record<string, string> = {
  g: 'Gramos (g)', kg: 'Kilogramos (kg)', ml: 'Mililitros (ml)',
  l: 'Litros (l)', u: 'Unidades (u)', lb: 'Libras (lb)',
  und: 'Unidades (und)', gr: 'Gramos (gr)',
}

function getIngredientUnitOptions(ingredientId: string) {
  if (!ingredientId) return Object.entries(unitLabels).map(([value, label]) => ({ value, label }))
  const ingredient = ingredientCache.value[ingredientId]
  const baseUnit = ingredient?.unit || 'g'
  const purchaseUnits = purchaseUnitsCache.value.get(ingredientId) || []
  const unitSet = new Set<string>([baseUnit])
  purchaseUnits.forEach((pu: any) => { if (pu.purchase_unit) unitSet.add(pu.purchase_unit) })
  return Array.from(unitSet).map(u => ({ value: u, label: unitLabels[u] || u }))
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
  form.value.ingredients[index].unit = ing.unit || 'g'
  ingredientCache.value[ing.id] = ing
  loadPurchaseUnits(ing.id)
  form.value.ingredients = [...form.value.ingredients]
}

const showCustomIngModal = ref(false)
const customIngModalName = ref('')
const customIngModalIndex = ref(-1)

function openCustomIngModal(name: string, index: number) {
  customIngModalIndex.value = index
  customIngModalName.value = name
  showCustomIngModal.value = true
}

function onCustomIngredientCreated(ingredient: any) {
  const index = customIngModalIndex.value
  if (index < 0 || index >= form.value.ingredients.length) return
  selectIngredient(ingredient, index)
  customIngModalIndex.value = -1
}

// Form state
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

// Watch recipe data and populate form
watch(recipeData, (data) => {
  if (data?.data) {
    const recipe = data.data
    form.value = {
      name: recipe.name,
      description: recipe.description || '',
      is_active: recipe.is_active,
      ingredients: recipe.ingredients.map((ing: any) => {
        if (ing.ingredient_id) {
          ingredientCache.value[ing.ingredient_id] = { id: ing.ingredient_id, name: ing.ingredient_name || '', unit: ing.unit }
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

// Methods
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

  // Validate quantities > 0
  const hasZeroQuantity = form.value.ingredients.some(ing => !ing.base_quantity || ing.base_quantity <= 0)
  if (hasZeroQuantity) {
    alert('Error: Todos los ingredientes deben tener una cantidad mayor a 0.')
    return
  }

  // Validate no duplicate ingredients
  const ingredientIds = form.value.ingredients
    .map(ing => ing.ingredient_id)
    .filter(id => id !== '') // Ignore empty selections

  const uniqueIds = new Set(ingredientIds)
  if (ingredientIds.length !== uniqueIds.size) {
    alert('Error: No puedes agregar el mismo ingrediente más de una vez en la misma receta.')
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

    // clearNuxtData()
    await router.push('/menu/recetas')
  } catch (error: any) {
    console.error('Error updating recipe base:', error)
    alert(`Error al actualizar la receta: ${error.data?.detail || error.message || 'Por favor intenta de nuevo.'}`)
  } finally {
    isSubmitting.value = false
  }
}

const cancel = () => {
  // clearNuxtData()
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

    // clearNuxtData()
    await router.push('/menu/recetas')
  } catch (error: any) {
    console.error('Error deleting recipe base:', error)
    alert(`Error al eliminar la receta: ${error.data?.detail || error.message || 'Por favor intenta de nuevo.'}`)
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
