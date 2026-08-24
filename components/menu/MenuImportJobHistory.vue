<template>
  <div>
    <h3
      v-if="showTitle"
      class="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2"
    >
      {{ title || t('abastecimiento.glossary.bulkImportHistory') }}
    </h3>
    <p v-if="!jobs?.length" class="text-xs text-text-secondary">
      {{ empty || t('abastecimiento.glossary.bulkImportNoJobs') }}
    </p>
    <ul v-else class="space-y-1 max-h-40 overflow-y-auto">
      <li v-for="j in jobs" :key="j.id">
        <button
          type="button"
          class="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-surface-secondary flex justify-between gap-2"
          @click="emit('select', j.id)"
        >
          <span class="truncate text-text-primary">{{ j.file_name }}</span>
          <span class="text-text-tertiary flex-shrink-0">
            {{ resolveStatus(j.status) }} · {{ j.row_committed || 0 }}/{{ j.row_valid || 0 }}
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    jobs: any[]
    title?: string | null
    empty?: string
    statusLabelFn?: (status: string | undefined | null) => string
    hideTitle?: boolean
  }>(),
  { hideTitle: false },
)
const emit = defineEmits<{ select: [id: string] }>()
const { t } = useI18n({ useScope: 'global' })

const showTitle = computed(() => !props.hideTitle && props.title !== '')

function resolveStatus(status: string | undefined | null): string {
  if (props.statusLabelFn) return props.statusLabelFn(status)
  const key = {
    uploaded: 'abastecimiento.glossary.bulkImportStatusUploaded',
    dry_run: 'abastecimiento.glossary.bulkImportStatusReviewed',
    committed: 'abastecimiento.glossary.bulkImportStatusImported',
    failed: 'abastecimiento.glossary.bulkImportStatusFailed',
  }[String(status || '')]
  return key ? t(key) : (status || '')
}
</script>
