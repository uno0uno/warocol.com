/**
 * Auth Store - OTP Verification
 * Manages authentication via email OTP with MOCK data (no backend yet)
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
    // Mock OTP code for testing
    mockOtpCode: '123456',
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
     * Send OTP code to email (MOCK)
     */
    async sendOTP(email: string, cartId: string) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Store email and timestamps
        this.email = email
        this.otpSentAt = new Date()
        this.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

        // Generate random mock OTP
        this.mockOtpCode = Math.floor(100000 + Math.random() * 900000).toString()

        console.log('[MOCK] OTP sent to:', email)
        console.log('[MOCK] OTP code:', this.mockOtpCode, '(for testing)')

        return {
          success: true,
          expires_in: 300, // 5 minutes in seconds
          message: `Código enviado a ${email}. Válido por 5 minutos.`,
        }
      } catch (error) {
        console.error('[MOCK] Error sending OTP:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Verify OTP code (MOCK)
     */
    async verifyOTP(email: string, cartId: string, code: string) {
      this.isLoading = true

      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800))

        // Check if OTP matches
        if (code !== this.mockOtpCode) {
          throw new Error('Código incorrecto')
        }

        // Check if expired
        if (this.otpExpiresAt && Date.now() > this.otpExpiresAt.getTime()) {
          throw new Error('Código expirado. Solicita uno nuevo.')
        }

        // Generate mock customer ID
        this.customerId = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.isVerified = true

        // Generate pickup PIN if needed (6 digits)
        this.pickupPin = Math.floor(100000 + Math.random() * 900000).toString()

        console.log('[MOCK] OTP verified successfully')
        console.log('[MOCK] Customer ID:', this.customerId)
        console.log('[MOCK] Pickup PIN:', this.pickupPin)

        return {
          success: true,
          customer_id: this.customerId,
          is_verified: true,
          pickup_pin: this.pickupPin,
          message: 'Verificación exitosa',
        }
      } catch (error) {
        console.error('[MOCK] Error verifying OTP:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Resend OTP code (MOCK)
     */
    async resendOTP(email: string, cartId: string) {
      if (!this.canResendOtp) {
        throw new Error(
          `Por favor espera ${this.otpCooldownRemaining} segundos antes de reenviar`
        )
      }

      return await this.sendOTP(email, cartId)
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
      console.log('[MOCK] User logged out')
    },
  },
})
