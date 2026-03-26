/**
 * Address Store - Delivery Addresses
 * Migrated from options API to setup API with Pinia Colada useQuery + useMutation.
 *
 * Dual address source handled via _isPreviewMode flag:
 *   - previewByEmail() → sets _isPreviewMode + _previewAddresses (no auth required)
 *   - fetchAddresses(customerId) → clears preview mode, query fetches real addresses
 *
 * UI state (selectedAddressId, pendingAddress, previewCustomerId) kept as local refs.
 * Public API preserved — all 4 checkout components + checkout page work unchanged.
 *
 * reset() / $reset() had no active callers — replaced with resetStore() that manually
 * resets all refs.
 */
import { defineStore } from 'pinia'

export interface Address {
  id: string
  customer_id: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
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
  postal_code: string
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
  const previewCustomerId = ref<string | null>(null)

  // Dual address source: preview (pre-auth) vs. real query data
  const _customerId = ref<string | null>(null)
  const _isPreviewMode = ref(false)
  const _previewAddresses = ref<Address[]>([])

  // ── Query — reactive on _customerId ──────────────────────────────────────────
  const { data: _addressesQueryData, status } = useQuery({
    key: () => ['addresses', _customerId.value],
    query: () =>
      $fetch<{ addresses: Address[]; total: number; default_address_id: string | null }>(
        `/api/online/addresses/customer/${_customerId.value}`
      ).then(r => r.addresses),
    enabled: () => !!_customerId.value,
  })

  // Auto-select default address when real query loads
  watch(_addressesQueryData, (newAddresses) => {
    if (!_isPreviewMode.value && newAddresses && !selectedAddressId.value) {
      const def = newAddresses.find(a => a.is_default)
      if (def) selectedAddressId.value = def.id
    }
  })

  // ── addresses: preview overrides query data when in preview mode ─────────────
  const addresses = computed<Address[]>(() =>
    _isPreviewMode.value ? _previewAddresses.value : (_addressesQueryData.value ?? [])
  )

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
      _isPreviewMode.value = false
    },
    onSettled: () => cache.invalidateQueries({ key: ['addresses'] }),
  })

  // previewByEmail: lazy mutation — no auth required, triggered on email input
  const previewMutation = useMutation({
    mutation: (email: string) =>
      $fetch<{ customer_id: string | null; addresses: Address[]; total: number }>(
        '/api/online/addresses/preview',
        { query: { email } }
      ),
    onSuccess(result) {
      previewCustomerId.value = result.customer_id ? String(result.customer_id) : null
      _previewAddresses.value = result.addresses
      _isPreviewMode.value = true
      if (!selectedAddressId.value) {
        const def = result.addresses.find(a => a.is_default)
        if (def) selectedAddressId.value = String(def.id)
      }
    },
    onError() {
      // Empty result = new customer — not an error
      previewCustomerId.value = null
      _previewAddresses.value = []
      _isPreviewMode.value = true
    },
  })

  // ── isLoading: covers query + all write mutations ──────────────────────────────
  const isLoading = computed(() =>
    status.value === 'loading' ||
    createMutation.isLoading.value ||
    updateMutation.isLoading.value ||
    deleteMutation.isLoading.value ||
    setDefaultMutation.isLoading.value ||
    persistMutation.isLoading.value
  )

  // ── Public action wrappers (preserve original signatures) ─────────────────────

  /** Fetch real addresses for authenticated customer */
  const fetchAddresses = (customerId: string) => {
    _isPreviewMode.value = false
    _previewAddresses.value = []
    _customerId.value = customerId
    // useQuery re-runs automatically when _customerId changes
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

  const previewByEmail = (email: string) => previewMutation.mutateAsync(email)

  const reset = () => {
    selectedAddressId.value = null
    pendingAddress.value = null
    previewCustomerId.value = null
    _customerId.value = null
    _isPreviewMode.value = false
    _previewAddresses.value = []
  }

  return {
    // State
    addresses,
    selectedAddressId,
    pendingAddress,
    previewCustomerId,
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
    previewByEmail,
    reset,
  }
})
