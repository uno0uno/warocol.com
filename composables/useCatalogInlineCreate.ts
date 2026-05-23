import type { MaybeRef } from 'vue'
import {
  resolveCreationIntent,
  type CatalogCreationContext,
  type CatalogCreationIntent,
} from '@/composables/useCatalogEntityCreation'

export type CatalogInlineBusyPhase =
  | 'creating-ingredient'
  | 'creating-product'
  | 'linking-ingredient'
  | 'linking-product'
  | null

export function useCatalogInlineCreate(options: {
  context: CatalogCreationContext
  onIngredientSaved: (ingredient: Record<string, unknown>) => void | Promise<void>
  onProductSaved: (product: Record<string, unknown>) => void | Promise<void>
  initialType?: MaybeRef<string>
}) {
  const showChooser = ref(false)
  const showPanel = ref(false)
  const showProductPanel = ref(false)
  const pendingName = ref('')

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
        return 'Vinculando ingrediente…'
      case 'linking-product':
        return 'Vinculando reventa al catálogo…'
      case 'creating-product':
        return 'Creando producto de menú…'
      case 'creating-ingredient':
        return 'Creando ingrediente…'
      default:
        return ''
    }
  })

  const busyHint = computed(() => {
    switch (busyPhase.value) {
      case 'linking-ingredient':
        return 'Se agregará a la fila y se actualizará la lista de ingredientes.'
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

  const panelInitialType = computed(() => unref(options.initialType) ?? 'food')

  function openFromSearch(name: string) {
    pendingName.value = name.trim()
    const intent = resolveCreationIntent(options.context)
    if (intent === 'supply') {
      showPanel.value = true
      return
    }
    showChooser.value = true
  }

  function onChooserIntent(intent: CatalogCreationIntent) {
    if (intent === 'supply') {
      showPanel.value = true
      return
    }
    showProductPanel.value = true
  }

  function onChooserCancel() {
    pendingName.value = ''
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
    showPanel,
    showProductPanel,
    pendingName,
    isBusy,
    busyPhase,
    busyMessage,
    busyHint,
    hideResaleToggle,
    panelInitialType,
    openFromSearch,
    onChooserIntent,
    onChooserCancel,
    onPanelSaved,
    onProductPanelSaved,
    onProductPanelBusy,
    onSupplyPanelBusy,
  }
}
