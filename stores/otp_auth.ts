/**
 * Auth Store - OTP Verification
 * Manages authentication via email OTP
 */
import { defineStore } from 'pinia'

export interface CustomerValidation {
  can_order: boolean
  is_blacklisted: boolean
  customer_tier: 'new' | 'intermediate' | 'trusted'
  max_amount?: number
  reason?: string
  warnings: string[]
}

export const useOtpAuthStore = defineStore('otpAuth', {
  state: () => ({
    customerId: null as string | null,
    email: null as string | null,
    phoneNumber: null as string | null,
    isVerified: false,
    otpSentAt: null as Date | null,
    otpExpiresAt: null as Date | null,
    pickupPin: null as string | null,
    isLoading: false,
  }),

  getters: {
    isAuthenticated: (state) => state.isVerified && !!state.customerId,

    otpCooldownRemaining(state): number {
      if (!state.otpSentAt) return 0

      const elapsed = Date.now() - state.otpSentAt.getTime()
      const cooldown = 60000 // 60 seconds
      const remaining = Math.max(0, cooldown - elapsed)

      return Math.ceil(remaining / 1000)
    },

    canResendOtp(): boolean {
      return this.otpCooldownRemaining === 0
    },
  },

  actions: {
    /**
     * Send OTP code to email
     */
    async sendOTP(email: string, cartId: string) {
      this.isLoading = true

      try {
        const data = await $fetch<{ success: boolean; expires_in: number; message: string }>(
          '/api/online/otp/send',
          {
            method: 'POST',
            body: { email, cart_id: cartId },
          }
        )

        this.email = email
        this.otpSentAt = new Date()
        this.otpExpiresAt = new Date(Date.now() + data.expires_in * 1000)

        return data
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al enviar el código')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Verify OTP code
     */
    async verifyOTP(email: string, cartId: string, code: string) {
      this.isLoading = true

      try {
        const data = await $fetch<{
          success: boolean
          customer_id: string
          is_verified: boolean
          pickup_pin: string | null
          message: string
        }>('/api/online/otp/verify', {
          method: 'POST',
          body: { email, cart_id: cartId, otp_code: code },
        })

        this.customerId = data.customer_id
        this.isVerified = data.is_verified
        this.pickupPin = data.pickup_pin

        return data
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Código incorrecto')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Resend OTP code
     */
    async resendOTP(email: string, cartId: string) {
      if (!this.canResendOtp) {
        throw new Error(
          `Por favor espera ${this.otpCooldownRemaining} segundos antes de reenviar`
        )
      }

      this.isLoading = true

      try {
        const data = await $fetch<{ success: boolean; expires_in: number; message: string }>(
          '/api/online/otp/resend',
          {
            method: 'POST',
            body: { email, cart_id: cartId },
          }
        )

        this.otpSentAt = new Date()
        this.otpExpiresAt = new Date(Date.now() + data.expires_in * 1000)

        return data
      } catch (error: any) {
        throw new Error(error.data?.detail || 'Error al reenviar el código')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Validate customer eligibility (MOCK)
     * Checks blacklist, tier, and spending limits
     */
    async validateCustomer(
      phoneNumber: string,
      cartTotal: number
    ): Promise<CustomerValidation> {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500))

        this.phoneNumber = phoneNumber

        // Mock validation logic
        // In real implementation, this would check database

        // Simulate 5% chance of blacklist
        const isBlacklisted = Math.random() < 0.05

        if (isBlacklisted) {
          console.log('[MOCK] Customer is blacklisted')
          return {
            can_order: false,
            is_blacklisted: true,
            customer_tier: 'new',
            reason: 'Este número está bloqueado temporalmente.',
            warnings: [],
          }
        }

        // Simulate customer tier (random)
        const rand = Math.random()
        let tier: 'new' | 'intermediate' | 'trusted'
        let maxAmount: number | undefined

        if (rand < 0.4) {
          tier = 'new'
          maxAmount = 50000
        } else if (rand < 0.7) {
          tier = 'intermediate'
          maxAmount = 100000
        } else {
          tier = 'trusted'
          maxAmount = undefined
        }

        // Check spending limit
        if (maxAmount && cartTotal > maxAmount) {
          console.log('[MOCK] Cart exceeds spending limit')
          return {
            can_order: false,
            is_blacklisted: false,
            customer_tier: tier,
            max_amount: maxAmount,
            reason: `Tu límite actual es $${maxAmount.toLocaleString('es-CO')} COP`,
            warnings: [],
          }
        }

        console.log('[MOCK] Customer validated:', tier)

        return {
          can_order: true,
          is_blacklisted: false,
          customer_tier: tier,
          max_amount: maxAmount,
          warnings: tier === 'new' ? ['Primer pedido - verificación requerida'] : [],
        }
      } catch (error) {
        console.error('[MOCK] Error validating customer:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Logout and clear auth state
     */
    logout() {
      this.$reset()
    },
  },
})
