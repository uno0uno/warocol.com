<template>
  <span class="loading-matrix" :style="{ '--font-size': size, '--bit-color': color }">
    <span v-for="(bit, i) in bits" :key="i" class="bit" :style="{ animationDelay: `${i * (1.8 / bits.length)}s` }">{{ bit }}</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: string
  color?: string
}>(), {
  size: '7px',
  color: 'currentColor',
})

const bits = [1,0,1,0, 0,1,0,1, 1,0,1,0, 0,1,0,1]
</script>

<style scoped>
.loading-matrix {
  display: inline-grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  width: fit-content;
  font-size: var(--font-size);
  font-weight: 700;
  font-family: monospace;
  line-height: 1.1;
  color: var(--bit-color);
}

.bit {
  animation: bit-flicker 1.8s ease-in-out infinite;
}

@keyframes bit-flicker {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.1; }
}
</style>
