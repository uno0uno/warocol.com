import type { MaybeRef } from 'vue'
import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'
import {
  resolveCreationIntent,
  shouldShowCreationChooser,
  type CatalogCreationContext,
  type CatalogCreationIntent,
} from '@/composables/useCatalogEntityCreation'

/** `ingredients.type` — not the same as CatalogCreationIntent `supply` (bodega path). */
export type IngredientDbType = 'food' | 'supply' | 'service'

export type CatalogInlineBusyPhase =
  | 'creating-ingredient'
  | 'creating-product'
  | 'linking-ingredient'
  | 'linking-product'
  | null

function normalizeIngredientDbType(value?: string): IngredientDbType {
  if (value === 'supply' || value === 'service') return value
  return 'food'
}

export function useCatalogInlineCreate(options: {
  context: CatalogCreationContext
  onIngredientSaved: (ingredient: Record<string, unknown>) => void | Promise<void>
  onProductSaved: (product: Record<string, unknown>) => void | Promise<void>
  initialType?: MaybeRef<string>
}) {
  const showChooser = ref(false)
  const showIngredientTypeStep = ref(false)
  const showPanel = ref(false)
  const showProductPanel = ref(false)
  const pendingName = ref('')
  const openedFromChooser = ref(false)
  const selectedIngredientDbType = ref<IngredientDbType | null>(null)

  const usesIngredientTypeStep = computed(() => shouldShowCreationChooser(options.context))

  const canReturnToChooser = computed(
    () => openedFromChooser.value && usesIngredientTypeStep.value,
  )
  const productPanelBusy = ref(false)
  const supplyPanelBusy = ref(false)
  const linkingBusy = ref(false)
  const lastSavedKind = ref<'ingredient' | 'product' | null>(null)

  const isBusy = computed(() => productPanelBusy.value || supplyPanelBusy.value || linkingBusy.value)

  const busyPhase = computed((): CatalogInlineBusyPhase => {
    if (linkingBusy.value) {
      return lastSavedKind.value === 'product' ? 'linking-product' : 'linking-ingredient'
    }
    if (productPanelBusy.value) return 'creating-product'
    if (supplyPanelBusy.value) return 'creating-ingredient'
    return null
  })

  const busyMessage = computed(() => {
    switch (busyPhase.value) {
      case 'linking-ingredient':
        return WAREHOUSE_COPY.linkingWarehouseItem
      case 'linking-product':
        return 'Vinculando reventa al catálogo…'
      case 'creating-product':
        return 'Creando producto de menú…'
      case 'creating-ingredient':
        return WAREHOUSE_COPY.creatingWarehouseItem
      default:
        return ''
    }
  })

  const busyHint = computed(() => {
    switch (busyPhase.value) {
      case 'linking-ingredient':
        return WAREHOUSE_COPY.linkingWarehouseItemHint
      case 'linking-product':
        return 'Buscando el insumo de reventa vinculado al producto.'
      case 'creating-product':
        return 'Al guardar, se vinculará a la fila de la receta o modificador.'
      case 'creating-ingredient':
        return 'Al guardar, se vinculará a la fila seleccionada.'
      default:
        return ''
    }
  })

  const hideResaleToggle = computed(
    () =>
      options.context === 'recipe'
      || options.context === 'modifier'
      || options.context === 'purchase'
      || options.context === 'product',
  )

  const panelInitialType = computed(() => {
    if (selectedIngredientDbType.value) return selectedIngredientDbType.value
    const external = unref(options.initialType)
    if (external) return normalizeIngredientDbType(external)
    return 'food'
  })

  const lockPanelIngredientType = computed(() => {
    if (selectedIngredientDbType.value !== null) return true
    if (!usesIngredientTypeStep.value) {
      const external = unref(options.initialType)
      return external === 'supply' || external === 'service'
    }
    return false
  })

  function resetIngredientTypeSelection() {
    selectedIngredientDbType.value = null
  }

  function openIngredientPanel() {
    showPanel.value = true
  }

  function openFromSearch(name: string) {
    pendingName.value = name.trim()
    resetIngredientTypeSelection()
    const intent = resolveCreationIntent(options.context)
    if (intent === 'supply') {
      openIngredientPanel()
      return
    }
    showChooser.value = true
  }

  function onChooserIntent(intent: CatalogCreationIntent) {
    openedFromChooser.value = true
    resetIngredientTypeSelection()
    if (intent === 'supply') {
      if (usesIngredientTypeStep.value) {
        showIngredientTypeStep.value = true
      } else {
        openIngredientPanel()
      }
      return
    }
    showProductPanel.value = true
  }

  function onIngredientTypeSelected(type: IngredientDbType) {
    selectedIngredientDbType.value = type
    openIngredientPanel()
  }

  function onIngredientTypeCancel() {
    showIngredientTypeStep.value = false
    resetIngredientTypeSelection()
    showChooser.value = true
  }

  function returnToChooser() {
    showPanel.value = false
    showProductPanel.value = false
    showIngredientTypeStep.value = false
    resetIngredientTypeSelection()
    showChooser.value = true
  }

  function onPanelBack() {
    showPanel.value = false
    if (openedFromChooser.value && usesIngredientTypeStep.value && selectedIngredientDbType.value) {
      showIngredientTypeStep.value = true
      return
    }
    returnToChooser()
  }

  function onChooserCancel() {
    pendingName.value = ''
    openedFromChooser.value = false
    resetIngredientTypeSelection()
  }

  async function onPanelSaved(ingredient: Record<string, unknown>) {
    lastSavedKind.value = 'ingredient'
    linkingBusy.value = true
    try {
      await options.onIngredientSaved(ingredient)
    } finally {
      pendingName.value = ''
      linkingBusy.value = false
      lastSavedKind.value = null
      openedFromChooser.value = false
      resetIngredientTypeSelection()
    }
  }

  async function onProductPanelSaved(product: Record<string, unknown>) {
    lastSavedKind.value = 'product'
    linkingBusy.value = true
    try {
      await options.onProductSaved(product)
    } finally {
      pendingName.value = ''
      linkingBusy.value = false
      lastSavedKind.value = null
      openedFromChooser.value = false
      resetIngredientTypeSelection()
    }
  }

  function onProductPanelBusy(busy: boolean) {
    productPanelBusy.value = busy
  }

  function onSupplyPanelBusy(busy: boolean) {
    supplyPanelBusy.value = busy
  }

  return {
    context: options.context,
    showChooser,
    showIngredientTypeStep,
    showPanel,
    showProductPanel,
    pendingName,
    isBusy,
    busyPhase,
    busyMessage,
    busyHint,
    hideResaleToggle,
    panelInitialType,
    lockPanelIngredientType,
    canReturnToChooser,
    openFromSearch,
    onChooserIntent,
    onChooserCancel,
    onIngredientTypeSelected,
    onIngredientTypeCancel,
    returnToChooser,
    onPanelBack,
    onPanelSaved,
    onProductPanelSaved,
    onProductPanelBusy,
    onSupplyPanelBusy,
  }
}
