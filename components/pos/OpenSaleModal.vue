<template>
  <Transition name="sheet">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-black/50"
      @click.self="handleClose"
    >
      <div
        class="bottom-sheet-panel bg-surface w-full md:max-w-md border border-border flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl"
        @click.stop
      >
        <div class="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-border" />
        </div>

        <div class="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 class="text-xl font-bold text-text-primary">Venta libre</h2>
            <p class="text-sm text-text-secondary mt-0.5">
              {{ shellName ? `Producto: ${shellName}` : 'Monto personalizado' }}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
            @click="handleClose"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="p-5 space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label for="open-sale-amount" class="block text-sm font-medium text-text-primary mb-1.5">
              Monto (COP) <span class="text-red-500">*</span>
            </label>
            <input
              id="open-sale-amount"
              ref="amountInputRef"
              v-model="amountInput"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              required
              placeholder="Ej. 25000"
              class="w-full min-h-[44px] px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base tabular-nums"
            />
          </div>

          <div>
            <label for="open-sale-description" class="block text-sm font-medium text-text-primary mb-1.5">
              Descripción <span class="text-text-tertiary font-normal">(opcional)</span>
            </label>
            <input
              id="open-sale-description"
              v-model="descriptionInput"
              type="text"
              maxlength="200"
              placeholder="Ej. Servicio especial, propina externa..."
              class="w-full min-h-[44px] px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base"
            />
          </div>

          <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>

          <div class="flex gap-2 pt-1">
            <button
              type="button"
              class="min-h-[44px] px-4 py-3 rounded-xl border border-border text-text-secondary font-medium hover:bg-surface-secondary transition-colors"
              @click="handleClose"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-1 min-h-[44px] px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Agregando...' : 'Agregar al carrito' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  modelValue: boolean
  shellName?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: { amount: number; description?: string }): void
}>()

const amountInput = ref('')
const descriptionInput = ref('')
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)
const amountInputRef = ref<HTMLInputElement | null>(null)

const resetForm = () => {
  amountInput.value = ''
  descriptionInput.value = ''
  errorMessage.value = null
  isSubmitting.value = false
}

const handleClose = () => {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      nextTick(() => amountInputRef.value?.focus())
    }
  },
)

const handleSubmit = () => {
  errorMessage.value = null
  const amount = Number(amountInput.value)
  if (!Number.isFinite(amount) || amount <= 0) {
    errorMessage.value = 'Ingresa un monto mayor a cero'
    return
  }
  isSubmitting.value = true
  emit('confirm', {
    amount: Math.round(amount),
    description: descriptionInput.value.trim() || undefined,
  })
}

defineExpose({ clearSubmitting: () => { isSubmitting.value = false } })
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.15s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
</style>
