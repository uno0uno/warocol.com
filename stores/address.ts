/**
 * Address Store - Delivery Addresses
 * Pinia Colada useQuery + useMutation.
 *
 * fetchAddresses(customerId) → loads real addresses after OTP verification
 *
 * UI state (selectedAddressId, pendingAddress) kept as local refs.
 */
import { defineStore } from 'pinia'

export interface Address {
  id: string
  customer_id: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string | null
  country: string
  latitude?: number
  longitude?: number
  is_default: boolean
  address_type: 'home' | 'work' | 'other'
  delivery_notes?: string
  created_at: Date
  updated_at: Date
}

export interface AddressCreate {
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code?: string
  country?: string
  latitude?: number
  longitude?: number
  is_default?: boolean
  address_type?: 'home' | 'work' | 'other'
  delivery_notes?: string
}

export const useAddressStore = defineStore('address', () => {
  const cache = useQueryCache()

  // ── UI state ──────────────────────────────────────────────────────────────────
  const selectedAddressId = ref<string | null>(null)
  const pendingAddress = ref<AddressCreate | null>(null)

  const _customerId = ref<string | null>(null)

  // ── Query — reactive on _customerId ──────────────────────────────────────────
  const { data: _addressesQueryData, status, refetch: _refetchAddresses } = useQuery({
    key: () => ['addresses', _customerId.value],
    query: () =>
      $fetch<{ addresses: Address[]; total: number; default_address_id: string | null }>(
        `/api/online/addresses/customer/${_customerId.value}`
      ).then(r => r.addresses),
    enabled: () => !!_customerId.value,
  })

  // Auto-select default address when query loads
  watch(_addressesQueryData, (newAddresses) => {
    if (newAddresses && !selectedAddressId.value) {
      const def = newAddresses.find(a => a.is_default)
      if (def) selectedAddressId.value = def.id
    }
  })

  const addresses = computed<Address[]>(() => _addressesQueryData.value ?? [])

  // ── Getters (converted from options API getters) ──────────────────────────────
  const defaultAddress = computed(() => addresses.value.find(a => a.is_default))
  const selectedAddress = computed(() => addresses.value.find(a => a.id === selectedAddressId.value))
  const homeAddresses = computed(() => addresses.value.filter(a => a.address_type === 'home'))
  const workAddresses = computed(() => addresses.value.filter(a => a.address_type === 'work'))
  const hasAddresses = computed(() => addresses.value.length > 0)

  // ── Write mutations ───────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutation: ({ customerId, data }: { customerId: string; data: AddressCreate }) =>
      $fetch<Address>('/api/online/addresses', {
        method: 'POST',
        body: { ...data, customer_id: customerId },
      }),
    onSettled: () => cache.invalidateQueries({ key: ['addresses'] }),
  })

  const updateMutation = useMutation({
    mutation: ({ customerId, addressId, data }: { customerId: string; addressId: string; data: Partial<AddressCreate> }) =>
      $fetch<Address>(`/api/online/addresses/${addressId}`, {
        method: 'PUT',
        query: { customer_id: customerId },
        body: data,
      }),
    onSettled: () => cache.invalidateQueries({ key: ['addresses'] }),
  })

  const deleteMutation = useMutation({
    mutation: ({ customerId, addressId }: { customerId: string; addressId: string }) =>
      $fetch(`/api/online/addresses/${addressId}`, {
        method: 'DELETE',
        query: { customer_id: customerId },
      }),
    onSuccess(_result, { addressId }) {
      if (selectedAddressId.value === addressId) {
        selectedAddressId.value = defaultAddress.value?.id || null
      }
    },
    onSettled: () => cache.invalidateQueries({ key: ['addresses'] }),
  })

  const setDefaultMutation = useMutation({
    mutation: ({ customerId, addressId }: { customerId: string; addressId: string }) =>
      $fetch<Address>(`/api/online/addresses/${addressId}/set-default`, {
        method: 'PATCH',
        query: { customer_id: customerId },
      }),
    onSettled: () => cache.invalidateQueries({ key: ['addresses'] }),
  })

  // persistPendingAddress: POST the pending address, then set selectedAddressId
  const persistMutation = useMutation({
    mutation: ({ customerId, data }: { customerId: string; data: AddressCreate }) =>
      $fetch<Address>('/api/online/addresses', {
        method: 'POST',
        body: { ...data, customer_id: customerId },
      }),
    onSuccess(result) {
      selectedAddressId.value = String(result.id)
      pendingAddress.value = null
    },
    onSettled: () => cache.invalidateQueries({ key: ['addresses'] }),
  })

  // ── isLoading ─────────────────────────────────────────────────────────────────
  const isLoading = computed(() =>
    status.value === 'loading' ||
    createMutation.isLoading.value ||
    updateMutation.isLoading.value ||
    deleteMutation.isLoading.value ||
    setDefaultMutation.isLoading.value ||
    persistMutation.isLoading.value
  )

  // ── Public action wrappers (preserve original signatures) ─────────────────────

  /** Fetch addresses for authenticated customer (post-OTP).
   * Returns a promise that resolves AFTER the underlying Pinia Colada query
   * has actually loaded — so callers that `await fetchAddresses(...)` can
   * safely render UI that depends on `addresses` / `hasAddresses` without
   * showing the empty/new-customer state during the split-second it takes
   * the request to come back. */
  const fetchAddresses = async (customerId: string): Promise<void> => {
    _customerId.value = customerId
    await _refetchAddresses()
  }

  const createAddress = (customerId: string, data: AddressCreate) =>
    createMutation.mutateAsync({ customerId, data })

  const updateAddress = (customerId: string, addressId: string, data: Partial<AddressCreate>) =>
    updateMutation.mutateAsync({ customerId, addressId, data })

  const deleteAddress = (customerId: string, addressId: string) =>
    deleteMutation.mutateAsync({ customerId, addressId })

  const setDefaultAddress = (customerId: string, addressId: string) =>
    setDefaultMutation.mutateAsync({ customerId, addressId })

  const selectAddress = (addressId: string) => {
    selectedAddressId.value = addressId
  }

  const setPendingAddress = (data: AddressCreate) => {
    pendingAddress.value = data
  }

  const persistPendingAddress = async (customerId: string): Promise<string | null> => {
    if (!pendingAddress.value) return null
    const result = await persistMutation.mutateAsync({ customerId, data: pendingAddress.value })
    return String(result.id)
  }

  const reset = () => {
    selectedAddressId.value = null
    pendingAddress.value = null
    _customerId.value = null
  }

  return {
    // State
    addresses,
    selectedAddressId,
    pendingAddress,
    isLoading,

    // Getters
    defaultAddress,
    selectedAddress,
    homeAddresses,
    workAddresses,
    hasAddresses,

    // Actions
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    selectAddress,
    setPendingAddress,
    persistPendingAddress,
    reset,
  }
})
