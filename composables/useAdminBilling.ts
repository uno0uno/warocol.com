/**
 * useAdminBilling — Pinia Colada migration (Phase 3a)
 *
 * Replaces 7 module-level refs + 8 manual fetch/mutation actions with:
 *   4 useQuery (admin plans, subscriptions, usage summary, events)
 *   4 useMutation (createPlan, updatePlan, deactivatePlan, updateSubscriptionStatus)
 *
 * Zero active callers in current pages — zero-risk migration.
 */
import type { BillingPlan } from './useBilling'

export interface AdminSubscription {
  id: string
  tenant_id: string
  tenant_name: string
  plan_id: string
  plan_name: string
  plan_slug: string
  billing_cycle: 'monthly' | 'annual'
  status: 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired'
  current_period_start: string
  current_period_end: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface UsageSummaryItem {
  tenant_id: string
  tenant_name: string
  plan_name: string
  plan_slug: string
  scans_used: number
  scans_limit: number
  percentage: number
  last_scanned_at: string | null
  period_start: string | null
  period_end: string | null
}

export interface BillingEvent {
  id: string
  tenant_id: string
  tenant_name: string
  subscription_id: string | null
  event_type: string
  amount: number | null
  currency: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface BillingEventsResponse {
  events: BillingEvent[]
  total: number
}

export const useAdminBilling = () => {
  const cache = useQueryCache()

  // ── Pagination state ──────────────────────────────────────────────────────────
  const eventsPage = ref(0)
  const eventsLimit = ref(20)

  // ── Queries ───────────────────────────────────────────────────────────────────

  const { data: plans, status: plansStatus } = useQuery({
    key: ['admin', 'billing', 'plans'],
    query: () => $fetch<BillingPlan[]>('/api/admin/billing/plans'),
  })

  const { data: subscriptions, status: subscriptionsStatus } = useQuery({
    key: ['admin', 'billing', 'subscriptions'],
    query: () => $fetch<AdminSubscription[]>('/api/admin/billing/subscriptions'),
  })

  const { data: usageSummary, status: usageStatus } = useQuery({
    key: ['admin', 'billing', 'usage'],
    query: () => $fetch<UsageSummaryItem[]>('/api/admin/billing/usage'),
  })

  const { data: eventsData, status: eventsStatus } = useQuery({
    key: () => ['admin', 'billing', 'events', eventsPage.value, eventsLimit.value],
    query: () => $fetch<BillingEventsResponse>(
      `/api/admin/billing/events?limit=${eventsLimit.value}&offset=${eventsPage.value * eventsLimit.value}`
    ),
  })

  const events = computed<BillingEvent[]>(() => eventsData.value?.events ?? [])
  const eventsTotal = computed<number>(() => eventsData.value?.total ?? 0)

  const loading = computed(() =>
    plansStatus.value === 'loading' ||
    subscriptionsStatus.value === 'loading' ||
    usageStatus.value === 'loading' ||
    eventsStatus.value === 'loading'
  )

  const error = computed(() => null as string | null)

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutation: (data: Omit<BillingPlan, 'id' | 'is_active'>) =>
      $fetch<BillingPlan>('/api/admin/billing/plans', { method: 'POST', body: data }),
    onSettled: () => cache.invalidateQueries({ key: ['admin', 'billing', 'plans'] }),
  })

  const updateMutation = useMutation({
    mutation: ({ id, ...data }: { id: string } & Partial<Omit<BillingPlan, 'id' | 'slug' | 'is_active'>>) =>
      $fetch<BillingPlan>(`/api/admin/billing/plans/${id}`, { method: 'PATCH', body: data }),
    onSettled: () => cache.invalidateQueries({ key: ['admin', 'billing', 'plans'] }),
  })

  const deactivateMutation = useMutation({
    mutation: (id: string) =>
      $fetch(`/api/admin/billing/plans/${id}`, { method: 'DELETE' }),
    onSettled: () => cache.invalidateQueries({ key: ['admin', 'billing', 'plans'] }),
  })

  const updateStatusMutation = useMutation({
    mutation: ({ id, ...data }: { id: string; status?: string; plan_id?: string }) =>
      $fetch(`/api/admin/billing/subscriptions/${id}/status`, { method: 'PATCH', body: data }),
    onSettled: () => cache.invalidateQueries({ key: ['admin', 'billing', 'subscriptions'] }),
  })

  // ── Public action wrappers (preserve original signatures) ─────────────────────

  const fetchAdminPlans = () =>
    cache.invalidateQueries({ key: ['admin', 'billing', 'plans'] })

  const fetchAdminSubscriptions = () =>
    cache.invalidateQueries({ key: ['admin', 'billing', 'subscriptions'] })

  const fetchUsageSummary = () =>
    cache.invalidateQueries({ key: ['admin', 'billing', 'usage'] })

  const fetchBillingEvents = (limit = 20, offset = 0) => {
    eventsLimit.value = limit
    eventsPage.value = Math.floor(offset / limit)
    return cache.invalidateQueries({ key: ['admin', 'billing', 'events'] })
  }

  const createPlan = async (data: Omit<BillingPlan, 'id' | 'is_active'>): Promise<BillingPlan | null> => {
    try {
      return await createMutation.mutateAsync(data)
    } catch {
      return null
    }
  }

  const updatePlan = async (
    planId: string,
    data: Partial<Omit<BillingPlan, 'id' | 'slug' | 'is_active'>>
  ): Promise<BillingPlan | null> => {
    try {
      return await updateMutation.mutateAsync({ id: planId, ...data })
    } catch {
      return null
    }
  }

  const deactivatePlan = async (planId: string): Promise<boolean> => {
    try {
      await deactivateMutation.mutateAsync(planId)
      return true
    } catch {
      return false
    }
  }

  const updateSubscriptionStatus = async (
    subId: string,
    data: { status?: string; plan_id?: string }
  ): Promise<boolean> => {
    try {
      await updateStatusMutation.mutateAsync({ id: subId, ...data })
      return true
    } catch {
      return false
    }
  }

  return {
    plans,
    subscriptions,
    usageSummary,
    events,
    eventsTotal,
    loading,
    error,
    fetchAdminPlans,
    fetchAdminSubscriptions,
    fetchUsageSummary,
    fetchBillingEvents,
    createPlan,
    updatePlan,
    deactivatePlan,
    updateSubscriptionStatus,
  }
}
