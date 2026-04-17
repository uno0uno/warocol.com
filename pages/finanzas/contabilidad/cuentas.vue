<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Cuentas contables' })

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// ── Filters ────────────────────────────────────────────────────────────────
const classFilter = ref<string | null>(null)
const activeFilter = ref<string | null>(null)

const PUC_CLASSES: { value: string; label: string; short: string }[] = [
  { value: '1', label: '1 · Activos',    short: 'Activos' },
  { value: '2', label: '2 · Pasivos',    short: 'Pasivos' },
  { value: '3', label: '3 · Patrimonio', short: 'Patrimonio' },
  { value: '4', label: '4 · Ingresos',   short: 'Ingresos' },
  { value: '5', label: '5 · Gastos',     short: 'Gastos' },
  { value: '6', label: '6 · Costos',     short: 'Costos' },
]

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset:     'Activo',
  liability: 'Pasivo',
  equity:    'Patrimonio',
  income:    'Ingreso',
  expense:   'Gasto',
  cogs:      'Costo de ventas',
  other:     'Otro',
}

const ACCOUNT_TYPE_VARIANTS: Record<string, string> = {
  asset:     'primary',
  liability: 'warning',
  equity:    'secondary',
  income:    'success',
  expense:   'destructive',
  cogs:      'warning',
  other:     'secondary',
}

const CLASS_SHORT: Record<string, string> = {
  '1': 'Activos',
  '2': 'Pasivos',
  '3': 'Patrimonio',
  '4': 'Ingresos',
  '5': 'Gastos',
  '6': 'Costos',
}

const CLASS_VARIANTS: Record<string, string> = {
  '1': 'primary',
  '2': 'warning',
  '3': 'secondary',
  '4': 'success',
  '5': 'destructive',
  '6': 'warning',
}

// ── Data ───────────────────────────────────────────────────────────────────
interface TenantAccount {
  id: string
  code: string
  name: string
  accountClass: string
  accountType: string
  normalBalance: string
  level: number
  parentId: string | null
  isDetail: boolean
  isActive: boolean
  isSystem: boolean
  tenantId: string
  templateId: string | null
  createdAt: string
}

const { data: accountsData, asyncStatus: accountsAsyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['accounting', 'accounts', currentTenant.value?.id, classFilter.value, activeFilter.value],
  query: () => $fetch<{ success: boolean; data: TenantAccount[] }>('/api/accounting/accounts', {
    params: {
      class: classFilter.value || undefined,
      active: activeFilter.value !== null ? (activeFilter.value === 'true') : undefined,
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => accountsData.value == null && !fetchError.value)
const isRefreshing = computed(() => accountsAsyncStatus.value === 'loading' && accountsData.value != null)

const accounts = computed<TenantAccount[]>(() => accountsData.value?.data ?? [])

// ── Summary stats ──────────────────────────────────────────────────────────
const summaryStats = computed(() => {
  const list = accounts.value
  return {
    total:    list.length,
    activas:  list.filter(a => a.isActive).length,
    inactivas: list.filter(a => !a.isActive).length,
    detalle:  list.filter(a => a.isDetail).length,
  }
})

// ── Table columns ──────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'code',         title: 'Código',  sortable: false },
  { key: 'name',         title: 'Nombre',  sortable: false },
  { key: 'isSystem',     title: 'Sistema', sortable: false },
  { key: 'accountClass', title: 'Clase',   sortable: false },
  { key: 'isActive',     title: 'Estado',  sortable: false },
  { key: 'actions',      title: '',        sortable: false },
]

// ── Toggle active ──────────────────────────────────────────────────────────
const togglingId = ref<string | null>(null)

const toggleActive = async (account: TenantAccount) => {
  if (togglingId.value) return
  togglingId.value = account.id
  try {
    await $fetch(`/api/accounting/accounts/${account.id}`, {
      method: 'PUT',
      body: { isActive: !account.isActive },
    })
    await refetch()
  } catch (err: any) {
    console.error('Error toggling account active status:', err)
    alert(err?.data?.detail || 'Error al actualizar la cuenta')
  } finally {
    togglingId.value = null
  }
}

const clearFilters = () => {
  classFilter.value = null
  activeFilter.value = null
}

const hasActiveFilters = computed(() => classFilter.value !== null || activeFilter.value !== null)

// ── Layout integration ─────────────────────────────────────────────────────
registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>

<template>
  <div class="page-layout">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- ── Summary cards ─────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard title="Total cuentas"   :value="summaryStats.total"     format="number" variant="primary" />
        <MetricCard title="Activas"         :value="summaryStats.activas"   format="number" variant="primary" />
        <MetricCard title="Inactivas"       :value="summaryStats.inactivas" format="number" variant="primary" />
        <MetricCard title="De detalle"      :value="summaryStats.detalle"   format="number" variant="primary" />
      </div>

      <!-- ── Filter bar ──────────────────────────────────────────────────── -->
      <div class="flex flex-wrap items-center gap-2 w-full">
        <!-- Class filter tabs -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            class="h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            :class="classFilter === null
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary'"
            @click="classFilter = null"
          >
            Todas
          </button>
          <button
            v-for="cls in PUC_CLASSES"
            :key="cls.value"
            type="button"
            class="h-10 px-3 rounded-lg border-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            :class="classFilter === cls.value
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary'"
            @click="classFilter = cls.value"
          >
            {{ cls.label }}
          </button>
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-border hidden sm:block" aria-hidden="true" />

        <!-- Active filter -->
        <select
          v-model="activeFilter"
          class="h-10 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          aria-label="Filtrar por estado"
        >
          <option :value="null">Todas las cuentas</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>

        <!-- Clear filters -->
        <button
          v-if="hasActiveFilters"
          type="button"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          aria-label="Limpiar filtros"
          @click="clearFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- ── Accounts table ──────────────────────────────────────────────── -->
      <HealthSemaphore :is-unlocked="true" title="Plan de cuentas PUC">
        <UiResponsiveDataView
          row-size="sm"
          :columns="tableColumns"
          :data="accounts"
          empty-message="No hay cuentas para este filtro"
          variant="default"
        >
          <!-- Mobile card -->
          <template #card="{ item, index }">
            <div
              class="flex items-start gap-3 py-3 px-3 border-b border-border"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-mono text-text-secondary flex-shrink-0">{{ item.code }}</span>
                  <svg
                    v-if="item.isSystem"
                    class="w-3 h-3 text-text-secondary flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="Cuenta del sistema"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p class="text-sm font-medium text-text-primary mt-0.5 truncate">
                  {{ item.name }}
                </p>
                <div class="flex items-center gap-1.5 mt-1">
                  <UiStatusBadge
                    :value="CLASS_SHORT[item.accountClass] || item.accountClass"
                    format="text"
                    :variant="CLASS_VARIANTS[item.accountClass] || 'secondary'"
                    size="sm"
                  />
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 flex-shrink-0">
                <UiStatusBadge
                  :value="item.isActive ? 'Activa' : 'Inactiva'"
                  format="text"
                  :variant="item.isActive ? 'success' : 'secondary'"
                  size="sm"
                />
                <button
                  type="button"
                  class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="togglingId === item.id"
                  :aria-label="item.isActive ? `Desactivar cuenta ${item.code}` : `Activar cuenta ${item.code}`"
                  @click="toggleActive(item)"
                >
                  <svg v-if="togglingId === item.id" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <svg v-else-if="item.isActive" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </template>

          <!-- Desktop: code -->
          <template #cell-code="{ row }">
            <span class="text-xs font-mono text-text-secondary tabular-nums">{{ row.code }}</span>
          </template>

          <!-- Desktop: isSystem (lock icon) -->
          <template #cell-isSystem="{ value }">
            <div class="flex justify-center">
              <svg
                v-if="value"
                class="w-3.5 h-3.5 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-label="Cuenta del sistema"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </template>

          <!-- Desktop: name -->
          <template #cell-name="{ row }">
            <span
              class="text-sm text-text-primary"
              :class="row.level === 1 ? 'font-bold' : row.level === 2 ? 'font-semibold' : 'font-medium'"
            >
              {{ row.name }}
            </span>
          </template>

          <!-- Desktop: class -->
          <template #cell-accountClass="{ value }">
            <UiStatusBadge
              :value="CLASS_SHORT[value] || value"
              format="text"
              :variant="CLASS_VARIANTS[value] || 'secondary'"
              size="sm"
            />
          </template>

          <!-- Desktop: isActive badge -->
          <template #cell-isActive="{ row }">
            <UiStatusBadge
              :value="row.isActive ? 'Activa' : 'Inactiva'"
              format="text"
              :variant="row.isActive ? 'success' : 'secondary'"
              size="sm"
            />
          </template>

          <!-- Desktop: actions -->
          <template #cell-actions="{ row }">
            <div class="flex justify-center">
              <button
                type="button"
                class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="togglingId === row.id"
                :aria-label="row.isActive ? `Desactivar cuenta ${row.code}` : `Activar cuenta ${row.code}`"
                :title="row.isActive ? 'Desactivar cuenta' : 'Activar cuenta'"
                @click="toggleActive(row)"
              >
                <svg v-if="togglingId === row.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <svg v-else-if="row.isActive" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </template>
        </UiResponsiveDataView>
      </HealthSemaphore>

    </div>
  </div>
</template>
