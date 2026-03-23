import { ref } from 'vue'

export interface BillingPlan {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_annual: number
  scan_limit: number
  features: Record<string, unknown>
  is_active: boolean
}

export interface TenantSubscription {
  id: string
  tenant_id: string
  plan_id: string
  plan_name: string
  status: 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired'
  billing_cycle: 'monthly' | 'annual'
  current_period_start: string
  current_period_end: string
  checkout_url: string | null
  scan_limit: number
  scans_used: number
  created_at: string
}

export interface AccessStatus {
  level: 'free' | 'full' | 'full_with_warning' | 'read_only' | 'blocked'
  grace_days_remaining: number | null
  subscription_status: string | null
  next_payment_date: string | null
  message: string
}

export interface SubscribeResult {
  checkout_url: string
  status: string
}

export interface BillingEvent {
  id: string
  tenant_id: string
  tenant_name: string
  subscription_id: string | null
  event_type: string
  amount: string | null
  currency: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface BillingEventsResponse {
  events: BillingEvent[]
  total: number
  limit: number
  offset: number
}

export interface ScanMonthlyEntry {
  year_month: string  // ISO date: "2026-03-01"
  scans_count: number
}

const plans = ref<BillingPlan[]>([])
const subscription = ref<TenantSubscription | null>(null)
const subscriptionFetched = ref(false)
const accessStatus = ref<AccessStatus | null>(null)
const events = ref<BillingEvent[]>([])
const eventsTotal = ref(0)
const usageHistory = ref<ScanMonthlyEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export const useBilling = () => {
  const fetchPlans = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<BillingPlan[]>('/api/billing/plans')
      plans.value = data
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al cargar planes'
      console.error('[useBilling] fetchPlans error:', err)
    } finally {
      loading.value = false
    }
  }

  const subscribe = async (plan_id: string, billing_cycle: 'monthly' | 'annual', payer_email?: string): Promise<SubscribeResult | null> => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<SubscribeResult>('/api/billing/subscribe', {
        method: 'POST',
        body: { plan_id, billing_cycle, payer_email },
      })
      return data
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al iniciar suscripción'
      console.error('[useBilling] subscribe error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchSubscription = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<TenantSubscription>('/api/billing/subscription')
      subscription.value = data
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { detail?: string } }
      if (e?.status === 404) {
        subscription.value = null
      } else {
        error.value = e?.data?.detail || 'Error al cargar suscripción'
        console.error('[useBilling] fetchSubscription error:', err)
      }
    } finally {
      loading.value = false
      subscriptionFetched.value = true
    }
  }

  const cancelSubscription = async (): Promise<boolean> => {
    loading.value = true
    error.value = null
    try {
      await $fetch('/api/billing/subscription', { method: 'DELETE' })
      subscription.value = null
      return true
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al cancelar suscripción'
      console.error('[useBilling] cancelSubscription error:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  const fetchAccessStatus = async () => {
    try {
      const data = await $fetch<AccessStatus>('/api/billing/access-status')
      accessStatus.value = data
    } catch (err) {
      console.error('[useBilling] fetchAccessStatus error:', err)
    }
  }

  const fetchMyEvents = async (limit = 20, offset = 0) => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<BillingEventsResponse>(`/api/billing/events?limit=${limit}&offset=${offset}`)
      events.value = data.events
      eventsTotal.value = data.total
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al cargar historial'
      console.error('[useBilling] fetchMyEvents error:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchUsageHistory = async (months = 12) => {
    try {
      const data = await $fetch<ScanMonthlyEntry[]>(`/api/billing/usage-history?months=${months}`)
      usageHistory.value = data
    } catch (err) {
      console.error('[useBilling] fetchUsageHistory error:', err)
    }
  }

  const fetchBillingOverview = async (limit = 20, offset = 0) => {
    loading.value = true
    error.value = null
    try {
      await Promise.all([
        $fetch<TenantSubscription>('/api/billing/subscription').then(
          data => { subscription.value = data },
          (err: any) => { if (err?.status !== 404) throw err; subscription.value = null },
        ),
        $fetch<BillingEventsResponse>(`/api/billing/events?limit=${limit}&offset=${offset}`).then(
          data => { events.value = data.events; eventsTotal.value = data.total },
        ),
        $fetch<ScanMonthlyEntry[]>('/api/billing/usage-history?months=12').then(
          data => { usageHistory.value = data },
          (err) => { console.warn('[useBilling] usage-history error:', err) },
        ),
      ])
      subscriptionFetched.value = true
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string }; message?: string }
      error.value = e?.data?.detail || e?.message || 'Error al cargar facturación'
      console.error('[useBilling] fetchBillingOverview error:', err)
    } finally {
      loading.value = false
    }
  }

  const resetBilling = () => {
    subscription.value = null
    subscriptionFetched.value = false
    accessStatus.value = null
    events.value = []
    eventsTotal.value = 0
    usageHistory.value = []
  }

  return {
    plans,
    subscription,
    subscriptionFetched,
    accessStatus,
    events,
    eventsTotal,
    usageHistory,
    loading,
    error,
    fetchPlans,
    subscribe,
    fetchSubscription,
    cancelSubscription,
    fetchAccessStatus,
    fetchMyEvents,
    fetchUsageHistory,
    fetchBillingOverview,
    resetBilling,
  }
}
