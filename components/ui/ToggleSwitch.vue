<script setup lang="ts">
withDefaults(defineProps<{
  checked?: boolean
  disabled?: boolean
  loading?: boolean
  ariaLabel?: string
}>(), {
  checked: false,
  disabled: false,
  loading: false,
  ariaLabel: undefined,
})

const emit = defineEmits<{
  'update:checked': [value: boolean]
  change: [event: Event]
}>()

const handleChange = (event: Event) => {
  emit('update:checked', (event.target as HTMLInputElement).checked)
  emit('change', event)
}
</script>

<template>
  <span class="flex h-6 w-10 flex-shrink-0 items-center justify-center">
    <UiLoadingDots v-if="loading" color="var(--color-primary)" size="11px" />
    <label
      v-else
      class="relative inline-flex items-center"
      :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
      :aria-label="ariaLabel"
    >
      <input
        type="checkbox"
        class="sr-only peer"
        :checked="checked"
        :disabled="disabled"
        @change="handleChange"
      >
      <span
        class="h-6 w-10 rounded-full bg-control-toggle-track-off transition-colors peer-checked:bg-control-toggle-track-on peer-focus:ring-2 peer-focus:ring-control-toggle-focus-ring after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-control-toggle-thumb after:transition-all after:content-[''] peer-checked:after:translate-x-full"
      />
    </label>
  </span>
</template>
