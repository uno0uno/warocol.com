<template>
  <div
    :class="[
      'bg-surface border border-border rounded-lg p-4 sm:p-5 flex items-center gap-4 transition-opacity',
      disabled ? 'opacity-50' : ''
    ]"
  >
    <!-- Icon -->
    <div :class="['flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg', iconBg]">
      <!-- bag: ticket_value -->
      <svg v-if="icon === 'bag'" class="w-5 h-5" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      <!-- count: purchase_count -->
      <svg v-else-if="icon === 'count'" class="w-5 h-5" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
      <!-- calendar: frequency -->
      <svg v-else-if="icon === 'calendar'" class="w-5 h-5" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <!-- ticket: per_ticket_qty -->
      <svg v-else class="w-5 h-5" :class="iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap mb-0.5">
        <p class="text-sm font-semibold text-text-primary">{{ meta.label }}</p>
        <span
          :class="[
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            rule.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
          ]"
        >
          {{ rule.is_active ? 'Activa' : 'Inactiva' }}
        </span>
      </div>
      <p class="text-sm text-text-secondary leading-relaxed">
        {{ rule.is_active ? summary : 'Sin configurar — activa para empezar' }}
      </p>
    </div>

    <!-- Toggle -->
    <button
      role="switch"
      :aria-checked="rule.is_active"
      :aria-label="`${rule.is_active ? 'Desactivar' : 'Activar'} regla ${meta.label}`"
      :disabled="toggling || disabled"
      @click="emit('toggle', rule)"
      :class="[
        'flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-wait',
        rule.is_active ? 'bg-primary' : 'bg-slate-300'
      ]"
    >
      <span
        :class="[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          rule.is_active ? 'translate-x-6' : 'translate-x-1'
        ]"
      />
    </button>

    <!-- Edit button -->
    <button
      :aria-label="`Editar regla ${meta.label}`"
      @click="emit('edit', rule)"
      class="flex-shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-text-secondary hover:text-primary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
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

const iconBg = computed(() => {
  switch (props.rule.rule_type) {
    case 'ticket_value':   return 'bg-orange-50'
    case 'purchase_count': return 'bg-blue-50'
    case 'frequency':      return 'bg-purple-50'
    case 'per_ticket_qty': return 'bg-emerald-50'
    default:               return 'bg-slate-50'
  }
})

const iconColor = computed(() => {
  switch (props.rule.rule_type) {
    case 'ticket_value':   return 'text-orange-500'
    case 'purchase_count': return 'text-blue-500'
    case 'frequency':      return 'text-purple-500'
    case 'per_ticket_qty': return 'text-emerald-500'
    default:               return 'text-slate-500'
  }
})
</script>
