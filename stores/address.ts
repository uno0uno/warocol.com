/**
 * Address Store - Delivery Addresses
 * Manages customer delivery addresses via real backend (/api/online/addresses)
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

export const useAddressStore = defineStore('address', {
  state: () => ({
    addresses: [] as Address[],
    selectedAddressId: null as string | null,
    pendingAddress: null as AddressCreate | null,
    previewCustomerId: null as string | null,
    isLoading: false,
  }),

  getters: {
    defaultAddress: (state) => state.addresses.find(a => a.is_default),

    selectedAddress: (state) =>
      state.addresses.find(a => a.id === state.selectedAddressId),

    homeAddresses: (state) => state.addresses.filter(a => a.address_type === 'home'),

    workAddresses: (state) => state.addresses.filter(a => a.address_type === 'work'),

    hasAddresses: (state) => state.addresses.length > 0,
  },

  actions: {
    /**
     * Fetch addresses for customer
     */
    async fetchAddresses(customerId: string) {
      this.isLoading = true

      try {
        const result = await $fetch<{ addresses: Address[]; total: number; default_address_id: string | null }>(
          `/api/online/addresses/customer/${customerId}`,
        )

        this.addresses = result.addresses

        if (this.defaultAddress && !this.selectedAddressId) {
          this.selectedAddressId = this.defaultAddress.id
        }
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al cargar las direcciones')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Create new address
     */
    async createAddress(customerId: string, addressData: AddressCreate) {
      this.isLoading = true

      try {
        const result = await $fetch<Address>('/api/online/addresses', {
          method: 'POST',
          body: { ...addressData, customer_id: customerId },
        })

        this.addresses.push(result as Address)

        return result as Address
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al crear la dirección')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Update address
     */
    async updateAddress(customerId: string, addressId: string, data: Partial<AddressCreate>) {
      this.isLoading = true

      try {
        const result = await $fetch<Address>(`/api/online/addresses/${addressId}`, {
          method: 'PUT',
          query: { customer_id: customerId },
          body: data,
        })

        const index = this.addresses.findIndex(a => a.id === addressId)
        if (index >= 0) this.addresses[index] = result as Address

        return result as Address
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al actualizar la dirección')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Delete address
     */
    async deleteAddress(customerId: string, addressId: string) {
      this.isLoading = true

      try {
        await $fetch(`/api/online/addresses/${addressId}`, {
          method: 'DELETE',
          query: { customer_id: customerId },
        })

        this.addresses = this.addresses.filter(a => a.id !== addressId)

        if (this.selectedAddressId === addressId) {
          this.selectedAddressId = this.defaultAddress?.id || null
        }
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al eliminar la dirección')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Set address as default
     */
    async setDefaultAddress(customerId: string, addressId: string) {
      this.isLoading = true

      try {
        const result = await $fetch<Address>(`/api/online/addresses/${addressId}/set-default`, {
          method: 'PATCH',
          query: { customer_id: customerId },
        })

        this.addresses.forEach(a => a.is_default = false)
        const index = this.addresses.findIndex(a => a.id === addressId)
        if (index >= 0) this.addresses[index] = result as Address

        return result as Address
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al establecer la dirección por defecto')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Select address for current order
     */
    selectAddress(addressId: string) {
      this.selectedAddressId = addressId
    },

    /**
     * Store address locally for guest checkout (pre-OTP)
     */
    setPendingAddress(data: AddressCreate) {
      this.pendingAddress = data
    },

    /**
     * Persist pending address to backend after OTP verification succeeds.
     * Returns the new address UUID (passed to PUT /delivery in confirm.vue).
     */
    async persistPendingAddress(customerId: string): Promise<string | null> {
      if (!this.pendingAddress) return null

      this.isLoading = true

      try {
        const result = await $fetch<{
          id: string
          customer_id: string
          address_line1: string
          address_line2?: string
          city: string
          state: string
          postal_code: string
          country: string
          is_default: boolean
          address_type: string
          delivery_notes?: string
        }>('/api/online/addresses', {
          method: 'POST',
          body: { ...this.pendingAddress, customer_id: customerId },
        })

        this.addresses = [result as Address]
        this.selectedAddressId = String(result.id)

        return String(result.id)
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al guardar la dirección')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Preview saved addresses for a given email — no auth required.
     * Calls GET /api/online/addresses/preview?email=...
     * Populates addresses[] and previewCustomerId so StepDeliveryInfo
     * can show saved addresses before OTP verification.
     */
    async previewByEmail(email: string) {
      this.isLoading = true

      try {
        const result = await $fetch<{
          customer_id: string | null
          addresses: Address[]
          total: number
        }>('/api/online/addresses/preview', { query: { email } })

        this.previewCustomerId = result.customer_id ? String(result.customer_id) : null
        this.addresses = result.addresses

        // Auto-select default address if present and nothing selected yet
        if (!this.selectedAddressId) {
          const defaultAddr = result.addresses.find(a => a.is_default)
          if (defaultAddr) this.selectedAddressId = String(defaultAddr.id)
        }
      }
      catch {
        // Empty result = new customer — not an error
        this.previewCustomerId = null
        this.addresses = []
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Reset store state
     */
    reset() {
      this.$reset()
    },
  },
})
