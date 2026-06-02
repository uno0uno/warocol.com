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
  catalogSearchPlaceholder: 'Buscar en catálogo de bodega...',
  catalogStatsTotal: 'Total en catálogo',
  catalogEmptyTitle: 'Aún no tienes artículos en tu catálogo de bodega',
  catalogEmptySub:
    'Crea tu primer artículo de bodega desde aquí o desde cualquier receta o modificador',
  catalogHubDescription:
    'Artículos de bodega de tu restaurante, creados para tus recetas específicas',
  newWarehouseItemDefault: '+ Nuevo artículo de bodega',
  newFood: '+ Nuevo alimento',
  newSupply: '+ Nuevo insumo',
  newService: '+ Nuevo servicio',
  warehouseItemType: 'Tipo de artículo',
  createChooserAria: 'Elegir artículo de bodega o producto de menú a crear',
  createChooserSubtitle: 'Elige artículo de bodega o producto de menú (venta)',
  typeChooserAria: 'Elegir tipo de artículo de bodega',
  typeChooserPrompt: '¿Qué tipo de artículo de bodega quieres crear?',
  typeChooserGroupAria: 'Tipo de artículo de bodega',
  panelNewTitle: 'Nuevo artículo de bodega',
  panelEditTitle: 'Editar artículo de bodega',
  panelCreateAria: 'Crear artículo de bodega personalizado',
  panelNewSubtitle: 'Artículo de bodega de tu restaurante',
  panelArchived: 'Artículo archivado',
  panelTypeHelper:
    'Para recetas y costos. Distinto de producto de menú (reventa en POS).',
  createWarehouseItem: 'Crear artículo de bodega',
  archiveWarehouseItem: 'Archivar artículo de bodega',
  restoreWarehouseItem: 'Restaurar artículo de bodega',
  linkingWarehouseItem: 'Vinculando artículo de bodega…',
  creatingWarehouseItem: 'Creando artículo de bodega…',
  linkingWarehouseItemHint:
    'Se agregará a la fila y se actualizará el catálogo de bodega.',
  duplicateWarehouseItemName: 'Ya existe un artículo de bodega con ese nombre',
  resaleWarehouseItemMustBeUnd:
    'Los artículos de bodega de reventa deben tener unidad "und" (pieza).',
} as const

export type WarehouseCopyKey = keyof typeof WAREHOUSE_COPY
