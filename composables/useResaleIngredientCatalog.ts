import type { Ref } from 'vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import {
  MENU_CATALOG_BATCH_MAX,
  runConcurrentRequests,
  type MenuSequentialRequest,
} from '@/composables/useMenuCatalogBulkSave'
import { logReventaCatalog } from '@/composables/useReventaCatalogDebugLog'
import { useToast } from '@/composables/useToast'

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
    name?: string
    price: number | string
    category_id?: string
    category_name?: string
    is_available?: unknown
    is_resale?: boolean
    costo_calculado?: number | null
    costo_percibido?: number | null
    ingredients?: { ingredient_id: string, quantity?: number, unit?: string }[]
  } | null
  price: number
  costoPercibido: number | null
  categoryId: string
  isAvailable: boolean
  isActive: boolean
  isNew: boolean
  toDelete: boolean
  originalPrice: number
  originalAvailable: boolean
  originalCostoPercibido: number | null
  originalCategoryId: string
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

type ResaleProductRow = NonNullable<ResaleIngredientItemState['existingProduct']>

function normalizeEntityId(id: unknown): string {
  return String(id ?? '').trim().toLowerCase()
}

/** Match resale product by recipe ingredient_id, then by exact name (legacy rows without recipe). */
function findProductForIngredient(
  products: ResaleProductRow[],
  ingredient: { id: string, name: string },
): ResaleProductRow | null {
  const ingId = normalizeEntityId(ingredient.id)
  const ingName = (ingredient.name ?? '').trim().toLowerCase()
  let nameFallback: ResaleProductRow | null = null

  for (const p of products) {
    if (!p?.id) continue
    if (p.ingredients?.some(ing => normalizeEntityId(ing.ingredient_id) === ingId)) {
      return p
    }
    if (ingName && (p.name ?? '').trim().toLowerCase() === ingName && !nameFallback) {
      nameFallback = p
    }
  }

  return nameFallback
}

/** GET /menu/products caps limit at 250 — paginate to load full resale mapping. */
async function fetchAllResaleProducts() {
  const limit = MENU_CATALOG_BATCH_MAX
  const merged: NonNullable<ResaleIngredientItemState['existingProduct']>[] = []
  let page = 1
  let total = 0

  do {
    const res = await $fetch<{ data?: NonNullable<ResaleIngredientItemState['existingProduct']>[], total?: number }>(
      '/api/menu/products',
      {
        query: {
          page,
          limit,
          is_resale: true,
          include_ingredients: true,
        },
      },
    )
    const chunk = res?.data ?? []
    total = res?.total ?? chunk.length
    merged.push(...chunk)
    if (chunk.length < limit) break
    page += 1
  } while (merged.length < total)

  return { data: merged, total: merged.length }
}

type ProductsResaleCache = {
  data: NonNullable<ResaleIngredientItemState['existingProduct']>[]
  total: number
}

export function useResaleIngredientCatalog(currentTenant: Ref<{ id: string } | null | undefined>) {
  const toast = useToast()
  const cache = useQueryCache()

  const isSubmittingBulk = ref(false)
  const isSubmittingSave = ref(false)
  const itemsWithStatus = ref<ResaleIngredientItemState[]>([])
  const togglingAvailabilityIds = ref<Set<string>>(new Set())

  const tenantId = computed(() => currentTenant.value?.id ?? 'default')

  const { data: categoriesData } = useQuery({
    key: () => ['menu', 'categories', tenantId.value],
    query: () => $fetch('/api/menu/categories'),
    enabled: () => !!currentTenant.value,
    staleTime: 30_000,
  })

  const {
    data: ingredientsData,
    error: ingredientsError,
    asyncStatus: ingredientsAsyncStatus,
    refetch: refetchIngredients,
  } = useQuery({
    key: () => ['menu', 'resale-ingredients', tenantId.value],
    query: () =>
      $fetch('/api/suppliers/ingredients', {
        query: { limit: INGREDIENTS_FETCH_LIMIT, is_resale: true },
      }),
    enabled: () => !!currentTenant.value,
    staleTime: 30_000,
  })

  const {
    data: productsData,
    error: productsError,
    asyncStatus: productsAsyncStatus,
    refetch: refetchProducts,
  } = useQuery({
    key: () => ['menu', 'products-resale', tenantId.value],
    query: () => fetchAllResaleProducts(),
    enabled: () => !!currentTenant.value,
    staleTime: 30_000,
  })

  const categories = computed(() => (categoriesData.value as { data?: unknown[] })?.data || [])
  const resaleIngredients = computed(() => (ingredientsData.value as { data?: unknown[] })?.data || [])
  const existingProducts = computed(() => (productsData.value as { data?: unknown[] })?.data || [])

  const catalogReady = computed(
    () => ingredientsData.value != null && productsData.value != null,
  )
  const isLoading = computed(() => !catalogReady.value)
  const isRefreshing = computed(() =>
    catalogReady.value
    && (ingredientsAsyncStatus.value === 'loading' || productsAsyncStatus.value === 'loading'),
  )
  const fetchError = computed(() => ingredientsError.value || productsError.value)

  function buildItemsWithStatus() {
    const products = (existingProducts.value || []) as NonNullable<ResaleIngredientItemState['existingProduct']>[]

    itemsWithStatus.value = (resaleIngredients.value as ResaleIngredientItemState['ingredient'][]).map((ingredient) => {
      const existingProduct = findProductForIngredient(products, ingredient)

      const price = existingProduct ? Number(existingProduct.price) : 0
      const isAvailable = existingProduct
        ? normalizeCatalogBoolean(existingProduct.is_available)
        : true
      const costoPercibido =
        existingProduct?.costo_percibido != null && existingProduct.costo_percibido !== ''
          ? Number(existingProduct.costo_percibido)
          : null
      const categoryId = existingProduct?.category_id
        ? String(existingProduct.category_id)
        : ''

      return {
        ingredient,
        existingProduct,
        price,
        costoPercibido,
        categoryId,
        isAvailable,
        isActive: !!existingProduct,
        isNew: false,
        toDelete: false,
        originalPrice: price,
        originalAvailable: isAvailable,
        originalCostoPercibido: costoPercibido,
        originalCategoryId: categoryId,
      }
    })
  }

  function mergeServerIntoLocalItems() {
    const products = (existingProducts.value || []) as NonNullable<ResaleIngredientItemState['existingProduct']>[]

    for (const item of itemsWithStatus.value) {
      const existingProduct = findProductForIngredient(products, item.ingredient)
      const serverPrice = existingProduct ? Number(existingProduct.price) : 0
      const serverAvail = existingProduct
        ? normalizeCatalogBoolean(existingProduct.is_available)
        : true

      item.existingProduct = existingProduct

      if (item.price === item.originalPrice) {
        item.price = serverPrice
        item.originalPrice = serverPrice
      }

      if (item.isAvailable === item.originalAvailable) {
        item.isAvailable = serverAvail
        item.originalAvailable = serverAvail
      }

      const serverCosto =
        existingProduct?.costo_percibido != null && existingProduct.costo_percibido !== ''
          ? Number(existingProduct.costo_percibido)
          : null
      if (item.costoPercibido === item.originalCostoPercibido) {
        item.costoPercibido = serverCosto
        item.originalCostoPercibido = serverCosto
      }

      const serverCategoryId = existingProduct?.category_id
        ? String(existingProduct.category_id)
        : item.categoryId
      if (item.categoryId === item.originalCategoryId) {
        item.categoryId = serverCategoryId
        item.originalCategoryId = serverCategoryId
      }

      if (!item.isNew && !item.toDelete) {
        const wasInCatalog = item.isActive
        const serverInCatalog = !!existingProduct
        if (wasInCatalog === serverInCatalog && item.price === item.originalPrice && item.isAvailable === item.originalAvailable) {
          item.isActive = serverInCatalog
        }
      }
    }
  }

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
      && (
        item.price !== item.originalPrice
        || item.isAvailable !== item.originalAvailable
        || item.categoryId !== item.originalCategoryId
        || item.costoPercibido !== item.originalCostoPercibido
      ),
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
    return activeItems.every(item => item.price > 0 && !!item.categoryId)
  })

  function syncItemsFromServer() {
    if (!catalogReady.value) return
    if (hasChanges.value) {
      mergeServerIntoLocalItems()
    } else {
      buildItemsWithStatus()
    }
  }

  watch([resaleIngredients, existingProducts, catalogReady], () => {
    syncItemsFromServer()
  }, { immediate: true })

  const activeProductsCount = computed(() =>
    itemsWithStatus.value.filter(item => item.isActive && !item.toDelete).length,
  )

  const defaultCategoryId = computed(() => {
    const resaleCategory = (categories.value as { id: string, name: string }[]).find(c =>
      c.name.toLowerCase().includes('reventa')
      || c.name.toLowerCase().includes('snack')
      || c.name.toLowerCase().includes('bebida'),
    )
    return resaleCategory?.id ?? (categories.value as { id: string }[])[0]?.id ?? ''
  })

  function resolveProductIdForIngredient(ingredientId: string): string | null {
    const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
    if (item?.existingProduct?.id) return String(item.existingProduct.id)

    const ingredient = item?.ingredient
      ?? (resaleIngredients.value as ResaleIngredientItemState['ingredient'][]).find(
        i => i.id === ingredientId,
      )
    if (!ingredient) return null

    const products = (existingProducts.value || []) as ResaleProductRow[]
    const product = findProductForIngredient(products, ingredient)
    return product?.id ? String(product.id) : null
  }

  function linkExistingProductOnItem(ingredientId: string) {
    const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
    if (!item || item.existingProduct?.id) return
    const products = (existingProducts.value || []) as ResaleProductRow[]
    const product = findProductForIngredient(products, item.ingredient)
    if (product) item.existingProduct = product
  }

  function itemToTableRow(item: ResaleIngredientItemState): ResaleIngredientTableRow {
    const p = item.existingProduct
    const cats = categories.value as { id: string, name: string }[]
    const cat = cats.find(c => c.id === item.categoryId)
    return {
      id: item.ingredient.id,
      _item: item,
      name: item.ingredient.name,
      category_name: cat?.name ?? p?.category_name ?? item.ingredient.category ?? 'Sin categoría',
      price: item.price,
      is_available: item.isAvailable,
      costo_calculado: p?.costo_calculado ?? null,
      costo_percibido: item.costoPercibido ?? p?.costo_percibido ?? null,
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
      if (!item.categoryId) {
        item.categoryId = defaultCategoryId.value
      }
    }
  }

  function toggleItemAvailability(item: ResaleIngredientItemState) {
    if (!isInCatalog(item)) return
    item.isAvailable = !item.isAvailable
  }

  function productsResaleCacheKey() {
    return ['menu', 'products-resale', tenantId.value] as const
  }

  function optimisticPatchProductsResale(
    productIds: string[],
    body: Record<string, string | boolean>,
  ): ProductsResaleCache | undefined {
    const snapshot = cache.getQueryData<ProductsResaleCache>(productsResaleCacheKey())
    logReventaCatalog('catalog', 'optimistic-patch', {
      productIds,
      body,
      cacheRows: snapshot?.data?.length ?? 0,
    })
    if (!snapshot?.data?.length) return snapshot

    const ids = new Set(productIds)
    cache.setQueryData(productsResaleCacheKey(), {
      ...snapshot,
      data: snapshot.data.map((p) => {
        if (!ids.has(p.id)) return p
        const next = { ...p }
        if (body.category_id !== undefined) {
          next.category_id = String(body.category_id)
        }
        if (body.is_available !== undefined) {
          next.is_available = body.is_available
        }
        return next
      }),
    })
    mergeServerIntoLocalItems()
    return snapshot
  }

  function rollbackProductsResaleCache(snapshot: ProductsResaleCache | undefined) {
    if (!snapshot) return
    logReventaCatalog('catalog', 'optimistic-rollback', { cacheRows: snapshot.data?.length ?? 0 })
    cache.setQueryData(productsResaleCacheKey(), snapshot)
    mergeServerIntoLocalItems()
  }

  async function toggleItemAvailabilityOptimistic(item: ResaleIngredientItemState) {
    if (!isInCatalog(item) || !item.existingProduct) {
      toggleItemAvailability(item)
      return
    }

    const productId = item.existingProduct.id
    if (togglingAvailabilityIds.value.has(productId)) return

    const newValue = !item.isAvailable
    const previous = item.isAvailable
    item.isAvailable = newValue
    item.originalAvailable = newValue
    togglingAvailabilityIds.value = new Set([...togglingAvailabilityIds.value, productId])

    const snapshot = optimisticPatchProductsResale([productId], { is_available: newValue })

    try {
      await $fetch(`/api/menu/products/${productId}`, {
        method: 'PUT',
        body: { is_available: newValue },
      })
      await refetchCatalog()
    } catch {
      rollbackProductsResaleCache(snapshot)
      item.isAvailable = previous
      item.originalAvailable = previous
      toast.error('Error al actualizar. Intenta de nuevo.', { title: 'Error' })
    } finally {
      togglingAvailabilityIds.value = new Set(
        [...togglingAvailabilityIds.value].filter(id => id !== productId),
      )
    }
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
            category_id: item.categoryId || defaultCategoryId.value,
            costo_percibido: item.costoPercibido,
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
        category_id: item.categoryId,
        costo_percibido: item.costoPercibido,
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

  async function refetchCatalog() {
    logReventaCatalog('catalog', 'refetch-start', { tenantId: tenantId.value })
    cache.invalidateQueries({ key: ['menu', 'products'] })
    cache.invalidateQueries({ key: ['menu', 'resale-ingredients', tenantId.value] })
    cache.invalidateQueries({ key: ['menu', 'products-resale', tenantId.value] })
    await Promise.all([refetchIngredients(), refetchProducts()])
    syncItemsFromServer()
    const linked = itemsWithStatus.value.filter(i => !!i.existingProduct?.id).length
    logReventaCatalog('catalog', 'refetch-done', {
      ingredients: (resaleIngredients.value as unknown[])?.length ?? 0,
      products: (existingProducts.value as unknown[])?.length ?? 0,
      itemsLinkedToProduct: linked,
    })
  }

  async function saveChanges() {
    if (isSubmittingSave.value || !hasChanges.value || !canSubmit.value) return

    isSubmittingSave.value = true

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
      await refetchCatalog()
      buildItemsWithStatus()

      if (errors > 0) {
        toast.warning(`Guardado parcial: ${messages.join(', ')}`, { title: 'Atención' })
      } else if (messages.length > 0) {
        toast.success(messages.join(', '), { title: 'Guardado' })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Por favor intenta de nuevo.'
      toast.error(`Error al guardar: ${message}`, { title: 'Error' })
    } finally {
      isSubmittingSave.value = false
    }
  }

  return {
    categories,
    resaleIngredients,
    isLoading,
    isRefreshing,
    fetchError,
    itemsWithStatus,
    activeProductsCount,
    catalogHasChanges: hasChanges,
    canSubmit,
    isSubmittingBulk,
    isSubmittingSave,
    togglingAvailabilityIds,
    itemToTableRow,
    isInCatalog,
    toggleItem,
    toggleItemAvailability,
    toggleItemAvailabilityOptimistic,
    discardChanges,
    saveChanges,
    refetchCatalog,
    optimisticPatchProductsResale,
    rollbackProductsResaleCache,
    resolveProductIdForIngredient,
    linkExistingProductOnItem,
    buildItemsWithStatus,
  }
}
