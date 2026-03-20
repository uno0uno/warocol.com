<template>
  <UiModal v-model="open" title="Editar regla">
    <div v-if="rule" class="overflow-y-auto max-h-[60vh] px-6 py-5 space-y-5">

      <!-- Rule header + is_active toggle -->
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="text-base font-semibold text-text-primary">{{ meta.label }}</p>
          <p class="text-sm text-text-secondary leading-relaxed mt-0.5">{{ meta.description }}</p>
        </div>
        <div class="flex flex-col items-end gap-1 flex-shrink-0">
          <button
            role="switch"
            :aria-checked="localActive"
            :aria-label="`${localActive ? 'Desactivar' : 'Activar'} regla`"
            @click="localActive = !localActive"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              localActive ? 'bg-primary' : 'bg-slate-300'
            ]"
          >
            <span :class="['inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', localActive ? 'translate-x-6' : 'translate-x-1']" />
          </button>
          <span class="text-xs text-text-secondary">{{ localActive ? 'Activa' : 'Inactiva' }}</span>
        </div>
      </div>

      <hr class="border-border" />

      <!-- ── ticket_value ── -->
      <template v-if="rule.rule_type === 'ticket_value'">
        <p class="text-sm font-semibold text-text-primary">Tasa base</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="field-base_waros" class="text-sm font-medium text-text-primary">Waros a otorgar</label>
            <input
              id="field-base_waros"
              v-model.number="tvConfig.base_waros"
              type="number" min="1" step="1"
              placeholder="1"
              :class="inputClass"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="field-base_pesos" class="text-sm font-medium text-text-primary">Por cada (COP)</label>
            <input
              id="field-base_pesos"
              v-model.number="tvConfig.base_pesos"
              type="number" min="1" step="100"
              placeholder="1000"
              :class="inputClass"
            />
          </div>
        </div>
        <p class="text-xs text-text-secondary -mt-2">
          Compra de ${{ (tvConfig.base_pesos * 10).toLocaleString('es-CO') }} COP → {{ tvConfig.base_waros * 10 }} Waros
        </p>

        <hr class="border-border" />

        <!-- Tiers -->
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-text-primary">Tiers por monto</p>
          <button @click="addTier" type="button" class="text-xs text-primary hover:text-primary/80 font-medium transition-colors focus:outline-none">
            + Agregar tier
          </button>
        </div>

        <div v-if="tierGapWarning" class="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span class="text-xs">{{ tierGapWarning }}</span>
        </div>

        <div v-if="tvConfig.tiers.length === 0" class="text-sm text-text-secondary text-center py-3 bg-surface-secondary rounded-lg">
          Sin tiers — se aplica la tasa base para todos los montos
        </div>

        <div v-for="(tier, i) in tvConfig.tiers" :key="i" class="flex items-end gap-2">
          <div class="flex flex-col gap-1 flex-1">
            <label :for="`tier-from-${i}`" class="text-xs font-medium text-text-secondary">Desde (COP)</label>
            <input
              :id="`tier-from-${i}`"
              v-model.number="tier.from"
              type="number" min="0" step="1000"
              placeholder="0"
              :class="inputClass"
            />
          </div>
          <div class="flex flex-col gap-1 flex-1">
            <label :for="`tier-to-${i}`" class="text-xs font-medium text-text-secondary">Hasta (COP)</label>
            <input
              :id="`tier-to-${i}`"
              v-model.number="tier.to"
              type="number" min="0" step="1000"
              placeholder="Sin límite"
              :class="inputClass"
            />
          </div>
          <div class="flex flex-col gap-1 flex-1">
            <label :for="`tier-mult-${i}`" class="text-xs font-medium text-text-secondary">Multiplicador</label>
            <input
              :id="`tier-mult-${i}`"
              v-model.number="tier.multiplier"
              type="number" min="0.1" step="0.1"
              placeholder="1.0"
              :class="inputClass"
            />
          </div>
          <button
            @click="removeTier(i)"
            type="button"
            :aria-label="`Eliminar tier ${i + 1}`"
            class="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200 mb-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </template>

      <!-- ── purchase_count ── -->
      <template v-else-if="rule.rule_type === 'purchase_count'">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-text-primary">Hitos de compra</p>
          <button @click="addMilestone" type="button" class="text-xs text-primary hover:text-primary/80 font-medium transition-colors focus:outline-none">
            + Agregar hito
          </button>
        </div>

        <div v-if="milestoneDupWarning" class="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span class="text-xs">{{ milestoneDupWarning }}</span>
        </div>

        <div v-if="pcConfig.milestones.length === 0" class="text-sm text-text-secondary text-center py-3 bg-surface-secondary rounded-lg">
          Sin hitos — agrega al menos uno para activar la regla
        </div>

        <div v-for="(m, i) in pcConfig.milestones" :key="i" class="flex items-end gap-2">
          <div class="flex flex-col gap-1 flex-1">
            <label :for="`m-num-${i}`" class="text-xs font-medium text-text-secondary">Compra #</label>
            <input
              :id="`m-num-${i}`"
              v-model.number="m.purchase_number"
              type="number" min="1" step="1"
              placeholder="1"
              :class="inputClass"
            />
          </div>
          <div class="flex flex-col gap-1 flex-1">
            <label :for="`m-bonus-${i}`" class="text-xs font-medium text-text-secondary">Waros bonus</label>
            <input
              :id="`m-bonus-${i}`"
              v-model.number="m.bonus"
              type="number" min="1" step="1"
              placeholder="50"
              :class="inputClass"
            />
          </div>
          <button
            @click="removeMilestone(i)"
            type="button"
            :aria-label="`Eliminar hito ${i + 1}`"
            class="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </template>

      <!-- ── frequency ── -->
      <template v-else-if="rule.rule_type === 'frequency'">
        <div class="flex flex-col gap-1">
          <label for="field-purchases" class="text-sm font-medium text-text-primary">Número de compras</label>
          <input
            id="field-purchases"
            v-model.number="freqConfig.purchases"
            type="number" min="1" step="1"
            placeholder="2"
            :class="inputClass"
          />
          <p class="text-xs text-text-secondary">Compras consecutivas requeridas para activar el bonus</p>
        </div>
        <div class="flex flex-col gap-1">
          <label for="field-within_days" class="text-sm font-medium text-text-primary">Ventana de días</label>
          <input
            id="field-within_days"
            v-model.number="freqConfig.within_days"
            type="number" min="1" step="1"
            placeholder="60"
            :class="inputClass"
          />
          <p class="text-xs text-text-secondary">Las compras deben ocurrir dentro de este período</p>
        </div>
        <div class="flex flex-col gap-1">
          <label for="field-freq-bonus" class="text-sm font-medium text-text-primary">Waros bonus</label>
          <input
            id="field-freq-bonus"
            v-model.number="freqConfig.bonus"
            type="number" min="1" step="1"
            placeholder="75"
            :class="inputClass"
          />
        </div>
        <p class="text-xs text-text-secondary bg-surface-secondary rounded-lg px-3 py-2">
          Ejemplo: {{ freqConfig.purchases ?? 2 }} compras en {{ freqConfig.within_days ?? 60 }} días → <strong>{{ freqConfig.bonus ?? 75 }} Waros</strong>
        </p>
      </template>

      <!-- ── per_ticket_qty ── -->
      <template v-else-if="rule.rule_type === 'per_ticket_qty'">
        <div class="flex flex-col gap-1">
          <label for="field-pti" class="text-sm font-medium text-text-primary">Waros por boleta</label>
          <input
            id="field-pti"
            v-model.number="ptqConfig.points_per_item"
            type="number" min="1" step="1"
            placeholder="10"
            :class="inputClass"
          />
        </div>

        <hr class="border-border" />
        <p class="text-sm font-semibold text-text-primary">Bonus por cantidad <span class="text-xs font-normal text-text-secondary ml-1">(opcional)</span></p>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label for="field-bonus_from_qty" class="text-sm font-medium text-text-primary">Desde # boletas</label>
            <input
              id="field-bonus_from_qty"
              v-model.number="ptqConfig.bonus_from_qty"
              type="number" min="1" step="1"
              placeholder="4"
              :class="inputClass"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="field-bonus_extra" class="text-sm font-medium text-text-primary">Waros extra</label>
            <input
              id="field-bonus_extra"
              v-model.number="ptqConfig.bonus_extra_points"
              type="number" min="1" step="1"
              placeholder="50"
              :class="inputClass"
            />
          </div>
        </div>
        <p v-if="ptqConfig.bonus_from_qty" class="text-xs text-text-secondary bg-surface-secondary rounded-lg px-3 py-2">
          Pedido con {{ ptqConfig.bonus_from_qty }} boletas → {{ (ptqConfig.points_per_item ?? 10) * ptqConfig.bonus_from_qty + (ptqConfig.bonus_extra_points ?? 0) }} Waros
        </p>
      </template>

      <!-- Validation errors -->
      <div v-if="validationError" class="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span class="text-xs">{{ validationError }}</span>
      </div>

    </div>

    <template #footer>
      <div class="flex gap-3 px-6 py-4">
        <button
          @click="close"
          type="button"
          class="flex-1 h-11 rounded-lg border-2 border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          Cancelar
        </button>
        <button
          @click="save"
          type="button"
          :disabled="isSaving || !!tierGapWarning || !!milestoneDupWarning"
          class="flex-1 h-11 rounded-lg bg-primary text-sm font-medium text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          <span v-if="isSaving">Guardando...</span>
          <span v-else>Guardar cambios</span>
        </button>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import type { WaroRule, TicketValueTier, PurchaseCountMilestone } from '~/composables/useWarosConfig'
import { DEFAULT_CONFIGS } from '~/composables/useWarosConfig'

interface Props {
  modelValue: boolean
  rule: WaroRule | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { updateRule, getRuleMeta, isSaving } = useWarosConfig()

const inputClass = 'h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const meta = computed(() =>
  props.rule ? getRuleMeta(props.rule.rule_type) : { label: '', description: '', icon: '' }
)

// ── Local state ───────────────────────────────────────────────────────────

const localActive = ref(false)
const validationError = ref<string | null>(null)

// ticket_value
const tvConfig = ref({ base_waros: 1, base_pesos: 1000, tiers: [] as TicketValueTier[] })
// purchase_count
const pcConfig = ref({ milestones: [] as PurchaseCountMilestone[] })
// frequency
const freqConfig = ref({ purchases: 2, within_days: 60, bonus: 75 })
// per_ticket_qty
const ptqConfig = ref({ points_per_item: 10, bonus_from_qty: null as number | null, bonus_extra_points: null as number | null })

// ── Sync from prop ────────────────────────────────────────────────────────

watch(
  () => props.rule,
  (rule) => {
    if (!rule) return
    validationError.value = null
    localActive.value = rule.is_active
    const defaults = DEFAULT_CONFIGS[rule.rule_type] ?? {}
    const c = { ...defaults, ...rule.config }

    switch (rule.rule_type) {
      case 'ticket_value':
        tvConfig.value = {
          base_waros: c.base_waros ?? 1,
          base_pesos: c.base_pesos ?? 1000,
          tiers: (c.tiers ?? []).map((t: TicketValueTier) => ({ ...t })),
        }
        break
      case 'purchase_count':
        pcConfig.value = {
          milestones: (c.milestones ?? []).map((m: PurchaseCountMilestone) => ({ ...m })),
        }
        break
      case 'frequency':
        freqConfig.value = { purchases: c.purchases ?? 2, within_days: c.within_days ?? 60, bonus: c.bonus ?? 75 }
        break
      case 'per_ticket_qty':
        ptqConfig.value = {
          points_per_item: c.points_per_item ?? 10,
          bonus_from_qty: c.bonus_from_qty ?? null,
          bonus_extra_points: c.bonus_extra_points ?? null,
        }
        break
    }
  },
  { immediate: true }
)

// ── Tier helpers ──────────────────────────────────────────────────────────

const addTier = () => {
  const tiers = tvConfig.value.tiers
  const lastTo = tiers.length > 0 ? (tiers[tiers.length - 1].to ?? 0) : 0
  tiers.push({ from: lastTo, to: null, multiplier: 1 })
}

const removeTier = (i: number) => {
  tvConfig.value.tiers.splice(i, 1)
}

const tierGapWarning = computed(() => {
  const tiers = tvConfig.value.tiers
  if (tiers.length < 2) return null
  const sorted = [...tiers].sort((a, b) => a.from - b.from)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].to !== sorted[i + 1].from) {
      return `Gap o solapamiento entre tier ${i + 1} y ${i + 2} — el "Hasta" de un tier debe ser igual al "Desde" del siguiente`
    }
  }
  return null
})

// ── Milestone helpers ─────────────────────────────────────────────────────

const addMilestone = () => {
  const ms = pcConfig.value.milestones
  const next = ms.length > 0 ? Math.max(...ms.map(m => m.purchase_number)) + 1 : 1
  ms.push({ purchase_number: next, bonus: 50 })
}

const removeMilestone = (i: number) => {
  pcConfig.value.milestones.splice(i, 1)
}

const milestoneDupWarning = computed(() => {
  const nums = pcConfig.value.milestones.map(m => m.purchase_number)
  const dupes = nums.filter((n, i) => nums.indexOf(n) !== i)
  return dupes.length ? `Número de compra duplicado: ${[...new Set(dupes)].join(', ')}` : null
})

// ── Validation ────────────────────────────────────────────────────────────

const validate = (): boolean => {
  validationError.value = null
  if (!props.rule) return false

  switch (props.rule.rule_type) {
    case 'ticket_value':
      if (!tvConfig.value.base_waros || tvConfig.value.base_waros <= 0) {
        validationError.value = 'Los Waros base deben ser mayor a 0'
        return false
      }
      if (!tvConfig.value.base_pesos || tvConfig.value.base_pesos <= 0) {
        validationError.value = 'El valor en COP debe ser mayor a 0'
        return false
      }
      if (tvConfig.value.tiers.some(t => !t.multiplier || t.multiplier <= 0)) {
        validationError.value = 'Todos los multiplicadores de tiers deben ser mayor a 0'
        return false
      }
      break
    case 'purchase_count':
      if (pcConfig.value.milestones.some(m => !m.purchase_number || m.purchase_number <= 0 || !m.bonus || m.bonus <= 0)) {
        validationError.value = 'Todos los hitos deben tener valores positivos'
        return false
      }
      break
    case 'frequency':
      if (!freqConfig.value.purchases || freqConfig.value.purchases <= 0) {
        validationError.value = 'El número de compras debe ser mayor a 0'
        return false
      }
      if (!freqConfig.value.within_days || freqConfig.value.within_days <= 0) {
        validationError.value = 'La ventana de días debe ser mayor a 0'
        return false
      }
      if (!freqConfig.value.bonus || freqConfig.value.bonus <= 0) {
        validationError.value = 'El bonus debe ser mayor a 0'
        return false
      }
      break
    case 'per_ticket_qty':
      if (!ptqConfig.value.points_per_item || ptqConfig.value.points_per_item <= 0) {
        validationError.value = 'Los Waros por boleta deben ser mayor a 0'
        return false
      }
      if (ptqConfig.value.bonus_from_qty && (!ptqConfig.value.bonus_extra_points || ptqConfig.value.bonus_extra_points <= 0)) {
        validationError.value = 'Si defines un bonus por cantidad, los Waros extra deben ser mayor a 0'
        return false
      }
      break
  }
  return true
}

// ── Build config payload ──────────────────────────────────────────────────

const buildConfig = (): Record<string, any> => {
  switch (props.rule!.rule_type) {
    case 'ticket_value':
      return { ...tvConfig.value }
    case 'purchase_count':
      return { ...pcConfig.value }
    case 'frequency':
      return { ...freqConfig.value }
    case 'per_ticket_qty':
      return { ...ptqConfig.value }
    default:
      return {}
  }
}

// ── Actions ───────────────────────────────────────────────────────────────

const close = () => {
  open.value = false
}

const save = async () => {
  if (!props.rule) return
  if (!validate()) return
  try {
    await updateRule(props.rule.rule_type, {
      is_active: localActive.value,
      config: buildConfig(),
    })
    emit('saved')
    close()
  } catch (e: any) {
    validationError.value = e?.data?.detail || e?.message || 'Error al guardar — intenta de nuevo'
  }
}
</script>
