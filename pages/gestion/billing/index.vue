<template>
  <div class="space-y-6 p-6">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-surface border border-border rounded-xl p-6 text-center">
      <p class="text-sm text-destructive mb-3">{{ error }}</p>
      <button @click="loadAll" class="text-sm text-primary hover:underline">Reintentar</button>
    </div>

    <template v-else>
      <!-- Plan y suscripción actual -->
      <div class="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="space-y-1">
            <p class="text-xs font-medium text-text-secondary uppercase tracking-widest">Plan actual</p>
            <p class="text-xl font-bold text-text-primary">{{ subscription?.plan_name ?? 'Sin plan' }}</p>
            <p class="text-sm text-text-secondary capitalize">
              {{ subscription?.billing_cycle === 'monthly' ? 'Mensual' : subscription?.billing_cycle === 'annual' ? 'Anual' : '—' }}
              <span v-if="subscription?.current_period_end">
                · Renovación {{ formatDate(subscription.current_period_end) }}
              </span>
            </p>
          </div>
          <span
            v-if="subscription"
            :class="['flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full', statusStyle(subscription.status).badge]"
          >
            <span aria-hidden="true">{{ statusStyle(subscription.status).icon }}</span>
            {{ statusStyle(subscription.status).label }}
          </span>
        </div>

        <!-- Uso de escaneos -->
        <div v-if="subscription" class="space-y-2 pt-2 border-t border-border">
          <p class="text-xs font-medium text-text-secondary uppercase tracking-widest">Uso de escaneos — período actual</p>
          <BillingUsageBar
            :scans-used="scansUsed"
            :scans-limit="subscription.scan_limit ?? 0"
            :percentage="scansPercentage"
            :show-percentage="true"
          />
        </div>

        <!-- Botón pagar si hay saldo pendiente -->
        <div v-if="subscription?.status === 'past_due'" class="pt-2 border-t border-border">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-status-warning-text">Tienes un pago pendiente</p>
              <p class="text-xs text-text-secondary mt-0.5">Tu acceso está en período de gracia</p>
            </div>
            <a
              v-if="subscription.checkout_url"
              :href="subscription.checkout_url"
              target="_blank"
              rel="noopener"
              class="min-h-[44px] px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center"
            >
              Pagar ahora
            </a>
          </div>
        </div>
      </div>

      <!-- Historial de pagos -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-border">
          <h2 class="text-base font-semibold text-text-primary">Historial de pagos</h2>
        </div>

        <div v-if="events.length === 0" class="px-6 py-12 text-center">
          <p class="text-sm text-text-secondary">No hay pagos registrados aún</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-secondary">
              <tr>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Fecha</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Tipo</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Monto</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Referencia MP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="evt in events" :key="evt.id" class="hover:bg-surface-secondary/50 transition-colors">
                <td class="px-6 py-4 text-text-secondary text-xs whitespace-nowrap">{{ formatDateTime(evt.created_at) }}</td>
                <td class="px-6 py-4">
                  <span :class="['text-xs font-medium px-2.5 py-1 rounded-full', eventStyle(evt.event_type).badge]">
                    {{ eventStyle(evt.event_type).label }}
                  </span>
                </td>
                <td class="px-6 py-4 font-medium text-text-primary">
                  <span v-if="evt.amount">{{ formatCOP(Number(evt.amount)) }}</span>
                  <span v-else class="text-text-secondary italic">—</span>
                </td>
                <td class="px-6 py-4 text-text-secondary text-xs font-mono">{{ evt.mp_payment_id ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div v-if="eventsTotal > PAGE_SIZE" class="px-6 py-4 border-t border-border flex items-center justify-between gap-4">
          <p class="text-sm text-text-secondary">{{ paginationLabel }}</p>
          <div class="flex gap-2">
            <button
              @click="goPage(currentPage - 1)"
              :disabled="currentPage === 0"
              class="min-h-[40px] px-4 rounded-lg text-sm font-medium border border-border hover:bg-surface-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página anterior"
            >Anterior</button>
            <button
              @click="goPage(currentPage + 1)"
              :disabled="(currentPage + 1) * PAGE_SIZE >= eventsTotal"
              class="min-h-[40px] px-4 rounded-lg text-sm font-medium border border-border hover:bg-surface-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Página siguiente"
            >Siguiente</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useBilling } from '~/composables/useBilling'

definePageMeta({ middleware: 'admin-only' })
useHead({ title: 'Historial de pagos — WaRo Admin' })

const { subscription, events, eventsTotal, loading, error, fetchSubscription, fetchMyEvents } = useBilling()

const PAGE_SIZE = 20
const currentPage = ref(0)

// Uso de escaneos — por ahora computado desde el límite del plan
const scansUsed = ref(0)
const scansPercentage = computed(() =>
  subscription.value?.scan_limit ? (scansUsed.value / subscription.value.scan_limit) * 100 : 0
)

const paginationLabel = computed(() => {
  const from = currentPage.value * PAGE_SIZE + 1
  const to = Math.min((currentPage.value + 1) * PAGE_SIZE, eventsTotal.value)
  return `${from}–${to} de ${eventsTotal.value}`
})

const goPage = async (page: number) => {
  currentPage.value = page
  await fetchMyEvents(PAGE_SIZE, page * PAGE_SIZE)
}

const loadAll = async () => {
  await Promise.all([fetchSubscription(), fetchMyEvents(PAGE_SIZE, 0)])
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

const statusStyle = (status: string) => {
  const map: Record<string, { badge: string; label: string; icon: string }> = {
    active:    { badge: 'bg-status-success-bg text-status-success-text', label: 'Activo',    icon: '●' },
    pending:   { badge: 'bg-status-info-bg text-status-info-text',       label: 'Pendiente', icon: '○' },
    past_due:  { badge: 'bg-status-warning-bg text-status-warning-text', label: 'Grace',     icon: '⚠' },
    cancelled: { badge: 'bg-status-critical-bg text-status-critical-text', label: 'Cancelado', icon: '✗' },
    expired:   { badge: 'bg-surface-secondary text-text-secondary',      label: 'Expirado',  icon: '✗' },
  }
  return map[status] ?? { badge: 'bg-surface-secondary text-text-secondary', label: status, icon: '○' }
}

const eventStyle = (type: string) => {
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

onMounted(loadAll)
</script>
