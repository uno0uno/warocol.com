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
  mp_preapproval_id: string | null
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
  mp_preapproval_id: string
  status: string
}

const plans = ref<BillingPlan[]>([])
const subscription = ref<TenantSubscription | null>(null)
const accessStatus = ref<AccessStatus | null>(null)
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

  const subscribe = async (plan_id: string, billing_cycle: 'monthly' | 'annual'): Promise<SubscribeResult | null> => {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<SubscribeResult>('/api/billing/subscribe', {
        method: 'POST',
        body: { plan_id, billing_cycle },
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

  return {
    plans,
    subscription,
    accessStatus,
    loading,
    error,
    fetchPlans,
    subscribe,
    fetchSubscription,
    cancelSubscription,
    fetchAccessStatus,
  }
}
