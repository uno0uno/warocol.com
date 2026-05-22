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
          <div class="flex justify-between items-center gap-4">
            <div>
              <h2 class="text-lg font-semibold text-text-primary">Nuevo producto de reventa</h2>
              <p class="text-sm text-text-secondary">
                Activa ingredientes de reventa que aún no están en el catálogo. Para editar productos existentes usa
                <NuxtLink to="/menu/reventa" class="text-primary hover:underline">Menú → Reventa</NuxtLink>.
              </p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-xs text-text-secondary">Seleccionados</p>
              <p class="text-2xl font-bold text-primary">{{ selectedCount }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="saveChanges">
        <div class="bg-surface border-border border rounded-lg">
          <div class="p-4 sm:p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-base sm:text-lg font-semibold text-text-primary">
                Ingredientes sin producto
              </h3>
              <div v-if="pendingItems.length > 0" class="flex gap-2">
                <button
                  type="button"
                  class="text-sm text-primary hover:underline"
                  @click="selectAll"
                >
                  Seleccionar todos
                </button>
                <span class="text-text-secondary">|</span>
                <button
                  type="button"
                  class="text-sm text-text-secondary hover:underline"
                  @click="deselectAll"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            <div v-if="pendingItems.length === 0" class="text-center py-12 text-text-secondary">
              <svg class="w-16 h-16 mx-auto mb-4 text-titan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-base font-medium mb-1">No hay ingredientes pendientes</p>
              <p class="text-sm mb-4">
                Todos los ingredientes de reventa ya tienen producto en el catálogo.
              </p>
              <NuxtLink
                to="/menu/reventa"
                class="btn-primary inline-flex px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground"
              >
                Ir al catálogo de reventa
              </NuxtLink>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-border">
                    <th class="text-left py-3 px-2 w-10">
                      <input
                        type="checkbox"
                        :checked="allSelected"
                        class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        @change="toggleAll"
                      >
                    </th>
                    <th class="text-left py-3 px-2 text-sm font-medium text-text-secondary">Item</th>
                    <th class="text-left py-3 px-2 text-sm font-medium text-text-secondary w-32">Categoria</th>
                    <th class="text-right py-3 px-2 text-sm font-medium text-text-secondary w-40">Precio venta</th>
                    <th class="text-center py-3 px-2 text-sm font-medium text-text-secondary w-28">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in pendingItems"
                    :key="item.ingredient.id"
                    class="border-b border-border hover:bg-surface-secondary transition-colors"
                    :class="{ 'bg-primary/5': item.isActive }"
                  >
                    <td class="py-3 px-2">
                      <input
                        type="checkbox"
                        :checked="item.isActive"
                        class="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        @change="toggleItem(item)"
                      >
                    </td>
                    <td class="py-3 px-2">
                      <p class="font-medium text-text-primary">{{ item.ingredient.name }}</p>
                    </td>
                    <td class="py-3 px-2">
                      <span class="text-sm text-text-secondary">{{ item.ingredient.category || '-' }}</span>
                    </td>
                    <td class="py-3 px-2">
                      <div v-if="item.isActive" class="relative">
                        <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm">$</span>
                        <input
                          v-model.number="item.price"
                          type="number"
                          placeholder="0"
                          min="0"
                          step="100"
                          class="w-full pl-6 pr-2 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary text-right"
                        >
                      </div>
                      <span v-else class="text-sm text-text-tertiary">-</span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <label v-if="item.isActive" class="relative inline-flex items-center cursor-pointer">
                        <input
                          v-model="item.isAvailable"
                          type="checkbox"
                          class="sr-only peer"
                        >
                        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                      </label>
                      <span v-else class="text-sm text-text-tertiary">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

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
            <span v-else>Crear productos</span>
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

useHead({ title: 'Nuevo producto de reventa' })

const router = useRouter()
const toast = useToast()
const cache = useQueryCache()
const { currentTenant } = useTenantReactive()

const isSubmitting = ref(false)

interface PendingItem {
  ingredient: { id: string, name: string, category?: string, unit?: string }
  price: number
  isAvailable: boolean
  isActive: boolean
}

const pendingItems = ref<PendingItem[]>([])

const { data: categoriesData } = useAsyncData(
  `categories-resale-create-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/categories'),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] }),
  },
)

const { data: ingredientsData, pending: loadingIngredients } = useAsyncData(
  `ingredients-resale-create-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/suppliers/ingredients', {
    query: {
      limit: INGREDIENTS_FETCH_LIMIT,
      is_resale: true,
    },
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] }),
  },
)

const { data: productsData, pending: loadingProducts } = useAsyncData(
  `products-resale-create-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/products', {
    query: {
      limit: INGREDIENTS_FETCH_LIMIT,
      is_resale: true,
      include_ingredients: true,
    },
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] }),
  },
)

const categories = computed(() => categoriesData.value?.data || [])
const resaleIngredients = computed(() => ingredientsData.value?.data || [])
const existingProducts = computed(() => productsData.value?.data || [])

const isLoadingData = computed(() => loadingIngredients.value || loadingProducts.value)

function ingredientHasProduct(ingredientId: string) {
  return existingProducts.value.some((p: { ingredients?: { ingredient_id: string }[] }) =>
    p.ingredients?.some(ing => ing.ingredient_id === ingredientId),
  )
}

function buildPendingItems() {
  pendingItems.value = resaleIngredients.value
    .filter((ingredient: { id: string }) => !ingredientHasProduct(ingredient.id))
    .map((ingredient: { id: string, name: string, category?: string, unit?: string }) => ({
      ingredient,
      price: 0,
      isAvailable: true,
      isActive: false,
    }))
}

watch([resaleIngredients, existingProducts, isLoadingData], () => {
  if (!isLoadingData.value) {
    buildPendingItems()
  }
}, { immediate: true })

const allSelected = computed(() =>
  pendingItems.value.length > 0 && pendingItems.value.every(item => item.isActive),
)

const selectedCount = computed(() =>
  pendingItems.value.filter(item => item.isActive).length,
)

const toCreate = computed(() =>
  pendingItems.value.filter(item => item.isActive && item.price > 0),
)

const hasChanges = computed(() => toCreate.value.length > 0)

const canSubmit = computed(() => {
  const activeItems = pendingItems.value.filter(item => item.isActive)
  return activeItems.length > 0 && activeItems.every(item => item.price > 0)
})

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

const defaultCategoryId = computed(() => {
  const resaleCategory = categories.value.find((c: { name: string }) =>
    c.name.toLowerCase().includes('reventa')
    || c.name.toLowerCase().includes('snack')
    || c.name.toLowerCase().includes('bebida'),
  )
  if (resaleCategory) return resaleCategory.id
  return categories.value[0]?.id || ''
})

function toggleItem(item: PendingItem) {
  item.isActive = !item.isActive
}

function toggleAll() {
  if (allSelected.value) {
    deselectAll()
  } else {
    selectAll()
  }
}

function selectAll() {
  pendingItems.value.forEach((item) => {
    item.isActive = true
  })
}

function deselectAll() {
  pendingItems.value.forEach((item) => {
    item.isActive = false
  })
}

function buildCreateRequests(): MenuSequentialRequest[] {
  return toCreate.value.map(item => ({
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
}

async function saveChanges() {
  if (isSubmitting.value || !hasChanges.value || !canSubmit.value) return

  isSubmitting.value = true

  try {
    const creates = buildCreateRequests()
    const result = await runConcurrentRequests(creates)

    cache.invalidateQueries({ key: ['menu', 'products'] })
    cache.invalidateQueries({ key: ['menu', 'products-resale'] })

    if (result.fail > 0) {
      toast.warning(
        `${result.ok} creado(s), ${result.fail} error(es)`,
        { title: 'Guardado parcial' },
      )
      return
    }

    toast.success(
      result.ok === 1 ? '1 producto creado' : `${result.ok} productos creados`,
      { title: 'Listo' },
    )
    await router.push('/menu/reventa')
  } catch (error: unknown) {
    console.error('Error creating resale products:', error)
    const message = error instanceof Error ? error.message : 'Por favor intenta de nuevo.'
    toast.error(`Error al crear: ${message}`, { title: 'Error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>
