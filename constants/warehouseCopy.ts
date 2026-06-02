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
  menuSearchPlaceholder: 'Buscar artículo de bodega o reventa...',
  menuFilterPlaceholder: 'Artículo de bodega...',
  menuFilterClearAria: 'Quitar filtro de artículo de bodega',
  warehouseItemOrResaleRequired: 'Artículo de bodega o reventa *',
  selectWarehouseItem: 'Selecciona artículo de bodega',
  selectWarehouseItemPrompt: 'Seleccione un artículo de bodega',
  removeWarehouseItemLine: 'Eliminar línea',
  recipeCompositionSection: 'Composición',
  recipeCompositionSummary: 'Líneas:',
  recipeCompositionEmptyHelp: 'Agrega artículos de bodega o productos de reventa',
  recipeCompositionSavingHint: 'Estamos guardando la receta y consolidando su composición.',
  recipeLinesColumn: 'Líneas',
  recipeCompositionTableHeader: 'Artículo de bodega',
  recipeLinesCountSuffix: 'líneas',
  withWarehouseItem: 'Con artículo de bodega:',
  linkedWarehouseItem: 'Artículo de bodega vinculado',
  linkedWarehouseItemLoading: 'Cargando artículo de bodega vinculado…',
  linkedWarehouseItemHelp: '1 und por venta · costo desde compras del artículo de bodega.',
  linkedWarehouseItemNotFound: 'Artículo de bodega no encontrado. Revisa en Abastecimiento.',
  linkedWarehouseItemNotFoundCatalog:
    'No se encontró el artículo de bodega vinculado. Revísalo en Abastecimiento → Catálogo de bodega.',
  resaleLinkedStockHelp:
    'Este producto descuenta stock del artículo de bodega vinculado (1 und por venta). El costo real se calcula desde compras de ese artículo, no desde una receta editable aquí.',
  recipeCostLinesSectionHelp:
    'Artículos de bodega o productos de reventa que descuentan inventario al vender este plato',
  addRecipeCostLinesHelp: 'Agrega artículos de bodega o productos de reventa para calcular el costo',
  completeRecipeCostLinesError: 'Completa todos los artículos de bodega con cantidad mayor a 0.',
  allRecipeCostLinesNeedQuantity: 'Todos los artículos de bodega deben tener una cantidad mayor a 0.',
  addWarehouseItemToRecipe: 'Agrega al menos un artículo de bodega a la receta.',
  duplicateWarehouseItemInList: 'No puedes agregar el mismo artículo de bodega más de una vez.',
  completeModifiersWarehouseItem: 'Completa todos los modificadores con artículo de bodega o reventa.',
  allOptionsNeedWarehouseItem: 'Todas las opciones deben tener un artículo de bodega o reventa.',
  inventoryRecipeHelp: 'Configura receta o artículos de bodega abajo.',
  defineRecipeInventoryHelp:
    'Define la receta del producto. Cada venta descontará los artículos de bodega del inventario.',
  recipeBaseLinesHelp: 'Selecciona una o más recetas base para usar sus líneas predefinidas.',
  resaleLineSummaryLabel: 'Artículo de bodega:',
  linkedWarehouseItemUpdateFailed:
    'Producto guardado, pero no se pudo actualizar el artículo de bodega vinculado',
  linkedWarehouseItemUpdateFailedDetail: 'Producto guardado, pero el artículo de bodega no se actualizó:',
  linkedWarehouseItemNotSynced: 'Artículo de bodega no sincronizado',
  cookedWithWarehouseItemsDescription:
    'Cocina con artículos de bodega y recetas base. Cada venta descuenta inventario.',
} as const

export type WarehouseCopyKey = keyof typeof WAREHOUSE_COPY
