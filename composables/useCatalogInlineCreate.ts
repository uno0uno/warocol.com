import type { MaybeRef } from 'vue'
import {
  resolveCreationIntent,
  type CatalogCreationContext,
  type CatalogCreationIntent,
} from '@/composables/useCatalogEntityCreation'

export function useCatalogInlineCreate(options: {
  context: CatalogCreationContext
  onIngredientSaved: (ingredient: Record<string, unknown>) => void
  onProductSaved: (product: Record<string, unknown>) => void
  initialType?: MaybeRef<string>
}) {
  const showChooser = ref(false)
  const showPanel = ref(false)
  const showProductPanel = ref(false)
  const pendingName = ref('')

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

  function onPanelSaved(ingredient: Record<string, unknown>) {
    options.onIngredientSaved(ingredient)
    pendingName.value = ''
  }

  function onProductPanelSaved(product: Record<string, unknown>) {
    options.onProductSaved(product)
    pendingName.value = ''
  }

  return {
    context: options.context,
    showChooser,
    showPanel,
    showProductPanel,
    pendingName,
    hideResaleToggle,
    panelInitialType,
    openFromSearch,
    onChooserIntent,
    onChooserCancel,
    onPanelSaved,
    onProductPanelSaved,
  }
}
