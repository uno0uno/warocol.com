<template>
  <UiModal v-model="open" title="Asignar Waros">
    <div class="px-6 py-5 space-y-5">

      <!-- Customer + current balance -->
      <div class="flex items-center justify-between gap-4 pb-1">
        <div class="min-w-0">
          <p class="text-sm text-text-secondary font-medium">Cliente</p>
          <p class="text-base font-semibold text-text-primary truncate">{{ customerName }}</p>
        </div>
        <div class="flex-shrink-0 text-right">
          <p class="text-sm text-text-secondary font-medium">Balance actual</p>
          <p class="text-base font-semibold text-amber-700 flex items-center justify-end gap-1">
            <span aria-hidden="true">🪙</span>
            {{ currentBalance.toLocaleString('es-CO') }} Waros
          </p>
        </div>
      </div>

      <hr class="border-border" />

      <!-- Mode: Dar / Quitar -->
      <fieldset>
        <legend class="text-sm font-medium text-text-primary mb-2">Acción</legend>
        <div role="radiogroup" aria-label="Seleccionar acción" class="flex gap-3">
          <label
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-colors"
            :class="mode === 'dar'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-border bg-surface text-text-secondary hover:border-green-300'"
          >
            <input type="radio" v-model="mode" value="dar" class="sr-only" />
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="text-sm font-semibold">Dar</span>
          </label>
          <label
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition-colors"
            :class="mode === 'quitar'
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-border bg-surface text-text-secondary hover:border-red-300'"
          >
            <input type="radio" v-model="mode" value="quitar" class="sr-only" />
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
            <span class="text-sm font-semibold">Quitar</span>
          </label>
        </div>
      </fieldset>

      <!-- Amount -->
      <div class="flex flex-col gap-1.5">
        <label for="waros-amount" class="text-sm font-medium text-text-primary">
          Cantidad de Waros
        </label>
        <input
          id="waros-amount"
          v-model.number="amount"
          type="number"
          min="1"
          step="1"
          placeholder="100"
          class="h-10 px-3 text-sm border-2 border-slate-200 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          :class="{ 'border-red-400 focus:border-red-400 focus:ring-red-400/20': !!validationError }"
          aria-label="Cantidad de Waros"
          :aria-describedby="validationError ? 'amount-error' : undefined"
        />
        <p
          v-if="validationError"
          id="amount-error"
          role="alert"
          class="flex items-center gap-1.5 text-sm text-red-600"
        >
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {{ validationError }}
        </p>
        <!-- Deduction preview -->
        <p v-if="mode === 'quitar' && amount > 0 && !validationError" class="text-xs text-text-secondary">
          Balance resultante: 🪙 {{ (currentBalance - amount).toLocaleString('es-CO') }} Waros
        </p>
        <p v-if="mode === 'dar' && amount > 0" class="text-xs text-text-secondary">
          Balance resultante: 🪙 {{ (currentBalance + amount).toLocaleString('es-CO') }} Waros
        </p>
      </div>

      <!-- Reason (optional) -->
      <div class="flex flex-col gap-1.5">
        <label for="waros-reason" class="text-sm font-medium text-text-primary">
          Razón <span class="text-text-secondary font-normal">(opcional)</span>
        </label>
        <textarea
          id="waros-reason"
          v-model="reason"
          placeholder="Ej. Premio por fidelidad, corrección manual..."
          rows="2"
          class="px-3 py-2 text-sm border-2 border-slate-200 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
          aria-label="Razón de la asignación (opcional)"
        />
      </div>

      <!-- API Error -->
      <div
        v-if="apiError"
        role="alert"
        class="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5"
      >
        <svg class="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-sm text-red-700">{{ apiError }}</p>
      </div>

    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex items-center justify-end gap-3 px-6 py-4">
        <button
          type="button"
          @click="open = false"
          class="min-h-[44px] px-4 text-sm font-medium text-text-secondary border-2 border-border rounded-lg hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="isSaving || !!validationError || !amount || amount < 1"
          @click="handleSubmit"
          :class="[
            'min-h-[44px] px-5 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            mode === 'dar'
              ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
              : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
          ]"
        >
          <span v-if="isSaving">Guardando...</span>
          <span v-else>{{ mode === 'dar' ? '+ Dar Waros' : '− Quitar Waros' }}</span>
        </button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  profileId: string
  customerName: string
  currentBalance: number
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'assigned', payload: { newBalance: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { assignWaros, isSaving } = useWarosCliente()
const { show: showToast } = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const mode = ref<'dar' | 'quitar'>('dar')
const amount = ref<number | null>(null)
const reason = ref('')
const apiError = ref<string | null>(null)

// Reset state when modal opens
watch(() => props.modelValue, (v) => {
  if (v) {
    mode.value = 'dar'
    amount.value = null
    reason.value = ''
    apiError.value = null
  }
})

const validationError = computed(() => {
  if (!amount.value || amount.value < 1) return null
  if (!Number.isInteger(amount.value)) return 'La cantidad debe ser un número entero'
  if (mode.value === 'quitar' && amount.value > props.currentBalance) {
    return `Saldo insuficiente. Balance actual: ${props.currentBalance.toLocaleString('es-CO')} Waros`
  }
  return null
})

const handleSubmit = async () => {
  if (!amount.value || amount.value < 1 || validationError.value) return
  apiError.value = null

  const finalAmount = mode.value === 'dar' ? amount.value : -amount.value

  try {
    const res = await assignWaros(props.profileId, finalAmount, reason.value || undefined)
    showToast(
      mode.value === 'dar'
        ? `+${amount.value} Waros asignados correctamente`
        : `−${amount.value} Waros deducidos correctamente`,
      'success'
    )
    emit('assigned', { newBalance: res.new_balance })
    open.value = false
  } catch (e: any) {
    apiError.value = e?.data?.detail || e?.message || 'Error al procesar la operación'
  }
}
</script>
