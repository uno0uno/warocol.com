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

export type CustomerWalletScope = 'ventas' | 'pos'

export const useCustomerWallet = (
  customerId: Ref<string> | string,
  options?: { scope?: CustomerWalletScope },
) => {
  const idRef = isRef(customerId) ? customerId : ref(customerId)
  const cache = useQueryCache()
  const scope = options?.scope ?? 'ventas'
  const walletBasePath = scope === 'pos' ? '/api/pos/customers' : '/api/customers'

  const { data, asyncStatus, error, refetch } = useQuery({
    key: () => ['customer-wallet', scope, idRef.value],
    query: () =>
      $fetch<WalletResponse>(`${walletBasePath}/${idRef.value}/wallet`),
    enabled: () => !!idRef.value,
    staleTime: 15_000,
  })

  const wallet = computed(() => data.value?.data ?? null)
  const isLoading = computed(
    () => asyncStatus.value === 'loading' && data.value == null,
  )
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
      payment_method_id?: string
      notes?: string
    }) =>
      $fetch<WalletResponse>(`/api/customers/${idRef.value}/wallet/recharge`, {
        method: 'POST',
        body: vars,
      }),
    onSettled: () =>
      cache.invalidateQueries({ key: ['customer-wallet', scope, idRef.value] }),
  })

  const recharge = (
    amount_cop: number,
    payment_method: string,
    notes?: string,
    payment_method_id?: string,
  ) =>
    rechargeMutation.mutateAsync({
      amount_cop,
      payment_method,
      notes,
      ...(payment_method_id ? { payment_method_id } : {}),
    })

  const resetRecharge = () => {
    rechargeMutation.reset()
  }

  return {
    wallet,
    isLoading,
    isRefreshing,
    walletError,
    refetch,
    recharge,
    resetRecharge,
    rechargeError: computed(() => {
      const e = rechargeMutation.error.value as any
      return e?.data?.detail || e?.message || null
    }),
  }
}
