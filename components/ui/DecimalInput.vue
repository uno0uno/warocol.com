<script setup lang="ts">
/**
 * Locale-safe decimal input — avoids HTML5 `type="number"` step validation.
 * Use in purchase/quantity forms (see epic #1074). Batch migrations: pass field-specific `precision`.
 * Display/parse punctuation follows tenant UI locale (es|en); defaults es-CO.
 */
import {
  formatLocaleNumber,
  normalizeUiLocale,
  parseLocaleDecimal,
  roundToPrecision,
  type DecimalPrecision,
  type UiLocale,
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
    /** Optional override; defaults to tenant businessProfile.locale → es. */
    locale?: UiLocale | string | null
  }>(),
  {
    modelValue: null,
    precision: 2,
    locale: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const tenantsStore = useTenantsStore()
const inputRef = ref<HTMLInputElement>()
const displayValue = ref('')

const resolvedLocale = computed<UiLocale>(() => {
  if (props.locale != null && props.locale !== '') {
    return normalizeUiLocale(props.locale)
  }
  return normalizeUiLocale(
    (tenantsStore.businessProfile as { locale?: string } | null | undefined)?.locale,
  )
})

function formatModelForDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  // No thousands grouping: es-CO "5.000" would parse as 5 under only-dot decimal rules.
  return formatLocaleNumber(value, resolvedLocale.value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: props.precision,
    useGrouping: false,
  })
}

watch(
  [() => props.modelValue, resolvedLocale, () => props.precision],
  () => {
    if (document.activeElement === inputRef.value) return
    displayValue.value = formatModelForDisplay(props.modelValue ?? null)
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
  const parsed = parseLocaleDecimal(displayValue.value, resolvedLocale.value)
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
