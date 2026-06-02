/**
 * Warehouse vs menu UI copy — single source of truth for the copy epic.
 *
 * Glossary table: https://github.com/uno0uno/warocol.com/issues/1113
 * Batches #1115–#1118 should import from here instead of inline Spanish strings.
 *
 * `supply` creation intent (bodega path) is not the same as `ingredients.type === 'supply'`.
 * @see composables/useCatalogEntityCreation.ts
 */
export const WAREHOUSE_COPY = {
  warehouseItem: 'Artículo de bodega',
  warehouseCatalog: 'Catálogo de bodega',
  recipeCostLines: 'Insumos de la receta',
  menuProduct: 'Producto de menú',
  waroTemplates: 'Plantillas Waro',
  typeFood: 'Alimento',
  typeSupply: 'Insumo',
  typeService: 'Servicio',
} as const

export type WarehouseCopyKey = keyof typeof WAREHOUSE_COPY
