<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ── Props / Emits ────────────────────────────────────────────────────────────
interface Account {
  id: string
  code: string
  name: string
  accountClass: string
  accountType: string
  normalBalance: 'debit' | 'credit'
  isDetail: boolean
  isActive: boolean
}

interface TenantAccountForLookup {
  id: string
  code: string
}

const props = defineProps<{
  modelValue: boolean
  account: Account | null
  bookBalance: number
  // Pre-fetched list of all tenant accounts (used to resolve contraparte by code)
  allAccounts: TenantAccountForLookup[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(v ?? 0)

const close = () => emit('update:modelValue', false)

// ── Form state ───────────────────────────────────────────────────────────────
const targetBalanceInput = ref<string>('')
const motivoCode = ref<string>('')
const submitting = ref(false)
const submitError = ref('')

const targetBalance = computed(() => {
  const cleaned = (targetBalanceInput.value ?? '').toString().replace(/[^0-9.-]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : NaN
})

const diferencia = computed(() => {
  if (!Number.isFinite(targetBalance.value)) return 0
  return targetBalance.value - props.bookBalance
})

const sign = computed<'positive' | 'negative' | 'zero'>(() => {
  if (!Number.isFinite(targetBalance.value)) return 'zero'
  if (diferencia.value > 0) return 'positive'
  if (diferencia.value < 0) return 'negative'
  return 'zero'
})

const canSubmit = computed(() =>
  Number.isFinite(targetBalance.value)
  && diferencia.value !== 0
  && motivoCode.value !== ''
  && !submitting.value,
)

// ── Motivos catalog (UX-facing) ──────────────────────────────────────────────
// Each motivo maps to a contraparte PUC code. The sign field decides which
// motivos are available based on whether saldo real > or < saldo libro.
interface Motivo {
  code: string
  label: string
  description: string
  contraparteCode: string
  pendingReview: boolean
  sign: 'positive' | 'negative'
}

const MOTIVOS: Motivo[] = [
  // Positive — saldo real > saldo libro (entró plata)
  {
    code: 'capital_aporte',
    label: 'Aporte de socio / capital',
    description: 'Un socio puso plata en la empresa',
    contraparteCode: '3105',
    pendingReview: false,
    sign: 'positive',
  },
  {
    code: 'prestamo',
    label: 'Préstamo recibido',
    description: 'Un banco o tercero le prestó al negocio',
    contraparteCode: '2105',
    pendingReview: false,
    sign: 'positive',
  },
  {
    code: 'saldo_historico',
    label: 'Saldo histórico que no había registrado',
    description: 'Plata que ya estaba antes de empezar a usar la plataforma',
    contraparteCode: '3705',
    pendingReview: false,
    sign: 'positive',
  },
  {
    code: 'cliente_directo',
    label: 'Cliente pagó directo al banco',
    description: 'Un cliente transfirió o consignó sin pasar por el POS',
    contraparteCode: '1305',
    pendingReview: false,
    sign: 'positive',
  },
  {
    code: 'no_seguro_positivo',
    label: 'No estoy seguro',
    description: 'Entró plata pero no sé exactamente de dónde — un contador lo revisará después',
    contraparteCode: '4295',
    pendingReview: true,
    sign: 'positive',
  },
  // Negative — saldo real < saldo libro (salió plata)
  {
    code: 'comision_bancaria',
    label: 'Comisión bancaria / GMF (4×1000)',
    description: 'El banco cobró comisiones, retención o GMF',
    contraparteCode: '5305',
    pendingReview: false,
    sign: 'negative',
  },
  {
    code: 'no_seguro_negativo',
    label: 'No estoy seguro',
    description: 'Salió plata pero no sé exactamente a dónde — un contador lo revisará después',
    contraparteCode: '5395',
    pendingReview: true,
    sign: 'negative',
  },
]

const availableMotivos = computed<Motivo[]>(() =>
  sign.value === 'zero' ? [] : MOTIVOS.filter(m => m.sign === sign.value),
)

const selectedMotivo = computed<Motivo | null>(
  () => MOTIVOS.find(m => m.code === motivoCode.value) ?? null,
)

// Reset motivo when sign changes (otherwise an invalid motivo could remain selected)
watch(sign, () => { motivoCode.value = '' })

// Reset entire form when panel closes/opens
watch(() => props.modelValue, (open) => {
  if (open) {
    targetBalanceInput.value = ''
    motivoCode.value = ''
    submitError.value = ''
  }
})

// Format COP on blur (don't reformat per keystroke — user-friendly typing)
const formatOnBlur = () => {
  if (!Number.isFinite(targetBalance.value)) return
  targetBalanceInput.value = formatCOP(targetBalance.value).replace(/\s/g, ' ')
}
const stripOnFocus = () => {
  if (!Number.isFinite(targetBalance.value)) return
  targetBalanceInput.value = String(targetBalance.value)
}

// ── Submit ───────────────────────────────────────────────────────────────────
//
// For an Activo (debit-normal) account "X" being adjusted:
//   - diferencia > 0 → DR X / CR contraparte (con monto = diferencia)
//   - diferencia < 0 → DR contraparte / CR X (con monto = abs(diferencia))
//
const submit = async () => {
  if (!canSubmit.value || !props.account || !selectedMotivo.value) return

  const contraparte = props.allAccounts.find(a => a.code === selectedMotivo.value!.contraparteCode)
  if (!contraparte) {
    submitError.value = `No se encontró la cuenta contraparte ${selectedMotivo.value.contraparteCode} en tu plan de cuentas. Contacta a soporte.`
    return
  }

  const monto = Math.abs(diferencia.value)
  const lines = sign.value === 'positive'
    ? [
        { accountId: props.account.id, debit: monto, credit: 0, description: 'Ajuste saldo (incremento)' },
        { accountId: contraparte.id,    debit: 0,     credit: monto, description: 'Contraparte ajuste saldo' },
      ]
    : [
        { accountId: contraparte.id,    debit: monto, credit: 0, description: 'Contraparte ajuste saldo' },
        { accountId: props.account.id,  debit: 0,     credit: monto, description: 'Ajuste saldo (decremento)' },
      ]

  const today = new Date().toISOString().slice(0, 10)
  const description = `Ajuste saldo ${props.account.code} ${props.account.name}: ${sign.value === 'positive' ? 'aumento' : 'disminución'} de ${formatCOP(monto)} — motivo: ${selectedMotivo.value.label}`

  submitting.value = true
  submitError.value = ''
  try {
    // 1) Create draft
    const created = await $fetch<{ success: boolean; data: { id: string } }>(
      '/api/accounting/journal-entries',
      {
        method: 'POST',
        body: {
          entryDate: today,
          description,
          reference: `BAL-ADJ-${props.account.code}-${Date.now().toString().slice(-6)}`,
          lines,
          sourceModule: 'manual_balance_adjustment',
          sourceId: props.account.id,
          pendingReview: selectedMotivo.value.pendingReview,
        },
      },
    )

    // 2) Post it (flips status='posted' and sets posted_at)
    if (created?.data?.id) {
      await $fetch(`/api/accounting/journal-entries/${created.data.id}/post`, {
        method: 'POST',
      })
    }

    emit('success')
    close()
  } catch (err: any) {
    submitError.value = err?.data?.detail || err?.data?.message || err?.message || 'Error al actualizar el saldo'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-40 bg-overlay-backdrop/40"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <!-- Panel: bottom sheet on mobile, slide-over on desktop -->
    <Transition name="panel">
      <div
        v-if="modelValue && account"
        role="dialog"
        aria-modal="true"
        :aria-label="`Actualizar saldo real de ${account?.name}`"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <!-- Mobile drag handle -->
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-surface-tertiary" aria-hidden="true" />
        </div>

        <!-- Header -->
        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  Actualizar saldo real
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5 truncate">
                  {{ account.code }} · {{ account.name }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="close"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <!-- Saldo en libros (read-only) -->
          <div class="rounded-xl border border-border bg-surface-secondary/30 px-4 py-3">
            <p class="text-xs uppercase tracking-wider text-text-secondary font-medium mb-1">
              Saldo en libros (actual)
            </p>
            <p class="text-xl font-bold text-text-primary">{{ formatCOP(bookBalance) }}</p>
          </div>

          <!-- Saldo real input -->
          <div class="flex flex-col gap-1.5">
            <label for="target-balance-input" class="text-sm font-semibold text-text-primary">
              ¿Cuánto tienes ahora mismo en esta cuenta?
            </label>
            <input
              id="target-balance-input"
              v-model="targetBalanceInput"
              type="text"
              inputmode="decimal"
              placeholder="$ 0"
              autocomplete="off"
              :disabled="submitting"
              class="min-h-[44px] px-3 rounded-lg border-2 border-border bg-surface text-text-primary text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50"
              @blur="formatOnBlur"
              @focus="stripOnFocus"
            />
            <p class="text-xs text-text-secondary leading-snug">
              Escribe el valor exacto que ves hoy en tu extracto, app del banco o conteo de caja.
            </p>
          </div>

          <!-- Diferencia calculated -->
          <div
            v-if="sign !== 'zero'"
            class="rounded-xl px-4 py-3 border-2"
            :class="sign === 'positive'
              ? 'border-state-success-border bg-state-success-bg'
              : 'border-state-warning-border bg-state-warning-bg'"
          >
            <p class="text-xs uppercase tracking-wider font-medium mb-1"
               :class="sign === 'positive' ? 'text-state-success-text' : 'text-state-warning-text'">
              Diferencia
            </p>
            <p class="text-2xl font-bold flex items-center gap-2"
               :class="sign === 'positive' ? 'text-state-success-text' : 'text-state-warning-text'">
              <svg v-if="sign === 'positive'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              {{ sign === 'positive' ? '+' : '−' }} {{ formatCOP(Math.abs(diferencia)) }}
            </p>
            <p class="text-xs leading-snug mt-1"
               :class="sign === 'positive' ? 'text-state-success-text/80' : 'text-state-warning-text/80'">
              {{ sign === 'positive'
                ? 'Tu cuenta tiene más plata que lo que dicen los libros.'
                : 'Tu cuenta tiene menos plata que lo que dicen los libros.' }}
            </p>
          </div>

          <!-- Motivo selector (only when sign known) -->
          <fieldset v-if="sign !== 'zero'" class="flex flex-col gap-2">
            <legend class="text-sm font-semibold text-text-primary mb-1">
              ¿Cuál fue el motivo?
            </legend>
            <label
              v-for="m in availableMotivos"
              :key="m.code"
              class="flex items-start gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors"
              :class="motivoCode === m.code
                ? 'border-primary bg-primary/5'
                : 'border-border bg-surface hover:border-primary/40 hover:bg-primary/5'"
            >
              <input
                v-model="motivoCode"
                type="radio"
                name="motivo"
                :value="m.code"
                :disabled="submitting"
                class="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary/30"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-text-primary leading-snug">
                  {{ m.label }}
                </p>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ m.description }}
                </p>
              </div>
            </label>
          </fieldset>

          <!-- Soft confirmation banner (when motivo selected) -->
          <div
            v-if="selectedMotivo"
            class="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <p class="text-xs uppercase tracking-wider text-primary font-medium mb-1.5">
              Confirmación
            </p>
            <p class="text-sm text-text-primary leading-relaxed">
              Vas a dejar el saldo de <strong>{{ account?.name }}</strong> en
              <strong>{{ formatCOP(targetBalance) }}</strong>. Esta acción crea un asiento contable.
              Para corregirlo deberás anularlo y crear uno nuevo.
            </p>
            <p
              v-if="selectedMotivo.pendingReview"
              class="text-xs text-state-warning-text leading-snug mt-2 flex items-start gap-1.5"
            >
              <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Marcaré este ajuste para que un contador lo revise. Si no tienes contador, revísalo antes de la próxima declaración fiscal.</span>
            </p>
          </div>

          <!-- Error -->
          <div v-if="submitError" class="rounded-xl border border-destructive/40 bg-destructive/8 px-4 py-3">
            <p class="text-sm text-destructive font-medium leading-snug">{{ submitError }}</p>
          </div>
        </div>

        <!-- Sticky footer -->
        <div class="flex-shrink-0 border-t border-border bg-surface px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            class="flex-1 min-h-[44px] rounded-lg border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            :disabled="submitting"
            @click="close"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="!canSubmit"
            class="flex-1 min-h-[44px] rounded-lg bg-action-primary-bg text-action-primary-text text-sm font-bold transition-colors hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="submit"
          >
            <UiLoadingDots v-if="submitting" size="8px" color="currentColor" />
            <template v-else>Actualizar saldo</template>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Slide-over transition: from-right on desktop, from-bottom on mobile */
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
