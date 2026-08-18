<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { computed, ref, watch } from 'vue'
import {
  BanknotesIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { mergePosPaymentGroupsFromApi, type PosPaymentGroup } from '~/utils/paymentDefaults'
import { notifyTableSessionUpdated } from '~/composables/useTableSessionSync'
import { isWompiPaymentMethod } from '~/utils/wompiCollections'

interface SessionAdvance {
  id: string
  amount_cop: number
  payment_method: string
  payment_method_id?: string | null
  notes?: string | null
  status: 'active' | 'voided'
  created_at?: string | null
}

interface MinimumConsumptionState {
  amount: number
  remaining: number
  covered: boolean
  advanceTotal?: number
  advance_total?: number
}

const props = defineProps<{
  modelValue: boolean
  tableId: string | null
  tableName?: string | null
  minimumConsumption?: MinimumConsumptionState | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const toast = useToast()
const amount = ref('')
const notes = ref('')
const selectedGroupSlug = ref('cash')
const selectedMethodId = ref<string | null>(null)
const paymentGroups = ref<PosPaymentGroup[]>([])
const advances = ref<SessionAdvance[]>([])
const loadingMethods = ref(false)
const loadingAdvances = ref(false)
const submitting = ref(false)
const voidingId = ref<string | null>(null)

const allowedPaymentGroups = computed(() =>
  paymentGroups.value.filter(group => ['cash', 'card', 'digital'].includes(group.slug)),
)

const selectedGroup = computed(() =>
  allowedPaymentGroups.value.find(group => group.slug === selectedGroupSlug.value) ?? allowedPaymentGroups.value[0] ?? null,
)

const amountNumber = computed(() => Number(amount.value || 0))
const amountInvalid = computed(() => !Number.isFinite(amountNumber.value) || amountNumber.value <= 0)
const requiresMethodSelection = computed(() => (selectedGroup.value?.methods?.length ?? 0) > 0 && !selectedMethodId.value)
const activeAdvanceTotal = computed(() =>
  advances.value
    .filter(advance => advance.status === 'active')
    .reduce((sum, advance) => sum + Number(advance.amount_cop || 0), 0),
)

const suggestedAmount = computed(() => {
  const state = props.minimumConsumption
  if (!state) return 0
  const remaining = Number(state.remaining) || 0
  return remaining > 0 ? remaining : Number(state.amount) || 0
})

const { formatCurrency } = useFormatters()

const methodLabel = (advance: SessionAdvance) => {
  const group = paymentGroups.value.find(g => g.slug === advance.payment_method)
  const method = group?.methods?.find(m => m.id === advance.payment_method_id)
  if (group && method) return `${group.name} · ${method.name}`
  if (group) return group.name
  return advance.payment_method
}

const close = () => {
  if (submitting.value || voidingId.value) return
  emit('update:modelValue', false)
}

const resetForm = () => {
  amount.value = suggestedAmount.value > 0 ? String(Math.round(suggestedAmount.value)) : ''
  notes.value = ''
  selectedGroupSlug.value = allowedPaymentGroups.value[0]?.slug ?? 'cash'
  selectedMethodId.value = null
}

const loadPaymentMethods = async () => {
  loadingMethods.value = true
  try {
    const res = await $fetch<{ success: boolean; data: PosPaymentGroup[] }>('/api/pos/payment-methods')
    paymentGroups.value = mergePosPaymentGroupsFromApi(res?.data ?? [])
    if (!allowedPaymentGroups.value.some(g => g.slug === selectedGroupSlug.value)) {
      selectedGroupSlug.value = allowedPaymentGroups.value[0]?.slug ?? 'cash'
    }
  } catch {
    paymentGroups.value = mergePosPaymentGroupsFromApi([])
  } finally {
    loadingMethods.value = false
  }
}

const loadAdvances = async () => {
  if (!props.tableId) return
  loadingAdvances.value = true
  try {
    const res = await $fetch<{ success: boolean; data: { advances: SessionAdvance[] } }>(
      `/api/tables/${props.tableId}/session-advances`,
    )
    advances.value = res?.data?.advances ?? []
  } catch (error: any) {
    advances.value = []
    toast.error(error?.data?.detail || t('pos.advance.loadError'), { title: 'Error' })
  } finally {
    loadingAdvances.value = false
  }
}

const refreshAfterMutation = async () => {
  if (!props.tableId) return
  await Promise.all([
    loadAdvances(),
    notifyTableSessionUpdated(props.tableId),
  ])
  emit('success')
}

const submit = async () => {
  if (!props.tableId || !selectedGroup.value || amountInvalid.value || requiresMethodSelection.value || submitting.value) return
  const method = selectedMethodId.value
    ? selectedGroup.value.methods?.find(item => item.id === selectedMethodId.value)
    : selectedGroup.value.methods?.[0]
  if (isWompiPaymentMethod(method) || isWompiPaymentMethod(selectedGroup.value)) {
    toast.error('Wompi se cobra al cerrar la cuenta, no como anticipo', { title: t('pos.advance.tableAdvance') })
    return
  }
  submitting.value = true
  try {
    await $fetch(`/api/tables/${props.tableId}/session-advances`, {
      method: 'POST',
      body: {
        amount_cop: Math.round(amountNumber.value),
        payment_method: selectedGroup.value.slug,
        payment_method_id: selectedMethodId.value,
        notes: notes.value.trim() || null,
      },
    })
    toast.success(t('pos.advance.registeredBy', { amount: formatCurrency(amountNumber.value) }), { title: t('pos.advance.tableAdvance') })
    resetForm()
    await refreshAfterMutation()
  } catch (error: any) {
    toast.error(error?.data?.detail || t('pos.advance.registerError'), { title: 'Error' })
  } finally {
    submitting.value = false
  }
}

const voidAdvance = async (advance: SessionAdvance) => {
  if (!props.tableId || voidingId.value) return
  voidingId.value = advance.id
  try {
    await $fetch(`/api/tables/${props.tableId}/session-advances/${advance.id}`, {
      method: 'DELETE',
      body: { reason: t('pos.advance.voidedFromPos') },
    })
    toast.success(t('pos.advance.voided'), { title: t('pos.advance.tableAdvance') })
    await refreshAfterMutation()
  } catch (error: any) {
    toast.error(error?.data?.detail || t('pos.advance.voidError'), { title: 'Error' })
  } finally {
    voidingId.value = null
  }
}

watch(() => selectedGroupSlug.value, () => {
  selectedMethodId.value = null
})

watch(() => props.modelValue, async (open) => {
  if (!open) return
  await loadPaymentMethods()
  resetForm()
  await loadAdvances()
})

watch(suggestedAmount, () => {
  if (props.modelValue && !amount.value) resetForm()
})
</script>

<template>
  <Teleport to="body">
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

    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="t('pos.advance.title')"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh] md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-sheet-border" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <BanknotesIcon class="h-[1em] w-[1em]" />
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">{{ t('pos.advance.titleShort') }}</h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5 truncate">
                  {{ tableName || t('pos.advance.activeTable') }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('pos.advance.closePanelAria')"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30"
              @click="close"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <form class="flex-1 overflow-y-auto px-6 py-5 space-y-5" @submit.prevent="submit">
          <div v-if="minimumConsumption" class="rounded-xl border border-border bg-surface-secondary/35 px-4 py-3 space-y-1">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-text-secondary">{{ t('pos.advance.minimum') }}</span>
              <span class="font-semibold text-text-primary tabular-nums">{{ formatCurrency(minimumConsumption.amount) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-text-secondary">{{ t('pos.advance.advanced') }}</span>
              <span class="font-semibold text-text-primary tabular-nums">{{ formatCurrency(activeAdvanceTotal) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-text-secondary">{{ t('pos.advance.status') }}</span>
              <span class="font-semibold tabular-nums" :class="minimumConsumption.covered ? 'text-state-success-text' : 'text-text-primary'">
                {{ minimumConsumption.covered ? t('pos.advance.covered') : t('pos.advance.remaining', { amount: formatCurrency(minimumConsumption.remaining) }) }}
              </span>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="advance-amount" class="text-sm font-medium text-text-primary">{{ t('pos.advance.amountCop') }}</label>
            <input
              id="advance-amount"
              v-model="amount"
              type="number"
              min="1"
              step="1000"
              inputmode="numeric"
              class="input-base w-full min-h-[44px] px-3 py-2 text-sm"
              :class="amountInvalid && amount ? 'border-state-danger-border' : ''"
              :disabled="submitting"
              placeholder="0"
            >
            <p v-if="amountInvalid && amount" class="text-xs text-state-danger-text">
              El monto debe ser mayor a cero.
            </p>
          </div>

          <div class="space-y-3">
            <label class="text-sm font-medium text-text-primary">{{ t('pos.advance.paymentMethod') }}</label>
            <div v-if="loadingMethods" class="grid grid-cols-3 gap-2">
              <div v-for="i in 3" :key="i" class="h-[68px] rounded-xl border border-border bg-surface-secondary animate-pulse" />
            </div>
            <div v-else class="grid grid-cols-3 gap-2">
              <button
                v-for="group in allowedPaymentGroups"
                :key="group.slug"
                type="button"
                class="min-h-[68px] rounded-xl border px-2 py-2 text-xs font-semibold transition-colors flex flex-col items-center justify-center gap-1.5"
                :class="selectedGroupSlug === group.slug
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-text-secondary hover:border-primary/30 hover:text-text-primary'"
                :disabled="submitting"
                @click="selectedGroupSlug = group.slug"
              >
                <BanknotesIcon v-if="group.slug === 'cash'" class="h-[1em] w-[1em]" />
                <CreditCardIcon v-else-if="group.slug === 'card'" class="h-[1em] w-[1em]" />
                <DevicePhoneMobileIcon v-else class="h-[1em] w-[1em]" />
                <span>{{ group.name }}</span>
              </button>
            </div>
          </div>

          <div v-if="selectedGroup?.methods?.length" class="space-y-2">
            <p class="text-xs font-semibold" :class="requiresMethodSelection ? 'text-state-danger-text' : 'text-text-secondary'">
              ¿Con cuál método de {{ selectedGroup.name }}?
            </p>
            <div class="rounded-xl border border-border bg-background overflow-hidden">
              <div class="max-h-[180px] overflow-y-auto divide-y divide-border">
                <button
                  v-for="method in selectedGroup.methods"
                  :key="method.id"
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors"
                  :class="selectedMethodId === method.id
                    ? 'bg-primary/8 text-primary font-semibold'
                    : 'text-text-primary hover:bg-surface-secondary/50'"
                  :disabled="submitting"
                  @click="selectedMethodId = selectedMethodId === method.id ? null : method.id"
                >
                  <span>{{ method.name }}</span>
                  <span v-if="selectedMethodId === method.id" class="h-2 w-2 rounded-full bg-primary" />
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="advance-notes" class="text-sm font-medium text-text-primary">{{ t('pos.advance.notes') }}</label>
            <textarea
              id="advance-notes"
              v-model="notes"
              rows="3"
              maxlength="500"
              class="input-base w-full px-3 py-2 text-sm resize-none"
              :disabled="submitting"
              :placeholder="t('pos.checkout.optional')"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-semibold text-text-primary">{{ t('pos.advance.history') }}</h3>
              <span class="text-xs text-text-secondary tabular-nums">{{ formatCurrency(activeAdvanceTotal) }}</span>
            </div>
            <div v-if="loadingAdvances" class="rounded-xl border border-border bg-surface-secondary p-4 text-sm text-text-secondary">
              {{ t('pos.advance.loading') }}
            </div>
            <div v-else-if="advances.length === 0" class="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-text-secondary">
              {{ t('pos.advance.empty') }}
            </div>
            <div v-else class="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
              <div
                v-for="advance in advances"
                :key="advance.id"
                class="flex items-center justify-between gap-3 px-4 py-3"
                :class="advance.status === 'voided' ? 'opacity-55' : ''"
              >
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-text-primary tabular-nums">
                    {{ formatCurrency(advance.amount_cop) }}
                  </p>
                  <p class="text-xs text-text-secondary truncate">
                    {{ methodLabel(advance) }}{{ advance.notes ? ` · ${advance.notes}` : '' }}
                  </p>
                </div>
                <button
                  v-if="advance.status === 'active'"
                  type="button"
                  class="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-status-error-text/30 text-status-error-text hover:bg-status-error-bg disabled:opacity-50"
                  :disabled="!!voidingId"
                  :aria-label="t('pos.advance.voidAdvance')"
                  @click="voidAdvance(advance)"
                >
                  <UiLoadingDots v-if="voidingId === advance.id" size="6px" />
                  <TrashIcon v-else class="h-4 w-4" />
                </button>
                <span v-else class="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{{ t('pos.advance.voided') }}</span>
              </div>
            </div>
          </div>
        </form>

        <div class="flex-shrink-0 border-t border-border bg-surface-secondary/40 px-6 py-4">
          <button
            type="button"
            class="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-action-primary-bg px-4 py-2 text-sm font-semibold text-action-primary-text transition-colors hover:bg-action-primary-hover-bg disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="submitting || loadingMethods || amountInvalid || requiresMethodSelection || !selectedGroup"
            @click="submit"
          >
            <UiLoadingDots v-if="submitting" size="8px" color="currentColor" />
            <template v-else>
              <PlusIcon class="h-[1em] w-[1em]" />
              {{ t('pos.advance.register') }}
            </template>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
