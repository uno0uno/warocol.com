<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="t(i18nTitle)"
    @click.self="emit('close')"
  >
    <div class="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface border border-border p-4 sm:p-6 flex flex-col gap-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-text-primary">
            {{ t(i18nTitle) }}
          </h2>
          <p class="text-sm text-text-secondary mt-1">
            {{ t(i18nHint) }}
          </p>
        </div>
        <button
          type="button"
          class="min-h-[40px] min-w-[40px] rounded-lg border border-border text-text-secondary"
          :aria-label="t(i18nClose)"
          @click="emit('close')"
        >
          ×
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <a
          :href="templateHref"
          class="btn-secondary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center"
        >
          {{ t(i18nDownloadTemplate) }}
        </a>
        <label class="btn-primary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium cursor-pointer inline-flex items-center">
          {{ t(i18nUpload) }}
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
        {{ job.file_name }} · {{ t(i18nStatus) }}: <span class="font-medium text-text-primary">{{ job.status }}</span>
        <a
          v-if="job.download_url"
          :href="job.download_url"
          target="_blank"
          rel="noopener"
          class="ml-2 text-primary underline text-xs"
        >
          {{ t(i18nDownloadOriginal) }}
        </a>
      </p>

      <div v-if="report" class="rounded-xl border border-border p-3 space-y-2 text-sm">
        <p class="text-state-success-text">
          {{ t(i18nValid, { n: report.valid?.length ?? job?.row_valid ?? 0 }) }}
        </p>
        <p class="text-destructive">
          {{ t(i18nInvalid, { n: report.errors?.length ?? job?.row_invalid ?? 0 }) }}
        </p>
        <p v-if="report.needs_product_count" class="text-text-secondary">
          {{ t('abastecimiento.glossary.bulkImportNeedsProduct', { n: report.needs_product_count }) }}
        </p>
        <p v-if="report.quota_exceeded" class="text-destructive font-medium">
          {{ t(i18nQuotaExceeded) }}
        </p>
        <ul v-if="report.errors?.length" class="max-h-40 overflow-y-auto text-xs text-destructive space-y-1">
          <li v-for="(e, i) in report.errors.slice(0, 50)" :key="i">
            <template v-if="e.row != null">fila {{ e.row }} · </template>{{ e.field }}: {{ e.error }}
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
          {{ t(i18nDryRun) }}
        </button>
        <button
          type="button"
          class="btn-primary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium"
          :disabled="!canCommit || busy"
          @click="runCommit"
        >
          {{ t(i18nCommit) }}
        </button>
      </div>

      <p v-if="commitMsg" class="text-sm text-state-success-text">{{ commitMsg }}</p>
      <p v-if="errorMsg" class="text-sm text-destructive" role="alert">{{ errorMsg }}</p>

      <MenuImportJobHistory
        :jobs="jobs"
        :title="isMenuEntity ? t(`${i18nPrefix}History`) : undefined"
        :empty="isMenuEntity ? t(`${i18nPrefix}NoJobs`) : undefined"
        @select="loadJob"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ open: boolean; entity?: 'warehouse' | 'recipe_bases' | 'products' | 'modifiers' }>(),
  { entity: 'warehouse' },
)
const emit = defineEmits<{ close: []; imported: [] }>()

const { t } = useI18n({ useScope: 'global' })
const toast = useToast()

const i18nPrefix = computed(() => {
  if (props.entity === 'recipe_bases') return 'menu.recetas.bulkImport'
  if (props.entity === 'products') return 'menu.productos.bulkImport'
  if (props.entity === 'modifiers') return 'menu.modificadores.bulkImport'
  return 'abastecimiento.glossary.bulkImport'
})
const i18nTitle = computed(() => `${i18nPrefix.value}Title`)
const i18nHint = computed(() => `${i18nPrefix.value}Hint`)
const i18nClose = computed(() => `${i18nPrefix.value}Close`)
const i18nDownloadTemplate = computed(() => `${i18nPrefix.value}DownloadTemplate`)
const i18nUpload = computed(() => `${i18nPrefix.value}Upload`)
const i18nStatus = computed(() => `${i18nPrefix.value}Status`)
const i18nDownloadOriginal = computed(() => `${i18nPrefix.value}DownloadOriginal`)
const i18nValid = computed(() => `${i18nPrefix.value}Valid`)
const i18nInvalid = computed(() => `${i18nPrefix.value}Invalid`)
const i18nQuotaExceeded = computed(() => `${i18nPrefix.value}QuotaExceeded`)
const i18nDryRun = computed(() => `${i18nPrefix.value}DryRun`)
const i18nCommit = computed(() => `${i18nPrefix.value}Commit`)
const i18nCommitted = computed(() => `${i18nPrefix.value}Committed`)
const isMenuEntity = computed(
  () =>
    props.entity === 'recipe_bases'
    || props.entity === 'products'
    || props.entity === 'modifiers',
)

const templateHref = computed(() => `/api/menu/imports/template/${props.entity}`)
const uploadPath = computed(() => `/api/menu/imports/${props.entity}/upload`)

const busy = ref(false)
const jobId = ref<string | null>(null)
const job = ref<any>(null)
const report = ref<any>(null)
const jobs = ref<any[]>([])
const commitMsg = ref('')
const errorMsg = ref('')

const canCommit = computed(
  () =>
    job.value?.status === 'dry_run'
    && (job.value?.row_valid ?? 0) > 0
    && !report.value?.quota_exceeded,
)

async function refreshJobs() {
  const res = await $fetch<{ success: boolean; data: any[] }>('/api/menu/imports/jobs', {
    params: { entity_type: props.entity },
  })
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
    const res = await $fetch<{ success: boolean; data: any }>(uploadPath.value, {
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
    commitMsg.value = t(i18nCommitted.value, {
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
      jobId.value = null
      job.value = null
      report.value = null
      commitMsg.value = ''
      errorMsg.value = ''
      await refreshJobs()
    }
  },
)
</script>
