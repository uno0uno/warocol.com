<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-black/40" @click="close" />

      <aside
        class="relative flex h-full w-full max-w-xl flex-col overflow-hidden bg-surface shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-label="t('ventas.detail.emailHistory.title')"
      >
        <header class="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 class="text-lg font-bold text-text-primary">{{ t('ventas.detail.emailHistory.title') }}</h2>
            <p class="mt-1 text-sm text-text-secondary">{{ t('ventas.detail.emailHistory.description') }}</p>
          </div>
          <button
            type="button"
            class="flex min-h-9 min-w-9 items-center justify-center rounded-lg transition-colors hover:bg-surface-secondary"
            :aria-label="t('ventas.detail.emailHistory.close')"
            @click="close"
          >
            <svg class="h-5 w-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </header>

        <main class="flex-1 overflow-y-auto p-6">
          <div v-if="state === 'loading'" class="flex justify-center py-12">
            <svg class="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
            </svg>
          </div>

          <div v-else-if="state === 'unavailable'" class="rounded-xl border border-border bg-surface-secondary/60 p-5 text-center">
            <p class="text-sm font-semibold text-text-primary">{{ t('ventas.detail.emailHistory.unavailableTitle') }}</p>
            <p class="mt-1 text-sm text-text-secondary">{{ t('ventas.detail.emailHistory.unavailableBody') }}</p>
          </div>

          <div v-else-if="state === 'error'" class="rounded-xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-800/40 dark:bg-red-950/20">
            <p class="text-sm font-semibold text-red-800 dark:text-red-300">{{ t('ventas.detail.emailHistory.errorTitle') }}</p>
            <p class="mt-1 text-sm text-red-700 dark:text-red-400">{{ t('ventas.detail.emailHistory.errorBody') }}</p>
            <button type="button" class="mt-4 min-h-[44px] rounded-lg border border-border px-4 text-sm font-semibold text-text-primary hover:bg-surface" @click="fetchHistory">
              {{ t('ventas.detail.emailHistory.retry') }}
            </button>
          </div>

          <div v-else-if="deliveries.length === 0" class="rounded-xl border border-border bg-surface-secondary/60 p-5 text-center">
            <p class="text-sm font-semibold text-text-primary">{{ t('ventas.detail.emailHistory.emptyTitle') }}</p>
            <p class="mt-1 text-sm text-text-secondary">{{ t('ventas.detail.emailHistory.emptyBody') }}</p>
          </div>

          <ol v-else class="space-y-3">
            <li v-for="delivery in deliveries" :key="delivery.id ?? `${delivery.recipient_email}-${delivery.created_at}`" class="rounded-xl border border-border p-4">
              <div class="flex items-start justify-between gap-3">
                <p class="min-w-0 break-all text-sm font-semibold text-text-primary">{{ delivery.recipient_email }}</p>
                <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(delivery.status)">
                  {{ statusLabel(delivery.status) }}
                </span>
              </div>
              <dl class="mt-3 space-y-1.5 text-sm text-text-secondary">
                <div v-if="delivery.sent_at" class="flex justify-between gap-3"><dt>{{ t('ventas.detail.emailHistory.sentAt') }}</dt><dd>{{ formatDate(delivery.sent_at) }}</dd></div>
                <div v-if="delivery.failed_at" class="flex justify-between gap-3"><dt>{{ t('ventas.detail.emailHistory.failedAt') }}</dt><dd>{{ formatDate(delivery.failed_at) }}</dd></div>
                <div class="flex justify-between gap-3"><dt>{{ t('ventas.detail.emailHistory.openSignal') }}</dt><dd>{{ t('ventas.detail.emailHistory.openCount', { count: delivery.open_count ?? 0 }) }}</dd></div>
                <div v-if="delivery.failure_code" class="flex justify-between gap-3"><dt>{{ t('ventas.detail.emailHistory.failureCode') }}</dt><dd class="break-all text-right">{{ delivery.failure_code }}</dd></div>
              </dl>
            </li>
          </ol>
        </main>

        <footer class="border-t border-border px-6 py-4">
          <button type="button" class="min-h-[44px] w-full rounded-lg border border-border px-4 text-sm font-semibold text-text-primary hover:bg-surface-secondary" @click="close">
            {{ t('ventas.detail.emailHistory.close') }}
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

type Delivery = {
  id?: string
  recipient_email: string
  status: string
  sent_at?: string | null
  failed_at?: string | null
  open_count?: number | null
  failure_code?: string | null
  created_at?: string | null
}

const props = defineProps<{ open: boolean; orderId: string; refreshKey: number }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const { t, locale } = useI18n({ useScope: 'global' })

const deliveries = ref<Delivery[]>([])
const state = ref<'idle' | 'loading' | 'unavailable' | 'error'>('idle')

const close = () => emit('update:open', false)

const fetchHistory = async () => {
  if (!props.open) return
  state.value = 'loading'
  try {
    const response = await $fetch<{ deliveries?: Delivery[] } | { data?: { deliveries?: Delivery[] } }>(`/api/orders/${props.orderId}/invoice/email-history`)
    deliveries.value = 'deliveries' in response ? response.deliveries ?? [] : response.data?.deliveries ?? []
    state.value = 'idle'
  } catch (error: any) {
    state.value = error?.status === 404 || error?.statusCode === 404 ? 'unavailable' : 'error'
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) fetchHistory()
})

watch(() => props.refreshKey, () => {
  if (props.open) fetchHistory()
})

const formatDate = (value: string) => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

const statusLabel = (status: string) => t(`ventas.detail.emailHistory.status.${status === 'failed' ? 'failed' : status === 'sent' ? 'sent' : 'pending'}`)
const statusClass = (status: string) => status === 'failed'
  ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
  : status === 'sent'
    ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
</script>
