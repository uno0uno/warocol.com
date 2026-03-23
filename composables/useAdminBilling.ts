import { ref } from 'vue'
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

// Module-level singleton state
const plans = ref<BillingPlan[]>([])
const subscriptions = ref<AdminSubscription[]>([])
const usageSummary = ref<UsageSummaryItem[]>([])
const events = ref<BillingEvent[]>([])
const eventsTotal = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

export const useAdminBilling = () => {
  const fetchAdminPlans = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<BillingPlan[]>('/api/admin/billing/plans')
      plans.value = data
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al cargar planes'
      console.error('[useAdminBilling] fetchAdminPlans error:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchAdminSubscriptions = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<AdminSubscription[]>('/api/admin/billing/subscriptions')
      subscriptions.value = data
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al cargar suscripciones'
      console.error('[useAdminBilling] fetchAdminSubscriptions error:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchUsageSummary = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<UsageSummaryItem[]>('/api/admin/billing/usage')
      usageSummary.value = data
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al cargar uso de escaneos'
      console.error('[useAdminBilling] fetchUsageSummary error:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchBillingEvents = async (limit = 20, offset = 0) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<BillingEventsResponse>(
        `/api/admin/billing/events?limit=${limit}&offset=${offset}`
      )
      events.value = data.events
      eventsTotal.value = data.total
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al cargar eventos'
      console.error('[useAdminBilling] fetchBillingEvents error:', err)
    } finally {
      loading.value = false
    }
  }

  const createPlan = async (data: Omit<BillingPlan, 'id' | 'is_active'>): Promise<BillingPlan | null> => {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch<BillingPlan>('/api/admin/billing/plans', {
        method: 'POST',
        body: data,
      })
      await fetchAdminPlans()
      return result
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al crear plan'
      console.error('[useAdminBilling] createPlan error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  const updatePlan = async (
    planId: string,
    data: Partial<Omit<BillingPlan, 'id' | 'slug' | 'is_active'>>
  ): Promise<BillingPlan | null> => {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch<BillingPlan>(`/api/admin/billing/plans/${planId}`, {
        method: 'PATCH',
        body: data,
      })
      await fetchAdminPlans()
      return result
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al actualizar plan'
      console.error('[useAdminBilling] updatePlan error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  const deactivatePlan = async (planId: string): Promise<boolean> => {
    loading.value = true
    error.value = null
    try {
      await $fetch(`/api/admin/billing/plans/${planId}`, { method: 'DELETE' })
      await fetchAdminPlans()
      return true
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al desactivar plan'
      console.error('[useAdminBilling] deactivatePlan error:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  const updateSubscriptionStatus = async (
    subId: string,
    data: { status?: string; plan_id?: string }
  ): Promise<boolean> => {
    loading.value = true
    error.value = null
    try {
      await $fetch(`/api/admin/billing/subscriptions/${subId}/status`, {
        method: 'PATCH',
        body: data,
      })
      await fetchAdminSubscriptions()
      return true
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al actualizar suscripción'
      console.error('[useAdminBilling] updateSubscriptionStatus error:', err)
      return false
    } finally {
      loading.value = false
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
