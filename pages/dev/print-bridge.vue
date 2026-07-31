<script setup lang="ts">
/**
 * Dev harness for QZ Tray local print bridge (warocol.com#1948).
 * Open only in development: /dev/print-bridge
 */
import { ref } from 'vue'
import {
  LocalPrintBridgeError,
  useLocalPrintBridge,
} from '~/composables/useLocalPrintBridge'

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

definePageMeta({
  layout: false,
})

useHead({ title: 'Print bridge — Dev' })

const bridge = useLocalPrintBridge()
const printers = ref<string[]>([])
const selected = ref('')
const status = ref('Disconnected')
const busy = ref(false)
const lastError = ref('')

const toast = useToast()

async function connect() {
  busy.value = true
  lastError.value = ''
  try {
    await bridge.connect()
    status.value = 'Connected'
    toast.success('QZ Tray connected', { title: 'Print bridge' })
  } catch (err) {
    status.value = 'Unavailable'
    lastError.value = err instanceof Error ? err.message : String(err)
    toast.error(lastError.value, { title: 'QZ Tray unavailable' })
  } finally {
    busy.value = false
  }
}

async function refreshPrinters() {
  busy.value = true
  lastError.value = ''
  try {
    printers.value = await bridge.listPrinters()
    if (!selected.value && printers.value[0]) selected.value = printers.value[0]
    status.value = `Connected · ${printers.value.length} printer(s)`
  } catch (err) {
    lastError.value = err instanceof Error ? err.message : String(err)
    const code = err instanceof LocalPrintBridgeError ? err.code : 'ERROR'
    toast.error(lastError.value, { title: code })
  } finally {
    busy.value = false
  }
}

async function printTest() {
  if (!selected.value) {
    toast.error('Select a printer first', { title: 'Print bridge' })
    return
  }
  busy.value = true
  lastError.value = ''
  try {
    await bridge.printEscPosTestTicket(selected.value, 'WARO print bridge OK')
    toast.success(`ESC/POS test sent to ${selected.value}`, { title: 'Printed' })
  } catch (err) {
    lastError.value = err instanceof Error ? err.message : String(err)
    toast.error(lastError.value, { title: 'Print failed' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page-layout mx-auto flex max-w-xl flex-col gap-4 p-4 md:p-6">
    <header class="space-y-1">
      <h1 class="text-xl font-bold text-text-primary">Local print bridge (QZ)</h1>
      <p class="text-sm text-text-secondary">
        Dev harness for warocol.com#1948. Install QZ Tray, connect, list printers, send a raw ESC/POS test.
        See <code class="text-xs">docs/engineering/local-print-bridge-qz.md</code>.
      </p>
      <p class="text-xs text-text-secondary">
        Status: <span class="font-semibold text-text-primary">{{ status }}</span>
      </p>
    </header>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="busy"
        @click="connect"
      >
        Connect
      </button>
      <button
        type="button"
        class="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
        :disabled="busy"
        @click="refreshPrinters"
      >
        List printers
      </button>
      <button
        type="button"
        class="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
        :disabled="busy || !selected"
        @click="printTest"
      >
        Print ESC/POS test
      </button>
    </div>

    <label class="flex flex-col gap-1 text-sm">
      <span class="font-medium text-text-primary">Printer</span>
      <select
        v-model="selected"
        class="input-base min-h-[44px] rounded-lg border border-border bg-background px-3 py-2"
      >
        <option disabled value="">
          {{ printers.length ? 'Select…' : 'Connect and list printers' }}
        </option>
        <option v-for="name in printers" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
    </label>

    <ul v-if="printers.length" class="rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary">
      <li v-for="name in printers" :key="name" class="font-mono text-xs text-text-primary">
        {{ name }}
      </li>
    </ul>

    <p v-if="lastError" class="rounded-lg border border-state-danger-border bg-state-danger-bg p-3 text-xs text-state-danger-text">
      {{ lastError }}
    </p>

    <p class="text-xs text-text-secondary">
      This page never calls <code>window.print</code>. Thermal tickets must use raw ESC/POS (not PostScript/PDF).
    </p>
  </div>
</template>
