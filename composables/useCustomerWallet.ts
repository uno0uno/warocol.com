/**
 * Customer COP wallet — balance, movements, staff recharge.
 * Proxied: GET/POST /api/customers/{id}/wallet*
 */

export interface WalletMovement {
  id: string
  movement_type: string
  amount_cop: number
  balance_after_cop: number
  payment_method: string | null
  order_id: string | null
  notes: string | null
  created_at: string
}

export interface CustomerWalletData {
  customer_id: string
  balance_cop: number
  updated_at: string | null
  movements: WalletMovement[]
}

export interface WalletResponse {
  success: boolean
  data: CustomerWalletData
}

export const useCustomerWallet = (customerId: Ref<string> | string) => {
  const idRef = isRef(customerId) ? customerId : ref(customerId)
  const cache = useQueryCache()

  const { data, status, asyncStatus, error, refetch } = useQuery({
    key: () => ['customer-wallet', idRef.value],
    query: () =>
      $fetch<WalletResponse>(`/api/customers/${idRef.value}/wallet`),
    enabled: () => !!idRef.value,
    staleTime: 15_000,
  })

  const wallet = computed(() => data.value?.data ?? null)
  const isLoading = computed(() => status.value === 'pending')
  const isRefreshing = computed(
    () => asyncStatus.value === 'loading' && data.value != null
  )
  const walletError = computed(() => {
    const e = error.value as any
    return e?.data?.detail || e?.message || null
  })

  const rechargeMutation = useMutation({
    mutation: (vars: {
      amount_cop: number
      payment_method: string
      notes?: string
    }) =>
      $fetch<WalletResponse>(`/api/customers/${idRef.value}/wallet/recharge`, {
        method: 'POST',
        body: vars,
      }),
    onSettled: () =>
      cache.invalidateQueries({ key: ['customer-wallet', idRef.value] }),
  })

  const recharge = (amount_cop: number, payment_method: string, notes?: string) =>
    rechargeMutation.mutateAsync({ amount_cop, payment_method, notes })

  return {
    wallet,
    isLoading,
    isRefreshing,
    walletError,
    refetch,
    recharge,
    isRecharging: rechargeMutation.isLoading,
    rechargeError: computed(() => {
      const e = rechargeMutation.error.value as any
      return e?.data?.detail || e?.message || null
    }),
  }
}
