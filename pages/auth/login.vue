<template>
  <div v-if="checking" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <TheCustomLoader size="large" />
      <p class="text-text-secondary font-medium mt-6">{{ t('auth.checkingSession') }}</p>
    </div>
  </div>
  <AuthLoginForm v-else />
</template>

<script setup lang="ts">
import {
  CUSTOMER_PORTAL_LOGIN,
  canUseInternalSession,
  getAccessAwareRedirect,
  isInternalAccessDeniedError,
} from '~/utils/internalAccess'
import { ONBOARDING_PATH, isPendingOnboardingSession } from '~/utils/onboardingFlow'

definePageMeta({
  layout: false,
  robots: 'noindex, nofollow'
})

const { t } = useI18n()
useHead({ title: () => t('auth.loginTitle') })

const checking = ref(true)
const router = useRouter()
const { syncAuthenticatedLocale } = useAppLocale()

onMounted(async () => {
  try {
    const sessionData = await $fetch('/api/auth/session')
    if (isPendingOnboardingSession(sessionData)) {
      useAuthStore().hydrateSession(sessionData)
      return navigateTo(ONBOARDING_PATH)
    }
    if (canUseInternalSession(sessionData)) {
      const accessStore = useAccessStore()
      await syncAuthenticatedLocale(sessionData)
      await accessStore.load()
      return navigateTo(getAccessAwareRedirect(useRoute().query.redirect, accessStore, router))
    }
    if (sessionData?.user) {
      return navigateTo(CUSTOMER_PORTAL_LOGIN)
    }
  } catch (e: any) {
    if (isInternalAccessDeniedError(e)) {
      return navigateTo(CUSTOMER_PORTAL_LOGIN)
    }
    // No valid session
  }
  checking.value = false
})
</script>
