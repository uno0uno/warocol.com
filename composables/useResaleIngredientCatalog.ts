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

function normalizeResaleName(name: string): string {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function recipeIngredientIdFromRow(ing: {
  ingredient_id?: string
  ingredientId?: string
  id?: string
}): string | null {
  const raw = ing.ingredient_id ?? ing.ingredientId ?? ing.id
  return raw != null && String(raw) !== '' ? normalizeEntityId(raw) : null
}

function namesLooselyMatch(ingredientName: string, productName: string): boolean {
  const a = normalizeResaleName(ingredientName)
  const b = normalizeResaleName(productName)
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 4 && b.includes(a)) return true
  if (b.length >= 4 && a.includes(b)) return true
  const tokens = a.split(' ').filter(t => t.length > 2)
  return tokens.length > 0 && tokens.every(t => b.includes(t))
}

/** Match resale product by recipe ingredient_id, then by normalized / loose name. */
function findProductForIngredient(
  products: ResaleProductRow[],
  ingredient: { id: string, name: string },
): ResaleProductRow | null {
  const ingId = normalizeEntityId(ingredient.id)
  const ingName = ingredient.name ?? ''
  let nameFallback: ResaleProductRow | null = null
  let looseFallback: ResaleProductRow | null = null

  for (const p of products) {
    if (!p?.id) continue
    if (p.ingredients?.some(ing => recipeIngredientIdFromRow(ing) === ingId)) {
      return p
    }
    const productName = p.name ?? ''
    if (ingName && namesLooselyMatch(ingName, productName)) {
      if (normalizeResaleName(ingName) === normalizeResaleName(productName)) {
        nameFallback = p
      } else if (!looseFallback) {
        looseFallback = p
      }
    }
  }

  return nameFallback ?? looseFallback
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
          is_resale: 'true',
          include_ingredients: 'true',
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

  function buildItemStateFromIngredient(
    ingredient: ResaleIngredientItemState['ingredient'],
    products: NonNullable<ResaleIngredientItemState['existingProduct']>[],
  ): ResaleIngredientItemState {
    const existingProduct = findProductForIngredient(products, ingredient)
    const listPrice = Number((ingredient as { price?: number }).price) || 0

    const price = existingProduct ? Number(existingProduct.price) : (listPrice > 0 ? listPrice : 0)
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
  }

  function buildItemsWithStatus() {
    const products = (existingProducts.value || []) as NonNullable<ResaleIngredientItemState['existingProduct']>[]
    itemsWithStatus.value = (resaleIngredients.value as ResaleIngredientItemState['ingredient'][]).map(
      ingredient => buildItemStateFromIngredient(ingredient, products),
    )
  }

  function appendNewIngredientsFromServer() {
    const products = (existingProducts.value || []) as NonNullable<ResaleIngredientItemState['existingProduct']>[]
    const known = new Set(itemsWithStatus.value.map(i => i.ingredient.id))
    const added: ResaleIngredientItemState[] = []

    for (const ingredient of resaleIngredients.value as ResaleIngredientItemState['ingredient'][]) {
      if (known.has(ingredient.id)) continue
      added.push(buildItemStateFromIngredient(ingredient, products))
    }

    if (added.length > 0) {
      itemsWithStatus.value = [...itemsWithStatus.value, ...added]
    }
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
      } else if (item.existingProduct && item.categoryId) {
        item.existingProduct.category_id = item.categoryId
        const cat = (categories.value as { id: string, name: string }[]).find(
          c => c.id === item.categoryId,
        )
        if (cat) item.existingProduct.category_name = cat.name
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
    if (itemsWithStatus.value.length === 0) {
      buildItemsWithStatus()
      return
    }
    mergeServerIntoLocalItems()
    appendNewIngredientsFromServer()
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

  function productIdFromRow(product: ResaleProductRow | null | undefined): string | null {
    if (!product) return null
    const raw = product.id ?? (product as { product_id?: string }).product_id
    return raw != null && String(raw) !== '' ? String(raw) : null
  }

  /** Precomputed map: resale ingredient id → server product id */
  const ingredientToProductId = computed(() => {
    const map = new Map<string, string>()
    const products = (existingProducts.value || []) as ResaleProductRow[]
    const ingredients = resaleIngredients.value as ResaleIngredientItemState['ingredient'][]

    for (const ingredient of ingredients) {
      const product = findProductForIngredient(products, ingredient)
      const pid = productIdFromRow(product)
      if (pid) map.set(normalizeEntityId(ingredient.id), pid)
    }

    return map
  })

  function resolveProductIdForIngredient(ingredientId: string): string | null {
    const mapped = ingredientToProductId.value.get(normalizeEntityId(ingredientId))
    if (mapped) return mapped

    const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
    const onItem = productIdFromRow(item?.existingProduct ?? null)
    if (onItem) return onItem

    const ingredient = item?.ingredient
      ?? (resaleIngredients.value as ResaleIngredientItemState['ingredient'][]).find(
        i => i.id === ingredientId,
      )
    if (!ingredient) return null

    const products = (existingProducts.value || []) as ResaleProductRow[]
    const product = findProductForIngredient(products, ingredient)
    return productIdFromRow(product)
  }

  function mergeProductIntoResaleCache(product: ResaleProductRow) {
    const pid = productIdFromRow(product)
    if (!pid) return
    const key = productsResaleCacheKey()
    const snapshot = cache.getQueryData<ProductsResaleCache>(key)
    if (!snapshot?.data?.some(p => productIdFromRow(p) === pid)) {
      cache.setQueryData(key, {
        data: [...(snapshot?.data ?? []), product],
        total: (snapshot?.total ?? snapshot?.data?.length ?? 0) + 1,
      })
    }
    mergeServerIntoLocalItems()
  }

  async function searchProductIdForIngredient(
    ingredient: ResaleIngredientItemState['ingredient'],
  ): Promise<string | null> {
    const name = (ingredient.name ?? '').trim()
    if (!name) return null

    try {
      const res = await $fetch<{ data?: ResaleProductRow[], total?: number }>(
        '/api/menu/products',
        {
          query: {
            search: name,
            is_resale: 'true',
            include_ingredients: 'true',
            limit: 10,
          },
        },
      )
      const chunk = res?.data ?? []
      const matched = findProductForIngredient(chunk, ingredient)
      const pid = productIdFromRow(matched)
      if (pid && matched) {
        mergeProductIntoResaleCache(matched)
        linkExistingProductOnItem(ingredient.id)
        return pid
      }
    } catch {
      return null
    }
    return null
  }

  async function collectProductIdsForBulkApply(ingredientIds: string[]) {
    const seen = new Set<string>()
    const ids: string[] = []
    const debug: {
      ingredientId: string
      ingredientName: string | null
      fromMap: string | null
      fromItem: string | null
      fromResolve: string | null
      fromSearch: string | null
      productId: string | null
    }[] = []

    for (const ingredientId of ingredientIds) {
      linkExistingProductOnItem(ingredientId)
      const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
      const fromMap = ingredientToProductId.value.get(normalizeEntityId(ingredientId)) ?? null
      const fromItem = productIdFromRow(item?.existingProduct ?? null)
      const fromResolve = resolveProductIdForIngredient(ingredientId)
      let productId = fromMap ?? fromItem ?? fromResolve
      let fromSearch: string | null = null

      if (!productId && item?.ingredient) {
        fromSearch = await searchProductIdForIngredient(item.ingredient)
        productId = fromSearch
      }

      debug.push({
        ingredientId,
        ingredientName: item?.ingredient.name ?? null,
        fromMap,
        fromItem,
        fromResolve,
        fromSearch,
        productId,
      })
      if (!productId || seen.has(productId)) continue
      seen.add(productId)
      ids.push(productId)
    }

    const products = (existingProducts.value || []) as ResaleProductRow[]
    logReventaCatalog('catalog', 'collect-bulk-product-ids', {
      ids,
      debug,
      mapSize: ingredientToProductId.value.size,
      productsInCache: products.map(p => ({
        id: productIdFromRow(p),
        name: p.name,
        recipeIds: (p.ingredients ?? []).map(ing => recipeIngredientIdFromRow(ing)).filter(Boolean),
      })),
    })
    return ids
  }

  function commitBulkCategoryToItems(ingredientIds: string[], categoryId: string) {
    if (!categoryId) return
    const cat = (categories.value as { id: string, name: string }[]).find(c => c.id === categoryId)
    for (const ingredientId of ingredientIds) {
      const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
      if (!item) continue
      item.categoryId = categoryId
      if (item.existingProduct) {
        item.existingProduct.category_id = categoryId
        if (cat) item.existingProduct.category_name = cat.name
      }
    }
    itemsWithStatus.value = [...itemsWithStatus.value]
  }

  function commitBulkAvailabilityToItems(ingredientIds: string[], isAvailable: boolean) {
    for (const ingredientId of ingredientIds) {
      const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
      if (!item) continue
      item.isAvailable = isAvailable
      if (item.existingProduct) {
        item.existingProduct.is_available = isAvailable
      }
    }
    itemsWithStatus.value = [...itemsWithStatus.value]
  }

  function applyBulkCatalogToSelection(ingredientIds: string[], wantInCatalog: boolean) {
    for (const ingredientId of ingredientIds) {
      const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
      if (!item || isInCatalog(item) === wantInCatalog) continue

      if (wantInCatalog) {
        item.isActive = true
        item.toDelete = false
        if (!item.existingProduct) {
          item.isNew = true
          if (!item.categoryId) item.categoryId = defaultCategoryId.value
        }
      } else if (item.existingProduct) {
        item.toDelete = true
        item.isActive = false
      } else {
        item.isActive = false
        item.isNew = false
      }
    }
    itemsWithStatus.value = [...itemsWithStatus.value]
  }

  function markBulkFieldsSaved(ingredientIds: string[]) {
    for (const ingredientId of ingredientIds) {
      const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
      if (!item) continue
      item.originalCategoryId = item.categoryId
      item.originalAvailable = item.isAvailable
      item.originalPrice = item.price
      item.isNew = false
      item.toDelete = false
    }
    itemsWithStatus.value = [...itemsWithStatus.value]
  }

  /** @deprecated alias — use markBulkFieldsSaved */
  const markBulkCategorySaved = markBulkFieldsSaved

  function selectionNeedsPriceForCreate(ingredientIds: string[]): string[] {
    const names: string[] = []
    const idSet = new Set(ingredientIds)
    for (const item of itemsWithStatus.value) {
      if (!idSet.has(item.ingredient.id) || !item.isNew || !isInCatalog(item)) continue
      if (!(Number(item.price) > 0) || !item.categoryId) {
        names.push(item.ingredient.name)
      }
    }
    return names
  }

  function linkExistingProductOnItem(ingredientId: string) {
    const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
    if (!item) return
    if (productIdFromRow(item.existingProduct)) return
    const products = (existingProducts.value || []) as ResaleProductRow[]
    const product = findProductForIngredient(products, item.ingredient)
    if (product) item.existingProduct = product
  }

  /** Link from cache only — no refetch (refetch was wiping bulk catalog/availability toggles). */
  function linkProductsForBulkFromCache(ingredientIds: string[]) {
    logReventaCatalog('catalog', 'bulk-link-from-cache', {
      ingredientIds,
      productsInCache: (existingProducts.value as unknown[])?.length ?? 0,
    })
    for (const ingredientId of ingredientIds) {
      linkExistingProductOnItem(ingredientId)
    }
    logReventaCatalog('catalog', 'bulk-link-from-cache-done', {
      resolved: ingredientIds.map(id => ({
        ingredientId: id,
        productId: resolveProductIdForIngredient(id),
      })),
    })
  }

  function buildBulkCreateRequests(
    ingredientIds: string[],
    patchBody: Record<string, string | boolean>,
  ): MenuSequentialRequest[] {
    const requests: MenuSequentialRequest[] = []

    for (const ingredientId of ingredientIds) {
      if (resolveProductIdForIngredient(ingredientId)) continue

      const item = itemsWithStatus.value.find(i => i.ingredient.id === ingredientId)
      if (!item || !isInCatalog(item)) continue

      const categoryId = patchBody.category_id != null
        ? String(patchBody.category_id)
        : (item.categoryId || defaultCategoryId.value)
      const listPrice = Number((item.ingredient as { price?: number }).price) || 0
      const price = Number(item.price) || Number(item.existingProduct?.price) || listPrice || 0
      if (!(price > 0 && categoryId)) continue

      const isAvailable = patchBody.is_available !== undefined
        ? patchBody.is_available === true || patchBody.is_available === 'true'
        : item.isAvailable

      requests.push({
        key: `bulk-create-${ingredientId}`,
        run: () =>
          $fetch('/api/menu/products', {
            method: 'POST',
            body: {
              name: item.ingredient.name,
              description: '',
              price,
              category_id: categoryId,
              costo_percibido: item.costoPercibido,
              is_available: isAvailable,
              is_resale: true,
              controla_stock: true,
              is_combo: false,
              allow_modifiers: false,
              recipe_base_ids: [],
              ingredients: [resaleRecipeRow(item.ingredient)],
              tenant_id: currentTenant.value?.id || '',
            },
          }).then(() => undefined),
      })
    }

    return requests
  }

  function itemToTableRow(item: ResaleIngredientItemState): ResaleIngredientTableRow {
    const p = item.existingProduct
    const cats = categories.value as { id: string, name: string }[]
    const effectiveCategoryId = item.categoryId || (p?.category_id ? String(p.category_id) : '')
    const cat = cats.find(c => c.id === effectiveCategoryId)
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

  function buildResaleSaveRequests(ingredientIds?: string[]): {
    creates: MenuSequentialRequest[]
    updates: MenuSequentialRequest[]
    deletes: MenuSequentialRequest[]
  } {
    const idSet = ingredientIds ? new Set(ingredientIds) : null
    const inScope = (item: ResaleIngredientItemState) =>
      !idSet || idSet.has(item.ingredient.id)

    const creates: MenuSequentialRequest[] = toCreate.value.filter(inScope).map(item => ({
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

    const updates: MenuSequentialRequest[] = toUpdate.value.filter(inScope).map((item) => {
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

    const deletes: MenuSequentialRequest[] = toDeleteList.value.filter(inScope).map(item => ({
      key: `delete-${item.existingProduct!.id}`,
      run: () =>
        $fetch(`/api/menu/products/${item.existingProduct!.id}`, {
          method: 'DELETE',
        }).then(() => undefined),
    }))

    return { creates, updates, deletes }
  }

  async function saveBulkCatalogSelection(ingredientIds: string[]) {
    const blockedNames = selectionNeedsPriceForCreate(ingredientIds)
    if (blockedNames.length > 0) {
      return {
        ok: 0,
        fail: 0,
        blocked: true as const,
        message: `Precio > 0 y categoría requeridos: ${blockedNames.slice(0, 3).join(', ')}${blockedNames.length > 3 ? '…' : ''}`,
      }
    }

    const { creates, updates, deletes } = buildResaleSaveRequests(ingredientIds)
    const total = creates.length + updates.length + deletes.length
    if (total === 0) {
      return { ok: 0, fail: 0, empty: true as const }
    }

    logReventaCatalog('catalog', 'will-save-catalog', {
      ingredientIds,
      createCount: creates.length,
      updateCount: updates.length,
      deleteCount: deletes.length,
    })

    const createResult = creates.length ? await runConcurrentRequests(creates) : { ok: 0, fail: 0 }
    const updateResult = updates.length ? await runConcurrentRequests(updates) : { ok: 0, fail: 0 }
    const deleteResult = deletes.length ? await runConcurrentRequests(deletes) : { ok: 0, fail: 0 }

    logReventaCatalog('catalog', 'save-catalog-done', {
      create: createResult,
      update: updateResult,
      delete: deleteResult,
    })

    markBulkFieldsSaved(ingredientIds)
    await refetchCatalog()

    return {
      ok: createResult.ok + updateResult.ok + deleteResult.ok,
      fail: createResult.fail + updateResult.fail + deleteResult.fail,
    }
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
    linkProductsForBulkFromCache,
    collectProductIdsForBulkApply,
    commitBulkCategoryToItems,
    commitBulkAvailabilityToItems,
    applyBulkCatalogToSelection,
    markBulkCategorySaved,
    markBulkFieldsSaved,
    saveBulkCatalogSelection,
    selectionNeedsPriceForCreate,
    buildBulkCreateRequests,
    buildItemsWithStatus,
  }
}
