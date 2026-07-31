<script setup lang="ts">
/**
 * Operaciones → Impresoras (warocol.com#1949 / #1958).
 * Compact tables + per-row test print + PrintBridge download modal.
 */
import { computed, ref, watch } from 'vue'
import { ArrowDownTrayIcon, PrinterIcon, QueueListIcon } from '@heroicons/vue/24/outline'
import { LocalPrintBridgeError, useLocalPrintBridge } from '~/composables/useLocalPrintBridge'
import { usePrinterAssignments } from '~/composables/usePrinterAssignments'
import {
  PRINTBRIDGE_DOWNLOADS,
  PRINTBRIDGE_RELEASES_PAGE,
  openPrintBridgeDownload,
  preferredPrintBridgeDownloadId,
  type PrintBridgeDownload,
} from '~/utils/printBridgeDownloads'

const { t } = useI18n({ useScope: 'global' })

definePageMeta({
  layout: 'dashboard',
  module: 'operaciones',
})

useHead({ title: () => t('operaciones.head.impresoras') })

const toast = useToast()
const bridge = useLocalPrintBridge()
const {
  assignments,
  isLoading,
  isRefreshing,
  error: fetchError,
  saveAssignments,
} = usePrinterAssignments()

const discovered = ref<string[]>([])
const bridgeStatus = ref('')
const bridgeOk = ref(false)
const bridgeBusy = ref(false)
const saving = ref(false)
const testingRowId = ref<string | null>(null)
const downloadModalOpen = ref(false)
/** Shown after Detectar fails so restaurants can install PrintBridge. */
const showDownloadCta = ref(false)

const cajaPrinter = ref<string>('')
/** station_id → printer name (empty = use caja) */
const stationPrinters = ref<Record<string, string>>({})

const preferredDownloadId = preferredPrintBridgeDownloadId()

const downloadsByPlatform = computed(() => {
  const groups: Record<'windows' | 'mac' | 'linux', PrintBridgeDownload[]> = {
    windows: [],
    mac: [],
    linux: [],
  }
  for (const d of PRINTBRIDGE_DOWNLOADS) groups[d.platform].push(d)
  return groups
})

watch(
  assignments,
  (data) => {
    if (!data) return
    cajaPrinter.value = data.caja_printer_name || ''
    const map: Record<string, string> = {}
    for (const st of data.active_stations || []) {
      const assigned = data.stations.find(s => s.station_id === st.id)
      map[st.id] = assigned?.printer_name || ''
    }
    stationPrinters.value = map
  },
  { immediate: true },
)

const printerOptions = computed(() => {
  const names = new Set<string>(discovered.value)
  if (cajaPrinter.value) names.add(cajaPrinter.value)
  for (const v of Object.values(stationPrinters.value)) {
    if (v) names.add(v)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b))
})

const activeStations = computed(() => assignments.value?.active_stations ?? [])

const cajaRows = computed(() => [
  {
    id: '__caja__',
    name: t('operaciones.impresoras.cajaRowName'),
    use: t('operaciones.impresoras.cajaUse'),
  },
])

const cajaColumns = [
  { key: 'name', title: t('operaciones.impresoras.colDestination'), sortable: false },
  { key: 'use', title: t('operaciones.impresoras.colUse'), sortable: false },
  { key: 'printer', title: t('operaciones.impresoras.colPrinter'), sortable: false },
  { key: 'test', title: t('operaciones.impresoras.colTest'), sortable: false },
]

const stationColumns = [
  { key: 'name', title: t('operaciones.impresoras.colStation'), sortable: false },
  { key: 'monitor', title: t('operaciones.impresoras.colMonitor'), sortable: false },
  { key: 'printer', title: t('operaciones.impresoras.colPrinter'), sortable: false },
  { key: 'test', title: t('operaciones.impresoras.colTest'), sortable: false },
]

function resolvedPrinterForCaja(): string {
  return (cajaPrinter.value || '').trim()
}

function resolvedPrinterForStation(stationId: string): string {
  return ((stationPrinters.value[stationId] || cajaPrinter.value) || '').trim()
}

async function refreshDiscovered() {
  bridgeBusy.value = true
  bridgeStatus.value = ''
  bridgeOk.value = false
  showDownloadCta.value = false
  try {
    await bridge.connect()
    discovered.value = await bridge.listPrinters()
    bridgeOk.value = true
    showDownloadCta.value = false
    bridgeStatus.value = t('operaciones.impresoras.bridgeOkShort', { n: discovered.value.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    bridgeStatus.value = msg
    showDownloadCta.value = true
    const title = err instanceof LocalPrintBridgeError ? err.code : t('operaciones.impresoras.bridgeError')
    toast.error(msg, { title })
  } finally {
    bridgeBusy.value = false
  }
}

function openDownloadModal() {
  downloadModalOpen.value = true
}

function downloadInstaller(item: PrintBridgeDownload) {
  openPrintBridgeDownload(item.url)
}

async function printTest(rowId: string, printerName: string) {
  const name = printerName.trim()
  if (!name) {
    toast.error(t('operaciones.impresoras.testPrintNeedPrinter'), {
      title: t('operaciones.impresoras.bridgeError'),
    })
    return
  }
  testingRowId.value = rowId
  try {
    await bridge.connect()
    await bridge.printEscPosTestTicket(name, `WARO · ${name}`)
    toast.success(t('operaciones.impresoras.testPrintOk', { name }), {
      title: t('operaciones.impresoras.testPrintTitle'),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : t('operaciones.impresoras.testPrintError')
    toast.error(msg, { title: t('operaciones.impresoras.testPrintTitle') })
  } finally {
    testingRowId.value = null
  }
}

async function onSave() {
  saving.value = true
  try {
    await saveAssignments({
      caja_printer_name: cajaPrinter.value.trim() || null,
      stations: activeStations.value.map(st => ({
        station_id: st.id,
        printer_name: (stationPrinters.value[st.id] || '').trim() || null,
      })),
    })
    toast.success(t('operaciones.impresoras.saved'), { title: t('operaciones.impresoras.savedTitle') })
  } catch (err: any) {
    toast.error(
      err?.data?.detail || err?.message || t('operaciones.impresoras.saveError'),
      { title: t('operaciones.impresoras.error') },
    )
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <div v-if="isLoading" class="flex min-h-[400px] items-center justify-center">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div
      v-else-if="fetchError"
      class="rounded-xl border border-state-danger-border bg-state-danger-bg p-4 text-sm text-state-danger-text"
    >
      {{ t('operaciones.impresoras.loadError') }}
    </div>

    <template v-else>
      <!-- ══════ DESTINO / CAJA ══════ -->
      <div class="rounded-xl border-2 border-border bg-surface p-4 sm:p-6">
        <div class="mb-5 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <PrinterIcon class="h-5 w-5 flex-shrink-0 text-primary" />
            <h3 class="text-base font-semibold text-text-primary sm:text-lg">
              {{ t('operaciones.impresoras.title') }}
            </h3>
            <span
              v-if="bridgeStatus"
              class="hidden truncate rounded-md px-2 py-0.5 text-xs font-medium sm:inline-block"
              :class="bridgeOk
                ? 'bg-badge-primary-bg text-badge-primary-text'
                : 'bg-state-danger-bg text-state-danger-text'"
            >
              {{ bridgeStatus }}
            </span>
          </div>
          <div class="flex flex-shrink-0 flex-wrap justify-end gap-2">
            <button
              type="button"
              class="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-primary/40 disabled:opacity-50"
              :disabled="bridgeBusy || isRefreshing"
              @click="refreshDiscovered"
            >
              <UiLoadingDots v-if="bridgeBusy" size="7px" color="currentColor" />
              <span v-else>{{ t('operaciones.impresoras.discover') }}</span>
            </button>
            <button
              type="button"
              class="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-primary/40"
              @click="openDownloadModal"
            >
              <ArrowDownTrayIcon class="h-3.5 w-3.5" />
              {{ t('operaciones.impresoras.download.cta') }}
            </button>
            <button
              type="button"
              class="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-action-primary-bg px-3 py-2 text-xs font-medium text-action-primary-text transition-colors hover:bg-action-primary-hover-bg disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="saving || isRefreshing"
              @click="onSave"
            >
              <UiLoadingDots v-if="saving" size="7px" color="currentColor" />
              <span v-else>{{ t('operaciones.impresoras.save') }}</span>
            </button>
          </div>
        </div>

        <div
          v-if="showDownloadCta"
          class="mb-4 flex flex-col gap-3 rounded-xl border border-state-warning-border bg-state-warning-bg p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-xs leading-relaxed text-state-warning-text sm:text-sm">
            {{ t('operaciones.impresoras.download.missingHint') }}
          </p>
          <button
            type="button"
            class="inline-flex min-h-[36px] flex-shrink-0 items-center justify-center gap-1.5 rounded-lg bg-action-primary-bg px-3 py-2 text-xs font-semibold text-action-primary-text transition-colors hover:bg-action-primary-hover-bg"
            @click="openDownloadModal"
          >
            <ArrowDownTrayIcon class="h-3.5 w-3.5" />
            {{ t('operaciones.impresoras.download.cta') }}
          </button>
        </div>

        <p
          v-if="bridgeStatus"
          class="mb-3 text-xs sm:hidden"
          :class="bridgeOk ? 'text-text-secondary' : 'text-state-danger-text'"
        >
          {{ bridgeStatus }}
        </p>

        <UiResponsiveDataView
          :data="cajaRows"
          :columns="cajaColumns"
          item-key="id"
          row-size="sm"
        >
          <template #card="{ item: row }">
            <div class="flex items-center justify-between gap-3 rounded-xl border-2 border-border bg-surface p-4">
              <div class="min-w-0 space-y-2">
                <p class="text-sm font-semibold text-text-primary">
                  {{ row.name }}
                </p>
                <p class="text-xs text-text-secondary">
                  {{ row.use }}
                </p>
                <select
                  v-model="cajaPrinter"
                  class="input-base min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">
                    {{ t('operaciones.impresoras.none') }}
                  </option>
                  <option v-for="name in printerOptions" :key="`caja-card-${name}`" :value="name">
                    {{ name }}
                  </option>
                </select>
              </div>
              <button
                type="button"
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text transition-colors hover:bg-badge-primary-hover-bg disabled:opacity-50"
                :disabled="testingRowId === row.id || !resolvedPrinterForCaja()"
                :aria-label="t('operaciones.impresoras.testPrintAria', { name: resolvedPrinterForCaja() || row.name })"
                :title="t('operaciones.impresoras.testPrintTitle')"
                @click="printTest(row.id, resolvedPrinterForCaja())"
              >
                <UiLoadingDots v-if="testingRowId === row.id" size="7px" color="currentColor" />
                <PrinterIcon v-else class="h-4 w-4" />
              </button>
            </div>
          </template>

          <template #cell-name="{ item: row }">
            <span class="text-sm font-medium text-text-primary">{{ row.name }}</span>
          </template>
          <template #cell-use="{ item: row }">
            <span class="text-sm text-text-secondary">{{ row.use }}</span>
          </template>
          <template #cell-printer>
            <select
              v-model="cajaPrinter"
              class="input-base min-h-[36px] w-full max-w-xs rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">
                {{ t('operaciones.impresoras.none') }}
              </option>
              <option v-for="name in printerOptions" :key="`caja-${name}`" :value="name">
                {{ name }}
              </option>
            </select>
          </template>
          <template #cell-test="{ item: row }">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text transition-colors hover:bg-badge-primary-hover-bg disabled:opacity-50"
              :disabled="testingRowId === row.id || !resolvedPrinterForCaja()"
              :aria-label="t('operaciones.impresoras.testPrintAria', { name: resolvedPrinterForCaja() || row.name })"
              :title="t('operaciones.impresoras.testPrintTitle')"
              @click="printTest(row.id, resolvedPrinterForCaja())"
            >
              <UiLoadingDots v-if="testingRowId === row.id" size="7px" color="currentColor" />
              <PrinterIcon v-else class="h-4 w-4" />
            </button>
          </template>
        </UiResponsiveDataView>
      </div>

      <!-- ══════ ESTACIONES ══════ -->
      <div class="rounded-xl border-2 border-border bg-surface p-4 sm:p-6">
        <div class="mb-5 flex items-center gap-2">
          <QueueListIcon class="h-5 w-5 flex-shrink-0 text-primary" />
          <h3 class="text-base font-semibold text-text-primary sm:text-lg">
            {{ t('operaciones.impresoras.stationsTitle') }}
          </h3>
        </div>

        <UiResponsiveDataView
          :data="activeStations"
          :columns="stationColumns"
          :empty-message="t('operaciones.impresoras.noStations')"
          :empty-sub-message="t('operaciones.impresoras.noStationsSub')"
          item-key="id"
          row-size="sm"
        >
          <template #card="{ item: st }">
            <div class="flex items-center justify-between gap-3 rounded-xl border-2 border-border bg-surface p-4">
              <div class="min-w-0 flex-1 space-y-2">
                <p class="text-sm font-semibold text-text-primary">
                  {{ st.name }}
                </p>
                <p v-if="st.kitchen_name" class="font-mono text-xs text-text-secondary">
                  {{ st.kitchen_name }}
                </p>
                <select
                  v-model="stationPrinters[st.id]"
                  class="input-base min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">
                    {{ t('operaciones.impresoras.useCaja') }}
                  </option>
                  <option v-for="name in printerOptions" :key="`${st.id}-card-${name}`" :value="name">
                    {{ name }}
                  </option>
                </select>
              </div>
              <button
                type="button"
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text transition-colors hover:bg-badge-primary-hover-bg disabled:opacity-50"
                :disabled="testingRowId === st.id || !resolvedPrinterForStation(st.id)"
                :aria-label="t('operaciones.impresoras.testPrintAria', { name: resolvedPrinterForStation(st.id) || st.name })"
                :title="t('operaciones.impresoras.testPrintTitle')"
                @click="printTest(st.id, resolvedPrinterForStation(st.id))"
              >
                <UiLoadingDots v-if="testingRowId === st.id" size="7px" color="currentColor" />
                <PrinterIcon v-else class="h-4 w-4" />
              </button>
            </div>
          </template>

          <template #cell-name="{ item: st }">
            <span class="text-sm font-medium text-text-primary">{{ st.name }}</span>
          </template>
          <template #cell-monitor="{ item: st }">
            <span v-if="st.kitchen_name" class="font-mono text-sm text-text-secondary">{{ st.kitchen_name }}</span>
            <span v-else class="text-xs italic text-text-tertiary">—</span>
          </template>
          <template #cell-printer="{ item: st }">
            <select
              v-model="stationPrinters[st.id]"
              class="input-base min-h-[36px] w-full max-w-xs rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">
                {{ t('operaciones.impresoras.useCaja') }}
              </option>
              <option v-for="name in printerOptions" :key="`${st.id}-${name}`" :value="name">
                {{ name }}
              </option>
            </select>
          </template>
          <template #cell-test="{ item: st }">
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg border border-badge-primary-border bg-badge-primary-bg text-badge-primary-text transition-colors hover:bg-badge-primary-hover-bg disabled:opacity-50"
              :disabled="testingRowId === st.id || !resolvedPrinterForStation(st.id)"
              :aria-label="t('operaciones.impresoras.testPrintAria', { name: resolvedPrinterForStation(st.id) || st.name })"
              :title="t('operaciones.impresoras.testPrintTitle')"
              @click="printTest(st.id, resolvedPrinterForStation(st.id))"
            >
              <UiLoadingDots v-if="testingRowId === st.id" size="7px" color="currentColor" />
              <PrinterIcon v-else class="h-4 w-4" />
            </button>
          </template>
        </UiResponsiveDataView>
      </div>
    </template>

    <UiModal
      v-model="downloadModalOpen"
      :title="t('operaciones.impresoras.download.modalTitle')"
      max-height="md"
    >
      <div class="space-y-4 px-6 py-4">
        <p class="text-sm text-text-secondary">
          {{ t('operaciones.impresoras.download.modalIntro') }}
        </p>
        <p class="rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-secondary">
          {{ t('operaciones.impresoras.download.whitelistHint') }}
        </p>

        <div
          v-for="platform in (['windows', 'mac', 'linux'] as const)"
          :key="platform"
          class="space-y-2"
        >
          <h4 class="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {{ t(`operaciones.impresoras.download.platform.${platform}`) }}
          </h4>
          <div class="flex flex-col gap-2">
            <button
              v-for="item in downloadsByPlatform[platform]"
              :key="item.id"
              type="button"
              class="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors"
              :class="item.id === preferredDownloadId
                ? 'border-primary bg-badge-primary-bg text-text-primary'
                : 'border-border bg-surface text-text-primary hover:border-primary/40'"
              @click="downloadInstaller(item)"
            >
              <span class="font-medium">
                {{ t(`operaciones.impresoras.download.${item.labelKey}`) }}
                <span
                  v-if="item.id === preferredDownloadId"
                  class="ml-2 text-xs font-normal text-badge-primary-text"
                >
                  {{ t('operaciones.impresoras.download.recommended') }}
                </span>
              </span>
              <ArrowDownTrayIcon class="h-4 w-4 flex-shrink-0 text-primary" />
            </button>
          </div>
        </div>

        <a
          :href="PRINTBRIDGE_RELEASES_PAGE"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex text-xs font-medium text-primary hover:underline"
        >
          {{ t('operaciones.impresoras.download.allReleases') }}
        </a>
      </div>
    </UiModal>
  </div>
</template>
