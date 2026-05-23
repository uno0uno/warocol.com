/** Where inline-search "Crear …" was triggered (wire-up in #850). */
export type CatalogCreationContext =
  | 'recipe'
  | 'modifier'
  | 'purchase'
  | 'product'
  | 'supply-hub'

/**
 * Flujo A (any custom ingredient) vs Flujo B (menu/POS product).
 * Not the same as IngredientePropioPanel `form.type === 'supply'`.
 */
export type CatalogCreationIntent = 'supply' | 'menu-product'

/**
 * Locked intent for single-option contexts, or `null` when the chooser UI is required.
 */
export function resolveCreationIntent(
  context: CatalogCreationContext,
): CatalogCreationIntent | null {
  switch (context) {
    case 'purchase':
    case 'supply-hub':
      return 'supply'
    case 'recipe':
    case 'modifier':
    case 'product':
      return null
    default: {
      const _exhaustive: never = context
      return _exhaustive
    }
  }
}

export function shouldShowCreationChooser(context: CatalogCreationContext): boolean {
  return resolveCreationIntent(context) === null
}
