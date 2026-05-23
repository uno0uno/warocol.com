<template>
  <MenuCreateCatalogEntityChooser
    v-model="showChooser"
    :context="context"
    :initial-name="pendingName"
    @intent="onChooserIntent"
    @cancel="onChooserCancel"
  />
  <IngredientesIngredientePropioPanel
    v-model="showPanel"
    :initial-name="pendingName"
    :initial-type="panelInitialType"
    :hide-resale-toggle="hideResaleToggle"
    @saved="onPanelSaved"
  />
  <MenuProductQuickCreatePanel
    v-model="showProductPanel"
    :initial-name="pendingName"
    @saved="onProductPanelSaved"
  />
</template>

<script setup lang="ts">
import type { CatalogCreationContext } from '@/composables/useCatalogEntityCreation'
import { useCatalogInlineCreate } from '@/composables/useCatalogInlineCreate'

const props = defineProps<{
  context: CatalogCreationContext
  initialType?: string
}>()

const emit = defineEmits<{
  saved: [ingredient: Record<string, unknown>]
  'product-saved': [product: Record<string, unknown>]
}>()

const {
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
} = useCatalogInlineCreate({
  context: props.context,
  initialType: toRef(props, 'initialType'),
  onIngredientSaved: ingredient => emit('saved', ingredient),
  onProductSaved: product => emit('product-saved', product),
})

defineExpose({ openFromSearch })
</script>
