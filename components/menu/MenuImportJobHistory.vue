<template>
  <div class="border-t border-border pt-4 mt-2">
    <h3 class="text-sm font-semibold text-text-primary mb-2">
      {{ t('abastecimiento.glossary.bulkImportHistory') }}
    </h3>
    <p v-if="!jobs?.length" class="text-sm text-text-secondary">
      {{ t('abastecimiento.glossary.bulkImportNoJobs') }}
    </p>
    <ul v-else class="space-y-1 max-h-48 overflow-y-auto">
      <li v-for="j in jobs" :key="j.id">
        <button
          type="button"
          class="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-surface-secondary flex justify-between gap-2"
          @click="emit('select', j.id)"
        >
          <span class="truncate text-text-primary">{{ j.file_name }}</span>
          <span class="text-text-tertiary flex-shrink-0">{{ j.status }} · {{ j.row_committed || 0 }}/{{ j.row_valid || 0 }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps<{ jobs: any[] }>()
const emit = defineEmits<{ select: [id: string] }>()
const { t } = useI18n({ useScope: 'global' })
</script>
