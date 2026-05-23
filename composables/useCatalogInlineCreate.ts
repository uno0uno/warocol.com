import type { MaybeRef } from 'vue'
import {
  resolveCreationIntent,
  type CatalogCreationContext,
  type CatalogCreationIntent,
} from '@/composables/useCatalogEntityCreation'

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

  const isBusy = computed(() => productPanelBusy.value || supplyPanelBusy.value || linkingBusy.value)

  const busyMessage = computed(() => {
    if (linkingBusy.value) return 'Vinculando ingrediente creado...'
    if (productPanelBusy.value) return 'Creando producto...'
    if (supplyPanelBusy.value) return 'Creando ingrediente...'
    return ''
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
    linkingBusy.value = true
    try {
      await options.onIngredientSaved(ingredient)
    } finally {
      pendingName.value = ''
      linkingBusy.value = false
    }
  }

  async function onProductPanelSaved(product: Record<string, unknown>) {
    linkingBusy.value = true
    try {
      await options.onProductSaved(product)
    } finally {
      pendingName.value = ''
      linkingBusy.value = false
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
    busyMessage,
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
