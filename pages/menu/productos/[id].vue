<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
    <CommonsTheCustomLoader size="large" />
  </div>

  <!-- Error State -->
  <div v-else-if="fetchError || !productData" class="flex items-center justify-center min-h-[400px]">
    <div class="text-center">
      <Icon name="heroicons:exclamation-circle" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
      <p class="text-text-secondary">{{ fetchError || 'Producto no encontrado' }}</p>
      <UiButton variant="outline" size="default" class="mt-4" @click="router.push('/menu/productos')">
        Volver a Productos
      </UiButton>
    </div>
  </div>

  <form v-else @submit.prevent="handleSubmit" class="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8">
    <!-- Left Column: Form Content -->
    <div class="xl:col-span-2 space-y-6">
      <div class="bg-surface border-2 border-border rounded-xl p-6 md:p-8 shadow-sm">
        <!-- Información Básica -->
        <div>
          <h3 class="text-lg font-semibold text-text-primary mb-6">Información Básica</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-text-primary mb-2">
                Nombre del Producto *
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                class="input-base w-full px-4 py-2"
                placeholder="Ej: Hamburguesa Clásica"
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-text-primary mb-2">
                Descripción
              </label>
              <textarea
                v-model="form.description"
                rows="3"
                class="input-base w-full px-4 py-2"
                placeholder="Describe el producto..."
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Categoría *
              </label>
              <select
                v-model="form.category_id"
                required
                class="input-base w-full px-4 py-2"
              >
                <option value="" disabled>Seleccione una categoría</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Tiempo de Preparación (min)
              </label>
              <input
                v-model.number="form.preparation_time"
                type="number"
                min="0"
                class="input-base w-full px-4 py-2"
                placeholder="15"
              />
            </div>
          </div>
        </div>

        <!-- Precios -->
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-text-primary mb-6">Precios y Costos</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-text-primary mb-2">
                Precio de Venta *
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                <input
                  v-model.number="form.price"
                  type="number"
                  required
                  min="0"
                  step="100"
                  class="input-base w-full pl-8 pr-4 py-2"
                  placeholder="15000"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary mb-2">
                Costo Calculado (desde receta)
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">$</span>
                <input
                  :value="formatCurrency(calculatedCost)"
                  type="text"
                  disabled
                  class="input-base w-full pl-8 pr-4 py-2 bg-surface-secondary cursor-not-allowed"
                  placeholder="0"
                />
              </div>
              <p class="text-xs text-text-tertiary mt-1">
                Se calculará automáticamente desde los ingredientes
              </p>
            </div>
          </div>

          <!-- Margin Display -->
          <div v-if="form.price > 0 && calculatedCost > 0" class="mt-4 p-4 bg-surface-secondary rounded-lg">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-text-primary">Margen:</span>
              <div class="flex items-center gap-3">
                <span class="text-lg font-bold text-text-primary">
                  {{ formatCurrency(form.price - calculatedCost) }}
                </span>
                <UiStatusBadge
                  :label="`${calculateMargin(form.price, calculatedCost)}%`"
                  :variant="calculateMargin(form.price, calculatedCost) > 50 ? 'success' : 'warning'"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Recetas Base (Opcional) -->
        <div class="mt-8">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-text-primary">Recetas Base (Opcional)</h3>
            <button
              type="button"
              @click="addRecipeBase"
              class="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
            >
              + Agregar Receta Base
            </button>
          </div>
          <p class="text-sm text-text-secondary mb-4">
            Selecciona una o más recetas base para usar sus ingredientes predefinidos.
          </p>

          <!-- Lista de recetas base seleccionadas -->
          <div v-if="form.recipe_base_ids.length > 0" class="space-y-3 mb-6">
            <div
              v-for="(recipeBaseId, index) in form.recipe_base_ids"
              :key="index"
              class="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg border border-border"
            >
              <div class="flex-1">
                <select
                  v-model="form.recipe_base_ids[index]"
                  class="input-base w-full px-3 py-2 text-sm"
                  @change="onRecipeBaseChange"
                >
                  <option value="">Seleccionar receta base...</option>
                  <option v-for="recipe in recipeBases" :key="recipe.id" :value="recipe.id">
                    {{ recipe.name }}
                  </option>
                </select>

                <!-- Ingredientes de esta receta base -->
                <div v-if="recipeBaseId && getRecipeBaseIngredients(recipeBaseId).length > 0" class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <div class="text-xs space-y-1">
                    <div
                      v-for="ing in getRecipeBaseIngredients(recipeBaseId)"
                      :key="ing.id"
                      class="flex justify-between text-text-secondary"
                    >
                      <span>{{ ing.ingredient_name }}</span>
                      <span>{{ ing.base_quantity }} {{ ing.unit }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                @click="removeRecipeBase(index)"
                class="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="Eliminar receta base"
              >
                <Icon name="heroicons:trash" class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else class="text-center py-6 text-text-secondary border border-dashed border-border rounded-lg mb-6">
            <p class="text-sm">No hay recetas base agregadas</p>
            <p class="text-xs mt-1">Haz clic en "+ Agregar Receta Base" para comenzar</p>
          </div>
        </div>

        <!-- Ingredientes Adicionales -->
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-text-primary mb-2">Ingredientes Adicionales</h3>
          <p class="text-sm text-text-secondary mb-4">
            Agrega ingredientes adicionales específicos para este producto
          </p>

          <!-- Lista de ingredientes -->
          <div class="space-y-3 mb-4">
            <div
              v-for="(ingredient, index) in form.ingredients"
              :key="index"
              class="flex items-start gap-3 p-4 bg-surface-secondary rounded-lg border border-border"
            >
              <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <select
                    v-model="ingredient.ingredient_id"
                    required
                    class="input-base w-full px-3 py-2 text-sm"
                  >
                    <option value="" disabled>Seleccione ingrediente</option>
                    <option v-for="ing in ingredients" :key="ing.id" :value="ing.id">
                      {{ ing.name }} ({{ formatCurrency(ing.costo_unitario || 0) }}/{{ ing.unit }})
                    </option>
                  </select>
                </div>
                <div>
                  <input
                    v-model.number="ingredient.quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cantidad"
                    required
                    class="input-base w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <input
                    v-model="ingredient.unit"
                    type="text"
                    placeholder="Unidad (g, ml, u)"
                    required
                    class="input-base w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                type="button"
                @click="removeIngredient(index)"
                class="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="Eliminar ingrediente"
              >
                <Icon name="heroicons:trash" class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Botón agregar ingrediente -->
          <UiButton
            type="button"
            variant="outline"
            size="default"
            class="w-full"
            @click="addIngredient"
          >
            <Icon name="heroicons:plus" class="h-5 w-5 mr-2" />
            Agregar Ingrediente
          </UiButton>
        </div>

        <!-- Configuración -->
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-text-primary mb-6">Configuración</h3>
          <div class="space-y-4">
            <!-- REMOVED: Controla Stock - ALL products now automatically control inventory -->

            <div class="flex items-start space-x-3">
              <input
                v-model="form.is_available"
                type="checkbox"
                id="is_available"
                class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
              />
              <div>
                <label for="is_available" class="text-sm font-medium text-text-primary block">
                  Disponible
                </label>
                <p class="text-xs text-text-secondary mt-1">
                  El producto aparece en el menú y se puede vender
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-3">
              <input
                v-model="form.is_combo"
                type="checkbox"
                id="is_combo"
                class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
              />
              <div>
                <label for="is_combo" class="text-sm font-medium text-text-primary block">
                  Es Combo
                </label>
                <p class="text-xs text-text-secondary mt-1">
                  Marca este producto como un combo de varios items
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: Summary & Actions -->
    <div class="xl:col-span-1 space-y-6">
      <!-- Summary Card -->
      <div class="bg-surface border-2 border-border rounded-xl p-6 shadow-sm sticky top-6">
        <h3 class="text-lg font-semibold text-text-primary mb-4">Resumen</h3>

        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-text-secondary">Precio:</span>
            <span class="font-semibold text-text-primary">{{ formatCurrency(form.price) }}</span>
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-text-secondary">Costo:</span>
            <span class="font-semibold text-text-primary">{{ formatCurrency(calculatedCost) }}</span>
          </div>

          <div class="flex justify-between text-sm pt-3 border-t border-border">
            <span class="text-text-secondary">Margen:</span>
            <span class="font-semibold text-primary">{{ formatCurrency(form.price - calculatedCost) }}</span>
          </div>

          <div class="flex justify-between text-sm">
            <span class="text-text-secondary">Ingredientes:</span>
            <span class="font-semibold text-text-primary">{{ form.ingredients.length }}</span>
          </div>
        </div>

        <div class="mt-6 pt-6 border-t border-border space-y-3">
          <UiButton
            type="submit"
            variant="default"
            size="lg"
            class="w-full"
            :disabled="isSubmitting"
          >
            <Icon v-if="!isSubmitting" name="heroicons:check" class="h-5 w-5 mr-2" />
            <Icon v-else name="heroicons:arrow-path" class="h-5 w-5 mr-2 animate-spin" />
            {{ isSubmitting ? 'Guardando...' : 'Actualizar Producto' }}
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
            @click="deleteProduct"
            :disabled="isSubmitting"
          >
            <Icon name="heroicons:trash" class="h-5 w-5 mr-2" />
            Eliminar Producto
          </UiButton>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  layout: 'dashboard',
  pageTransition: {
    name: 'fade',
    mode: 'out-in'
  },
  middleware: defineNuxtRouteMiddleware((to, from) => {
    const backButton = useState('backButton')
    backButton.value = {
      label: 'Volver a Productos',
      action: () => navigateTo('/menu/productos')
    }
  })
})

const route = useRoute()
const router = useRouter()
const { currentTenant } = useTenantReactive()

// Get product ID from route
const productId = route.params.id as string

// Fetch product data from backend
const { data: productData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `product-${productId}`,
  () => $fetch(`/api/menu/products/${productId}`),
  {
    server: false,
    default: () => null
  }
)

// Fetch categories for dropdown
const { data: categoriesData } = useAsyncData(
  `categories-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/categories'),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Fetch recipe bases for dropdown
const { data: recipeBasesData } = useAsyncData(
  `recipe-bases-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/recipe-bases', {
    query: {
      limit: 250,
      is_active: true,
      include_ingredients: true
    }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Fetch ingredients for dropdown
const { data: ingredientsData } = useAsyncData(
  `ingredients-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/suppliers/ingredients', { query: { limit: 250 } }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

const categories = computed(() => categoriesData.value?.data || [])
const ingredients = computed(() => ingredientsData.value?.data || [])
const recipeBases = computed(() => recipeBasesData.value?.data || [])

// Computed: Get all ingredients from all selected recipe bases
const selectedRecipeBaseIngredients = computed(() => {
  const allIngredients: any[] = []
  form.value.recipe_base_ids.forEach((recipeBaseId: string) => {
    if (recipeBaseId) {
      const selectedRecipe = recipeBases.value.find((r: any) => r.id === recipeBaseId)
      if (selectedRecipe?.ingredients) {
        allIngredients.push(...selectedRecipe.ingredients)
      }
    }
  })
  return allIngredients
})

// Form state
const form = ref({
  name: '',
  description: '',
  price: 0,
  category_id: '',
  preparation_time: 15,
  controla_stock: true,
  is_available: true,
  is_combo: false,
  allow_modifiers: true,
  recipe_base_ids: [] as string[],
  ingredients: [] as Array<{ ingredient_id: string, quantity: number, unit: string }>
})

const isSubmitting = ref(false)

// Watch product data and populate form
watch(productData, (data) => {
  if (data?.data) {
    const product = data.data
    form.value = {
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      category_id: product.category_id,
      preparation_time: product.preparation_time || 15,
      controla_stock: product.controla_stock,
      is_available: product.is_available,
      is_combo: product.is_combo,
      allow_modifiers: product.allow_modifiers,
      recipe_base_ids: product.recipe_base_ids || [],
      ingredients: product.ingredients.map((ing: any) => ({
        ingredient_id: ing.ingredient_id,
        quantity: Number(ing.quantity),
        unit: ing.unit
      }))
    }
  }
}, { immediate: true })

// Computed
const calculatedCost = computed(() => {
  let totalCost = 0

  // Add cost from all recipe base ingredients
  if (selectedRecipeBaseIngredients.value.length > 0) {
    totalCost += selectedRecipeBaseIngredients.value.reduce((sum: number, ing: any) => {
      const ingredient = ingredients.value.find((i: any) => i.id === ing.ingredient_id)
      const costPerUnit = ingredient?.costo_unitario || 0
      return sum + (ing.base_quantity * Number(costPerUnit))
    }, 0)
  }

  // Add cost from additional ingredients
  totalCost += form.value.ingredients.reduce((sum, ing) => {
    const ingredient = ingredients.value.find((i: any) => i.id === ing.ingredient_id)
    const costPerUnit = ingredient?.costo_unitario || 0
    return sum + (ing.quantity * Number(costPerUnit))
  }, 0)

  return totalCost
})

// Methods
function addRecipeBase() {
  form.value.recipe_base_ids.push('')
}

function removeRecipeBase(index: number) {
  form.value.recipe_base_ids.splice(index, 1)
}

function getRecipeBaseIngredients(recipeBaseId: string) {
  if (!recipeBaseId) return []
  const recipe = recipeBases.value.find((r: any) => r.id === recipeBaseId)
  return recipe?.ingredients || []
}

const onRecipeBaseChange = () => {
  console.log('Recipe bases:', form.value.recipe_base_ids)
}

const addIngredient = () => {
  form.value.ingredients.push({
    ingredient_id: '',
    quantity: 0,
    unit: 'g'
  })
}

const removeIngredient = (index: number) => {
  form.value.ingredients.splice(index, 1)
}

const getIngredientName = (ingredientId: string) => {
  const ingredient = ingredients.value.find((i: any) => i.id === ingredientId)
  return ingredient?.name || 'Seleccione un ingrediente'
}

const handleSubmit = async () => {
  isSubmitting.value = true

  try {
    // Validate no duplicate recipe bases
    const recipeBaseIds = form.value.recipe_base_ids.filter(id => id !== '')
    const uniqueRecipeBaseIds = [...new Set(recipeBaseIds)]

    if (recipeBaseIds.length !== uniqueRecipeBaseIds.length) {
      alert('Error: No puedes agregar la misma receta base más de una vez')
      isSubmitting.value = false
      return
    }

    // Filter out empty recipe base IDs before sending
    const cleanedForm = {
      ...form.value,
      recipe_base_ids: uniqueRecipeBaseIds
    }
    await $fetch(`/api/menu/products/${productId}`, {
      method: 'PUT',
      body: cleanedForm
    })

    console.log('✅ Producto actualizado')

    // Navigate back to products list
    await router.push('/menu/productos')
  } catch (error: any) {
    console.error('❌ Error al actualizar producto:', error)
    alert(`Error al actualizar el producto: ${error.data?.detail || error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const deleteProduct = async () => {
  if (!confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
    return
  }

  isSubmitting.value = true

  try {
    await $fetch(`/api/menu/products/${productId}`, {
      method: 'DELETE'
    })

    console.log('✅ Producto eliminado')
    await router.push('/menu/productos')
  } catch (error: any) {
    console.error('❌ Error al eliminar producto:', error)
    alert(`Error al eliminar el producto: ${error.data?.detail || error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

const cancel = () => {
  router.push('/menu/productos')
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const calculateMargin = (price: number, cost: number) => {
  if (!cost) return 0
  return Math.round(((price - cost) / cost) * 100)
}

useHead({
  title: computed(() => productData.value?.data ? `Editar ${productData.value.data.name} - Menú` : 'Editar Producto')
})
</script>
