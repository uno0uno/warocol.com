<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="emit('close')"
      />
    </Transition>

    <Transition name="menu-import-panel">
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        :aria-label="t(i18nTitle)"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ t(i18nTitle) }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ t(i18nHint) }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              :aria-label="t(i18nClose)"
              @click="emit('close')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <!-- Template + how-to -->
          <section class="space-y-3" aria-labelledby="menu-import-step-template">
            <h3 id="menu-import-step-template" class="text-sm font-semibold text-text-primary">
              {{ t(i18nStepTemplate) }}
            </h3>
            <a
              :href="templateHref"
              class="btn-secondary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center"
            >
              {{ t(i18nDownloadTemplate) }}
            </a>
            <div class="rounded-xl border border-border bg-surface-secondary/40 px-3 py-3 space-y-2">
              <p class="text-sm font-medium text-text-primary">
                {{ t(i18nHelpTitle) }}
              </p>
              <p class="text-xs text-text-secondary leading-relaxed">
                {{ t(i18nHelpBody) }}
              </p>
              <p class="text-xs text-text-primary leading-relaxed font-medium whitespace-pre-line">
                {{ t(i18nHelpExample) }}
              </p>
              <p class="text-xs text-text-tertiary leading-relaxed">
                {{ t(i18nHelpColumnsNote) }}
              </p>
            </div>
          </section>

          <!-- File dropzone -->
          <section class="space-y-2" aria-labelledby="menu-import-step-file">
            <h3 id="menu-import-step-file" class="text-sm font-semibold text-text-primary">
              {{ t(i18nStepFile) }}
            </h3>
            <input
              ref="fileInput"
              type="file"
              accept=".csv,text/csv"
              class="hidden"
              :disabled="busy"
              @change="onFileInput"
            >
            <div
              role="button"
              tabindex="0"
              class="relative border-2 border-dashed rounded-xl transition-colors overflow-hidden cursor-pointer"
              :class="isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border/60 hover:border-primary/50 bg-surface-secondary'"
              :aria-label="t(i18nDropPrompt)"
              :aria-disabled="busy"
              @click="openFilePicker"
              @keydown.enter.prevent="openFilePicker"
              @keydown.space.prevent="openFilePicker"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDrop"
            >
              <div class="flex flex-col items-center justify-center py-8 px-5 text-center">
                <svg
                  class="w-8 h-8 text-text-secondary/40 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.6"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <p class="text-sm font-medium text-text-primary">
                  {{ t(i18nDropPrompt) }}
                  <span class="text-primary">{{ t(i18nDropSelect) }}</span>
                </p>
                <p class="text-xs text-text-secondary mt-1">
                  {{ t(i18nDropHint) }}
                </p>
              </div>
            </div>
            <p v-if="job" class="text-sm text-text-secondary">
              <span class="font-medium text-text-primary">{{ job.file_name }}</span>
              · {{ t(i18nStatus) }}:
              <span class="font-medium text-text-primary">{{ statusLabel(job.status) }}</span>
              <a
                v-if="job.download_url"
                :href="job.download_url"
                target="_blank"
                rel="noopener"
                class="ms-2 text-primary underline text-xs"
              >
                {{ t(i18nDownloadOriginal) }}
              </a>
            </p>
            <p v-else class="text-xs text-text-tertiary">
              {{ t(i18nNoFileYet) }}
            </p>
          </section>

          <!-- Result -->
          <section
            v-if="report"
            class="space-y-2"
            aria-labelledby="menu-import-step-result"
          >
            <h3 id="menu-import-step-result" class="text-sm font-semibold text-text-primary">
              {{ t(i18nStepResult) }}
            </h3>
            <div class="rounded-xl border border-border p-3 space-y-2 text-sm">
              <p class="text-state-success-text">
                {{ t(i18nValid, { n: readyCount }) }}
              </p>
              <p class="text-destructive">
                {{ t(i18nInvalid, { n: errorCount }) }}
              </p>
              <p v-if="report.needs_product_count" class="text-text-secondary">
                {{ t('abastecimiento.glossary.bulkImportNeedsProduct', { n: report.needs_product_count }) }}
              </p>
              <p v-if="report.quota_exceeded" class="text-destructive font-medium">
                {{ t(i18nQuotaExceeded) }}
              </p>
              <ul
                v-if="report.errors?.length"
                class="max-h-40 overflow-y-auto text-xs text-destructive space-y-1"
              >
                <li v-for="(e, i) in report.errors.slice(0, 50)" :key="i">
                  <template v-if="e.row != null">{{ t(i18nErrorRow, { row: e.row }) }} · </template>{{ e.field }}: {{ e.error }}
                </li>
              </ul>
            </div>
          </section>

          <p v-if="commitMsg" class="text-sm text-state-success-text">{{ commitMsg }}</p>
          <p v-if="errorMsg" class="text-sm text-destructive" role="alert">{{ errorMsg }}</p>

          <MenuImportJobHistory
            :jobs="jobs"
            :title="t(i18nStepHistory)"
            :empty="isMenuEntity ? t(`${i18nPrefix}NoJobs`) : t('abastecimiento.glossary.bulkImportNoJobs')"
            :status-label-fn="statusLabel"
            @select="loadJob"
          />
        </div>

        <div class="flex-shrink-0 border-t border-border px-6 py-4 bg-surface space-y-2">
          <p class="text-xs text-text-tertiary leading-snug">
            {{ canCommit ? t(i18nReviewHintReady) : (commitBlockedReason || t(i18nReviewHint)) }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="btn-secondary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium"
              :disabled="!jobId || busy"
              @click="runDryRun"
            >
              {{ t(i18nReview) }}
            </button>
            <button
              type="button"
              class="btn-primary min-h-[40px] rounded-lg px-4 py-2 text-sm font-medium"
              :disabled="!canCommit || busy"
              :title="canCommit ? undefined : (commitBlockedReason || undefined)"
              @click="runCommit"
            >
              {{ t(i18nCommit, { n: readyCount }) }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
const i18nStatus = computed(() => `${i18nPrefix.value}Status`)
const i18nDownloadOriginal = computed(() => `${i18nPrefix.value}DownloadOriginal`)
const i18nValid = computed(() => `${i18nPrefix.value}Valid`)
const i18nInvalid = computed(() => `${i18nPrefix.value}Invalid`)
const i18nQuotaExceeded = computed(() => `${i18nPrefix.value}QuotaExceeded`)
const i18nReview = computed(() => `${i18nPrefix.value}Review`)
const i18nReviewHint = computed(() => `${i18nPrefix.value}ReviewHint`)
const i18nReviewHintReady = computed(() => `${i18nPrefix.value}ReviewHintReady`)
const i18nCommit = computed(() => `${i18nPrefix.value}Commit`)
const i18nCommitted = computed(() => `${i18nPrefix.value}Committed`)
const i18nStepTemplate = computed(() => `${i18nPrefix.value}StepTemplate`)
const i18nStepFile = computed(() => `${i18nPrefix.value}StepFile`)
const i18nStepResult = computed(() => `${i18nPrefix.value}StepResult`)
const i18nStepHistory = computed(() => `${i18nPrefix.value}History`)
const i18nHelpTitle = computed(() => `${i18nPrefix.value}HelpTitle`)
const i18nHelpBody = computed(() => `${i18nPrefix.value}HelpBody`)
const i18nHelpExample = computed(() => `${i18nPrefix.value}HelpExample`)
const i18nHelpColumnsNote = computed(() => `${i18nPrefix.value}HelpColumnsNote`)
const i18nDropPrompt = computed(() => `${i18nPrefix.value}DropPrompt`)
const i18nDropSelect = computed(() => `${i18nPrefix.value}DropSelect`)
const i18nDropHint = computed(() => `${i18nPrefix.value}DropHint`)
const i18nNoFileYet = computed(() => `${i18nPrefix.value}NoFileYet`)
const i18nErrorRow = computed(() => `${i18nPrefix.value}ErrorRow`)
const i18nNeedFile = computed(() => `${i18nPrefix.value}NeedFile`)
const i18nNeedReview = computed(() => `${i18nPrefix.value}NeedReview`)
const i18nNoneReady = computed(() => `${i18nPrefix.value}NoneReady`)
const isMenuEntity = computed(
  () =>
    props.entity === 'recipe_bases'
    || props.entity === 'products'
    || props.entity === 'modifiers',
)

const templateHref = computed(() => `/api/menu/imports/template/${props.entity}`)
const uploadPath = computed(() => `/api/menu/imports/${props.entity}/upload`)

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const busy = ref(false)
const jobId = ref<string | null>(null)
const job = ref<any>(null)
const report = ref<any>(null)
const jobs = ref<any[]>([])
const commitMsg = ref('')
const errorMsg = ref('')

const readyCount = computed(() => Number(job.value?.row_valid ?? report.value?.valid?.length ?? 0))
const errorCount = computed(() => Number(report.value?.errors?.length ?? job.value?.row_invalid ?? 0))

const canCommit = computed(
  () =>
    job.value?.status === 'dry_run'
    && readyCount.value > 0
    && !report.value?.quota_exceeded,
)

const commitBlockedReason = computed(() => {
  if (canCommit.value) return ''
  if (!jobId.value) return t(i18nNeedFile.value)
  if (report.value?.quota_exceeded) return t(i18nQuotaExceeded.value)
  if (job.value?.status !== 'dry_run') return t(i18nNeedReview.value)
  if (readyCount.value <= 0) return t(i18nNoneReady.value)
  return t(i18nNeedReview.value)
})

function statusLabel(status: string | undefined | null): string {
  const key = {
    uploaded: 'abastecimiento.glossary.bulkImportStatusUploaded',
    dry_run: 'abastecimiento.glossary.bulkImportStatusReviewed',
    committed: 'abastecimiento.glossary.bulkImportStatusImported',
    failed: 'abastecimiento.glossary.bulkImportStatusFailed',
  }[String(status || '')]
  return key ? t(key) : (status || '')
}

function openFilePicker() {
  if (busy.value) return
  fileInput.value?.click()
}

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel'
}

async function acceptFile(file: File | undefined | null) {
  if (!file) return
  if (!isCsvFile(file)) {
    errorMsg.value = t(`${i18nPrefix.value}InvalidFileType`)
    return
  }
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

function onFileInput(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  void acceptFile(file)
}

function onDrop(event: DragEvent) {
  isDragging.value = false
  if (busy.value) return
  const file = event.dataTransfer?.files?.[0]
  void acceptFile(file)
}

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
    errorMsg.value = e?.data?.detail || e?.message || 'Review failed'
  } finally {
    busy.value = false
  }
}

async function runCommit() {
  if (!canCommit.value || !jobId.value) return
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
      isDragging.value = false
      await refreshJobs()
    }
  },
)
</script>

<style scoped>
.menu-import-panel-enter-active,
.menu-import-panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.menu-import-panel-enter-from,
.menu-import-panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .menu-import-panel-enter-from,
  .menu-import-panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
