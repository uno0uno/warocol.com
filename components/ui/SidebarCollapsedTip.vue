<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="sidebar-collapsed-tip"
      role="tooltip"
      :style="positionStyle"
    >
      <span
        v-for="(ch, i) in chars"
        :key="`${nonce}-${i}`"
        class="sidebar-collapsed-tip__char"
        :style="{ animationDelay: `${i * 18}ms` }"
      >{{ ch === ' ' ? '\u00A0' : ch }}</span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  positionStyle: Record<string, string>
  chars: string[]
  nonce: number
}>()
</script>

<style>
.sidebar-collapsed-tip {
  position: fixed;
  z-index: 10050;
  transform: translateY(-50%);
  padding: 0.375rem 0.625rem;
  border-radius: 0.5rem;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--surface));
  color: hsl(var(--text-primary));
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: 0.01em;
  white-space: nowrap;
  box-shadow: 0 4px 14px hsl(var(--neutral-950) / 0.1);
  pointer-events: none;
}

.sidebar-collapsed-tip__char {
  display: inline-block;
  opacity: 0;
  transform: scale(0.35);
  transform-origin: left center;
  animation: sidebar-tip-char-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes sidebar-tip-char-in {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-collapsed-tip__char {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
</style>
