/**
 * Address Store - Delivery Addresses
 * Manages customer delivery addresses with MOCK data (no backend yet)
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
     * Fetch addresses for customer (MOCK)
     */
    async fetchAddresses(customerId: string) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))

        // Mock addresses
        this.addresses = [
          {
            id: 'addr_1',
            customer_id: customerId,
            address_line1: 'Calle 100 # 20-30',
            address_line2: 'Apto 501',
            city: 'Bogotá',
            state: 'Cundinamarca',
            postal_code: '110111',
            country: 'CO',
            latitude: 4.701594,
            longitude: -74.033936,
            is_default: true,
            address_type: 'home',
            delivery_notes: 'Portería con citófono - timbre 501',
            created_at: new Date('2024-01-15'),
            updated_at: new Date('2024-01-15'),
          },
          {
            id: 'addr_2',
            customer_id: customerId,
            address_line1: 'Carrera 7 # 71-21',
            address_line2: 'Torre B, Oficina 302',
            city: 'Bogotá',
            state: 'Cundinamarca',
            postal_code: '110231',
            country: 'CO',
            latitude: 4.654107,
            longitude: -74.062488,
            is_default: false,
            address_type: 'work',
            delivery_notes: 'Recepción primer piso',
            created_at: new Date('2024-02-01'),
            updated_at: new Date('2024-02-01'),
          },
        ]

        console.log('[MOCK] Addresses fetched:', this.addresses.length)

        // Auto-select default address if available
        if (this.defaultAddress && !this.selectedAddressId) {
          this.selectedAddressId = this.defaultAddress.id
        }
      } catch (error) {
        console.error('[MOCK] Error fetching addresses:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Create new address (MOCK)
     */
    async createAddress(customerId: string, addressData: AddressCreate) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800))

        // Generate new address
        const newAddress: Address = {
          id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          customer_id: customerId,
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2,
          city: addressData.city,
          state: addressData.state,
          postal_code: addressData.postal_code,
          country: addressData.country || 'CO',
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          is_default: addressData.is_default || false,
          address_type: addressData.address_type || 'home',
          delivery_notes: addressData.delivery_notes,
          created_at: new Date(),
          updated_at: new Date(),
        }

        // If setting as default, unset all others
        if (newAddress.is_default) {
          this.addresses.forEach(addr => {
            addr.is_default = false
          })
        }

        this.addresses.push(newAddress)

        console.log('[MOCK] Address created:', newAddress.id)

        return newAddress
      } catch (error) {
        console.error('[MOCK] Error creating address:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Update address (MOCK)
     */
    async updateAddress(addressId: string, data: Partial<AddressCreate>) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 600))

        const address = this.addresses.find(a => a.id === addressId)
        if (!address) {
          throw new Error('Dirección no encontrada')
        }

        // Update fields
        Object.assign(address, data, { updated_at: new Date() })

        // If setting as default, unset all others
        if (data.is_default) {
          this.addresses.forEach(addr => {
            if (addr.id !== addressId) {
              addr.is_default = false
            }
          })
        }

        console.log('[MOCK] Address updated:', addressId)

        return address
      } catch (error) {
        console.error('[MOCK] Error updating address:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Delete address (MOCK)
     */
    async deleteAddress(addressId: string) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 400))

        const index = this.addresses.findIndex(a => a.id === addressId)
        if (index < 0) {
          throw new Error('Dirección no encontrada')
        }

        const deletedAddress = this.addresses[index]

        // Remove address
        this.addresses.splice(index, 1)

        // If was default and other addresses exist, set first as default
        if (deletedAddress.is_default && this.addresses.length > 0) {
          this.addresses[0].is_default = true
        }

        // Clear selection if deleted
        if (this.selectedAddressId === addressId) {
          this.selectedAddressId = this.defaultAddress?.id || null
        }

        console.log('[MOCK] Address deleted:', addressId)
      } catch (error) {
        console.error('[MOCK] Error deleting address:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Set address as default (MOCK)
     */
    async setDefaultAddress(addressId: string) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 400))

        const address = this.addresses.find(a => a.id === addressId)
        if (!address) {
          throw new Error('Dirección no encontrada')
        }

        // Unset all defaults
        this.addresses.forEach(addr => {
          addr.is_default = false
        })

        // Set new default
        address.is_default = true
        address.updated_at = new Date()

        console.log('[MOCK] Default address set:', addressId)

        return address
      } catch (error) {
        console.error('[MOCK] Error setting default address:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Select address for current order
     */
    selectAddress(addressId: string) {
      this.selectedAddressId = addressId
      console.log('[MOCK] Address selected:', addressId)
    },

    /**
     * Reset store state
     */
    reset() {
      this.$reset()
      console.log('[MOCK] Address store reset')
    },
  },
})
