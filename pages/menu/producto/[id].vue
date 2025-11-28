<template>
  <div v-if="!product" class="flex items-center justify-center min-h-[400px]">
    <div class="text-center">
      <Icon name="heroicons:exclamation-circle" class="h-16 w-16 mx-auto text-text-secondary mb-4" />
      <p class="text-text-secondary">Producto no encontrado</p>
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
              <input
                v-model="form.category"
                type="text"
                required
                class="input-base w-full px-4 py-2"
                placeholder="Ej: Hamburguesas, Bebidas, Pizzas"
              />
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

        <!-- Receta / Ingredientes -->
        <div class="mt-8">
          <h3 class="text-lg font-semibold text-text-primary mb-6">Receta / Ingredientes</h3>

          <!-- Lista de ingredientes -->
          <div class="space-y-3 mb-4">
            <div
              v-for="(ingredient, index) in form.ingredients"
              :key="index"
              class="flex items-start gap-3 p-4 bg-surface-secondary rounded-lg border border-border"
            >
              <div class="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <input
                    v-model="ingredient.name"
                    type="text"
                    placeholder="Nombre ingrediente"
                    class="input-base w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <input
                    v-model.number="ingredient.quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cantidad"
                    class="input-base w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <input
                    v-model="ingredient.unit"
                    type="text"
                    placeholder="Unidad (g, ml, u)"
                    class="input-base w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <input
                    v-model.number="ingredient.cost_per_unit"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Costo/unidad"
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
            <div class="flex items-start space-x-3">
              <input
                v-model="form.controla_stock"
                type="checkbox"
                id="controla_stock"
                class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
              />
              <div>
                <label for="controla_stock" class="text-sm font-medium text-text-primary block">
                  Controla Stock
                </label>
                <p class="text-xs text-text-secondary mt-1">
                  Valida y descuenta ingredientes al vender
                </p>
              </div>
            </div>

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
import { ref, computed, onMounted } from 'vue'
import { useProductsStore, type RecipeIngredient } from '@/stores/useProductsStore'

definePageMeta({
  layout: 'dashboard',
  pageTransition: {
    name: 'fade',
    mode: 'out-in'
  },
  middleware: defineNuxtRouteMiddleware((to, from) => {
    // Set back button in layout
    const backButton = useState('backButton')
    backButton.value = {
      label: 'Volver a Productos',
      action: () => navigateTo('/menu/productos')
    }
  })
})

const route = useRoute()
const router = useRouter()
const productsStore = useProductsStore()

// Get product ID from route
const productId = route.params.id as string

// Load product
const product = computed(() => productsStore.getProduct(productId))

// Form state
const form = ref({
  name: '',
  description: '',
  price: 0,
  category: '',
  preparation_time: 15,
  controla_stock: true,
  is_available: true,
  is_combo: false,
  ingredients: [] as RecipeIngredient[]
})

const isSubmitting = ref(false)

// Load product data into form
onMounted(() => {
  if (product.value) {
    form.value = {
      name: product.value.name,
      description: product.value.description,
      price: product.value.price,
      category: product.value.category,
      preparation_time: product.value.preparation_time,
      controla_stock: product.value.controla_stock,
      is_available: product.value.is_available,
      is_combo: product.value.is_combo,
      ingredients: JSON.parse(JSON.stringify(product.value.ingredients)) // Deep copy
    }
  }
})

// Computed
const calculatedCost = computed(() => {
  return form.value.ingredients.reduce((sum, ing) => {
    return sum + (ing.quantity * ing.cost_per_unit)
  }, 0)
})

// Methods
const addIngredient = () => {
  form.value.ingredients.push({
    id: `temp_${Date.now()}`,
    name: '',
    quantity: 0,
    unit: 'g',
    cost_per_unit: 0,
    controla_inventario: true
  })
}

const removeIngredient = (index: number) => {
  form.value.ingredients.splice(index, 1)
}

const handleSubmit = async () => {
  isSubmitting.value = true

  try {
    // Update product in store
    const updated = productsStore.updateProduct(productId, {
      name: form.value.name,
      description: form.value.description,
      price: form.value.price,
      category: form.value.category,
      preparation_time: form.value.preparation_time,
      controla_stock: form.value.controla_stock,
      is_available: form.value.is_available,
      is_combo: form.value.is_combo,
      ingredients: form.value.ingredients
    })

    console.log('✅ Producto actualizado:', updated)

    // Navigate back to products list
    await router.push('/menu/productos')
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error)
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
    const success = productsStore.deleteProduct(productId)

    if (success) {
      console.log('✅ Producto eliminado')
      await router.push('/menu/productos')
    }
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error)
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
  title: computed(() => product.value ? `Editar ${product.value.name} - Menú` : 'Producto no encontrado')
})
</script>
