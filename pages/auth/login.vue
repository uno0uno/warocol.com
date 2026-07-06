<template>
  <div v-if="checking" class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <TheCustomLoader size="large" />
      <p class="text-text-secondary font-medium mt-6">Verificando sesión...</p>
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

definePageMeta({
  layout: false,
  robots: 'noindex, nofollow'
})

useHead({ title: 'Iniciar Sesión' })

const checking = ref(true)
const router = useRouter()

onMounted(async () => {
  try {
    const sessionData = await $fetch('/api/auth/session')
    if (canUseInternalSession(sessionData)) {
      const authStore = useAuthStore()
      const accessStore = useAccessStore()
      authStore.initializeFromMiddleware({
        session: sessionData,
        profileData: null,
        user: {
          name: sessionData.user.name || 'Anonymous User',
          email: sessionData.user.email,
        }
      })
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
