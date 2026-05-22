<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant: 'selection' | 'edit-only'
    selectedCount?: number
    editMode?: boolean
    isSubmitting?: boolean
    canApply?: boolean
    canSaveEdit?: boolean
    showStation?: boolean
    showOnline?: boolean
    showQr?: boolean
    showDelete?: boolean
    showInCatalog?: boolean
    categories?: { id: string; name: string }[]
    stations?: { id: string; name: string }[]
    availabilityOptions?: { label: string; value: string }[]
    channelOptions?: { label: string; value: string }[]
    inCatalogOptions?: { label: string; value: string }[]
  }>(),
  {
    selectedCount: 0,
    editMode: false,
    isSubmitting: false,
    canApply: false,
    canSaveEdit: false,
    showStation: false,
    showOnline: false,
    showQr: false,
    showDelete: true,
    showInCatalog: false,
    categories: () => [],
    stations: () => [],
    availabilityOptions: () => [],
    channelOptions: () => [],
    inCatalogOptions: () => [
      { label: 'En catálogo', value: 'true' },
      { label: 'Fuera del catálogo', value: 'false' },
    ],
  },
)

const bulkCategoryId = defineModel<string>('bulkCategoryId', { default: '' })
const bulkAvailability = defineModel<string>('bulkAvailability', { default: '' })
const bulkInCatalog = defineModel<string>('bulkInCatalog', { default: '' })
const bulkStationId = defineModel<string>('bulkStationId', { default: '' })
const bulkOnline = defineModel<string>('bulkOnline', { default: '' })
const bulkQr = defineModel<string>('bulkQr', { default: '' })

const emit = defineEmits<{
  apply: []
  cancel: []
  'clear-selection': []
  delete: []
}>()

function onCancel() {
  if (props.editMode) {
    emit('cancel')
  } else {
    emit('clear-selection')
  }
}
</script>

<template>
  <!-- Selection bulk bar -->
  <div
    v-if="variant === 'selection'"
    class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5"
  >
    <div class="flex items-center gap-2 flex-shrink-0">
      <span class="text-sm font-semibold text-text-primary">{{ selectedCount }} seleccionada(s)</span>
      <button
        type="button"
        class="text-xs text-text-secondary hover:text-text-primary underline"
        @click="emit('clear-selection')"
      >
        deseleccionar
      </button>
    </div>

    <div class="flex-1" />

    <UiFilterSelect
      v-model="bulkCategoryId"
      placeholder="Categoría..."
      :aria-label="editMode ? 'Categoría al guardar para seleccionadas' : 'Cambiar categoría masivamente'"
      :options="categories.map((c) => ({ label: c.name, value: c.id }))"
    />

    <UiFilterSelect
      v-model="bulkAvailability"
      placeholder="Estado..."
      :aria-label="editMode ? 'Estado al guardar para seleccionadas' : 'Cambiar estado masivamente'"
      :options="availabilityOptions"
    />

    <UiFilterSelect
      v-if="showInCatalog"
      v-model="bulkInCatalog"
      placeholder="En catálogo..."
      :aria-label="editMode ? 'Catálogo al guardar para seleccionadas' : 'Cambiar en catálogo masivamente'"
      :options="inCatalogOptions"
    />

    <UiFilterSelect
      v-if="showStation"
      v-model="bulkStationId"
      placeholder="Cocina..."
      :aria-label="editMode ? 'Cocina al guardar para seleccionadas' : 'Cambiar estación de cocina masivamente'"
      :options="stations.map((s) => ({ label: s.name, value: s.id }))"
    />

    <UiFilterSelect
      v-if="showOnline"
      v-model="bulkOnline"
      placeholder="Domicilios..."
      :aria-label="editMode ? 'Domicilios al guardar para seleccionadas' : 'Cambiar domicilios masivamente'"
      :options="channelOptions"
    />

    <UiFilterSelect
      v-if="showQr"
      v-model="bulkQr"
      placeholder="QR mesa..."
      :aria-label="editMode ? 'QR mesa al guardar para seleccionadas' : 'Cambiar QR mesa masivamente'"
      :options="channelOptions"
    />

    <button
      type="button"
      class="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      :disabled="!canApply || isSubmitting"
      @click="emit('apply')"
    >
      <UiLoadingDots v-if="isSubmitting" size="12px" />
      <span v-else>Aplicar</span>
    </button>

    <button
      v-if="!editMode && showDelete"
      type="button"
      class="h-9 px-3 rounded-lg border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50 transition-colors"
      :disabled="isSubmitting"
      @click="emit('delete')"
    >
      Eliminar
    </button>

    <button
      type="button"
      class="h-9 px-3 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
      :disabled="isSubmitting"
      @click="onCancel"
    >
      Cancelar
    </button>
  </div>

  <!-- Edit mode bar without selection -->
  <div
    v-else
    class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5"
  >
    <span class="text-sm text-text-secondary flex-shrink-0">
      Modo edición — los cambios se envían al guardar
    </span>

    <div class="flex-1" />

    <button
      type="button"
      class="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      :disabled="!canSaveEdit || isSubmitting"
      @click="emit('apply')"
    >
      <UiLoadingDots v-if="isSubmitting" size="12px" />
      <span v-else>Aplicar</span>
    </button>

    <button
      type="button"
      class="h-9 px-3 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
      :disabled="isSubmitting"
      @click="emit('cancel')"
    >
      Cancelar
    </button>
  </div>
</template>
