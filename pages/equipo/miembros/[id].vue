<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({
  layout: 'dashboard',
})

useHead({ title: 'Perfil de mesero — Equipo' })

const route = useRoute()
const memberId = computed(() => String(route.params.id))

const { currentTenant } = useTenantReactive()

// Members list — shares cache key with /equipo/miembros so this is almost
// always a cache hit. Direct URL hit on the detail page fetches once.
const { data: membersResponse, asyncStatus: membersAsyncStatus } = useQuery({
  key: () => ['team-members', currentTenant.value?.id],
  query: () => $fetch<any>('/api/tenants/members'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const isLoadingMembers = computed(() => !membersResponse.value && membersAsyncStatus.value !== 'idle')

const member = computed(() => {
  const list = (membersResponse.value as any)?.data ?? []
  const m = list.find((entry: any) => String(entry.id) === memberId.value)
  if (!m) return null
  return {
    id: m.id,
    name: m.profile?.name || m.profile?.user_name || 'Sin nombre',
    email: m.profile?.email || null,
    role: m.role || null,
    avatar: m.profile?.logo_avatar || null,
  }
})

const roleLabel = (role: string | null) =>
  role === 'superuser' ? 'Super Usuario'
  : role === 'admin' ? 'Administrador'
  : role === 'employee' ? 'Empleado'
  : role === 'member' ? 'Miembro'
  : (role ?? '—')

// Tenant context for tip_enabled gate (cache-shared)
const { data: ctxData } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const tipEnabled = computed<boolean>(() => ctxData.value?.data?.tip_enabled === true)

// ── Tip aggregate queries (today / last 7d / last 30d) ─────────────────────
const today = new Date()
const todayStr = fnsFormat(today, 'yyyy-MM-dd')
const sevenAgoDate = new Date(); sevenAgoDate.setDate(sevenAgoDate.getDate() - 7)
const thirtyAgoDate = new Date(); thirtyAgoDate.setDate(thirtyAgoDate.getDate() - 30)
const sevenAgoStr = fnsFormat(sevenAgoDate, 'yyyy-MM-dd')
const thirtyAgoStr = fnsFormat(thirtyAgoDate, 'yyyy-MM-dd')

const { data: tipsTodayData } = useQuery({
  key: () => ['tips', 'member-period', memberId.value, 'today', todayStr],
  query: () => $fetch<any>('/api/orders/tips', {
    params: { member_id: memberId.value, date_from: todayStr, date_to: todayStr, limit: 1 },
  }),
  enabled: () => !!memberId.value && tipEnabled.value,
  staleTime: 30_000,
})
const { data: tipsWeekData } = useQuery({
  key: () => ['tips', 'member-period', memberId.value, '7d', sevenAgoStr, todayStr],
  query: () => $fetch<any>('/api/orders/tips', {
    params: { member_id: memberId.value, date_from: sevenAgoStr, date_to: todayStr, limit: 1 },
  }),
  enabled: () => !!memberId.value && tipEnabled.value,
  staleTime: 30_000,
})
const { data: tipsMonthData } = useQuery({
  key: () => ['tips', 'member-period', memberId.value, '30d', thirtyAgoStr, todayStr],
  query: () => $fetch<any>('/api/orders/tips', {
    params: { member_id: memberId.value, date_from: thirtyAgoStr, date_to: todayStr, limit: 1 },
  }),
  enabled: () => !!memberId.value && tipEnabled.value,
  staleTime: 30_000,
})

const periodAgg = (data: any) => ({
  sum: Number(data?.aggregates?.sum_tip ?? 0),
  avg: Number(data?.aggregates?.avg_pct ?? 0),
})
const todayAgg = computed(() => periodAgg(tipsTodayData.value))
const weekAgg = computed(() => periodAgg(tipsWeekData.value))
const monthAgg = computed(() => periodAgg(tipsMonthData.value))

// ── Last 10 tips for the member ─────────────────────────────────────────────
const { data: recentTipsData, asyncStatus: recentAsyncStatus } = useQuery({
  key: () => ['tips', 'member-recent', memberId.value],
  query: () => $fetch<any>('/api/orders/tips', {
    params: {
      member_id: memberId.value,
      limit: 10,
      sort_field: 'order_date',
      sort_direction: 'desc',
    },
  }),
  enabled: () => !!memberId.value && tipEnabled.value,
  staleTime: 30_000,
})
const recentTips = computed<any[]>(() => recentTipsData.value?.data ?? [])

const isRefreshing = computed(() =>
  recentAsyncStatus.value === 'loading' && recentTipsData.value != null
)

// ── Formatters ──────────────────────────────────────────────────────────────
const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(v || 0)

const formatPercent = (v: number) => `${(v || 0).toFixed(2)}%`

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  return fnsFormat(new Date(iso), "d MMM yyyy, h:mm a", { locale: es })
}

const channelLabel = (ch: string | null | undefined) => {
  if (ch === 'online') return 'Online'
  if (ch === 'mesa') return 'Mesa'
  if (ch === 'barra') return 'Barra'
  return 'POS'
}
const channelVariant = (ch: string | null | undefined) => {
  if (ch === 'online') return 'success'
  if (ch === 'mesa') return 'info'
  if (ch === 'barra') return 'warning'
  return 'secondary'
}

const columns: Column[] = [
  { key: 'order_date', title: 'Fecha', width: '160px' },
  { key: 'order_number', title: 'Orden', width: '80px' },
  { key: 'channel', title: 'Canal', width: '90px' },
  { key: 'total_amount', title: 'Subtotal', align: 'right' },
  { key: 'tip_amount', title: 'Propina', align: 'right' },
  { key: 'tip_percent', title: '%', align: 'right', width: '70px' },
]

const historyLink = computed(() => ({
  path: '/ventas/propinas',
  query: { member_id: memberId.value },
}))

// Layout integration
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(() => {}))
onUnmounted(() => clearRefreshHandler(() => {}))
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <!-- Back link -->
    <NuxtLink
      to="/equipo/miembros"
      class="self-start inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Equipo
    </NuxtLink>

    <!-- Loading skeleton -->
    <div v-if="isLoadingMembers" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Empty state — member not found -->
    <div
      v-else-if="!member"
      class="flex flex-col items-center justify-center gap-3 py-16 px-6 bg-surface rounded-xl border-2 border-border text-center"
    >
      <span aria-hidden="true" class="text-4xl">🔍</span>
      <p class="text-base font-semibold text-text-primary">Miembro no encontrado</p>
      <p class="text-sm text-text-secondary max-w-md">
        El miembro que buscas no existe o ya no pertenece al equipo.
      </p>
      <NuxtLink
        to="/equipo/miembros"
        class="mt-2 min-h-[44px] px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
      >
        Volver al equipo →
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Member header -->
      <div class="flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-surface">
        <div v-if="member.avatar" class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
          <img :src="member.avatar" :alt="member.name" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-bold flex-shrink-0">
          {{ (member.name || '?').slice(0, 2).toUpperCase() }}
        </div>
        <div class="min-w-0">
          <p class="text-lg font-bold text-text-primary leading-tight truncate">{{ member.name }}</p>
          <p v-if="member.email" class="text-xs text-text-secondary truncate">{{ member.email }}</p>
          <span
            class="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            :class="{
              'bg-amber-100 text-amber-800': member.role === 'superuser',
              'bg-blue-100 text-blue-800': member.role === 'admin',
              'bg-slate-100 text-slate-700': member.role === 'employee',
              'bg-green-100 text-green-800': member.role === 'member',
            }"
          >
            {{ roleLabel(member.role) }}
          </span>
        </div>
      </div>

      <!-- ══════ TIPS BLOCK (only when tipping is enabled) ══════ -->
      <template v-if="tipEnabled">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-bold text-text-primary">Propinas</h3>
          <NuxtLink
            :to="historyLink"
            class="text-sm text-primary hover:underline"
          >
            Ver todo en propinas →
          </NuxtLink>
        </div>

        <!-- 3 MetricCards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <MetricCard
            title="Hoy"
            :value="todayAgg.sum"
            format="currency"
            variant="primary"
            :subtitle="`Promedio: ${formatPercent(todayAgg.avg)}`"
          />
          <MetricCard
            title="Últimos 7 días"
            :value="weekAgg.sum"
            format="currency"
            variant="primary"
            :subtitle="`Promedio: ${formatPercent(weekAgg.avg)}`"
          />
          <MetricCard
            title="Últimos 30 días"
            :value="monthAgg.sum"
            format="currency"
            variant="primary"
            :subtitle="`Promedio: ${formatPercent(monthAgg.avg)}`"
          />
        </div>

        <!-- Recent tips table -->
        <div class="flex flex-col gap-3">
          <p class="text-sm font-semibold text-text-primary">Últimas 10 propinas</p>
          <UiResponsiveDataView
            :columns="columns"
            :data="recentTips"
            empty-message="Sin propinas registradas"
            empty-sub-message="Las propinas atribuidas a este mesero aparecerán aquí."
            item-key="id"
            row-size="sm"
          >
            <!-- Mobile card -->
            <template #card="{ item, index }">
              <div :class="['flex flex-col gap-1.5 p-4 border-b border-border', index % 2 === 0 ? 'bg-surface' : 'bg-background']">
                <div class="flex items-center justify-between">
                  <div class="flex items-baseline gap-2">
                    <span class="text-xs text-text-secondary">{{ formatDate(item.order_date) }}</span>
                    <span class="text-sm font-semibold text-primary">#{{ item.order_number }}</span>
                  </div>
                  <UiStatusBadge :variant="channelVariant(item.channel)" size="sm" :value="channelLabel(item.channel)" />
                </div>
                <div class="flex items-end justify-between">
                  <p class="text-xs text-text-secondary">Subtotal: {{ formatCurrency(item.total_amount) }}</p>
                  <div class="text-right">
                    <p class="text-lg font-bold text-primary tabular-nums">{{ formatCurrency(item.tip_amount) }}</p>
                    <p class="text-xs text-text-secondary tabular-nums">{{ formatPercent(item.tip_percent) }}</p>
                  </div>
                </div>
              </div>
            </template>

            <!-- Desktop cells -->
            <template #cell-order_date="{ value }">
              <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
            </template>
            <template #cell-order_number="{ value }">
              <span class="text-sm font-medium text-primary">#{{ value }}</span>
            </template>
            <template #cell-channel="{ row }">
              <UiStatusBadge :variant="channelVariant(row.channel)" size="sm" :value="channelLabel(row.channel)" />
            </template>
            <template #cell-total_amount="{ value }">
              <span class="text-sm tabular-nums">{{ formatCurrency(value) }}</span>
            </template>
            <template #cell-tip_amount="{ value }">
              <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(value) }}</span>
            </template>
            <template #cell-tip_percent="{ value }">
              <span class="text-sm tabular-nums text-text-secondary">{{ formatPercent(value) }}</span>
            </template>
          </UiResponsiveDataView>
        </div>
      </template>
    </template>
  </div>
</template>
