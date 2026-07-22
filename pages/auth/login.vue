<template>
  <div v-if="checking" class="flex min-h-screen flex-col items-center justify-center gap-4">
    <CommonsTheCustomLoader size="large" :show-phrase="false" />
    <p class="text-sm font-medium text-text-secondary">{{ t('auth.checkingSession') }}</p>
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
import { isOnboardingEntrySession } from '~/utils/onboardingFlow'

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
    if (isOnboardingEntrySession(sessionData)) {
      useAuthStore().hydrateSession(sessionData)
      return navigateTo('/gestion/billing')
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
