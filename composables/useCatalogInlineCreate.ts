import type { MaybeRef } from 'vue'
import {
  resolveCreationIntent,
  type CatalogCreationContext,
  type CatalogCreationIntent,
} from '@/composables/useCatalogEntityCreation'

export function useCatalogInlineCreate(options: {
  context: CatalogCreationContext
  onIngredientSaved: (ingredient: Record<string, unknown>) => void
  initialType?: MaybeRef<string>
}) {
  const showChooser = ref(false)
  const showPanel = ref(false)
  const pendingName = ref('')

  const hideResaleToggle = computed(
    () =>
      options.context === 'recipe'
      || options.context === 'modifier'
      || options.context === 'purchase',
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
    navigateTo({
      path: '/menu/productos/crear',
      query: {
        modo: 'venta-directa',
        ...(pendingName.value ? { nombre: pendingName.value } : {}),
      },
    })
    pendingName.value = ''
  }

  function onChooserCancel() {
    pendingName.value = ''
  }

  function onPanelSaved(ingredient: Record<string, unknown>) {
    options.onIngredientSaved(ingredient)
    pendingName.value = ''
  }

  return {
    context: options.context,
    showChooser,
    showPanel,
    pendingName,
    hideResaleToggle,
    panelInitialType,
    openFromSearch,
    onChooserIntent,
    onChooserCancel,
    onPanelSaved,
  }
}
