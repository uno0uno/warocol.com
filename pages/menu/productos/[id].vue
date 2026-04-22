<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError || !productData" />

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

          <!-- Categoría de Impuesto — solo visible cuando el tenant tiene impuestos activos -->
          <div v-if="hasTaxes" class="mt-8">
            <h3 class="text-lg font-semibold text-text-primary mb-2">Categoría de Impuesto</h3>
            <p class="text-sm text-text-secondary mb-4">
              Define cómo se aplica el impuesto a este producto según la configuración del negocio.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" aria-label="Categoría de impuesto">
              <button
                type="button"
                @click="form.tax_category = 'standard'"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                  form.tax_category === 'standard'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <span class="text-sm font-semibold">Alimento / Bebida</span>
                <span class="text-xs leading-snug">INC 8% o IVA 19% según configuración del negocio</span>
              </button>
              <button
                type="button"
                @click="form.tax_category = 'liquor'"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                  form.tax_category === 'liquor'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <span class="text-sm font-semibold">Licor para llevar</span>
                <span class="text-xs leading-snug">IVA licores 5% — botellas o licores para llevar</span>
              </button>
              <button
                type="button"
                @click="form.tax_category = 'exempt'"
                :class="[
                  'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left',
                  form.tax_category === 'exempt'
                    ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
                    : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60'
                ]"
              >
                <span class="text-sm font-semibold">Exento</span>
                <span class="text-xs leading-snug">Sin impuesto — alimentos básicos sin transformación</span>
              </button>
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
            <p v-if="duplicateRecipeBaseError" class="text-sm text-destructive flex items-center gap-1 mb-3">
              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ duplicateRecipeBaseError }}
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
            <p v-if="quantityError" class="text-sm text-destructive flex items-center gap-1 mb-3">
              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ quantityError }}
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
                    <UiIngredientSearchInput
                      :initialValue="ingredient.ingredient_name"
                      :allow-create="true"
                      @select="(ing) => selectIngredient(ing, index)"
                      @create="(name) => openCustomIngModal(name, index)"
                    />
                  </div>
                  <div>
                    <input
                      v-model.number="ingredient.quantity"
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Cantidad"
                      required
                      class="input-base w-full px-3 py-2 text-sm"
                    />
                  </div>
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
                  v-model="form.is_available_online"
                  type="checkbox"
                  id="is_available_online"
                  class="h-4 w-4 mt-0.5 text-primary focus:ring-primary border-border rounded"
                />
                <div>
                  <label for="is_available_online" class="text-sm font-medium text-text-primary block">
                    Disponible para domicilios
                  </label>
                  <p class="text-xs text-text-secondary mt-1">
                    El producto aparece en el menú de pedidos online (delivery/pickup)
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
            <p v-if="submitError" class="text-sm text-destructive flex items-center gap-1">
              <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              {{ submitError }}
            </p>
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

    <!-- Delete confirmation modal -->
    <UiModal v-model="showDeleteModal" title="Eliminar Producto">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <Icon name="heroicons:trash" class="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p class="text-sm text-text-primary font-medium mb-1">¿Eliminar este producto?</p>
            <p class="text-sm text-text-secondary">Esta acción no se puede deshacer. El producto será eliminado permanentemente.</p>
          </div>
        </div>
        <div v-if="deleteError" class="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {{ deleteError }}
        </div>
        <div class="flex gap-3 mt-6">
          <UiButton type="button" variant="outline" class="flex-1" @click="showDeleteModal = false" :disabled="isSubmitting">
            Cancelar
          </UiButton>
          <UiButton type="button" variant="destructive" class="flex-1" @click="confirmDelete" :disabled="isSubmitting">
            <CommonsTheCustomLoader v-if="isSubmitting" size="small" class="mr-2" />
            {{ isSubmitting ? 'Eliminando...' : 'Sí, eliminar' }}
          </UiButton>
        </div>
      </div>
    </UiModal>

    <IngredientesIngredientePropioPanel
      v-model="showCustomIngModal"
      :initial-name="customIngModalName"
      @saved="onCustomIngredientCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuery } from '@pinia/colada'
import { useMenuIngredientsQuery } from '@/composables/queries/useMenuIngredients'
import { useActiveStationsQuery } from '@/composables/queries/useActiveStations'
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
      label: 'Volver a Productos',
      action: () => navigateTo('/menu/productos')
    }
  })
})

const route = useRoute()
const router = useRouter()
const { currentTenant, businessProfile } = useTenantReactive()

// Tax config — only show selector when tenant has taxes enabled
const { data: taxConfigData } = useQuery({
  key: () => ['tenant', 'tax-config', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/api/tenant/tax-config'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const taxConfig = computed(() => taxConfigData.value?.data ?? null)
const hasTaxes = computed(() =>
  !!(taxConfig.value?.inc_applicable || taxConfig.value?.iva_applicable || taxConfig.value?.liquor_tax_applicable)
)

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

// Shared ingredients — kept only for recipe-base cost calculation
const { availableIngredients: ingredients } = useMenuIngredientsQuery()

// Ingredient cache: populated from API response on load or when user selects via UiIngredientSearchInput
const ingredientCache = ref<Record<string, any>>({})
const purchaseUnitsCache = ref<Map<string, any[]>>(new Map())
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

const categories = computed(() => categoriesData.value?.data || [])
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
  is_available_online: true,
  is_combo: false,
  allow_modifiers: true,
  tax_category: 'standard' as 'standard' | 'liquor' | 'exempt',
  recipe_base_ids: [] as string[],
  ingredients: [] as Array<{ ingredient_id: string, ingredient_name: string, quantity: number, unit: string }>,
})

const isSubmitting = ref(false)
const submitError = ref('')
const duplicateRecipeBaseError = ref('')
const quantityError = ref('')

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
      is_available_online: product.is_available_online ?? true,
      is_combo: product.is_combo,
      allow_modifiers: product.allow_modifiers,
      tax_category: (product.tax_category || 'standard') as 'standard' | 'liquor' | 'exempt',
      recipe_base_ids: product.recipe_base_ids || [],
      ingredients: product.ingredients.map((ing: any) => {
        if (ing.ingredient_id) {
          ingredientCache.value[ing.ingredient_id] = { id: ing.ingredient_id, name: ing.ingredient_name || '', unit: ing.unit }
          loadPurchaseUnits(ing.ingredient_id)
        }
        return {
          ingredient_id: ing.ingredient_id,
          ingredient_name: ing.ingredient_name || '',
          quantity: Number(ing.quantity),
          unit: ing.unit
        }
      }),
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
      const costPerUnit = ingredient?.costo_unitario || ingredient?.price || 0
      return sum + (ing.base_quantity * Number(costPerUnit))
    }, 0)
  }

  // Add cost from additional ingredients
  totalCost += form.value.ingredients.reduce((sum, ing) => {
    const ingredient = ingredientCache.value[ing.ingredient_id]
    const costPerUnit = ingredient?.costo_unitario || ingredient?.price || 0
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
    ingredient_name: '',
    quantity: 0,
    unit: 'g'
  })
}

const removeIngredient = (index: number) => {
  form.value.ingredients.splice(index, 1)
}

const getIngredientName = (ingredientId: string) => {
  const ingredient = ingredientCache.value[ingredientId]
  return ingredient?.name || 'Seleccione un ingrediente'
}

const handleSubmit = async () => {
  submitError.value = ''
  duplicateRecipeBaseError.value = ''
  quantityError.value = ''

  // Validate ingredient quantities > 0
  const hasZeroQuantity = form.value.ingredients.some(ing => !ing.quantity || ing.quantity <= 0)
  if (hasZeroQuantity) {
    quantityError.value = 'Todos los ingredientes deben tener una cantidad mayor a 0.'
    return
  }

  isSubmitting.value = true

  try {
    // Validate no duplicate recipe bases
    const recipeBaseIds = form.value.recipe_base_ids.filter(id => id !== '')
    const uniqueRecipeBaseIds = [...new Set(recipeBaseIds)]

    if (recipeBaseIds.length !== uniqueRecipeBaseIds.length) {
      duplicateRecipeBaseError.value = 'No puedes agregar la misma receta base más de una vez.'
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

    // clearNuxtData()
    await router.push('/menu/productos')
  } catch (error: any) {
    console.error('❌ Error al actualizar producto:', error)
    submitError.value = `Error al actualizar el producto: ${error.data?.detail || error.message}`
  } finally {
    isSubmitting.value = false
  }
}

const showDeleteModal = ref(false)
const deleteError = ref('')

const deleteProduct = () => {
  deleteError.value = ''
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  isSubmitting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/menu/products/${productId}`, {
      method: 'DELETE'
    })
    showDeleteModal.value = false
    await router.push('/menu/productos')
  } catch (error: any) {
    console.error('❌ Error al eliminar producto:', error)
    deleteError.value = error.data?.detail || error.message || 'Error al eliminar el producto'
  } finally {
    isSubmitting.value = false
  }
}

const cancel = () => {
  // clearNuxtData()
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

const { setRefreshHandler, clearRefreshHandler } = useLayoutActions()
onMounted(() => { setRefreshHandler(refresh) })
onUnmounted(() => { clearRefreshHandler(refresh) })
</script>
