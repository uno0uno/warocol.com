/**
 * Standard limit for full-catalog ingredient fetches across all pages.
 * Change this single value to adjust the limit everywhere at once.
 *
 * The composable has been migrated to Pinia Colada — use useMenuIngredientsQuery() instead.
 * @see composables/queries/useMenuIngredients.ts
 */
export const INGREDIENTS_FETCH_LIMIT = 3000
