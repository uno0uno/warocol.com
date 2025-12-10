<template>
    <div>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <CommonsToastContainer />
    </div>
</template>

<script setup>
</script>

<style lang="scss">
.page-enter-active,
.page-leave-active {
  transition: all 0.2s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(0.5rem);
}
</style>