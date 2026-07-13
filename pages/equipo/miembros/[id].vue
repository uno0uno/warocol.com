<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { format as fnsFormat } from 'date-fns'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({
  layout: 'dashboard',

  module: 'equipo',
})

const { t, locale } = useI18n({ useScope: 'global' })
useHead({ title: () => t('equipo.miembros.profileTitle') })

const route = useRoute()
const memberId = computed(() => String(route.params.id))

const { currentTenant } = useTenantReactive()

// Members list — shares cache key with /equipo/miembros so this is almost
// always a cache hit. Direct URL hit on the detail page fetches once.
const { data: membersResponse, asyncStatus: membersAsyncStatus, error: membersError, refetch: refetchMembers } = useQuery({
  key: () => ['team-members', currentTenant.value?.id],
  query: () => $fetch<any>('/api/tenants/members'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const member = computed(() => {
  const list = (membersResponse.value as any)?.data ?? []
  const m = list.find((entry: any) => String(entry.id) === memberId.value)
  if (!m) return null
  return {
    id: m.id,
    name: m.profile?.name || m.profile?.user_name || t('equipo.miembros.noName'),
    email: m.profile?.email || null,
    role: m.role || null,
    avatar: m.profile?.logo_avatar || null,
  }
})

const roleDefinitions: Record<string, { label: string; badgeClass: string }> = {
  superuser: {
    label: t('equipo.roles.superuser'),
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  admin: {
    label: t('equipo.roles.admin'),
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  employee: {
    label: t('equipo.roles.employeeLabel'),
    badgeClass: 'bg-slate-100 text-slate-700',
  },
  member: {
    label: t('equipo.roles.memberLabel'),
    badgeClass: 'bg-green-100 text-green-800',
  },
  promotor: {
    label: t('equipo.roles.promotorLabel'),
    badgeClass: 'bg-purple-100 text-purple-800',
  },
}

const roleLabel = (role: string | null) =>
  role ? roleDefinitions[role]?.label || role : t('equipo.miembros.noRoleDash')

const memberRoleClass = (role: string | null) => ({
  [roleDefinitions[role || '']?.badgeClass || 'bg-green-100 text-green-800']: true,
})

// Tenant context for tip_enabled gate (cache-shared)
const { data: ctxData, asyncStatus: ctxAsyncStatus, refetch: refetchCtx } = useQuery({
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

const { data: tipsTodayData, asyncStatus: tipsTodayAsyncStatus, refetch: refetchTipsToday } = useQuery({
  key: () => ['tips', 'member-period', memberId.value, 'today', todayStr],
  query: () => $fetch<any>('/api/orders/tips', {
    params: { member_id: memberId.value, date_from: todayStr, date_to: todayStr, limit: 1 },
  }),
  enabled: () => !!memberId.value && tipEnabled.value,
  staleTime: 30_000,
})
const { data: tipsWeekData, asyncStatus: tipsWeekAsyncStatus, refetch: refetchTipsWeek } = useQuery({
  key: () => ['tips', 'member-period', memberId.value, '7d', sevenAgoStr, todayStr],
  query: () => $fetch<any>('/api/orders/tips', {
    params: { member_id: memberId.value, date_from: sevenAgoStr, date_to: todayStr, limit: 1 },
  }),
  enabled: () => !!memberId.value && tipEnabled.value,
  staleTime: 30_000,
})
const { data: tipsMonthData, asyncStatus: tipsMonthAsyncStatus, refetch: refetchTipsMonth } = useQuery({
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
const { data: recentTipsData, asyncStatus: recentAsyncStatus, refetch: refetchRecent } = useQuery({
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

const isQueryInitial = (status: string, data: unknown) =>
  status === 'loading' && !data

const isQueryRefetching = (status: string, data: unknown) =>
  status === 'loading' && data != null

const isLoading = computed(() => {
  if (isQueryInitial(membersAsyncStatus.value, membersResponse.value)) return true
  if (isQueryInitial(ctxAsyncStatus.value, ctxData.value)) return true
  if (!member.value || !tipEnabled.value) return false
  return (
    isQueryInitial(tipsTodayAsyncStatus.value, tipsTodayData.value)
    || isQueryInitial(tipsWeekAsyncStatus.value, tipsWeekData.value)
    || isQueryInitial(tipsMonthAsyncStatus.value, tipsMonthData.value)
    || isQueryInitial(recentAsyncStatus.value, recentTipsData.value)
  )
})

const isRefreshing = computed(() => {
  if (isQueryRefetching(membersAsyncStatus.value, membersResponse.value)) return true
  if (isQueryRefetching(ctxAsyncStatus.value, ctxData.value)) return true
  if (!tipEnabled.value) return false
  return (
    isQueryRefetching(tipsTodayAsyncStatus.value, tipsTodayData.value)
    || isQueryRefetching(tipsWeekAsyncStatus.value, tipsWeekData.value)
    || isQueryRefetching(tipsMonthAsyncStatus.value, tipsMonthData.value)
    || isQueryRefetching(recentAsyncStatus.value, recentTipsData.value)
  )
})

const pageError = computed(() => membersError.value)

const handleRefresh = async () => {
  const tasks: Promise<unknown>[] = [refetchMembers(), refetchCtx()]
  if (tipEnabled.value) {
    tasks.push(
      refetchTipsToday(),
      refetchTipsWeek(),
      refetchTipsMonth(),
      refetchRecent(),
    )
  }
  await Promise.all(tasks)
}

// ── Formatters ──────────────────────────────────────────────────────────────
const formatCurrency = (v: number) =>
  new Intl.NumberFormat(toNumberLocaleTag(locale.value), {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(v || 0)

const formatPercent = (v: number) => `${(v || 0).toFixed(2)}%`

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  return new Intl.DateTimeFormat(toNumberLocaleTag(locale.value), {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

const channelLabel = (ch: string | null | undefined) => {
  if (ch === 'online') return 'Online'
  if (ch === 'mesa') return t('equipo.miembros.channelTable')
  if (ch === 'barra') return t('equipo.miembros.channelBar')
  return t('equipo.miembros.channelPos')
}
const channelVariant = (ch: string | null | undefined) => {
  if (ch === 'online') return 'success'
  if (ch === 'mesa') return 'info'
  if (ch === 'barra') return 'warning'
  return 'secondary'
}

const columns = computed<Column[]>(() => [
  { key: 'order_date', title: t('equipo.miembros.date'), width: '180px' },
  { key: 'order_number', title: t('equipo.miembros.order'), width: '80px' },
  { key: 'channel', title: t('equipo.miembros.channel'), width: '90px' },
  { key: 'total_amount', title: t('equipo.miembros.subtotal'), align: 'right' },
  { key: 'tip_amount', title: t('equipo.miembros.tip'), align: 'right' },
  { key: 'tip_percent', title: '%', align: 'right', width: '70px' },
])

// Layout integration
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
registerProgressiveLoading(isRefreshing)
onMounted(() => setRefreshHandler(handleRefresh))
onUnmounted(() => clearRefreshHandler(handleRefresh))
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="pageError" />

    <!-- Empty state — member not found -->
    <div
      v-else-if="!member"
      class="flex flex-col items-center justify-center gap-3 py-16 px-6 bg-surface rounded-xl border-2 border-border text-center"
    >
      <span aria-hidden="true" class="text-4xl">🔍</span>
      <p class="text-base font-semibold text-text-primary">{{ t('equipo.miembros.memberNotFound') }}</p>
      <p class="text-sm text-text-secondary max-w-md">
        {{ t('equipo.miembros.memberNotFoundDescription') }}
      </p>
    </div>

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <template v-if="tipEnabled">
        <div v-if="isRefreshing && recentTips.length === 0" class="flex items-center justify-center min-h-[200px]">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <div v-else class="flex flex-col gap-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <h2 class="text-base font-semibold text-text-primary">{{ member.name }}</h2>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span
                v-if="member.email"
                class="hidden md:inline text-xs text-text-secondary truncate max-w-[220px]"
              >{{ member.email }}</span>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="memberRoleClass(member.role)"
              >
                {{ roleLabel(member.role) }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <MetricCard
              :title="t('equipo.miembros.today')"
              :value="todayAgg.sum"
              format="currency"
              variant="primary"
              :subtitle="t('equipo.miembros.average', { value: formatPercent(todayAgg.avg) })"
            />
            <MetricCard
              :title="t('equipo.miembros.lastSevenDays')"
              :value="weekAgg.sum"
              format="currency"
              variant="primary"
              :subtitle="t('equipo.miembros.average', { value: formatPercent(weekAgg.avg) })"
            />
            <MetricCard
              :title="t('equipo.miembros.lastThirtyDays')"
              :value="monthAgg.sum"
              format="currency"
              variant="primary"
              :subtitle="t('equipo.miembros.average', { value: formatPercent(monthAgg.avg) })"
            />
          </div>

          <div class="flex flex-col gap-3">
            <p class="text-sm font-semibold text-text-primary">{{ t('equipo.miembros.lastTenTips') }}</p>
            <UiResponsiveDataView
              :columns="columns"
              :data="recentTips"
              :empty-message="t('equipo.miembros.noTips')"
              :empty-sub-message="t('equipo.miembros.noTipsSub')"
              item-key="id"
              row-size="sm"
            >
              <template #card="{ item, index }">
                <div :class="['flex flex-col gap-1.5 p-4 border-b border-border', index % 2 === 0 ? 'bg-surface' : 'bg-background']">
                  <div class="flex items-center justify-between">
                    <div class="flex items-baseline gap-2">
                      <span class="text-xs text-text-secondary whitespace-nowrap shrink-0">{{ formatDate(item.order_date) }}</span>
                      <span class="text-sm font-semibold text-primary">#{{ item.order_number }}</span>
                    </div>
                    <UiStatusBadge :variant="channelVariant(item.channel)" size="sm" :value="channelLabel(item.channel)" />
                  </div>
                  <div class="flex items-end justify-between">
                    <p class="text-xs text-text-secondary">{{ t('equipo.miembros.subtotal') }}: {{ formatCurrency(item.total_amount) }}</p>
                    <div class="text-right">
                      <p class="text-lg font-bold text-primary tabular-nums">{{ formatCurrency(item.tip_amount) }}</p>
                      <p class="text-xs text-text-secondary tabular-nums">{{ formatPercent(item.tip_percent) }}</p>
                    </div>
                  </div>
                </div>
              </template>

              <template #cell-order_date="{ value }">
                <span class="text-sm text-text-secondary whitespace-nowrap">{{ formatDate(value) }}</span>
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
        </div>
      </template>

      <div v-else class="flex flex-col gap-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <h2 class="text-base font-semibold text-text-primary">{{ member.name }}</h2>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span
              v-if="member.email"
              class="hidden md:inline text-xs text-text-secondary truncate max-w-[220px]"
            >{{ member.email }}</span>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              :class="memberRoleClass(member.role)"
            >
              {{ roleLabel(member.role) }}
            </span>
          </div>
        </div>
        <p class="text-sm text-text-secondary">
          {{ t('equipo.miembros.tipsDisabled') }}
        </p>
      </div>
    </div>
  </div>
</template>
