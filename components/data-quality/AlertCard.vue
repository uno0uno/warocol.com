<template>
  <div
    :class="[
      'bg-white border rounded-xl p-4 transition-opacity',
      alert.resolved ? 'opacity-60' : '',
      alert.severity === 'critical' ? 'border-destructive/30' : 'border-warning/30'
    ]"
  >
    <!-- Header: badge + ingredient name -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <span
          :class="[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
            alert.resolved
              ? 'bg-success/10 text-success'
              : alert.severity === 'critical'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-warning/10 text-warning'
          ]"
        >
          <span aria-hidden="true">{{ alert.resolved ? '✓' : alert.severity === 'critical' ? '●' : '▲' }}</span>
          {{ alert.resolved ? 'Resuelto' : alert.severity === 'critical' ? 'Crítico' : 'Aviso' }}
        </span>
        <span class="text-sm font-semibold text-text-primary truncate">{{ alert.ingredient_name }}</span>
      </div>
      <span class="text-xs text-text-secondary shrink-0">{{ formattedDate }}</span>
    </div>

    <!-- Deviation description in plain language -->
    <p class="text-sm text-text-primary mb-3 leading-relaxed">{{ deviationDescription }}</p>

    <!-- Price history (last 5 prices) -->
    <div v-if="alert.context?.history?.length" class="mb-3">
      <p class="text-xs text-text-secondary mb-1">Últimos precios:</p>
      <div class="flex flex-wrap gap-1">
        <span
          v-for="(price, i) in alert.context.history"
          :key="i"
          :class="[
            'text-xs px-2 py-0.5 rounded font-mono',
            i === alert.context.history.length - 1 && !alert.resolved
              ? 'bg-destructive/10 text-destructive font-bold'
              : 'bg-surface-secondary text-text-secondary'
          ]"
        >
          ${{ price.toLocaleString() }}
        </span>
      </div>
    </div>

    <!-- Resolution info (if resolved) -->
    <div v-if="alert.resolved && alert.resolution_note" class="mb-3 text-xs text-text-secondary italic">
      Nota: {{ alert.resolution_note }}
    </div>
    <div v-if="alert.resolved && alert.corrected_value" class="mb-3 text-xs text-success">
      Corregido a ${{ alert.corrected_value.toLocaleString() }} (original: ${{ alert.original_value?.toLocaleString() }})
    </div>

    <!-- Action buttons -->
    <div v-if="!alert.resolved" class="flex flex-wrap gap-2 mt-1">
      <button
        :disabled="validating"
        class="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border border-border
               text-text-primary hover:bg-surface-secondary
               disabled:opacity-50 disabled:cursor-not-allowed
               focus:ring-2 focus:ring-primary transition-colors"
        :aria-label="`Marcar como válido el precio de ${alert.ingredient_name}`"
        @click="emit('mark-valid', alert.id)"
      >
        <span v-if="validating">Guardando...</span>
        <span v-else>✓ Marcar como válido</span>
      </button>

      <button
        class="min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg
               bg-primary text-white hover:bg-primary/90
               focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
        :aria-label="`Corregir el precio de ${alert.ingredient_name}`"
        @click="emit('correct', alert)"
      >
        Corregir precio
      </button>

      <a
        v-if="purchaseLink"
        :href="purchaseLink"
        class="min-h-[44px] inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg
               text-primary hover:underline focus:ring-2 focus:ring-primary transition-colors"
        :aria-label="`Ver la compra que originó la anomalía de ${alert.ingredient_name}`"
      >
        Ver compra →
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format as fnsFormat } from 'date-fns'
import { es } from 'date-fns/locale'

interface Alert {
  id: string
  ingredient_name: string
  alert_type: 'price_spike' | 'price_drop' | 'impossible_value' | 'unit_mismatch'
  severity: 'critical' | 'warning'
  expected_value: number | null
  actual_value: number | null
  deviation_pct: number | null
  rolling_avg: number | null
  context: Record<string, any> | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  resolution_note: string | null
  original_value: number | null
  corrected_value: number | null
  created_at: string
}

interface Props {
  alert: Alert
  validating?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  validating: false
})

const emit = defineEmits<{
  'mark-valid': [id: string]
  'correct': [alert: Alert]
}>()

const formattedDate = computed(() => {
  try {
    return fnsFormat(new Date(props.alert.created_at), "d 'de' MMM, yyyy", { locale: es })
  } catch {
    return ''
  }
})

const deviationDescription = computed(() => {
  const { alert_type, deviation_pct, actual_value, rolling_avg, ingredient_name } = props.alert

  if (alert_type === 'impossible_value') {
    return `Valor imposible registrado: $${actual_value?.toLocaleString() ?? 0} (el precio debe ser mayor a cero).`
  }

  if (deviation_pct !== null && rolling_avg !== null) {
    const direction = alert_type === 'price_spike' ? 'sobre' : 'bajo'
    const pct = Math.round(deviation_pct)
    const avg = rolling_avg.toLocaleString()
    return `${pct}% ${direction} el promedio histórico — promedio: $${avg}, registrado: $${actual_value?.toLocaleString() ?? '?'}.`
  }

  return `Anomalía detectada en el precio de ${ingredient_name}.`
})

const purchaseLink = computed(() => {
  const purchaseId = props.alert.context?.purchase_id
  return purchaseId ? `/abastecimiento/compra/${purchaseId}` : null
})
</script>
