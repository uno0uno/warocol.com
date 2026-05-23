import { fetchResaleLinkedIngredient } from '@/composables/useResaleLinkedIngredient'

export type ResaleIngredientSyncResult = {
  synced: boolean
  warning?: string
}

export function normalizeResaleProductName(name: string): string {
  return name.trim()
}

type ProductWithRecipes = {
  is_resale?: boolean
  name?: string
  ingredients?: Array<{ ingredient_id?: string }>
  resale_ingredient_id?: string | null
}

/**
 * Resolves the linked resale ingredient id for a product (GET + fallbacks).
 */
export async function resolveResaleLinkedIngredientId(
  productId: string,
): Promise<string | null> {
  const res = await $fetch<{ data?: ProductWithRecipes }>(`/api/menu/products/${productId}`)
  const product = res?.data
  if (!product?.is_resale) return null

  const linked = await fetchResaleLinkedIngredient(product as Record<string, unknown>)
  if (linked?.id != null) return String(linked.id)

  const rows = product.ingredients ?? []
  if (rows.length === 1 && rows[0]?.ingredient_id) {
    return String(rows[0].ingredient_id)
  }

  return null
}

export type ResaleIngredientPatchBody = {
  name?: string
  unit_weight_gr?: number
  unit_weight_unit?: 'gr' | 'ml'
}

export async function patchResaleLinkedIngredient(
  ingredientId: string,
  body: ResaleIngredientPatchBody,
): Promise<void> {
  if (Object.keys(body).length === 0) return
  await $fetch(`/api/suppliers/ingredients/${ingredientId}`, {
    method: 'PATCH',
    body,
  })
}

/**
 * PATCH linked ingredient name when a resale product was renamed (product → ingredient, one-way).
 */
export async function syncResaleIngredientName(
  productId: string,
  newName: string,
  previousName?: string,
): Promise<ResaleIngredientSyncResult> {
  const trimmed = normalizeResaleProductName(newName)
  if (!trimmed) return { synced: false }

  if (
    previousName !== undefined
    && normalizeResaleProductName(previousName) === trimmed
  ) {
    return { synced: false }
  }

  const ingredientId = await resolveResaleLinkedIngredientId(productId)
  if (!ingredientId) return { synced: false }

  try {
    await patchResaleLinkedIngredient(ingredientId, { name: trimmed })
    return { synced: true }
  } catch (err: unknown) {
    const e = err as { data?: { detail?: string }; message?: string }
    const detail = e?.data?.detail ?? e?.message ?? 'No se pudo actualizar el insumo vinculado'
    return { synced: false, warning: String(detail) }
  }
}
