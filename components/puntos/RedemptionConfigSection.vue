<template>
  <div class="bg-surface border border-border rounded-lg overflow-hidden">
    <div class="px-4 py-3 border-b border-border">
      <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Canje B1 — conversión Waros</h3>
      <p class="text-xs text-text-secondary mt-0.5">Cuántos Waros equivalen a pesos en checkout</p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-10">
      <CommonsTheCustomLoader size="medium" />
    </div>

    <form v-else class="px-4 py-4 space-y-4" @submit.prevent="handleSubmit">
      <label class="flex items-center justify-between gap-4 cursor-pointer">
        <span class="text-sm font-medium text-text-primary">Canje habilitado</span>
        <button
          type="button"
          role="switch"
          :aria-checked="form.redemption_enabled"
          @click="form.redemption_enabled = !form.redemption_enabled"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            form.redemption_enabled ? 'bg-primary' : 'bg-slate-300',
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              form.redemption_enabled ? 'translate-x-6' : 'translate-x-1',
            ]"
          />
        </button>
      </label>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1.5">
          <label for="waros-per-1000" class="text-xs font-medium text-text-secondary">
            Waros por cada $1.000 COP
          </label>
          <input
            id="waros-per-1000"
            v-model.number="form.waros_per_1000_cop"
            type="number"
            min="1"
            class="h-10 px-3 text-sm border border-border rounded-lg bg-background"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="max-redeem-pct" class="text-xs font-medium text-text-secondary">
            Máx. % del pedido canjeable
          </label>
          <input
            id="max-redeem-pct"
            v-model.number="form.max_redeem_percent_per_order"
            type="number"
            min="0"
            max="100"
            step="1"
            class="h-10 px-3 text-sm border border-border rounded-lg bg-background"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="min-waros" class="text-xs font-medium text-text-secondary">
            Mínimo Waros para canjear
          </label>
          <input
            id="min-waros"
            v-model.number="form.min_waros_to_redeem"
            type="number"
            min="1"
            class="h-10 px-3 text-sm border border-border rounded-lg bg-background"
          />
        </div>
      </div>

      <p v-if="saveError" role="alert" class="text-sm text-red-600">{{ saveError }}</p>

      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="isSaving"
          class="min-h-[44px] px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
        >
          <UiLoadingDots v-if="isSaving" size="9px" />
          <span v-else>Guardar configuración</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

const { show: showToast } = useToast()
const { config, isLoading, saveConfig, isSaving, saveError } = useRedemptionConfig()

const form = reactive({
  redemption_enabled: false,
  waros_per_1000_cop: 100,
  max_redeem_percent_per_order: 50,
  min_waros_to_redeem: 1,
})

watch(
  config,
  (c) => {
    if (!c) return
    form.redemption_enabled = c.redemption_enabled
    form.waros_per_1000_cop = c.waros_per_1000_cop
    form.max_redeem_percent_per_order = c.max_redeem_percent_per_order
    form.min_waros_to_redeem = c.min_waros_to_redeem
  },
  { immediate: true }
)

const handleSubmit = async () => {
  try {
    await saveConfig({
      redemption_enabled: form.redemption_enabled,
      waros_per_1000_cop: form.waros_per_1000_cop,
      max_redeem_percent_per_order: form.max_redeem_percent_per_order,
      min_waros_to_redeem: form.min_waros_to_redeem,
    })
    showToast('Configuración de canje guardada', 'success')
  } catch {
    showToast(saveError.value || 'Error al guardar', 'error')
  }
}
</script>
