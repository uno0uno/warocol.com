<template>
  <div class="space-y-6 p-6">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-surface border border-border rounded-xl p-6 text-center">
      <p class="text-sm text-destructive mb-3">{{ error }}</p>
      <button @click="loadPage(currentPage)" class="text-sm text-primary hover:underline">Reintentar</button>
    </div>

    <template v-else>
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div v-if="events.length === 0" class="px-6 py-12 text-center">
          <p class="text-sm text-text-secondary">No hay eventos de billing aún</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-secondary">
              <tr>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Fecha</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Tenant</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Tipo</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Monto</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">MP Payment ID</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="evt in events"
                :key="evt.id"
                class="hover:bg-surface-secondary/50 transition-colors"
              >
                <td class="px-6 py-4 text-text-secondary text-xs whitespace-nowrap">{{ formatDateTime(evt.created_at) }}</td>
                <td class="px-6 py-4 font-medium text-text-primary">{{ evt.tenant_name }}</td>
                <td class="px-6 py-4">
                  <span :class="['text-xs font-medium px-2.5 py-1 rounded-full', eventTypeStyle(evt.event_type).badge]">
                    {{ eventTypeStyle(evt.event_type).label }}
                  </span>
                </td>
                <td class="px-6 py-4 text-text-secondary">
                  <span v-if="evt.amount != null">{{ formatCOP(evt.amount) }}</span>
                  <span v-else class="italic text-text-secondary/60">—</span>
                </td>
                <td class="px-6 py-4 text-text-secondary text-xs font-mono">
                  {{ evt.mp_payment_id ?? '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="eventsTotal > PAGE_SIZE" class="flex items-center justify-between gap-4">
        <p class="text-sm text-text-secondary">{{ paginationLabel }}</p>
        <div class="flex gap-2">
          <button
            @click="loadPage(currentPage - 1)"
            :disabled="currentPage === 0 || loading"
            class="min-h-[44px] px-4 rounded-lg text-sm font-medium border border-border hover:bg-surface-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Página anterior"
          >
            Anterior
          </button>
          <button
            @click="loadPage(currentPage + 1)"
            :disabled="(currentPage + 1) * PAGE_SIZE >= eventsTotal || loading"
            class="min-h-[44px] px-4 rounded-lg text-sm font-medium border border-border hover:bg-surface-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Página siguiente"
          >
            Siguiente
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAdminBilling } from '~/composables/useAdminBilling'

definePageMeta({ middleware: 'admin-only' })
useHead({ title: 'Eventos de Billing — WaRo Admin' })

const { events, eventsTotal, loading, error, fetchBillingEvents } = useAdminBilling()

const PAGE_SIZE = 20
const currentPage = ref(0)

const paginationLabel = computed(() => {
  const from = currentPage.value * PAGE_SIZE + 1
  const to = Math.min((currentPage.value + 1) * PAGE_SIZE, eventsTotal.value)
  return `${from}–${to} de ${eventsTotal.value}`
})

const loadPage = async (page: number) => {
  currentPage.value = page
  await fetchBillingEvents(PAGE_SIZE, page * PAGE_SIZE)
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

const eventTypeStyle = (type: string): { badge: string; label: string } => {
  const map: Record<string, { badge: string; label: string }> = {
    subscription_created:   { badge: 'bg-status-info-bg text-status-info-text',         label: 'Suscripción creada' },
    subscription_renewed:   { badge: 'bg-status-success-bg text-status-success-text',   label: 'Renovación' },
    subscription_cancelled: { badge: 'bg-status-critical-bg text-status-critical-text', label: 'Cancelación' },
    subscription_expired:   { badge: 'bg-surface-secondary text-text-secondary',        label: 'Expiración' },
    payment_approved:       { badge: 'bg-status-success-bg text-status-success-text',   label: 'Pago aprobado' },
    payment_failed:         { badge: 'bg-status-critical-bg text-status-critical-text', label: 'Pago fallido' },
    payment_pending:        { badge: 'bg-status-warning-bg text-status-warning-text',   label: 'Pago pendiente' },
    plan_changed:           { badge: 'bg-status-info-bg text-status-info-text',         label: 'Cambio de plan' },
  }
  return map[type] ?? { badge: 'bg-surface-secondary text-text-secondary', label: type }
}

onMounted(() => loadPage(0))
</script>
