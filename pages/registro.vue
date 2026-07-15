<template>
  <main v-if="checking" class="flex min-h-[100dvh] items-center justify-center bg-[hsl(220,14%,97%)]" role="status" aria-live="polite">
    <div class="text-center">
      <span class="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-[hsl(250,30%,16%)] border-t-transparent" aria-hidden="true"></span>
      <p class="mt-6 font-medium text-text-secondary">{{ t('auth.checkingSession') }}</p>
    </div>
  </main>
  <AuthRegistrationForm v-else />
</template>

<script setup lang="ts">
import {
  CUSTOMER_PORTAL_LOGIN,
  canUseInternalSession,
  getAccessAwareRedirect,
  isInternalAccessDeniedError,
} from '~/utils/internalAccess'
import { ONBOARDING_PATH, isOnboardingEntrySession } from '~/utils/onboardingFlow'

definePageMeta({ layout: false, robots: 'noindex, nofollow' })

const { t } = useI18n()
useHead({ title: () => t('auth.registerTitle') })

const checking = ref(true)
const router = useRouter()
const authStore = useAuthStore()
const accessStore = useAccessStore()
const { syncAuthenticatedLocale } = useAppLocale()

onMounted(async () => {
  try {
    const session = await $fetch('/api/auth/session', { credentials: 'include' })
    if (isOnboardingEntrySession(session)) {
      authStore.hydrateSession(session)
      await navigateTo(ONBOARDING_PATH)
      return
    }
    if (canUseInternalSession(session)) {
      authStore.hydrateSession(session)
      await syncAuthenticatedLocale(session)
      await accessStore.load()
      await navigateTo(getAccessAwareRedirect(undefined, accessStore, router))
      return
    }
    if (session?.user) {
      await navigateTo(CUSTOMER_PORTAL_LOGIN)
      return
    }
  } catch (error) {
    if (isInternalAccessDeniedError(error)) {
      await navigateTo(CUSTOMER_PORTAL_LOGIN)
      return
    }
  } finally {
    checking.value = false
  }
})
</script>
