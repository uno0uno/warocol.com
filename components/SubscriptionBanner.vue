<template>
  <div
    :class="bannerClass"
    :role="kind === 'trialing' ? 'status' : 'alert'"
    aria-live="polite"
  >
    <div class="flex items-center gap-3 px-4 sm:px-6 md:px-8 py-2.5">
      <!-- Icon -->
      <svg
        class="w-4 h-4 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clip-rule="evenodd"
        />
      </svg>

      <!-- Text -->
      <p class="text-xs sm:text-sm font-medium flex-1 leading-snug">
        {{ message }}
      </p>

      <!-- CTA -->
      <NuxtLink
        to="/gestion/billing"
        :class="ctaClass"
        class="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[44px] flex items-center whitespace-nowrap transition-opacity hover:opacity-80"
      >
        {{ ctaLabel }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BillingLifecycleKind } from '~/utils/billingLifecycle'

const props = defineProps<{
  kind: BillingLifecycleKind
  message: string
  ctaLabel: string
}>()

const bannerClass = computed(() => {
  if (props.kind === 'trial_expired') return 'border-b border-status-critical-text/20 bg-status-critical-bg text-status-critical-text'
  if (props.kind === 'trialing') return 'border-b border-status-info-text/20 bg-status-info-bg text-status-info-text'
  return 'border-b border-status-warning-text/20 bg-status-warning-bg text-status-warning-text'
})

const ctaClass = computed(() => {
  if (props.kind === 'trial_expired') return 'bg-status-critical-text text-white'
  if (props.kind === 'trialing') return 'bg-status-info-text text-white'
  return 'bg-status-warning-text text-white'
})
</script>
