<template>
  <div class="min-h-screen bg-surface-secondary text-text-primary">
    <a
      href="#onboarding-main"
      class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
    >
      {{ t('onboarding.skipToContent') }}
    </a>

    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <img src="/logo_waro_colombia.png" alt="WARO" class="h-8 w-auto" />
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          :disabled="isLoggingOut"
          @click="handleLogout"
        >
          <ArrowRightOnRectangleIcon class="h-5 w-5" aria-hidden="true" />
          {{ isLoggingOut ? t('shell.loggingOut') : t('shell.logout') }}
        </button>
      </div>
    </header>

    <main id="onboarding-main" class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'

const { t } = useI18n()
const authStore = useAuthStore()
const accessStore = useAccessStore()
const tenantsStore = useTenantsStore()
const isLoggingOut = ref(false)

const handleLogout = async () => {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await $fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
  } catch {
    // Local cleanup must still run if the server session already expired.
  } finally {
    authStore.expireSession()
    accessStore.clear()
    tenantsStore.clearTenants()
    if (import.meta.client) {
      localStorage.clear()
      sessionStorage.clear()
    }
    await navigateTo('/auth/login')
    isLoggingOut.value = false
  }
}
</script>
