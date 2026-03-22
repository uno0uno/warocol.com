<template>
  <div v-if="quota" :class="compact ? 'flex items-center gap-2' : 'space-y-2'">
    <!-- Compact mode: single row -->
    <template v-if="compact">
      <div class="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden min-w-0">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="barColor"
          :style="{ width: `${Math.min(quota.percentage, 100)}%` }"
          :aria-valuenow="quota.scans_used"
          :aria-valuemax="quota.scans_limit"
          aria-valuemin="0"
          role="progressbar"
          :aria-label="`${quota.scans_used} de ${quota.scans_limit} escaneos usados`"
        />
      </div>
      <span class="text-xs text-text-secondary whitespace-nowrap flex-shrink-0">
        {{ quota.scans_used.toLocaleString('es-CO') }} / {{ quota.scans_limit.toLocaleString('es-CO') }}
      </span>
    </template>

    <!-- Full mode: bar + labels + period + warning -->
    <template v-else>
      <!-- Label row -->
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm text-text-secondary">
          Escaneos IA:
          <span class="font-medium text-text-primary">
            {{ quota.scans_used.toLocaleString('es-CO') }} / {{ quota.scans_limit.toLocaleString('es-CO') }}
          </span>
        </span>
        <NuxtLink
          v-if="showPeriod"
          to="/billing/"
          class="text-xs text-primary hover:underline whitespace-nowrap"
        >
          Ver plan
        </NuxtLink>
      </div>

      <!-- Progress bar -->
      <div class="h-2 bg-surface-alt rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="barColor"
          :style="{ width: `${Math.min(quota.percentage, 100)}%` }"
          :aria-valuenow="quota.scans_used"
          :aria-valuemax="quota.scans_limit"
          aria-valuemin="0"
          role="progressbar"
          :aria-label="`${quota.scans_used} de ${quota.scans_limit} escaneos usados`"
        />
      </div>

      <!-- Period -->
      <div v-if="showPeriod" class="flex items-center justify-between text-xs text-text-secondary">
        <span>Período: {{ formatPeriod(quota.period_start) }} – {{ formatPeriod(quota.period_end) }}</span>
      </div>

      <!-- Warning messages (text + icon, never color alone) -->
      <p v-if="warningLevel === 'warning'" class="text-xs text-yellow-700 flex items-center gap-1">
        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        Te quedan {{ scansRemaining?.toLocaleString('es-CO') }} escaneos este período
      </p>
      <p v-else-if="warningLevel === 'critical'" class="text-xs text-orange-700 flex items-center gap-1">
        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
        </svg>
        Cuota casi agotada — actualiza tu plan
      </p>
      <p v-else-if="warningLevel === 'exceeded'" class="text-xs text-destructive flex items-center gap-1">
        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
        </svg>
        Cuota agotada — el escaneo está deshabilitado
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ScanQuota, QuotaWarningLevel } from '~/composables/useScanQuota'

const props = withDefaults(defineProps<{
  quota: ScanQuota | null
  compact?: boolean
  showPeriod?: boolean
  warningLevel?: QuotaWarningLevel
  scansRemaining?: number | null
}>(), {
  compact: false,
  showPeriod: true,
})

const barColor = computed(() => {
  const level = props.warningLevel ?? 'ok'
  if (level === 'exceeded') return 'bg-destructive'
  if (level === 'critical') return 'bg-orange-500'
  if (level === 'warning') return 'bg-yellow-500'
  return 'bg-success'
})

function formatPeriod(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(date)
}
</script>
