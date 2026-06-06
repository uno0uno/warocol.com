<template>
  <div class="flex flex-col items-center gap-4">
    <div class="flex gap-2 sm:gap-3 justify-center">
      <input
        v-for="(digit, index) in digits"
        :key="index"
        :ref="el => inputRefs[index] = el as HTMLInputElement"
        v-model="digits[index]"
        type="text"
        inputmode="numeric"
        pattern="[0-9]"
        maxlength="1"
        class="w-11 h-14 sm:w-[52px] sm:h-16 text-2xl sm:text-3xl font-bold text-center
               rounded-xl border-2 transition-all duration-200
               border-border bg-background text-foreground
               focus:outline-none focus:border-form-control-focus-border focus:ring-2 focus:ring-form-control-focus-ring
               disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
        :class="{
          'border-primary bg-primary/10': digits[index] !== '' && !hasError,
          'border-destructive bg-destructive/10 otp-error-shake': hasError,
        }"
        @input="handleInput(index, $event)"
        @keydown="handleKeydown(index, $event)"
        @paste="handlePaste"
        :disabled="disabled"
        :aria-label="`Dígito ${index + 1}`"
      />
    </div>

    <p v-if="hasError" class="text-sm font-medium text-destructive text-center m-0">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    length?: number
    disabled?: boolean
    hasError?: boolean
    errorMessage?: string
  }>(),
  {
    length: 6,
    disabled: false,
    hasError: false,
    errorMessage: 'Código inválido',
  }
)

const emit = defineEmits<{
  (e: 'complete', code: string): void
  (e: 'change', code: string): void
}>()

const digits = ref<string[]>(Array(props.length).fill(''))
const inputRefs = ref<HTMLInputElement[]>([])

const handleInput = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // Only allow numbers
  if (value && !/^\d$/.test(value)) {
    digits.value[index] = ''
    return
  }

  digits.value[index] = value

  // Emit change
  const code = digits.value.join('')
  emit('change', code)

  // Move to next input if value entered
  if (value && index < props.length - 1) {
    inputRefs.value[index + 1]?.focus()
  }

  // Emit complete if all digits filled
  if (code.length === props.length) {
    emit('complete', code)
  }
}

const handleKeydown = (index: number, event: KeyboardEvent) => {
  // Backspace - move to previous input if current is empty
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }

  // Left arrow
  if (event.key === 'ArrowLeft' && index > 0) {
    event.preventDefault()
    inputRefs.value[index - 1]?.focus()
  }

  // Right arrow
  if (event.key === 'ArrowRight' && index < props.length - 1) {
    event.preventDefault()
    inputRefs.value[index + 1]?.focus()
  }
}

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pastedData = event.clipboardData?.getData('text/plain') || ''
  const pastedDigits = pastedData.replace(/\D/g, '').split('').slice(0, props.length)

  pastedDigits.forEach((digit, index) => {
    if (index < props.length) {
      digits.value[index] = digit
    }
  })

  // Focus last filled input
  const lastIndex = Math.min(pastedDigits.length, props.length) - 1
  if (lastIndex >= 0) {
    inputRefs.value[lastIndex]?.focus()
  }

  // Emit complete if all digits filled
  const code = digits.value.join('')
  emit('change', code)
  if (code.length === props.length) {
    emit('complete', code)
  }
}

const clear = () => {
  digits.value = Array(props.length).fill('')
  inputRefs.value[0]?.focus()
}

// Auto-focus first input on mount
onMounted(() => {
  inputRefs.value[0]?.focus()
})

// Expose clear method
defineExpose({
  clear,
})
</script>

<style scoped>
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-8px);
  }
  75% {
    transform: translateX(8px);
  }
}

.otp-error-shake {
  animation: shake 0.4s ease;
}
</style>
