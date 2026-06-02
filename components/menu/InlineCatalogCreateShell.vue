<template>
  <MenuCreateCatalogEntityChooser
    v-model="showChooser"
    :context="context"
    :initial-name="pendingName"
    @intent="onChooserIntent"
    @cancel="onChooserCancel"
  />
  <MenuInlineCatalogIngredientTypeChooser
    v-model="showIngredientTypeStep"
    :initial-name="pendingName"
    @select="onIngredientTypeSelected"
    @cancel="onIngredientTypeCancel"
  />
  <IngredientesIngredientePropioPanel
    v-model="showPanel"
    :initial-name="pendingName"
    :initial-type="panelInitialType"
    :hide-resale-toggle="hideResaleToggle"
    :show-back-to-chooser="canReturnToChooser"
    @back-to-chooser="onPanelBack"
    @saved="onPanelSaved"
    @busy-change="onSupplyPanelBusy"
  />
  <MenuProductQuickCreatePanel
    v-model="showProductPanel"
    :initial-name="pendingName"
    :show-back-to-chooser="canReturnToChooser"
    @back-to-chooser="returnToChooser"
    @saved="onProductPanelSaved"
    @busy-change="onProductPanelBusy"
  />
</template>

<script setup lang="ts">
import type { CatalogCreationContext } from '@/composables/useCatalogEntityCreation'
import { useCatalogInlineCreate } from '@/composables/useCatalogInlineCreate'

const props = defineProps<{
  context: CatalogCreationContext
  initialType?: string
  busy?: boolean
  busyLabel?: string
  busyHint?: string
  onIngredientSaved?: (ingredient: Record<string, unknown>) => void | Promise<void>
  onProductSaved?: (product: Record<string, unknown>) => void | Promise<void>
}>()

const emit = defineEmits<{
  saved: [ingredient: Record<string, unknown>]
  'product-saved': [product: Record<string, unknown>]
  'update:busy': [value: boolean]
  'update:busyLabel': [value: string]
  'update:busyHint': [value: string]
}>()

async function handleIngredientSaved(ingredient: Record<string, unknown>) {
  if (props.onIngredientSaved) {
    await props.onIngredientSaved(ingredient)
    return
  }
  emit('saved', ingredient)
}

async function handleProductSaved(product: Record<string, unknown>) {
  if (props.onProductSaved) {
    await props.onProductSaved(product)
    return
  }
  emit('product-saved', product)
}

const {
  showChooser,
  showIngredientTypeStep,
  showPanel,
  showProductPanel,
  pendingName,
  isBusy,
  busyMessage,
  busyHint,
  hideResaleToggle,
  panelInitialType,
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
} = useCatalogInlineCreate({
  context: props.context,
  initialType: toRef(props, 'initialType'),
  onIngredientSaved: handleIngredientSaved,
  onProductSaved: handleProductSaved,
})

watch(isBusy, (value) => {
  emit('update:busy', value)
}, { immediate: true })

watch(busyMessage, (value) => {
  emit('update:busyLabel', value)
}, { immediate: true })

watch(busyHint, (value) => {
  emit('update:busyHint', value)
}, { immediate: true })

defineExpose({ openFromSearch, isBusy, busyMessage, busyHint })
</script>
