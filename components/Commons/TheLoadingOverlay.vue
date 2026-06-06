<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay-backdrop/50 backdrop-blur-sm"
    >
      <CommonsTheLoading />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps({
  show: {
    type: Boolean,
    default: false
  }
});
</script>
