<template>
  <span class="loading-binary" :style="{ '--font-size': size, '--bit-color': color }">
    <span class="bit bit-1">1</span>
    <span class="bit bit-2">0</span>
    <span class="bit bit-3">1</span>
    <span class="bit bit-4">0</span>
  </span>

</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: string
  color?: string
}>(), {
  size: '10px',
  color: 'currentColor',
})
</script>

<style scoped>
.loading-binary {
  display: inline-flex;
  flex-direction: row;
  gap: 2px;
  width: fit-content;
  line-height: 1;
  font-size: var(--font-size);
  font-weight: 700;
  font-family: monospace;
  color: var(--bit-color);
}

.bit {
  animation: bit-pulse 1.2s ease-in-out infinite;
}

.bit-1 { animation-delay: 0s; }
.bit-2 { animation-delay: 0.3s; }
.bit-4 { animation-delay: 0.6s; }
.bit-3 { animation-delay: 0.9s; }

@keyframes bit-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.15; }
}
</style>
