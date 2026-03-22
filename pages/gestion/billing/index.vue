<template>
  <div class="page-layout space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Billing Admin</h1>
        <p class="text-sm text-text-secondary mt-0.5">Gestión de suscripciones y uso de escaneos</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/gestion/billing/planes" class="btn-secondary px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] flex items-center">
          Planes
        </NuxtLink>
        <NuxtLink to="/gestion/billing/suscripciones" class="btn-secondary px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] flex items-center">
          Suscripciones
        </NuxtLink>
        <NuxtLink to="/gestion/billing/eventos" class="btn-secondary px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] flex items-center">
          Eventos
        </NuxtLink>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-surface border border-border rounded-xl p-6 text-center">
      <p class="text-sm text-error mb-3">{{ error }}</p>
      <button @click="loadData" class="text-sm text-primary hover:underline">Reintentar</button>
    </div>

    <template v-else>
      <!-- Metric cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p class="text-xs text-text-secondary uppercase tracking-wide">Tenants activos</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.active }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p class="text-xs text-text-secondary uppercase tracking-wide">Grace period</p>
          <p class="text-3xl font-bold text-yellow-600">{{ stats.pastDue }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p class="text-xs text-text-secondary uppercase tracking-wide">Bloqueados</p>
          <p class="text-3xl font-bold text-red-600">{{ stats.blocked }}</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4 space-y-1">
          <p class="text-xs text-text-secondary uppercase tracking-wide">Total tenants</p>
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
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Tenant</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Plan</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide w-48">Uso</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Período</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Último scan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="item in usageSummary" :key="item.tenant_id" class="hover:bg-surface-secondary/50 transition-colors">
                <td class="px-6 py-4 font-medium text-text-primary">{{ item.tenant_name }}</td>
                <td class="px-6 py-4">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium" :class="item.plan_slug === 'pro' ? 'bg-primary/10 text-primary' : 'bg-surface-secondary text-text-secondary'">
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

definePageMeta({ layout: 'admin', middleware: 'admin-only' })
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
