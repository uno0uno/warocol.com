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
      <div v-if="open" class="fixed inset-0 z-40 bg-black/40" aria-hidden="true" @click="close" />
    </Transition>

    <Transition name="panel">
      <aside
        v-if="open"
        class="fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl inset-x-0 bottom-0 md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:h-full md:max-h-none md:max-w-md md:rounded-none"
        role="dialog"
        aria-modal="true"
        :aria-label="t('ventas.detail.emailHistory.title')"
      >
        <div class="flex shrink-0 justify-center pb-1 pt-3 md:hidden">
          <div class="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <header class="shrink-0 border-b border-border bg-surface-secondary/40 px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold leading-tight text-text-primary">{{ t('ventas.detail.emailHistory.title') }}</h2>
                <p class="mt-0.5 text-xs leading-snug text-text-secondary">{{ t('ventas.detail.emailHistory.description') }}</p>
              </div>
            </div>
            <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30" :aria-label="t('ventas.detail.emailHistory.close')" @click="close">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 6 12 12M6 18 18 6" />
              </svg>
            </button>
          </div>
        </header>

        <main class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div v-if="state === 'loading'" class="flex items-center justify-center py-8">
            <CommonsTheCustomLoader size="medium" />
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
            <li v-for="delivery in deliveries" :key="delivery.id ?? `${delivery.recipient_email}-${delivery.created_at}`" class="rounded-xl border border-border bg-surface-secondary/30 p-4">
              <div class="flex items-start justify-between gap-3">
                <p class="min-w-0 break-all text-sm font-semibold text-text-primary">{{ delivery.recipient_email }}</p>
                <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(delivery.status)">
                  {{ statusLabel(delivery.status) }}
                </span>
              </div>
              <dl class="mt-3 space-y-2 text-sm text-text-secondary">
                <div v-if="delivery.sent_at" class="flex items-start justify-between gap-3"><dt>{{ t('ventas.detail.emailHistory.sentAt') }}</dt><dd class="text-right tabular-nums">{{ formatDate(delivery.sent_at) }}</dd></div>
                <div v-if="delivery.failed_at" class="flex items-start justify-between gap-3"><dt>{{ t('ventas.detail.emailHistory.failedAt') }}</dt><dd class="text-right tabular-nums">{{ formatDate(delivery.failed_at) }}</dd></div>
                <div class="flex items-start justify-between gap-3"><dt>{{ t('ventas.detail.emailHistory.openSignal') }}</dt><dd class="text-right">{{ t('ventas.detail.emailHistory.openCount', { count: delivery.open_count ?? 0 }) }}</dd></div>
                <div v-if="delivery.failure_code" class="flex items-start justify-between gap-3"><dt>{{ t('ventas.detail.emailHistory.failureCode') }}</dt><dd class="break-all text-right">{{ delivery.failure_code }}</dd></div>
              </dl>
            </li>
          </ol>
        </main>

        <footer class="shrink-0 border-t border-border bg-surface-secondary/40 px-6 py-4">
          <button type="button" class="min-h-[44px] w-full rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/30" @click="close">
            {{ t('ventas.detail.emailHistory.close') }}
          </button>
        </footer>
      </aside>
    </Transition>
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

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
