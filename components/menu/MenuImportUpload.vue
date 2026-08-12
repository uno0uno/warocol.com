<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="t('abastecimiento.glossary.bulkImportTitle')"
    @click.self="emit('close')"
  >
    <div class="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface border border-border p-4 sm:p-6 flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-text-primary">
            {{ t('abastecimiento.glossary.bulkImportTitle') }}
          </h2>
          <p class="text-sm text-text-secondary mt-1">
            {{ t('abastecimiento.glossary.bulkImportHint') }}
          </p>
        </div>
        <button
          type="button"
          class="min-h-[40px] min-w-[40px] rounded-lg border border-border text-text-secondary"
          :aria-label="t('abastecimiento.glossary.bulkImportClose')"
          @click="emit('close')"
        >
          ×
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <a
          href="/api/menu/imports/template/warehouse"
          class="btn-secondary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center"
        >
          {{ t('abastecimiento.glossary.bulkImportDownloadTemplate') }}
        </a>
        <label class="btn-primary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium cursor-pointer inline-flex items-center">
          {{ t('abastecimiento.glossary.bulkImportUpload') }}
          <input
            type="file"
            accept=".csv,text/csv"
            class="sr-only"
            :disabled="busy"
            @change="onFile"
          >
        </label>
      </div>

      <p v-if="job" class="text-sm text-text-secondary">
        {{ job.file_name }} · {{ t('abastecimiento.glossary.bulkImportStatus') }}: <span class="font-medium text-text-primary">{{ job.status }}</span>
      </p>

      <div v-if="report" class="rounded-xl border border-border p-3 space-y-2 text-sm">
        <p class="text-state-success-text">
          {{ t('abastecimiento.glossary.bulkImportValid', { n: report.valid?.length ?? job?.row_valid ?? 0 }) }}
        </p>
        <p class="text-destructive">
          {{ t('abastecimiento.glossary.bulkImportInvalid', { n: report.errors?.length ?? job?.row_invalid ?? 0 }) }}
        </p>
        <p v-if="report.needs_product_count" class="text-text-secondary">
          {{ t('abastecimiento.glossary.bulkImportNeedsProduct', { n: report.needs_product_count }) }}
        </p>
        <ul v-if="report.errors?.length" class="max-h-40 overflow-y-auto text-xs text-destructive space-y-1">
          <li v-for="(e, i) in report.errors.slice(0, 50)" :key="i">
            fila {{ e.row }} · {{ e.field }}: {{ e.error }}
          </li>
        </ul>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="btn-secondary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium"
          :disabled="!jobId || busy"
          @click="runDryRun"
        >
          {{ t('abastecimiento.glossary.bulkImportDryRun') }}
        </button>
        <button
          type="button"
          class="btn-primary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium"
          :disabled="!canCommit || busy"
          @click="runCommit"
        >
          {{ t('abastecimiento.glossary.bulkImportCommit') }}
        </button>
      </div>

      <p v-if="commitMsg" class="text-sm text-state-success-text">{{ commitMsg }}</p>
      <p v-if="errorMsg" class="text-sm text-destructive" role="alert">{{ errorMsg }}</p>

      <MenuImportJobHistory :jobs="jobs" @select="loadJob" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n({ useScope: 'global' })
const toast = useToast()

const busy = ref(false)
const jobId = ref<string | null>(null)
const job = ref<any>(null)
const report = ref<any>(null)
const jobs = ref<any[]>([])
const commitMsg = ref('')
const errorMsg = ref('')

const canCommit = computed(
  () => job.value?.status === 'dry_run' && (job.value?.row_valid ?? 0) > 0,
)

async function refreshJobs() {
  const res = await $fetch<{ success: boolean; data: any[] }>('/api/menu/imports/jobs')
  jobs.value = res.data || []
}

async function loadJob(id: string) {
  const res = await $fetch<{ success: boolean; data: any }>(`/api/menu/imports/jobs/${id}`)
  job.value = res.data
  jobId.value = res.data.id
  report.value = res.data.dry_run_report || null
  commitMsg.value = ''
  errorMsg.value = ''
}

async function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  busy.value = true
  errorMsg.value = ''
  commitMsg.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const res = await $fetch<{ success: boolean; data: any }>('/api/menu/imports/warehouse/upload', {
      method: 'POST',
      body,
    })
    jobId.value = res.data.id
    job.value = res.data
    report.value = null
    await refreshJobs()
    await runDryRun()
  } catch (e: any) {
    errorMsg.value = e?.data?.detail || e?.message || 'Upload failed'
  } finally {
    busy.value = false
  }
}

async function runDryRun() {
  if (!jobId.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: any }>(
      `/api/menu/imports/jobs/${jobId.value}/dry-run`,
      { method: 'POST' },
    )
    job.value = { ...job.value, ...res.data }
    report.value = res.data.report
    await refreshJobs()
  } catch (e: any) {
    errorMsg.value = e?.data?.detail || e?.message || 'Dry-run failed'
  } finally {
    busy.value = false
  }
}

async function runCommit() {
  if (!jobId.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: any }>(
      `/api/menu/imports/jobs/${jobId.value}/commit`,
      { method: 'POST' },
    )
    job.value = { ...job.value, ...res.data }
    commitMsg.value = t('abastecimiento.glossary.bulkImportCommitted', {
      n: res.data.row_committed ?? 0,
    })
    toast.success(commitMsg.value)
    await refreshJobs()
    emit('imported')
  } catch (e: any) {
    errorMsg.value = e?.data?.detail || e?.message || 'Commit failed'
  } finally {
    busy.value = false
  }
}

watch(
  () => props.open,
  async (v) => {
    if (v) {
      await refreshJobs()
    }
  },
)
</script>
