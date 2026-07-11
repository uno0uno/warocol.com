<template>
  <div class="flex w-screen h-screen overflow-hidden">
    <div class="relative flex items-center justify-center w-full h-full px-6 sm:px-12 md:px-16 py-8 md:py-12 bg-[hsl(220,14%,97%)]">
      <!-- Fondo de emojis -->
      <div ref="foodBgContainer" class="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          v-for="(item, index) in foodItems"
          :key="index"
          class="food-item"
          :style="item.style"
        >
          {{ item.emoji }}
        </div>
      </div>

      <div class="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-lg p-8 md:p-10">
        <!-- Logo -->
        <div class="mb-8 flex justify-center">
          <img src="/logo_waro_colombia.png" alt="Waro Colombia" class="h-8 md:h-10 w-auto">
        </div>

        <!-- Step 1: Email input -->
        <div v-if="step === 'email'" class="space-y-5">
          <div class="text-center mb-2">
            <h1 class="text-2xl font-bold mb-1" style="color: hsl(250, 30%, 16%);">{{ t('auth.myOrders') }}</h1>
            <p class="text-base" style="color: hsl(220, 13%, 28%);">
              {{ t('auth.customerEmailPrompt') }}
            </p>
          </div>

          <div class="space-y-1">
            <label for="email-input" class="block text-sm font-medium" style="color: hsl(250, 30%, 16%);">
              {{ t('auth.emailFieldLabel') }}
            </label>
            <input
              id="email-input"
              v-model="email"
              type="email"
              autocomplete="email"
              :placeholder="t('auth.emailPlaceholder')"
              class="w-full h-11 px-3 rounded-lg border transition-colors outline-none text-base"
              style="border-color: hsl(220, 13%, 80%); color: hsl(250, 30%, 16%);"
              :class="{ 'border-red-500': emailError }"
              :disabled="otpStore.isLoading"
              @keyup.enter="handleSendOTP"
              @input="emailError = ''"
            />
            <p v-if="emailError" class="text-sm text-red-600" role="alert">{{ emailError }}</p>
          </div>

          <button
            class="w-full min-h-[44px] rounded-lg text-base font-medium text-white transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-offset-2"
            style="background-color: hsl(250, 30%, 16%); --tw-ring-color: hsl(250, 30%, 16%);"
            :disabled="!email || otpStore.isLoading"
            @click="handleSendOTP"
          >
            <span v-if="otpStore.isLoading">{{ t('auth.sending') }}</span>
            <span v-else>{{ t('auth.sendCode') }}</span>
          </button>
        </div>

        <!-- Step 2: OTP entry -->
        <div v-else-if="step === 'otp'" class="space-y-5">
          <div class="text-center">
            <div class="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
              style="background-color: hsl(250, 30%, 16%, 0.1);">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style="color: hsl(250, 30%, 16%);" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h1 class="text-xl font-bold mb-1" style="color: hsl(250, 30%, 16%);">{{ t('auth.enterCode') }}</h1>
            <p class="text-sm" style="color: hsl(220, 13%, 28%);">
              {{ t('auth.codeSentTo', { email }) }}
            </p>
          </div>

          <div v-if="countdown > 0" class="text-center text-sm font-medium" style="color: hsl(35, 90%, 45%);">
            {{ t('auth.resendIn', { n: countdown }) }}
          </div>

          <OTPInput
            ref="otpInputRef"
            :has-error="!!otpError"
            :error-message="otpError"
            :disabled="otpStore.isLoading"
            @complete="handleVerifyOTP"
            @change="otpError = ''"
          />

          <div class="flex flex-col gap-2">
            <button
              class="w-full min-h-[44px] rounded-lg text-base font-medium text-white transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-offset-2"
              style="background-color: hsl(250, 30%, 16%); --tw-ring-color: hsl(250, 30%, 16%);"
              :disabled="otpStore.isLoading"
              @click="handleManualVerify"
            >
              <span v-if="otpStore.isLoading">{{ t('auth.verifying') }}</span>
              <span v-else>{{ t('auth.verify') }}</span>
            </button>

            <button
              class="w-full min-h-[44px] rounded-lg text-sm font-medium transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-offset-2"
              style="color: hsl(250, 30%, 16%);"
              :disabled="countdown > 0 || otpStore.isLoading"
              @click="handleResendOTP"
            >
              {{ t('auth.resendCode') }}
            </button>
          </div>

          <button
            class="w-full text-sm text-center transition-colors focus:outline-none"
            style="color: hsl(220, 13%, 55%);"
            @click="step = 'email'"
          >
            {{ t('auth.changeEmail') }}
          </button>
        </div>

        <!-- Step 3: Success -->
        <div v-else-if="step === 'success'" class="text-center">
          <div class="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center bg-green-100">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold mb-2" style="color: hsl(250, 30%, 16%);">{{ t('auth.verified') }}</h1>
          <p class="text-base" style="color: hsl(220, 13%, 28%);">{{ t('auth.redirectingOrders') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OTPInput from '~/components/online/OTPInput.vue'
import { useOtpAuthStore } from '~/stores/otp_auth'

definePageMeta({ layout: false, robots: 'noindex, nofollow' })

const { t } = useI18n()
useHead({ title: () => t('auth.customerVerifyTitle') })

const route = useRoute()
const otpStore = useOtpAuthStore()

type Step = 'email' | 'otp' | 'success'
const step = ref<Step>('email')
const email = ref('')
const emailError = ref('')
const otpError = ref('')
const otpInputRef = ref<{ clear: () => void } | null>(null)
const countdown = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  countdownInterval = setInterval(() => {
    countdown.value = otpStore.otpCooldownRemaining
  }, 1000)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

const handleSendOTP = async () => {
  const trimmed = email.value.trim()
  if (!trimmed) {
    emailError.value = t('auth.emailRequired')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    emailError.value = t('auth.emailInvalid')
    return
  }

  try {
    await otpStore.sendOTPPortal(trimmed)
    step.value = 'otp'
  } catch (error: any) {
    emailError.value = error.message || t('auth.sendCodeError')
  }
}

const pendingCode = ref('')

const handleVerifyOTP = async (code: string) => {
  pendingCode.value = code
  await verifyCode(code)
}

const handleManualVerify = async () => {
  if (pendingCode.value) await verifyCode(pendingCode.value)
}

const verifyCode = async (code: string) => {
  try {
    await otpStore.verifyOTPPortal(email.value.trim(), code)
    step.value = 'success'
    await new Promise(resolve => setTimeout(resolve, 1000))
    const redirect = (route.query.redirect as string) || '/mis-pedidos'
    await navigateTo(redirect)
  } catch (error: any) {
    otpError.value = error.message || t('auth.wrongCode')
    otpInputRef.value?.clear()
    pendingCode.value = ''
  }
}

const handleResendOTP = async () => {
  if (countdown.value > 0) return
  try {
    await otpStore.sendOTPPortal(email.value.trim())
    otpError.value = ''
    otpInputRef.value?.clear()
    pendingCode.value = ''
  } catch (error: any) {
    otpError.value = error.message || t('auth.resendCodeError')
  }
}

// ── Food emoji background (same pattern as auth/verify.vue) ──────────────
const foodEmojis = [
  '🍞', '🥖', '🥐', '🍕', '🍔', '🌮', '🍟', '🥪', '🌭', '🍖',
  '🥙', '🍗', '🥓', '🥩', '🍳', '🧀', '🥚', '🍱', '🥗', '🍝',
  '🍜', '🍲', '🍛', '🍣', '🍤', '🥟', '🥡', '🦐', '🦞', '🦀',
  '🐟', '🥘', '🍚', '🥫', '🧆', '🥧', '🧁', '🍰', '🎂', '🍪',
]

const foodBgContainer = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

const generateFoodItems = (width: number, height: number, size: number) => {
  if (width === 0 || height === 0) return []
  const cols = Math.ceil(width / size)
  const rows = Math.ceil(height / size)
  return Array.from({ length: cols * rows }, (_, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const emoji = foodEmojis[Math.floor(Math.random() * foodEmojis.length)]
    return {
      emoji,
      style: {
        left: `${col * size + size / 2 + (Math.random() - 0.5) * size * 0.6}px`,
        top: `${row * size + size / 2 + (Math.random() - 0.5) * size * 0.6}px`,
      },
    }
  })
}

const foodItems = computed(() => generateFoodItems(containerWidth.value, containerHeight.value, 100))

onMounted(() => {
  if (foodBgContainer.value) {
    const rect = foodBgContainer.value.getBoundingClientRect()
    containerWidth.value = rect.width
    containerHeight.value = rect.height
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
        containerHeight.value = entry.contentRect.height
      }
    })
    resizeObserver.observe(foodBgContainer.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.food-item {
  position: absolute;
  font-size: 50px;
  opacity: 0.08;
  filter: grayscale(100%) brightness(0.7);
  transform: translate(-50%, -50%);
}
</style>
