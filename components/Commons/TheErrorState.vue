<template>
  <div class="flex flex-col items-center justify-center min-h-[360px] py-12 px-6 text-center">
    <!-- Illustration -->
    <div class="relative mb-6">
      <div class="w-24 h-24 rounded-full bg-status-critical-bg flex items-center justify-center">
        <svg class="w-10 h-10 text-status-critical-text" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <!-- Decorative dots -->
      <span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-status-warning-bg border-2 border-white" />
      <span class="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-status-critical-bg border-2 border-white" />
    </div>

    <h3 class="text-base font-semibold text-text-primary mb-1">{{ t('errors.somethingWrong') }}</h3>
    <p v-if="message" class="text-sm text-text-secondary max-w-xs">{{ message }}</p>
    <p v-else class="text-sm text-text-secondary max-w-xs">{{ t('errors.reloadHint') }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message?: string
}>()

const { t } = useI18n()
</script>
