<script setup lang="ts">
/**
 * Custom bulk-selection checkbox — same visual as ventas/ordenes.
 * Uses explicit checked classes (peer-checked is unreliable with :checked binding).
 */
defineProps<{
  checked: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  change: []
}>()
</script>

<template>
  <label
    class="flex items-center justify-center"
    :class="disabled ? 'cursor-default opacity-40' : 'cursor-pointer'"
    @click.stop
  >
    <input
      type="checkbox"
      class="sr-only"
      :checked="checked"
      :disabled="disabled"
      @change="!disabled && emit('change')"
    />
    <span
      class="w-5 h-5 rounded-[5px] border-2 transition-colors flex items-center justify-center text-white"
      :class="checked ? 'bg-primary border-primary' : 'bg-background border-border'"
    >
      <svg v-if="checked" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
        <path
          d="M1 4l2.5 2.5L9 1"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </label>
</template>
