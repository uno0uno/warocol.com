<template>
  <div
    v-if="level === 'full_with_warning' || level === 'read_only'"
    :class="bannerClass"
    role="alert"
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
        <span v-if="graceDaysRemaining !== null && graceDaysRemaining !== undefined && level === 'read_only'" class="opacity-80">
          ({{ graceDaysRemaining }} {{ graceDaysRemaining === 1 ? 'día' : 'días' }} restantes)
        </span>
      </p>

      <!-- CTA -->
      <NuxtLink
        to="/billing/planes"
        :class="ctaClass"
        class="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg min-h-[44px] flex items-center whitespace-nowrap transition-opacity hover:opacity-80"
      >
        Renovar plan
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  level: 'full_with_warning' | 'read_only'
  message: string
  graceDaysRemaining?: number | null
}>()

const bannerClass = computed(() => {
  if (props.level === 'read_only') return 'bg-orange-100 text-orange-900 border-b border-orange-200'
  return 'bg-yellow-100 text-yellow-900 border-b border-yellow-200'
})

const ctaClass = computed(() => {
  if (props.level === 'read_only') return 'bg-orange-800 text-white'
  return 'bg-yellow-800 text-white'
})
</script>
