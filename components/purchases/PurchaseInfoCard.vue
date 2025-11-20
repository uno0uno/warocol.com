<template>
  <div class="flex items-start space-x-3">
    <div class="bg-background p-3 rounded-lg border border-border flex-shrink-0">
      <slot name="icon">
        <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="defaultIconPath" />
        </svg>
      </slot>
    </div>
    <div class="space-y-1">
      <p class="text-xs font-medium text-text-secondary uppercase tracking-wide">
        {{ label }}
      </p>
      <slot>
        <p class="text-lg font-semibold text-text-primary">
          {{ value }}
        </p>
      </slot>
      <p v-if="subtitle" class="text-sm text-text-secondary">
        {{ subtitle }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  value?: string | number
  subtitle?: string
  iconPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
})

const defaultIconPath = computed(() => props.iconPath)
</script>
