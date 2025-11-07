<script setup lang="ts">
import { cn } from '../utils'

export interface InputProps {
  type?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  id?: string
  class?: string
  modelValue?: string | number
}

interface Props extends InputProps {}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const inputRef = ref<HTMLInputElement>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})
</script>

<template>
  <input
    ref="inputRef"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :id="id"
    :value="modelValue"
    :class="cn(
      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
    @input="handleInput"
  />
</template>