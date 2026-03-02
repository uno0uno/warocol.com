<template>
    <div>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <CommonsToastContainer />
      <LazyModalsLeadModal />
    </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss">
/* Page transitions between routes */
.page-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
}

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
</style>