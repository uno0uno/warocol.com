<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Reusable tip selector for POS and online checkouts (warocol.com#639).
// Props-driven, layout-agnostic — fills the parent container.

interface TipModel {
  amount: number
  source: 'preset' | 'custom' | 'none'
}

const props = withDefaults(defineProps<{
  enabled: boolean
  presets: number[]
  preselectIndex: number | null
  subtotal: number
  modelValue: TipModel
}>(), {
  enabled: false,
  presets: () => [10],
  preselectIndex: null,
  subtotal: 0,
  modelValue: () => ({ amount: 0, source: 'none' }),
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: TipModel): void
}>()

type Mode = { kind: 'preset'; index: number } | { kind: 'custom' } | { kind: 'none' }

// Internal state — derived shape that maps cleanly to which chip is highlighted
const activeMode = ref<Mode>({ kind: 'none' })
const customAmount = ref<number>(0)
const hydrated = ref(false)

// Hydrate from props.preselectIndex on first render. Once hydrated, the user's
// choice wins and we don't auto-flip back even if props change.
watch(
  [() => props.enabled, () => props.preselectIndex, () => props.presets.length],
  () => {
    if (hydrated.value) return
    if (!props.enabled) return
    if (
      props.preselectIndex !== null
      && props.preselectIndex >= 0
      && props.preselectIndex < props.presets.length
    ) {
      activeMode.value = { kind: 'preset', index: props.preselectIndex }
    } else {
      activeMode.value = { kind: 'none' }
    }
    hydrated.value = true
  },
  { immediate: true },
)

// Compute the resolved tip amount in COP, in cents-free integer (round to whole pesos
// because the DB column is numeric(12,2) but COP UI is integer-only).
const presetAmount = (i: number): number => {
  const p = props.presets[i]
  if (p === undefined || p === null) return 0
  return Math.round(props.subtotal * (Number(p) / 100))
}

const tipAmount = computed<number>(() => {
  if (!props.enabled) return 0
  if (activeMode.value.kind === 'preset') return presetAmount(activeMode.value.index)
  if (activeMode.value.kind === 'custom') return Math.max(0, Math.round(customAmount.value || 0))
  return 0
})

const tipSource = computed<'preset' | 'custom' | 'none'>(() => {
  if (!props.enabled || activeMode.value.kind === 'none' || tipAmount.value === 0) return 'none'
  return activeMode.value.kind === 'preset' ? 'preset' : 'custom'
})

// Emit on every change (immediate so parent v-model matches hydration/preselect)
watch([tipAmount, tipSource], () => {
  emit('update:modelValue', { amount: tipAmount.value, source: tipSource.value })
}, { immediate: true })

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)

const formatPercentLabel = (p: number): string =>
  Number.isInteger(p) ? `${p}%` : `${p}%`

const selectPreset = (i: number) => {
  activeMode.value = { kind: 'preset', index: i }
}
const selectCustom = () => {
  activeMode.value = { kind: 'custom' }
}
const selectNone = () => {
  activeMode.value = { kind: 'none' }
  customAmount.value = 0
}

const onCustomInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const raw = Number(input.value.replace(/\./g, '').replace(/\D/g, ''))
  customAmount.value = Number.isFinite(raw) ? raw : 0
  input.value = raw ? raw.toLocaleString('es-CO') : ''
}

const customDisplay = computed(() =>
  customAmount.value > 0 ? customAmount.value.toLocaleString('es-CO') : ''
)

const isActivePreset = (i: number) => activeMode.value.kind === 'preset' && activeMode.value.index === i
const isActiveCustom = computed(() => activeMode.value.kind === 'custom')
const isActiveNone = computed(() => activeMode.value.kind === 'none')
</script>

<template>
  <div v-if="enabled" class="flex flex-col gap-3 p-4 rounded-xl bg-surface border-2 border-border">
    <div class="flex flex-col gap-0.5">
      <p class="text-sm font-semibold text-text-primary">Propina (opcional)</p>
      <p class="text-xs leading-snug text-text-secondary">
        Voluntaria — Ley 1935. Se calcula sobre el subtotal antes de impuestos.
      </p>
    </div>

    <!-- Chip row: presets + Personalizado + Sin propina -->
    <div role="group" aria-label="Opciones de propina" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <button
        v-for="(p, i) in presets"
        :key="`preset-${i}`"
        type="button"
        :aria-pressed="isActivePreset(i)"
        class="min-h-[56px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all active:scale-95"
        :class="isActivePreset(i)
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-background text-text-secondary hover:border-primary/40 hover:text-text-primary'"
        @click="selectPreset(i)"
      >
        <span>{{ formatPercentLabel(p) }}</span>
        <span class="text-xs font-normal opacity-70 tabular-nums">{{ formatCurrency(presetAmount(i)) }}</span>
      </button>

      <button
        type="button"
        :aria-pressed="isActiveCustom"
        class="min-h-[56px] px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all active:scale-95"
        :class="isActiveCustom
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-background text-text-secondary hover:border-primary/40 hover:text-text-primary'"
        @click="selectCustom"
      >
        Personalizado
      </button>

      <button
        type="button"
        :aria-pressed="isActiveNone"
        class="min-h-[56px] px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all active:scale-95"
        :class="isActiveNone
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-background text-text-secondary hover:border-primary/40 hover:text-text-primary'"
        @click="selectNone"
      >
        Sin propina
      </button>
    </div>

    <!-- Custom input — only when Personalizado is active -->
    <div v-if="isActiveCustom" class="flex flex-col gap-1">
      <label for="tip-custom-input" class="sr-only">Monto personalizado</label>
      <div class="relative">
        <input
          id="tip-custom-input"
          type="text"
          inputmode="numeric"
          :value="customDisplay"
          placeholder="0"
          maxlength="10"
          class="input-base w-full min-h-[48px] pl-4 pr-10 py-2 text-lg font-semibold tabular-nums"
          @input="onCustomInput"
        />
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-secondary pointer-events-none">$</span>
      </div>
    </div>
  </div>
</template>
