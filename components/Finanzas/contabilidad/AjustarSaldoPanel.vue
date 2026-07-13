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
const { t } = useI18n({ useScope: 'global' })
const { todayISO } = useTenantTimezone()
const { formatCurrency } = useFormatters()

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatCOP = (v: number) => formatCurrency(v ?? 0)

const close = () => emit('update:modelValue', false)

// ── Form state ───────────────────────────────────────────────────────────────
const targetBalanceInput = ref<string>('')
const reasonCode = ref<string>('')
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
  && reasonCode.value !== ''
  && !submitting.value,
)

// ── Motivos catalog (UX-facing) ──────────────────────────────────────────────
// Each reason maps to a counterpart PUC code. The sign field decides which
// options are available based on whether real balance is above or below books.
interface Motivo {
  code: string
  contraparteCode: string
  pendingReview: boolean
  sign: 'positive' | 'negative'
}

const REASONS: Motivo[] = [
  // Positive: real balance > book balance.
  {
    code: 'capital_aporte',
    contraparteCode: '3105',
    pendingReview: false,
    sign: 'positive',
  },
  {
    code: 'prestamo',
    contraparteCode: '2105',
    pendingReview: false,
    sign: 'positive',
  },
  {
    code: 'saldo_historico',
    contraparteCode: '3705',
    pendingReview: false,
    sign: 'positive',
  },
  {
    code: 'cliente_directo',
    contraparteCode: '1305',
    pendingReview: false,
    sign: 'positive',
  },
  {
    code: 'no_seguro_positivo',
    contraparteCode: '4295',
    pendingReview: true,
    sign: 'positive',
  },
  // Negative: real balance < book balance.
  {
    code: 'comision_bancaria',
    contraparteCode: '5305',
    pendingReview: false,
    sign: 'negative',
  },
  {
    code: 'no_seguro_negativo',
    contraparteCode: '5395',
    pendingReview: true,
    sign: 'negative',
  },
]

const availableReasons = computed<Motivo[]>(() =>
  sign.value === 'zero' ? [] : REASONS.filter(m => m.sign === sign.value),
)

const selectedReason = computed<Motivo | null>(
  () => REASONS.find(m => m.code === reasonCode.value) ?? null,
)
const reasonLabel = (code: string) => t(`finanzas.contabilidad.balanceAdjust.reasons.${code}.label`)
const reasonDescription = (code: string) => t(`finanzas.contabilidad.balanceAdjust.reasons.${code}.description`)

// Reset reason when sign changes, otherwise an invalid option could remain selected.
watch(sign, () => { reasonCode.value = '' })

// Reset entire form when panel closes/opens
watch(() => props.modelValue, (open) => {
  if (open) {
    targetBalanceInput.value = ''
    reasonCode.value = ''
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
  if (!canSubmit.value || !props.account || !selectedReason.value) return

  const contraparte = props.allAccounts.find(a => a.code === selectedReason.value!.contraparteCode)
  if (!contraparte) {
    submitError.value = t('finanzas.contabilidad.balanceAdjust.counterpartNotFound', { code: selectedReason.value.contraparteCode })
    return
  }

  const monto = Math.abs(diferencia.value)
  const lines = sign.value === 'positive'
    ? [
        { accountId: props.account.id, debit: monto, credit: 0, description: t('finanzas.contabilidad.balanceAdjust.lineIncrease') },
        { accountId: contraparte.id,    debit: 0,     credit: monto, description: t('finanzas.contabilidad.balanceAdjust.lineCounterpart') },
      ]
    : [
        { accountId: contraparte.id,    debit: monto, credit: 0, description: t('finanzas.contabilidad.balanceAdjust.lineCounterpart') },
        { accountId: props.account.id,  debit: 0,     credit: monto, description: t('finanzas.contabilidad.balanceAdjust.lineDecrease') },
      ]

  const today = todayISO()
  const description = t('finanzas.contabilidad.balanceAdjust.entryDescription', {
    code: props.account.code,
    name: props.account.name,
    direction: sign.value === 'positive'
      ? t('finanzas.contabilidad.balanceAdjust.increase')
      : t('finanzas.contabilidad.balanceAdjust.decrease'),
    amount: formatCOP(monto),
    reason: reasonLabel(selectedReason.value.code),
  })

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
          pendingReview: selectedReason.value.pendingReview,
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
    submitError.value = err?.data?.detail || err?.data?.message || err?.message || t('finanzas.contabilidad.balanceAdjust.updateError')
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
        :aria-label="t('finanzas.contabilidad.updateRealBalanceOf', { name: account?.name })"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
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
                  {{ t('finanzas.contabilidad.updateRealBalance') }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5 truncate">
                  {{ account.code }} · {{ account.name }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('finanzas.common.closePanel')"
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

          <!-- Book balance (read-only) -->
          <div class="rounded-xl border border-border bg-surface-secondary/30 px-4 py-3">
            <p class="text-xs uppercase tracking-wider text-text-secondary font-medium mb-1">
              {{ t('finanzas.contabilidad.balanceAdjust.bookBalance') }}
            </p>
            <p class="text-xl font-bold text-text-primary">{{ formatCOP(bookBalance) }}</p>
          </div>

          <!-- Saldo real input -->
          <div class="flex flex-col gap-1.5">
            <label for="target-balance-input" class="text-sm font-semibold text-text-primary">
              {{ t('finanzas.contabilidad.balanceAdjust.targetQuestion') }}
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
              {{ t('finanzas.contabilidad.balanceAdjust.targetHelp') }}
            </p>
          </div>

          <!-- Calculated difference -->
          <div
            v-if="sign !== 'zero'"
            class="rounded-xl px-4 py-3 border-2"
            :class="sign === 'positive'
              ? 'border-state-success-border bg-state-success-bg'
              : 'border-state-warning-border bg-state-warning-bg'"
          >
            <p class="text-xs uppercase tracking-wider font-medium mb-1"
               :class="sign === 'positive' ? 'text-state-success-text' : 'text-state-warning-text'">
              {{ t('finanzas.common.difference') }}
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
                ? t('finanzas.contabilidad.balanceAdjust.moreThanBooks')
                : t('finanzas.contabilidad.balanceAdjust.lessThanBooks') }}
            </p>
          </div>

          <!-- Motivo selector (only when sign known) -->
          <fieldset v-if="sign !== 'zero'" class="flex flex-col gap-2">
            <legend class="text-sm font-semibold text-text-primary mb-1">
              {{ t('finanzas.contabilidad.balanceAdjust.reasonQuestion') }}
            </legend>
            <label
              v-for="m in availableReasons"
              :key="m.code"
              class="flex items-start gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors"
              :class="reasonCode === m.code
                ? 'border-primary bg-primary/5'
                : 'border-border bg-surface hover:border-primary/40 hover:bg-primary/5'"
            >
              <input
                v-model="reasonCode"
                type="radio"
                name="reason"
                :value="m.code"
                :disabled="submitting"
                class="mt-1 h-4 w-4 text-primary focus:ring-2 focus:ring-primary/30"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-text-primary leading-snug">
                  {{ reasonLabel(m.code) }}
                </p>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ reasonDescription(m.code) }}
                </p>
              </div>
            </label>
          </fieldset>

          <!-- Soft confirmation banner (when a reason is selected) -->
          <div
            v-if="selectedReason"
            class="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <p class="text-xs uppercase tracking-wider text-primary font-medium mb-1.5">
              {{ t('finanzas.contabilidad.confirmation') }}
            </p>
            <p class="text-sm text-text-primary leading-relaxed">
              {{ t('finanzas.contabilidad.balanceAdjust.confirmPrefix') }} <strong>{{ account?.name }}</strong>
              {{ t('finanzas.contabilidad.balanceAdjust.confirmMiddle') }}
              <strong>{{ formatCOP(targetBalance) }}</strong>. {{ t('finanzas.contabilidad.balanceAdjust.confirmSuffix') }}
            </p>
            <p
              v-if="selectedReason.pendingReview"
              class="text-xs text-state-warning-text leading-snug mt-2 flex items-start gap-1.5"
            >
              <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{{ t('finanzas.contabilidad.balanceAdjust.reviewWarning') }}</span>
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
            {{ t('finanzas.common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="!canSubmit"
            class="flex-1 min-h-[44px] rounded-lg bg-action-primary-bg text-action-primary-text text-sm font-bold transition-colors hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            @click="submit"
          >
            <UiLoadingDots v-if="submitting" size="8px" color="currentColor" />
            <template v-else>{{ t('finanzas.contabilidad.updateBalance') }}</template>
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
