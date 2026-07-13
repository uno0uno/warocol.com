<template>
    <div>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <CommonsToastContainer />
      <LazyModalsLeadModal />
      <LazyModalsAccessRequestModal />
    </div>
</template>

<script setup lang="ts">
import { getLocaleDirection, toLocaleTag } from '~/utils/appLocales'

const { locale } = useI18n({ useScope: 'global' })

useHead(() => ({
  htmlAttrs: {
    lang: toLocaleTag(locale.value),
    dir: getLocaleDirection(locale.value),
  },
}))
</script>

<style lang="scss">

/* Subtle fade-in for initial SSR load */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fade-in-up 0.4s ease-out both;
}

/* Page enter animation — fires on mount, no <Transition>+<Suspense> involved */
.page-layout {
  animation: fade-in-up 0.25s ease-out both;
}
</style>
