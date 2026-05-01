<template>
  <span
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel"
    class="inline-flex items-center gap-1 align-middle"
  >
    <span class="dot" :style="dotStyle" />
    <span class="dot" :style="{ ...dotStyle, animationDelay: '0.15s' }" />
    <span class="dot" :style="{ ...dotStyle, animationDelay: '0.3s' }" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  /** Diameter of each dot in pixels. Default: 6 */
  size?: number
  /** Tailwind utility for the dot color. Default: 'currentColor' */
  color?: string
  /** Accessible label announced to screen readers. */
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 6,
  color: 'currentColor',
  ariaLabel: 'Cargando',
})

const dotStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  backgroundColor: props.color,
}))
</script>

<style scoped>
.dot {
  display: inline-block;
  border-radius: 9999px;
  animation: dotBounce 1s infinite ease-in-out both;
}

@keyframes dotBounce {
  0%,
  80%,
  100% {
    transform: scale(0.4);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot {
    animation: none;
    opacity: 0.7;
  }
}
</style>
