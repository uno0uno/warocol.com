<template>
  <div class="otp-input-container">
    <div class="otp-inputs">
      <input
        v-for="(digit, index) in digits"
        :key="index"
        :ref="el => inputRefs[index] = el as HTMLInputElement"
        v-model="digits[index]"
        type="text"
        inputmode="numeric"
        pattern="[0-9]"
        maxlength="1"
        class="otp-digit"
        :class="{ filled: digits[index] !== '', error: hasError }"
        @input="handleInput(index, $event)"
        @keydown="handleKeydown(index, $event)"
        @paste="handlePaste"
        :disabled="disabled"
        :aria-label="`Dígito ${index + 1}`"
      />
    </div>

    <p v-if="hasError" class="error-message">{{ errorMessage }}</p>
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
.otp-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.otp-inputs {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.otp-digit {
  width: 52px;
  height: 64px;
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  border: 2px solid #d1d5db;
  border-radius: 12px;
  background: white;
  color: #111827;
  transition: all 0.2s ease;
  caret-color: #667eea;
}

.otp-digit:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.otp-digit.filled {
  border-color: #667eea;
  background: #f0f4ff;
}

.otp-digit.error {
  border-color: #ef4444;
  background: #fef2f2;
  animation: shake 0.4s ease;
}

.otp-digit:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  text-align: center;
}

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

/* Mobile styles */
@media (max-width: 640px) {
  .otp-inputs {
    gap: 8px;
  }

  .otp-digit {
    width: 44px;
    height: 56px;
    font-size: 24px;
  }
}
</style>
