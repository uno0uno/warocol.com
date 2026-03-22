<template>
  <div class="page-layout space-y-6">
    <h1 class="text-2xl font-bold text-text-primary">Suscripciones</h1>

    <!-- Status filter tabs -->
    <div class="flex gap-2 flex-wrap" role="group" aria-label="Filtrar por estado">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        @click="activeStatus = tab.value"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium min-h-[40px] transition-colors border',
          activeStatus === tab.value
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-surface border-border text-text-secondary hover:bg-surface-secondary',
        ]"
        :aria-pressed="activeStatus === tab.value"
      >
        {{ tab.label }}
        <span class="ml-1.5 text-xs opacity-70">({{ tab.count }})</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-surface border border-border rounded-xl p-6 text-center">
      <p class="text-sm text-error mb-3">{{ error }}</p>
      <button @click="fetchAdminSubscriptions" class="text-sm text-primary hover:underline">Reintentar</button>
    </div>

    <!-- Table -->
    <div v-else class="bg-surface border border-border rounded-xl overflow-hidden">
      <div v-if="filtered.length === 0" class="px-6 py-12 text-center">
        <p class="text-sm text-text-secondary">No hay suscripciones con este estado</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-secondary">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Tenant</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Plan</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Ciclo</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Estado</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Renovación</th>
              <th class="text-right px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wide">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="sub in filtered"
              :key="sub.id"
              class="hover:bg-surface-secondary/50 transition-colors"
            >
              <td class="px-6 py-4 font-medium text-text-primary">{{ sub.tenant_name }}</td>
              <td class="px-6 py-4 text-text-secondary">{{ sub.plan_name }}</td>
              <td class="px-6 py-4 text-text-secondary capitalize">{{ sub.billing_cycle === 'monthly' ? 'Mensual' : 'Anual' }}</td>
              <td class="px-6 py-4">
                <span :class="['flex items-center gap-1.5 text-xs font-semibold w-fit px-2.5 py-1 rounded-full', statusStyle(sub.status).badge]">
                  <span aria-hidden="true">{{ statusStyle(sub.status).icon }}</span>
                  {{ statusStyle(sub.status).label }}
                </span>
              </td>
              <td class="px-6 py-4 text-text-secondary text-xs">{{ formatDate(sub.current_period_end) }}</td>
              <td class="px-6 py-4 text-right">
                <button
                  @click="openEdit(sub)"
                  class="text-xs text-primary hover:underline font-medium min-h-[32px] px-2"
                  :aria-label="`Editar suscripción de ${sub.tenant_name}`"
                >
                  Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit modal -->
    <Teleport to="body">
      <div
        v-if="editingSub"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click.self="editingSub = null"
        role="dialog"
        aria-modal="true"
        :aria-label="`Editar suscripción de ${editingSub.tenant_name}`"
      >
        <div class="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
          <h2 class="text-lg font-semibold text-text-primary">Editar — {{ editingSub.tenant_name }}</h2>

          <form @submit.prevent="submitEdit" class="space-y-4">
            <div class="flex flex-col gap-1">
              <label for="edit-status" class="text-sm font-medium text-text-primary">Estado</label>
              <select id="edit-status" v-model="editForm.status" class="input-base px-3 py-2 rounded-lg">
                <option value="pending">Pendiente</option>
                <option value="active">Activo</option>
                <option value="past_due">Vencido (grace)</option>
                <option value="cancelled">Cancelado</option>
                <option value="expired">Expirado</option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label for="edit-plan" class="text-sm font-medium text-text-primary">Plan</label>
              <select id="edit-plan" v-model="editForm.plan_id" class="input-base px-3 py-2 rounded-lg">
                <option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ plan.name }}</option>
              </select>
            </div>

            <div v-if="editError" class="flex items-center gap-2 text-sm text-error">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ editError }}
            </div>

            <div class="flex gap-3">
              <button type="button" @click="editingSub = null" class="flex-1 min-h-[44px] border border-border rounded-xl text-sm hover:bg-surface-secondary transition-colors">Cancelar</button>
              <button type="submit" :disabled="loading" class="flex-1 min-h-[44px] bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {{ loading ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAdminBilling } from '~/composables/useAdminBilling'
import type { AdminSubscription } from '~/composables/useAdminBilling'

definePageMeta({ layout: 'admin', middleware: 'admin-only' })
useHead({ title: 'Suscripciones — WaRo Admin' })

const { subscriptions, plans, loading, error, fetchAdminSubscriptions, fetchAdminPlans, updateSubscriptionStatus } = useAdminBilling()

const activeStatus = ref<string>('all')
const editingSub = ref<AdminSubscription | null>(null)
const editError = ref<string | null>(null)
const editForm = ref({ status: '', plan_id: '' })

const statusTabs = computed(() => [
  { value: 'all', label: 'Todos', count: subscriptions.value.length },
  { value: 'active', label: '● Activo', count: subscriptions.value.filter(s => s.status === 'active').length },
  { value: 'past_due', label: '⚠ Grace', count: subscriptions.value.filter(s => s.status === 'past_due').length },
  { value: 'cancelled', label: '✗ Cancelado', count: subscriptions.value.filter(s => s.status === 'cancelled').length },
  { value: 'expired', label: '✗ Expirado', count: subscriptions.value.filter(s => s.status === 'expired').length },
])

const filtered = computed(() =>
  activeStatus.value === 'all'
    ? subscriptions.value
    : subscriptions.value.filter(s => s.status === activeStatus.value)
)

const statusStyle = (status: string) => {
  const map: Record<string, { badge: string; label: string; icon: string }> = {
    active:    { badge: 'bg-green-100 text-green-700',  label: 'Activo',     icon: '●' },
    pending:   { badge: 'bg-blue-100 text-blue-700',    label: 'Pendiente',  icon: '○' },
    past_due:  { badge: 'bg-yellow-100 text-yellow-700', label: 'Vencido',   icon: '⚠' },
    cancelled: { badge: 'bg-red-100 text-red-700',      label: 'Cancelado',  icon: '✗' },
    expired:   { badge: 'bg-gray-100 text-gray-600',    label: 'Expirado',   icon: '✗' },
  }
  return map[status] ?? { badge: 'bg-surface-secondary text-text-secondary', label: status, icon: '○' }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const openEdit = (sub: AdminSubscription) => {
  editingSub.value = sub
  editError.value = null
  editForm.value = { status: sub.status, plan_id: sub.plan_id }
}

const submitEdit = async () => {
  if (!editingSub.value) return
  editError.value = null
  const ok = await updateSubscriptionStatus(editingSub.value.id, {
    status: editForm.value.status,
    plan_id: editForm.value.plan_id,
  })
  if (ok) editingSub.value = null
  else editError.value = error.value
}

onMounted(() => Promise.all([fetchAdminSubscriptions(), fetchAdminPlans()]))
</script>
