import type { Ref } from 'vue'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import {
  runConcurrentRequests,
  type MenuSequentialRequest,
} from '@/composables/useMenuCatalogBulkSave'

/** Normaliza is_available del API (boolean o string) para toggles de UI. */
export function normalizeCatalogBoolean(value: unknown): boolean {
  if (value === true || value === 'true' || value === 1 || value === '1') return true
  if (value === false || value === 'false' || value === 0 || value === '0') return false
  return Boolean(value)
}

export type ResaleIngredientItemState = {
  ingredient: { id: string, name: string, category?: string, unit?: string }
  existingProduct: {
    id: string
    price: number | string
    is_available?: unknown
    costo_calculado?: number | null
    costo_percibido?: number | null
    ingredients?: { ingredient_id: string, quantity?: number, unit?: string }[]
  } | null
  price: number
  isAvailable: boolean
  isActive: boolean
  isNew: boolean
  toDelete: boolean
  originalPrice: number
  originalAvailable: boolean
}

export type ResaleIngredientTableRow = {
  id: string
  _item: ResaleIngredientItemState
  name: string
  category_name: string
  price: number
  is_available: boolean
  costo_calculado: number | null
  costo_percibido: number | null
}

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

export function useResaleIngredientCatalog(currentTenant: Ref<{ id: string } | null | undefined>) {
  const toast = useToast()
  const cache = useQueryCache()

  const isSubmitting = ref(false)
  const itemsWithStatus = ref<ResaleIngredientItemState[]>([])

  const { data: categoriesData } = useAsyncData(
    () => `categories-resale-${currentTenant.value?.id || 'default'}`,
    () => $fetch('/api/menu/categories'),
    { server: false, watch: [currentTenant], default: () => ({ data: [] }) },
  )

  const { data: ingredientsData, pending: loadingIngredients, refresh: refreshIngredients } = useAsyncData(
    () => `ingredients-resale-${currentTenant.value?.id || 'default'}`,
    () => $fetch('/api/suppliers/ingredients', {
      query: { limit: INGREDIENTS_FETCH_LIMIT, is_resale: true },
    }),
    { server: false, watch: [currentTenant], default: () => ({ data: [] }) },
  )

  const { data: productsData, pending: loadingProducts, refresh: refreshProducts } = useAsyncData(
    () => `products-resale-all-${currentTenant.value?.id || 'default'}`,
    () => $fetch('/api/menu/products', {
      query: {
        limit: INGREDIENTS_FETCH_LIMIT,
        is_resale: true,
        include_ingredients: true,
      },
    }),
    { server: false, watch: [currentTenant], default: () => ({ data: [] }) },
  )

  const categories = computed(() => categoriesData.value?.data || [])
  const resaleIngredients = computed(() => ingredientsData.value?.data || [])
  const existingProducts = computed(() => productsData.value?.data || [])

  const isLoadingData = computed(() => loadingIngredients.value || loadingProducts.value)
  const isRefreshing = computed(() =>
    (loadingIngredients.value || loadingProducts.value) && itemsWithStatus.value.length > 0,
  )

  function buildItemsWithStatus() {
    const products = existingProducts.value || []

    itemsWithStatus.value = resaleIngredients.value.map((ingredient: ResaleIngredientItemState['ingredient']) => {
      const existingProduct = products.find((p: ResaleIngredientItemState['existingProduct']) =>
        p?.ingredients?.some(ing => ing.ingredient_id === ingredient.id),
      ) ?? null

      const price = existingProduct ? Number(existingProduct.price) : 0
      const isAvailable = existingProduct
        ? normalizeCatalogBoolean(existingProduct.is_available)
        : true

      return {
        ingredient,
        existingProduct,
        price,
        isAvailable,
        isActive: !!existingProduct,
        isNew: false,
        toDelete: false,
        originalPrice: price,
        originalAvailable: isAvailable,
      }
    })
  }

  watch([resaleIngredients, existingProducts, isLoadingData], () => {
    if (!isLoadingData.value) {
      buildItemsWithStatus()
    }
  }, { immediate: true })

  const activeProductsCount = computed(() =>
    itemsWithStatus.value.filter(item => item.isActive && !item.toDelete).length,
  )

  const toCreate = computed(() =>
    itemsWithStatus.value.filter(item =>
      item.isActive && !item.toDelete && !item.existingProduct && item.price > 0,
    ),
  )

  const toUpdate = computed(() =>
    itemsWithStatus.value.filter(item =>
      item.isActive
      && !item.toDelete
      && item.existingProduct
      && (item.price !== item.originalPrice || item.isAvailable !== item.originalAvailable),
    ),
  )

  const toDeleteList = computed(() =>
    itemsWithStatus.value.filter(item => item.toDelete && item.existingProduct),
  )

  const hasChanges = computed(() =>
    toCreate.value.length > 0 || toUpdate.value.length > 0 || toDeleteList.value.length > 0,
  )

  const canSubmit = computed(() => {
    const activeItems = itemsWithStatus.value.filter(item => item.isActive && !item.toDelete)
    return activeItems.every(item => item.price > 0)
  })

  const defaultCategoryId = computed(() => {
    const resaleCategory = categories.value.find((c: { name: string }) =>
      c.name.toLowerCase().includes('reventa')
      || c.name.toLowerCase().includes('snack')
      || c.name.toLowerCase().includes('bebida'),
    )
    return resaleCategory?.id ?? categories.value[0]?.id ?? ''
  })

  function itemToTableRow(item: ResaleIngredientItemState): ResaleIngredientTableRow {
    const p = item.existingProduct
    return {
      id: item.ingredient.id,
      _item: item,
      name: item.ingredient.name,
      category_name: item.ingredient.category || 'Sin categoría',
      price: item.price,
      is_available: item.isAvailable,
      costo_calculado: p?.costo_calculado ?? null,
      costo_percibido: p?.costo_percibido ?? null,
    }
  }

  function isInCatalog(item: ResaleIngredientItemState) {
    return item.isActive && !item.toDelete
  }

  function toggleItem(item: ResaleIngredientItemState) {
    if (item.isActive && !item.toDelete) {
      if (item.existingProduct) {
        item.toDelete = true
        item.isActive = false
      } else {
        item.isActive = false
        item.isNew = false
      }
    } else if (item.toDelete) {
      item.toDelete = false
      item.isActive = true
    } else if (item.existingProduct) {
      item.isActive = true
    } else {
      item.isActive = true
      item.isNew = true
    }
  }

  function toggleItemAvailability(item: ResaleIngredientItemState) {
    if (!isInCatalog(item)) return
    item.isAvailable = !item.isAvailable
  }

  function discardChanges() {
    if (hasChanges.value && !window.confirm('¿Descartar los cambios sin guardar?')) return
    buildItemsWithStatus()
  }

  function buildResaleSaveRequests(): {
    creates: MenuSequentialRequest[]
    updates: MenuSequentialRequest[]
    deletes: MenuSequentialRequest[]
  } {
    const creates: MenuSequentialRequest[] = toCreate.value.map(item => ({
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
        key: `update-${item.existingProduct!.id}`,
        run: () =>
          $fetch(`/api/menu/products/${item.existingProduct!.id}`, {
            method: 'PUT',
            body,
          }).then(() => undefined),
      }
    })

    const deletes: MenuSequentialRequest[] = toDeleteList.value.map(item => ({
      key: `delete-${item.existingProduct!.id}`,
      run: () =>
        $fetch(`/api/menu/products/${item.existingProduct!.id}`, {
          method: 'DELETE',
        }).then(() => undefined),
    }))

    return { creates, updates, deletes }
  }

  async function reloadCatalog() {
    await Promise.all([refreshIngredients(), refreshProducts()])
    buildItemsWithStatus()
  }

  async function saveChanges() {
    if (isSubmitting.value || !hasChanges.value || !canSubmit.value) return

    isSubmitting.value = true

    try {
      const { creates, updates, deletes } = buildResaleSaveRequests()

      const createResult = creates.length ? await runConcurrentRequests(creates) : { ok: 0, fail: 0 }
      const updateResult = updates.length ? await runConcurrentRequests(updates) : { ok: 0, fail: 0 }
      const deleteResult = deletes.length ? await runConcurrentRequests(deletes) : { ok: 0, fail: 0 }

      const errors = createResult.fail + updateResult.fail + deleteResult.fail
      const messages: string[] = []
      if (createResult.ok > 0) messages.push(`${createResult.ok} creado(s)`)
      if (updateResult.ok > 0) messages.push(`${updateResult.ok} actualizado(s)`)
      if (deleteResult.ok > 0) messages.push(`${deleteResult.ok} eliminado(s)`)
      if (errors > 0) messages.push(`${errors} error(es)`)

      cache.invalidateQueries({ key: ['menu', 'products'] })
      cache.invalidateQueries({ key: ['menu', 'products-resale'] })
      await reloadCatalog()

      if (errors > 0) {
        toast.warning(`Guardado parcial: ${messages.join(', ')}`, { title: 'Atención' })
      } else if (messages.length > 0) {
        toast.success(messages.join(', '), { title: 'Guardado' })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Por favor intenta de nuevo.'
      toast.error(`Error al guardar: ${message}`, { title: 'Error' })
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    categories,
    resaleIngredients,
    isLoadingData,
    isRefreshing,
    itemsWithStatus,
    activeProductsCount,
    hasChanges,
    canSubmit,
    isSubmitting,
    itemToTableRow,
    isInCatalog,
    toggleItem,
    toggleItemAvailability,
    discardChanges,
    saveChanges,
    reloadCatalog,
    buildItemsWithStatus,
  }
}
