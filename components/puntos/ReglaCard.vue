<template>
  <div
    :class="[
      'group flex flex-col rounded-xl overflow-hidden transition-all duration-200',
      rule.is_active && !disabled
        ? ['border-2 shadow-sm', activeBorderClass]
        : 'border border-border bg-surface',
      disabled ? 'opacity-50 pointer-events-none' : 'cursor-default',
    ]"
  >
    <!-- ── Icon zone ─────────────────────────────────────────────── -->
    <div :class="['relative flex flex-col items-center justify-center pt-6 pb-5 px-4 gap-3', iconZoneBg]">

      <!-- Icon container -->
      <div :class="['flex items-center justify-center w-14 h-14 rounded-2xl shadow-sm', iconContainerBg]">
        <!-- bag: ticket_value -->
        <svg v-if="icon === 'bag'" class="w-7 h-7" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <!-- count: purchase_count -->
        <svg v-else-if="icon === 'count'" class="w-7 h-7" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
        <!-- calendar: frequency -->
        <svg v-else-if="icon === 'calendar'" class="w-7 h-7" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <!-- ticket: per_ticket_qty -->
        <svg v-else class="w-7 h-7" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      </div>

      <!-- Status badge: color + text (not color alone) -->
      <span
        :class="[
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
          rule.is_active
            ? 'bg-green-100 text-green-700'
            : 'bg-slate-100 text-slate-500',
        ]"
      >
        <span
          :class="[
            'inline-block w-1.5 h-1.5 rounded-full',
            rule.is_active ? 'bg-green-500' : 'bg-slate-400',
          ]"
          aria-hidden="true"
        />
        {{ rule.is_active ? 'Activa' : 'Inactiva' }}
      </span>
    </div>

    <!-- ── Content ───────────────────────────────────────────────── -->
    <div class="flex flex-col flex-1 px-4 pt-3 pb-2 gap-1">
      <!-- Title: minimum text-sm font-bold for card label -->
      <p class="text-sm font-bold text-text-primary leading-tight">{{ meta.label }}</p>
      <!-- Config summary: text-xs acceptable for card metadata -->
      <p class="text-xs text-text-secondary leading-relaxed flex-1">
        {{ rule.is_active ? summary : 'Sin configurar — activa para empezar' }}
      </p>
    </div>

    <!-- ── Footer: toggle + edit ─────────────────────────────────── -->
    <div class="flex items-center justify-between px-3 pb-3 pt-1">
      <!-- Toggle: role=switch + aria-checked + aria-label -->
      <button
        role="switch"
        :aria-checked="rule.is_active"
        :aria-label="`${rule.is_active ? 'Desactivar' : 'Activar'} regla ${meta.label}`"
        :disabled="toggling"
        @click="emit('toggle', rule)"
        :class="[
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-wait',
          rule.is_active ? activeSwitchBg : 'bg-slate-300',
        ]"
      >
        <span
          :class="[
            'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
            rule.is_active ? 'translate-x-[18px]' : 'translate-x-[2px]',
          ]"
        />
      </button>

      <!-- Edit button: aria-label + min 44×44px touch target -->
      <button
        :aria-label="`Editar regla ${meta.label}`"
        @click="emit('edit', rule)"
        class="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-1 rounded-lg text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
        :class="[iconColor.replace('text-', 'hover:text-'), 'hover:bg-white/70']"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WaroRule } from '~/composables/useWarosConfig'

interface Props {
  rule: WaroRule
  toggling?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'toggle', rule: WaroRule): void
  (e: 'edit', rule: WaroRule): void
}

const props = withDefaults(defineProps<Props>(), {
  toggling: false,
  disabled: false,
})

const emit = defineEmits<Emits>()

const { getRuleMeta, configSummary } = useWarosConfig()
const meta = computed(() => getRuleMeta(props.rule.rule_type))
const summary = computed(() => configSummary(props.rule))
const icon = computed(() => meta.value.icon)

// ── Per-type color tokens ─────────────────────────────────────────────────
// Warm palette for ticket/purchase (food context), cool for time/qty (admin)
const iconZoneBg = computed(() => {
  switch (props.rule.rule_type) {
    case 'ticket_value':   return 'bg-orange-50'
    case 'purchase_count': return 'bg-blue-50'
    case 'frequency':      return 'bg-violet-50'
    case 'per_ticket_qty': return 'bg-emerald-50'
    default:               return 'bg-slate-50'
  }
})

const iconContainerBg = computed(() => {
  switch (props.rule.rule_type) {
    case 'ticket_value':   return 'bg-orange-100'
    case 'purchase_count': return 'bg-blue-100'
    case 'frequency':      return 'bg-violet-100'
    case 'per_ticket_qty': return 'bg-emerald-100'
    default:               return 'bg-slate-100'
  }
})

// Contrast verified: -600 on white ≥ 4.5:1 for all these Tailwind colors
const iconColor = computed(() => {
  switch (props.rule.rule_type) {
    case 'ticket_value':   return 'text-orange-600'
    case 'purchase_count': return 'text-blue-600'
    case 'frequency':      return 'text-violet-600'
    case 'per_ticket_qty': return 'text-emerald-600'
    default:               return 'text-slate-600'
  }
})

const activeBorderClass = computed(() => {
  switch (props.rule.rule_type) {
    case 'ticket_value':   return 'border-orange-200 bg-orange-50/30'
    case 'purchase_count': return 'border-blue-200 bg-blue-50/30'
    case 'frequency':      return 'border-violet-200 bg-violet-50/30'
    case 'per_ticket_qty': return 'border-emerald-200 bg-emerald-50/30'
    default:               return 'border-primary/20'
  }
})

const activeSwitchBg = computed(() => {
  switch (props.rule.rule_type) {
    case 'ticket_value':   return 'bg-orange-500'
    case 'purchase_count': return 'bg-blue-500'
    case 'frequency':      return 'bg-violet-500'
    case 'per_ticket_qty': return 'bg-emerald-500'
    default:               return 'bg-primary'
  }
})
</script>
