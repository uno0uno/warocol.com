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
</style>