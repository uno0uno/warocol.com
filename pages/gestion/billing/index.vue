<template>
  <div class="space-y-6 p-6">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-surface border border-border rounded-xl p-6 text-center">
      <p class="text-sm text-destructive mb-3">{{ error }}</p>
      <button @click="loadData" class="text-sm text-primary hover:underline">Reintentar</button>
    </div>

    <template v-else>
      <!-- Metric cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-surface border border-border rounded-xl p-5 space-y-1">
          <p class="text-xs font-medium text-text-secondary uppercase tracking-widest">Tenants activos</p>
          <p class="text-3xl font-bold text-status-success-text">{{ stats.active }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-5 space-y-1">
          <p class="text-xs font-medium text-text-secondary uppercase tracking-widest">Grace period</p>
          <p class="text-3xl font-bold text-status-warning-text">{{ stats.pastDue }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-5 space-y-1">
          <p class="text-xs font-medium text-text-secondary uppercase tracking-widest">Bloqueados</p>
          <p class="text-3xl font-bold text-status-critical-text">{{ stats.blocked }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-5 space-y-1">
          <p class="text-xs font-medium text-text-secondary uppercase tracking-widest">Total tenants</p>
          <p class="text-3xl font-bold text-text-primary">{{ subscriptions.length }}</p>
        </div>
      </div>

      <!-- Usage table -->
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-border">
          <h2 class="text-base font-semibold text-text-primary">Uso de escaneos — período actual</h2>
        </div>

        <div v-if="usageSummary.length === 0" class="px-6 py-12 text-center">
          <p class="text-sm text-text-secondary">Sin datos de uso para el período actual</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-secondary">
              <tr>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Tenant</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Plan</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest w-48">Uso</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Período</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">Último scan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="item in usageSummary" :key="item.tenant_id" class="hover:bg-surface-secondary/50 transition-colors">
                <td class="px-6 py-4 font-medium text-text-primary">{{ item.tenant_name }}</td>
                <td class="px-6 py-4">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="item.plan_slug === 'pro' ? 'bg-status-info-bg text-status-info-text' : 'bg-surface-secondary text-text-secondary'"
                  >
                    {{ item.plan_name }}
                  </span>
                </td>
                <td class="px-6 py-4 w-48">
                  <BillingUsageBar
                    :scans-used="item.scans_used"
                    :scans-limit="item.scans_limit"
                    :percentage="item.percentage"
                    :show-percentage="true"
                  />
                </td>
                <td class="px-6 py-4 text-text-secondary text-xs">
                  <span v-if="item.period_start">
                    {{ formatDate(item.period_start) }} — {{ formatDate(item.period_end ?? '') }}
                  </span>
                  <span v-else class="italic">Sin período activo</span>
                </td>
                <td class="px-6 py-4 text-text-secondary text-xs">
                  {{ item.last_scanned_at ? formatDateTime(item.last_scanned_at) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAdminBilling } from '~/composables/useAdminBilling'

definePageMeta({ middleware: 'admin-only' })
useHead({ title: 'Billing Admin — WaRo' })

const { subscriptions, usageSummary, loading, error, fetchAdminSubscriptions, fetchUsageSummary } = useAdminBilling()

const stats = computed(() => ({
  active: subscriptions.value.filter(s => s.status === 'active').length,
  pastDue: subscriptions.value.filter(s => s.status === 'past_due').length,
  blocked: subscriptions.value.filter(s => s.status === 'cancelled' || s.status === 'expired').length,
}))

const formatDate = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateTime = (iso: string) => {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const loadData = async () => {
  await Promise.all([fetchAdminSubscriptions(), fetchUsageSummary()])
}

onMounted(loadData)
</script>
