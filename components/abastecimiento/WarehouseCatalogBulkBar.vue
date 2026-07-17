<script setup lang="ts">
import type { WarehouseCategoryRow } from '~/composables/useWarehouseCategorySearch'

const props = withDefaults(defineProps<{
  variant: 'selection' | 'edit-only'
  selectedCount?: number
  isSubmitting?: boolean
  canApply?: boolean
}>(), {
  selectedCount: 0,
  isSubmitting: false,
  canApply: false,
})

const category = defineModel<WarehouseCategoryRow | null>('category', { default: null })
const emit = defineEmits<{
  apply: []
  cancel: []
  'clear-selection': []
}>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3">
    <template v-if="variant === 'selection'">
      <div class="flex flex-shrink-0 items-center gap-2">
        <span class="text-sm font-semibold text-text-primary">
          {{ t('abastecimiento.glossary.catalogSelectedCount', { count: selectedCount }) }}
        </span>
        <button
          type="button"
          class="text-xs text-text-secondary underline hover:text-text-primary"
          @click="emit('clear-selection')"
        >
          {{ t('abastecimiento.glossary.catalogDeselect') }}
        </button>
      </div>

      <div class="min-w-[15rem] flex-1 md:max-w-sm">
        <UiWarehouseCategorySearchInput
          v-model="category"
          input-id="warehouse-catalog-bulk-category"
          :placeholder="t('abastecimiento.glossary.categoryPlaceholder')"
          :listbox-label="t('abastecimiento.glossary.warehouseCategorySearchResults')"
          compact
          :allow-create="false"
          placement="bottom"
        />
      </div>
    </template>
    <span v-else class="text-sm text-text-secondary">
      {{ t('abastecimiento.glossary.catalogEditingHint') }}
    </span>

    <div class="flex-1" />

    <button
      type="button"
      class="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="!canApply || isSubmitting"
      @click="emit('apply')"
    >
      <UiLoadingDots v-if="isSubmitting" size="12px" />
      <span v-else>{{ t('abastecimiento.glossary.saveChanges') }}</span>
    </button>
    <button
      type="button"
      class="h-9 rounded-lg border border-border px-3 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
      :disabled="isSubmitting"
      @click="emit('cancel')"
    >
      {{ t('abastecimiento.glossary.cancel') }}
    </button>
  </div>
</template>
