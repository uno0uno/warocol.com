<script setup lang="ts">
/**
 * Operaciones → Impresoras (warocol.com#1949).
 * Assign caja + optional kitchen station printers via QZ discovery.
 */
import { computed, ref, watch } from 'vue'
import { LocalPrintBridgeError, useLocalPrintBridge } from '~/composables/useLocalPrintBridge'
import { usePrinterAssignments } from '~/composables/usePrinterAssignments'

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
const bridgeBusy = ref(false)
const saving = ref(false)

const cajaPrinter = ref<string>('')
/** station_id → printer name (empty = use caja) */
const stationPrinters = ref<Record<string, string>>({})

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

async function refreshDiscovered() {
  bridgeBusy.value = true
  bridgeStatus.value = ''
  try {
    await bridge.connect()
    discovered.value = await bridge.listPrinters()
    bridgeStatus.value = t('operaciones.impresoras.bridgeOk', { n: discovered.value.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    bridgeStatus.value = msg
    const title = err instanceof LocalPrintBridgeError ? err.code : t('operaciones.impresoras.bridgeError')
    toast.error(msg, { title })
  } finally {
    bridgeBusy.value = false
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

    <template v-else>
      <div
        v-if="fetchError"
        class="rounded-xl border border-state-danger-border bg-state-danger-bg p-4 text-sm text-state-danger-text"
      >
        {{ t('operaciones.impresoras.loadError') }}
      </div>

      <div class="rounded-xl border-2 border-border bg-surface p-4 sm:p-6">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <h3 class="text-base font-semibold text-text-primary sm:text-lg">
              {{ t('operaciones.impresoras.title') }}
            </h3>
            <p class="text-sm text-text-secondary">
              {{ t('operaciones.impresoras.subtitle') }}
            </p>
            <p v-if="bridgeStatus" class="text-xs text-text-secondary">
              {{ bridgeStatus }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
              :disabled="bridgeBusy || isRefreshing"
              @click="refreshDiscovered"
            >
              {{ t('operaciones.impresoras.discover') }}
            </button>
            <button
              type="button"
              class="min-h-[44px] rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              :disabled="saving || isRefreshing"
              @click="onSave"
            >
              {{ t('operaciones.impresoras.save') }}
            </button>
          </div>
        </div>

        <div class="space-y-4">
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-semibold text-text-primary">{{ t('operaciones.impresoras.cajaLabel') }}</span>
            <span class="text-xs text-text-secondary">{{ t('operaciones.impresoras.cajaHelp') }}</span>
            <select
              v-model="cajaPrinter"
              class="input-base min-h-[44px] rounded-lg border border-border bg-background px-3 py-2"
            >
              <option value="">
                {{ t('operaciones.impresoras.none') }}
              </option>
              <option v-for="name in printerOptions" :key="`caja-${name}`" :value="name">
                {{ name }}
              </option>
            </select>
          </label>

          <div class="border-t border-border pt-4">
            <h4 class="mb-2 text-sm font-semibold text-text-primary">
              {{ t('operaciones.impresoras.stationsTitle') }}
            </h4>
            <p class="mb-3 text-xs text-text-secondary">
              {{ t('operaciones.impresoras.stationsHelp') }}
            </p>

            <p v-if="activeStations.length === 0" class="text-sm text-text-secondary">
              {{ t('operaciones.impresoras.noStations') }}
            </p>

            <div v-else class="divide-y divide-border rounded-xl border border-border">
              <div
                v-for="st in activeStations"
                :key="st.id"
                class="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-text-primary">
                    {{ st.name }}
                  </p>
                  <p v-if="st.kitchen_name" class="font-mono text-xs text-text-secondary">
                    {{ st.kitchen_name }}
                  </p>
                  <p class="text-xs text-text-secondary">
                    {{
                      t('operaciones.impresoras.resolvedAs', {
                        name: stationPrinters[st.id] || cajaPrinter || t('operaciones.impresoras.none'),
                      })
                    }}
                  </p>
                </div>
                <select
                  v-model="stationPrinters[st.id]"
                  class="input-base min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 sm:max-w-xs"
                >
                  <option value="">
                    {{ t('operaciones.impresoras.useCaja') }}
                  </option>
                  <option v-for="name in printerOptions" :key="`${st.id}-${name}`" :value="name">
                    {{ name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
