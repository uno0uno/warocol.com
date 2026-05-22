<template>
  <div class="w-full">
    <!-- Loading State -->
    <div v-if="isLoadingData" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex w-full flex-col">
      <!-- Header Card -->
      <div class="bg-surface border-2 border-border rounded-lg mb-4 sm:mb-6">
        <div class="p-4 sm:p-6">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-lg font-semibold text-text-primary">Gestionar Productos de Reventa</h2>
              <p class="text-sm text-text-secondary">Selecciona items, asigna precios y gestiona disponibilidad</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-text-secondary">Productos activos</p>
              <p class="text-2xl font-bold text-primary">{{ activeProductsCount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="saveChanges">
        <div class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <!-- Header -->
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary">
                Items de Reventa
              </h3>
              <div class="flex gap-2">
                <button
                  type="button"
                  @click="selectAll"
                  class="text-sm text-primary hover:underline"
                >
                  Seleccionar todos
                </button>
                <span class="text-text-secondary">|</span>
                <button
                  type="button"
                  @click="deselectAll"
                  class="text-sm text-text-secondary hover:underline"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            <!-- Empty state if no resale ingredients -->
            <div v-if="resaleIngredients.length === 0" class="text-center py-12 text-text-secondary">
              <svg class="w-16 h-16 mx-auto mb-4 text-titan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p class="text-base font-medium mb-1">No hay ingredientes de reventa</p>
              <p class="text-sm">Primero agrega ingredientes con is_resale = true</p>
            </div>

            <!-- Items Table -->
            <div v-else class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left py-3 px-2 w-10">
                      <input
                        type="checkbox"
                        :checked="allSelected"
                        @change="toggleAll"
                        class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                    </th>
                    <th class="text-left py-3 px-2 text-sm font-medium text-text-secondary">Item</th>
                    <th class="text-left py-3 px-2 text-sm font-medium text-text-secondary w-32">Categoria</th>
                    <th class="text-right py-3 px-2 text-sm font-medium text-text-secondary w-40">Precio Venta</th>
                    <th class="text-center py-3 px-2 text-sm font-medium text-text-secondary w-28">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in itemsWithStatus"
                    :key="item.ingredient.id"
                    class="border-b border-border hover:bg-surface-secondary transition-colors"
                    :class="{
                      'bg-primary/5': item.isActive,
                      'bg-red-50': item.toDelete
                    }"
                  >
                    <td class="py-3 px-2">
                      <input
                        type="checkbox"
                        :checked="item.isActive"
                        @change="toggleItem(item)"
                        class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                    </td>
                    <td class="py-3 px-2">
                      <div class="flex items-center gap-2">
                        <p class="font-medium text-text-primary">{{ item.ingredient.name }}</p>
                        <span v-if="item.existingProduct" class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          Existe
                        </span>
                        <span v-if="item.toDelete" class="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          A eliminar
                        </span>
                        <span v-else-if="item.isNew" class="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Nuevo
                        </span>
                      </div>
                    </td>
                    <td class="py-3 px-2">
                      <span class="text-sm text-text-secondary">{{ item.ingredient.category || '-' }}</span>
                    </td>
                    <td class="py-3 px-2">
                      <div v-if="item.isActive" class="relative">
                        <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm">$</span>
                        <input
                          type="number"
                          v-model.number="item.price"
                          placeholder="0"
                          min="0"
                          step="100"
                          class="w-full pl-6 pr-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary text-right"
                        />
                      </div>
                      <span v-else class="text-sm text-text-tertiary">-</span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <label v-if="item.isActive" class="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          v-model="item.isAvailable"
                          class="sr-only peer"
                        />
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                      <span v-else class="text-sm text-text-tertiary">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-between mt-4 sm:mt-6 gap-3">
          <NuxtLink
            to="/menu/reventa"
            class="btn-secondary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium"
          >
            Cancelar
          </NuxtLink>

          <button
            type="submit"
            :disabled="!hasChanges || !canSubmit || isSubmitting"
            class="btn-primary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[10rem]"
          >
            <UiLoadingDots v-if="isSubmitting" size="12px" />
            <span v-else>Guardar Cambios</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import {
  runConcurrentRequests,
  type MenuSequentialRequest,
} from '@/composables/useMenuCatalogBulkSave'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Gestionar Productos de Reventa' })

const router = useRouter()
const toast = useToast()
const cache = useQueryCache()
const { currentTenant } = useTenantReactive()

// State
const isSubmitting = ref(false)

interface ItemState {
  ingredient: any
  existingProduct: any | null
  price: number
  isAvailable: boolean
  isActive: boolean
  isNew: boolean
  toDelete: boolean
  originalPrice: number
  originalAvailable: boolean
}

const itemsWithStatus = ref<ItemState[]>([])

// Fetch categories
const { data: categoriesData } = useAsyncData(
  `categories-resale-manage-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/categories'),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Fetch ingredients - ONLY resale ingredients
const { data: ingredientsData, pending: loadingIngredients } = useAsyncData(
  `ingredients-resale-manage-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/suppliers/ingredients', {
    query: {
      limit: INGREDIENTS_FETCH_LIMIT,
      is_resale: true
    }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Fetch existing resale products WITH ingredients
const { data: productsData, pending: loadingProducts, refresh: refreshProducts } = useAsyncData(
  `products-resale-manage-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/products', {
    query: {
      limit: 250,
      is_resale: true,
      include_ingredients: true
    }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Computed
const categories = computed(() => categoriesData.value?.data || [])
const resaleIngredients = computed(() => ingredientsData.value?.data || [])
const existingProducts = computed(() => productsData.value?.data || [])

const isLoadingData = computed(() => {
  return loadingIngredients.value || loadingProducts.value
})

// Build items with status when both data sources are loaded
watch([resaleIngredients, existingProducts, isLoadingData], () => {
  // Only build when loading is complete and we have ingredients
  if (!isLoadingData.value && resaleIngredients.value.length > 0) {
    buildItemsWithStatus()
  }
}, { immediate: true })

function buildItemsWithStatus() {
  const products = existingProducts.value || []

  itemsWithStatus.value = resaleIngredients.value.map((ingredient: any) => {
    // Find existing product that uses this ingredient
    const existingProduct = products.find((p: any) =>
      p.ingredients?.some((ing: any) => ing.ingredient_id === ingredient.id)
    )

    const price = existingProduct ? Number(existingProduct.price) : 0
    const isAvailable = existingProduct ? existingProduct.is_available : true

    return {
      ingredient,
      existingProduct,
      price,
      isAvailable,
      isActive: !!existingProduct,
      isNew: false,
      toDelete: false,
      originalPrice: price,
      originalAvailable: isAvailable
    }
  })
}

const allSelected = computed(() => {
  return itemsWithStatus.value.length > 0 &&
    itemsWithStatus.value.every(item => item.isActive)
})

const activeProductsCount = computed(() => {
  return itemsWithStatus.value.filter(item => item.isActive && !item.toDelete).length
})

// Calculate what needs to be done
const toCreate = computed(() => {
  return itemsWithStatus.value.filter(item =>
    item.isActive && !item.existingProduct && item.price > 0
  )
})

const toUpdate = computed(() => {
  return itemsWithStatus.value.filter(item =>
    item.isActive &&
    item.existingProduct &&
    (item.price !== item.originalPrice || item.isAvailable !== item.originalAvailable)
  )
})

const toDeleteList = computed(() => {
  return itemsWithStatus.value.filter(item => item.toDelete)
})

const hasChanges = computed(() => {
  return toCreate.value.length > 0 || toUpdate.value.length > 0 || toDeleteList.value.length > 0
})

const canSubmit = computed(() => {
  // All active items must have price > 0
  const activeItems = itemsWithStatus.value.filter(item => item.isActive && !item.toDelete)
  return activeItems.every(item => item.price > 0)
})

/** Resale ingredients use base unit `und` (backend ALLOWED_UNITS / is_resale rule). */
function resaleRecipeUnit(ingredient: { unit?: string }): string {
  const u = ingredient?.unit || 'und'
  return u === 'u' ? 'und' : u
}

function resaleRecipeRow(ingredient: { id: string, unit?: string }, quantity = 1) {
  return {
    ingredient_id: ingredient.id,
    quantity,
    unit: resaleRecipeUnit(ingredient),
  }
}

// Get default category
const defaultCategoryId = computed(() => {
  const resaleCategory = categories.value.find((c: any) =>
    c.name.toLowerCase().includes('reventa') ||
    c.name.toLowerCase().includes('snack') ||
    c.name.toLowerCase().includes('bebida')
  )
  if (resaleCategory) return resaleCategory.id
  return categories.value[0]?.id || ''
})

// Methods
function toggleItem(item: ItemState) {
  if (item.isActive) {
    // Deactivating
    if (item.existingProduct) {
      // Mark for deletion
      item.toDelete = true
      item.isActive = false
    } else {
      // Just deselect (was new, not created yet)
      item.isActive = false
      item.isNew = false
    }
  } else {
    // Activating
    if (item.toDelete) {
      // Cancel deletion
      item.toDelete = false
      item.isActive = true
    } else if (item.existingProduct) {
      // Re-activate existing
      item.isActive = true
    } else {
      // New product
      item.isActive = true
      item.isNew = true
    }
  }
}

function toggleAll() {
  if (allSelected.value) {
    deselectAll()
  } else {
    selectAll()
  }
}

function selectAll() {
  itemsWithStatus.value.forEach(item => {
    if (!item.isActive) {
      item.isActive = true
      item.toDelete = false
      if (!item.existingProduct) {
        item.isNew = true
      }
    }
  })
}

function deselectAll() {
  itemsWithStatus.value.forEach(item => {
    if (item.isActive) {
      if (item.existingProduct) {
        item.toDelete = true
      }
      item.isActive = false
      item.isNew = false
    }
  })
}

function buildResaleSaveRequests(): {
  creates: MenuSequentialRequest[]
  updates: MenuSequentialRequest[]
  deletes: MenuSequentialRequest[]
} {
  const creates: MenuSequentialRequest[] = toCreate.value.map((item) => ({
    key: `create-${item.ingredient.id}`,
    run: () =>
      $fetch('/api/menu/products', {
        method: 'POST',
        body: {
          name: item.ingredient.name,
          description: '',
          price: item.price,
          category_id: defaultCategoryId.value,
          is_available: item.isAvailable,
          is_resale: true,
          controla_stock: true,
          is_combo: false,
          allow_modifiers: false,
          recipe_base_ids: [],
          ingredients: [resaleRecipeRow(item.ingredient)],
          tenant_id: currentTenant.value?.id || '',
        },
      }).then(() => undefined),
  }))

  const updates: MenuSequentialRequest[] = toUpdate.value.map((item) => {
    const existingRecipe = item.existingProduct?.ingredients?.[0]
    const body: Record<string, unknown> = {
      price: item.price,
      is_available: item.isAvailable,
    }
    if (existingRecipe?.unit === 'u' && item.ingredient?.id) {
      body.ingredients = [resaleRecipeRow(item.ingredient, Number(existingRecipe.quantity) || 1)]
    }
    return {
      key: `update-${item.existingProduct.id}`,
      run: () =>
        $fetch(`/api/menu/products/${item.existingProduct.id}`, {
          method: 'PUT',
          body,
        }).then(() => undefined),
    }
  })

  const deletes: MenuSequentialRequest[] = toDeleteList.value.map((item) => ({
    key: `delete-${item.existingProduct.id}`,
    run: () =>
      $fetch(`/api/menu/products/${item.existingProduct.id}`, {
        method: 'DELETE',
      }).then(() => undefined),
  }))

  return { creates, updates, deletes }
}

async function saveChanges() {
  if (isSubmitting.value || !hasChanges.value || !canSubmit.value) return

  isSubmitting.value = true

  try {
    const { creates, updates, deletes } = buildResaleSaveRequests()

    const createResult = creates.length ? await runConcurrentRequests(creates) : { ok: 0, fail: 0 }
    const updateResult = updates.length ? await runConcurrentRequests(updates) : { ok: 0, fail: 0 }
    const deleteResult = deletes.length ? await runConcurrentRequests(deletes) : { ok: 0, fail: 0 }

    const created = createResult.ok
    const updated = updateResult.ok
    const deleted = deleteResult.ok
    const errors = createResult.fail + updateResult.fail + deleteResult.fail

    const messages: string[] = []
    if (created > 0) messages.push(`${created} creado(s)`)
    if (updated > 0) messages.push(`${updated} actualizado(s)`)
    if (deleted > 0) messages.push(`${deleted} eliminado(s)`)
    if (errors > 0) messages.push(`${errors} error(es)`)

    cache.invalidateQueries({ key: ['menu', 'products'] })
    await refreshProducts()

    if (errors > 0) {
      toast.warning(`Cambios guardados con errores: ${messages.join(', ')}`, { title: 'Guardado parcial' })
    } else if (messages.length > 0) {
      toast.success(messages.join(', '), { title: 'Guardado' })
    } else {
      toast.success('Sin cambios pendientes', { title: 'Guardado' })
    }
  } catch (error: unknown) {
    console.error('Error saving changes:', error)
    const message = error instanceof Error ? error.message : 'Por favor intenta de nuevo.'
    toast.error(`Error al guardar: ${message}`, { title: 'Error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>
