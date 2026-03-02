<script setup lang="ts">
interface HistoryEntry {
  id: string
  old_status: string | null
  new_status: string
  change_date: string
  reason: string | null
}

interface Props {
  history: HistoryEntry[]
  isLoading: boolean
  error: any
  orderType?: string
}

const props = defineProps<Props>()

const { getStatusText, getStatusVariant } = useOnlineOrderStatus()
const { formatDateTime } = useFormatters()

const variantColorMap: Record<string, string> = {
  warning:     'bg-yellow-500/10 border-yellow-500 text-yellow-500',
  primary:     'bg-primary/10 border-primary text-primary',
  info:        'bg-blue-500/10 border-blue-500 text-blue-500',
  success:     'bg-green-500/10 border-green-500 text-green-500',
  destructive: 'bg-red-500/10 border-red-500 text-red-500',
  secondary:   'bg-gray-500/10 border-gray-500 text-gray-500',
}

function getIconClasses(status: string): string {
  const variant = getStatusVariant(status)
  return variantColorMap[variant] ?? variantColorMap.secondary
}

const STATUS_ICONS: Record<string, string> = {
  pending:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  confirmed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  preparing: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  delivered: 'M5 13l4 4L19 7',
  completed: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  cancelled: 'M6 18L18 6M6 6l12 12',
}

function getStatusIcon(status: string): string {
  return STATUS_ICONS[status] ?? STATUS_ICONS.pending
}
</script>

<template>
  <div class="bg-surface border border-border rounded-xl p-4 sm:p-6">
    <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Historial de estados</p>

    <!-- Loading: thin animated bar per issue spec -->
    <div v-if="isLoading" aria-live="polite" aria-label="Cargando historial">
      <div class="animate-pulse h-1 bg-border rounded w-full" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" aria-live="polite" role="alert">
      <p class="text-sm text-destructive">Error al cargar el historial.</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="history.length === 0" class="text-center py-6">
      <p class="text-sm text-text-secondary">Sin historial registrado</p>
    </div>

    <!-- Timeline -->
    <ol v-else aria-label="Historial de estados del pedido" class="space-y-6">
      <li v-for="(entry, index) in history" :key="entry.id" class="relative">
        <!-- Connector line (hidden on last item) -->
        <div
          v-if="index !== history.length - 1"
          class="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border"
          aria-hidden="true"
        />

        <div class="flex space-x-4">
          <!-- Status dot/icon -->
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 z-10"
            :class="index === 0 ? getIconClasses(entry.new_status) : 'bg-gray-500/10 border-gray-500 text-gray-500'"
            aria-hidden="true"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="getStatusIcon(entry.new_status)"
              />
            </svg>
          </div>

          <!-- Entry content -->
          <div class="flex-1 pb-6">
            <div class="bg-background border border-border rounded-lg p-4">
              <!-- Status title -->
              <h4 class="font-semibold text-text-primary">
                {{ entry.old_status === null ? 'Pedido creado' : getStatusText(entry.new_status, props.orderType) }}
              </h4>

              <!-- Previous status (skip on creation event) -->
              <p v-if="entry.old_status !== null" class="text-xs text-text-secondary mt-0.5">
                Desde: {{ getStatusText(entry.old_status, props.orderType) }}
              </p>

              <!-- Date/time -->
              <p class="text-sm text-text-secondary mt-2 flex items-center gap-1">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ formatDateTime(entry.change_date) }}
              </p>

              <!-- Reason (optional) -->
              <div v-if="entry.reason" class="mt-3 pt-3 border-t border-border">
                <p class="text-sm text-text-secondary">
                  <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  {{ entry.reason }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>
