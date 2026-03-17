<template>
  <Teleport to="body">
    <div
      v-if="isOpen && alert"
      class="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black bg-opacity-50"
      @click.self="close"
    >
      <div
        class="bg-white w-full rounded-t-2xl md:rounded-2xl md:max-w-lg shadow-xl flex flex-col max-h-[90vh]"
        @click.stop
      >
        <!-- Header -->
        <div class="flex-shrink-0 border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-text-primary">Corregir precio</h2>
            <p class="text-sm text-text-secondary">{{ alert.ingredient_name }}</p>
          </div>
          <button
            class="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-surface-secondary rounded-lg transition-colors"
            aria-label="Cerrar modal"
            @click="close"
          >
            <svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          <!-- Context: current anomaly info -->
          <div class="bg-surface-secondary rounded-lg p-3 text-sm text-text-secondary">
            <span class="font-medium text-text-primary">Valor registrado:</span>
            ${{ alert.actual_value?.toLocaleString() ?? '?' }}
            <span v-if="alert.rolling_avg" class="ml-2">
              · Promedio histórico: ${{ alert.rolling_avg.toLocaleString() }}
            </span>
          </div>

          <!-- Corrected price field -->
          <div class="flex flex-col gap-1">
            <label for="corrected-value" class="text-sm font-medium text-text-primary">
              Precio corregido <span class="text-destructive" aria-label="requerido">*</span>
            </label>
            <input
              id="corrected-value"
              v-model.number="form.corrected_value"
              type="number"
              min="0.01"
              step="1"
              class="w-full min-h-[44px] px-4 py-2 border border-border rounded-lg text-text-primary
                     focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
              placeholder="Ej: 15000"
              :aria-describedby="deviationStatus ? 'deviation-feedback' : undefined"
            />

            <!-- Real-time deviation feedback -->
            <div
              v-if="deviationStatus"
              id="deviation-feedback"
              :class="[
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mt-1',
                deviationStatus.type === 'ok'
                  ? 'bg-success/10 text-success'
                  : deviationStatus.type === 'warning'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-destructive/10 text-destructive'
              ]"
              role="status"
              aria-live="polite"
            >
              {{ deviationStatus.label }}
            </div>
          </div>

          <!-- Optional: corrected quantity -->
          <div v-if="alert.context?.purchase_quantity != null" class="flex flex-col gap-1">
            <label for="corrected-quantity" class="text-sm font-medium text-text-primary">
              Cantidad (opcional)
            </label>
            <input
              id="corrected-quantity"
              v-model.number="form.corrected_quantity"
              type="number"
              min="0.001"
              step="any"
              class="w-full min-h-[44px] px-4 py-2 border border-border rounded-lg text-text-primary
                     focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors"
              :placeholder="`Actual: ${alert.context.purchase_quantity}`"
            />
            <p class="text-xs text-text-secondary">Deja vacío para conservar la cantidad actual.</p>
          </div>

          <!-- Resolution note -->
          <div class="flex flex-col gap-1">
            <label for="resolution-note" class="text-sm font-medium text-text-primary">
              Nota de resolución (opcional)
            </label>
            <textarea
              id="resolution-note"
              v-model="form.resolution_note"
              rows="2"
              class="w-full px-4 py-2 border border-border rounded-lg text-text-primary
                     focus:ring-2 focus:ring-primary focus:border-primary outline-none
                     transition-colors resize-none"
              placeholder="Ej: Error de digitación del proveedor"
            />
          </div>

        </div>

        <!-- Footer -->
        <div class="flex-shrink-0 border-t border-border px-5 py-4 flex gap-3">
          <button
            type="button"
            :disabled="saving"
            class="flex-1 min-h-[44px] px-4 py-2 border border-border rounded-lg text-text-primary
                   hover:bg-surface-secondary transition-colors font-medium
                   disabled:opacity-50 disabled:cursor-not-allowed"
            @click="close"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="!canSave || saving"
            class="flex-1 min-h-[44px] px-4 py-2 bg-primary text-white rounded-lg font-medium
                   hover:bg-primary/90 active:scale-95 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
            @click="save"
          >
            <span v-if="saving">Guardando...</span>
            <span v-else>Guardar corrección</span>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Alert {
  id: string
  ingredient_name: string
  alert_type: string
  severity: string
  actual_value: number | null
  rolling_avg: number | null
  context: Record<string, any> | null
  [key: string]: any
}

interface Props {
  modelValue: boolean
  alert: Alert | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'resolved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const saving = ref(false)

const form = reactive({
  corrected_value: null as number | null,
  corrected_quantity: null as number | null,
  resolution_note: ''
})

watch(() => props.alert, (alert) => {
  if (alert) {
    form.corrected_value = alert.actual_value
    form.corrected_quantity = null
    form.resolution_note = ''
  }
}, { immediate: true })

const deviationStatus = computed(() => {
  const price = form.corrected_value
  const avg = props.alert?.rolling_avg

  if (price === null || price === undefined || price === 0) return null
  if (price <= 0) {
    return { type: 'error', label: '🔴 El precio debe ser mayor a cero' }
  }
  if (!avg) return null

  const dev = Math.abs(price - avg) / avg * 100
  const direction = price > avg ? 'sobre' : 'bajo'

  if (dev > 50) {
    return { type: 'error', label: `🔴 Aún ${Math.round(dev)}% ${direction} el promedio — sigue siendo anómalo` }
  }
  if (dev > 25) {
    return { type: 'warning', label: `⚠️ Aún ${Math.round(dev)}% ${direction} el promedio — ¿estás seguro?` }
  }
  return { type: 'ok', label: '✅ Este valor está dentro del rango normal' }
})

const canSave = computed(() => {
  return form.corrected_value !== null && form.corrected_value > 0
})

const close = () => {
  if (!saving.value) {
    isOpen.value = false
  }
}

const save = async () => {
  if (!canSave.value || !props.alert) return

  saving.value = true
  try {
    const body: Record<string, any> = {
      resolution_type: 'corrected',
      corrected_value: form.corrected_value
    }
    if (form.corrected_quantity !== null && form.corrected_quantity > 0) {
      body.corrected_quantity = form.corrected_quantity
    }
    if (form.resolution_note?.trim()) {
      body.resolution_note = form.resolution_note.trim()
    }

    await $fetch(`/api/analytics/data-quality/${props.alert.id}/resolve`, {
      method: 'PATCH',
      body
    })

    useToast().success('Precio corregido correctamente', { title: 'Corrección guardada' })
    isOpen.value = false
    emit('resolved')
  } catch (error: any) {
    useToast().error(
      error?.data?.detail || 'No se pudo guardar la corrección. Intenta de nuevo.',
      { title: 'Error al corregir' }
    )
  } finally {
    saving.value = false
  }
}
</script>
