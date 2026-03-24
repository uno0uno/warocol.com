<template>
  <div
    v-if="quota"
    :class="[
      compact ? 'flex items-center gap-3 px-3 py-2' : 'space-y-2.5 p-4',
      'glass-container rounded-xl border border-white/10 shadow-sm'
    ]"
  >
    <!-- Compact mode: single row -->
    <template v-if="compact">
      <div class="flex-1 h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden min-w-0">
        <div
          class="h-full rounded-full transition-all duration-700 ease-out progress-bar-glow"
          :class="barClass"
          :style="{ width: `${Math.min(quota.percentage, 100)}%` }"
          role="progressbar"
          :aria-valuenow="quota.scans_used"
          :aria-valuemax="quota.scans_limit"
        />
      </div>
      <span class="text-xs font-semibold text-text-primary tabular-nums whitespace-nowrap flex-shrink-0">
        {{ quota.scans_used.toLocaleString('es-CO') }} <span class="text-text-secondary font-normal">/ {{ quota.scans_limit.toLocaleString('es-CO') }}</span>
      </span>
    </template>

    <!-- Full mode: bar + labels + period + warning -->
    <template v-else>
      <!-- Label row -->
      <div class="flex items-center justify-between gap-2 mb-1">
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full" :class="dotColor"></div>
          <span class="text-[0.85rem] font-semibold text-text-primary tracking-tight">
            Escaneos IA
            <span class="ml-1 text-text-secondary font-medium uppercase text-[10px] tracking-widest bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
              {{ quota.scans_used.toLocaleString('es-CO') }} / {{ quota.scans_limit.toLocaleString('es-CO') }}
            </span>
          </span>
        </div>
        <NuxtLink
          v-if="showPeriod"
          to="/billing/"
          class="text-xs font-bold text-primary hover:text-primary/80 transition-colors py-1.5 px-2.5 -mr-2 bg-primary/5 rounded-lg active:scale-95"
          style="min-height: 44px; display: flex; align-items: center;"
        >
          Ver plan
        </NuxtLink>
      </div>

      <!-- Progress bar container -->
      <div class="h-2.5 bg-black/5 dark:bg-white/5 rounded-full p-[2px] overflow-hidden backdrop-blur-sm">
        <div
          class="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] progress-bar-glow"
          :class="[barClass, warningLevel === 'critical' ? 'animate-pulse-subtle' : '']"
          :style="{ width: `${Math.min(quota.percentage, 100)}%` }"
          role="progressbar"
          :aria-valuenow="quota.scans_used"
          :aria-valuemax="quota.scans_limit"
        />
      </div>

      <!-- Period info -->
      <div v-if="showPeriod" class="flex items-center justify-between mt-2">
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">
          <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Restablece: {{ formatPeriod(quota.period_end) }}
        </div>
        <div class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
          {{ Math.round(quota.percentage) }}% usado
        </div>
      </div>

      <!-- Specialized Warning Messages -->
      <div v-if="warningLevel !== 'ok'" class="mt-3 p-2.5 rounded-lg border flex items-start gap-2.5 transition-all duration-300" :class="alertClass">
        <div class="mt-0.5 p-1 rounded-md" :class="alertIconBg">
          <svg v-if="warningLevel === 'exceeded'" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
          <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-xs font-bold leading-tight" :class="alertTextColor">
            {{ warningMessageTitle }}
          </p>
          <p class="text-[10px] mt-0.5 opacity-80" :class="alertTextColor">
            {{ warningMessageSub }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const barClass = computed(() => {
  const level = props.warningLevel ?? 'ok'
  if (level === 'exceeded') return 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/20'
  if (level === 'critical') return 'bg-gradient-to-r from-orange-400 to-amber-600 shadow-orange-500/20'
  if (level === 'warning') return 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-yellow-500/20'
  return 'bg-gradient-to-r from-emerald-400 to-teal-600 shadow-emerald-500/20'
})

const dotColor = computed(() => {
  const level = props.warningLevel ?? 'ok'
  if (level === 'exceeded') return 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]'
  if (level === 'critical') return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
  if (level === 'warning') return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'
  return 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]'
})

const alertClass = computed(() => {
  const level = props.warningLevel ?? 'ok'
  if (level === 'exceeded') return 'bg-destructive/10 border-destructive/20'
  if (level === 'critical') return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
  if (level === 'warning') return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
  return 'hidden'
})

const alertIconBg = computed(() => {
  const level = props.warningLevel ?? 'ok'
  if (level === 'exceeded') return 'bg-destructive text-white'
  if (level === 'critical') return 'bg-orange-500 text-white'
  if (level === 'warning') return 'bg-yellow-500 text-white'
  return ''
})

const alertTextColor = computed(() => {
  const level = props.warningLevel ?? 'ok'
  if (level === 'exceeded') return 'text-destructive'
  if (level === 'critical') return 'text-orange-900 dark:text-orange-200'
  if (level === 'warning') return 'text-yellow-900 dark:text-yellow-200'
  return ''
})

const warningMessageTitle = computed(() => {
  if (props.warningLevel === 'exceeded') return 'Cuota agotada'
  if (props.warningLevel === 'critical') return '¡Cuidado! Quedan pocos escaneos'
  if (props.warningLevel === 'warning') return 'Cuota de uso moderada'
  return ''
})

const warningMessageSub = computed(() => {
  if (props.warningLevel === 'exceeded') return 'Actualiza tu plan para seguir escaneando facturas.'
  if (props.warningLevel === 'critical') return `Solo te quedan ${props.scansRemaining} para este mes.`
  if (props.warningLevel === 'warning') return `Has usado ${props.quota?.scans_used} de ${props.quota?.scans_limit} escaneos.`
  return ''
})

function formatPeriod(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(date)
  } catch {
    return dateStr
  }
}
</script>

<style scoped>
.glass-container {
  background: rgba(var(--surface-rgb, 255, 255, 255), 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.progress-bar-glow {
  box-shadow: 0 0 12px var(--tw-shadow-color);
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.01); }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s infinite ease-in-out;
}
</style>
