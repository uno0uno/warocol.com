<script setup lang="ts">
/**
 * Locale-safe decimal input — avoids HTML5 `type="number"` step validation.
 * Use in purchase/quantity forms (see epic #1074). Batch migrations: pass field-specific `precision`.
 */
import {
  parseLocaleDecimal,
  roundToPrecision,
  type DecimalPrecision,
} from '~/utils/parseLocaleDecimal'

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    /** Decimal places applied on blur (default 2 = former step="0.01"). */
    precision?: DecimalPrecision
    min?: number
    max?: number
    placeholder?: string
    disabled?: boolean
    required?: boolean
    id?: string
    class?: string
  }>(),
  {
    modelValue: null,
    precision: 2,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const inputRef = ref<HTMLInputElement>()
const displayValue = ref('')

function formatModelForDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return String(value)
}

watch(
  () => props.modelValue,
  (value) => {
    if (document.activeElement === inputRef.value) return
    displayValue.value = formatModelForDisplay(value ?? null)
  },
  { immediate: true },
)

function sanitizeTyping(raw: string): string {
  return raw.replace(/[^\d.,-]/g, '')
}

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  displayValue.value = sanitizeTyping(target.value)
}

function commitValue() {
  const parsed = parseLocaleDecimal(displayValue.value)
  if (parsed === null) {
    emit('update:modelValue', null)
    displayValue.value = ''
    return
  }

  let rounded = roundToPrecision(parsed, props.precision)
  if (props.min !== undefined && rounded < props.min) rounded = props.min
  if (props.max !== undefined && rounded > props.max) rounded = props.max

  emit('update:modelValue', rounded)
  displayValue.value = formatModelForDisplay(rounded)
}

function onBlur() {
  commitValue()
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})
</script>

<template>
  <input
    ref="inputRef"
    :id="id"
    type="text"
    inputmode="decimal"
    :value="displayValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :class="['input-base', props.class]"
    @input="onInput"
    @blur="onBlur"
  />
</template>
