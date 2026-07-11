<template>
  <UiModal :model-value="open" :title="title" @update:model-value="$emit('update:open', $event)">
    <component :is="contentTemplate" />
  </UiModal>
  <UiBottomSheetModal :model-value="open" :title="title" @update:model-value="$emit('update:open', $event)">
    <component :is="contentTemplate" />
  </UiBottomSheetModal>
</template>

<script setup lang="ts">
const { t } = useI18n()
import { computed, h, ref, watch } from 'vue'
import {
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/vue/24/outline'

interface Customer {
  email?: string | null
  phone?: string | null
  name?: string | null
}

interface Props {
  open: boolean
  orderId: string
  invoiceLabel: string  // e.g. "LZT-5462" for the in-modal copy
  customer: Customer | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'sent', email: string): void
}>()

const title = computed(() => t('ventas.emailModal.title'))

// warocol.com#603 — A profile is "generic" (no useful email to prefill)
// when either the phone is '0000000000' (per-tenant default Genérico) OR
// the email ends in '@customer.temp' (auto-created POS walk-in). Both
// signals are used elsewhere in the codebase — see
// pages/pos/checkout.vue:440,614.
const isGenericCustomer = computed(() => {
  const c = props.customer
  if (!c) return true
  const phoneIsZero = (c.phone ?? '') === '0000000000'
  const tempEmail = (c.email ?? '').toLowerCase().endsWith('@customer.temp')
  return phoneIsZero || tempEmail
})

const customerEmail = computed(() => props.customer?.email ?? '')

type Mode = 'customer' | 'custom'
const mode = ref<Mode>('customer')
const customEmail = ref('')

type State = 'idle' | 'sending' | 'sent' | 'error'
const state = ref<State>('idle')
const errorMessage = ref('')
const sentToEmail = ref('')

const resetForm = () => {
  state.value = 'idle'
  errorMessage.value = ''
  sentToEmail.value = ''
  if (isGenericCustomer.value) {
    mode.value = 'custom'
    customEmail.value = ''
  } else {
    mode.value = 'customer'
    customEmail.value = customerEmail.value
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) resetForm()
})

const recipientForMode = computed(() =>
  mode.value === 'customer' ? customerEmail.value : customEmail.value,
)

const canSubmit = computed(() => {
  if (state.value === 'sending') return false
  if (mode.value === 'customer') return !!customerEmail.value
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail.value)
})

const submit = async () => {
  if (!canSubmit.value) return
  state.value = 'sending'
  errorMessage.value = ''
  try {
    await $fetch(`/api/orders/${props.orderId}/invoice/send-email`, {
      method: 'POST',
      body: { email: recipientForMode.value },
    })
    sentToEmail.value = recipientForMode.value
    state.value = 'sent'
    emit('sent', sentToEmail.value)
  } catch (e: any) {
    state.value = 'error'
    const detail = e?.data?.detail
    if (Array.isArray(detail)) {
      errorMessage.value = detail.map((d: any) => d?.msg || JSON.stringify(d)).join(', ')
    } else if (typeof detail === 'string') {
      errorMessage.value = detail
    } else {
      errorMessage.value = e?.message || t('ventas.emailModal.sendError')
    }
  }
}

// warocol.com#603 — preserve the last-typed email when going back to the
// form (the v0 in #598 cleared it, forcing the operator to retype).
const sendAnother = () => {
  state.value = 'idle'
  errorMessage.value = ''
}

const cancel = () => emit('update:open', false)

// Shared form/success body rendered once per breakpoint (Modal + BottomSheet
// both mount but each is hidden at the wrong viewport via internal classes).
const contentTemplate = () =>
  h('div', { class: 'p-5 sm:p-6 space-y-5' }, [
    // ─── Success ────────────────────────────────────────────────────────────
    state.value === 'sent'
      ? h('div', { class: 'space-y-4' }, [
          h(
            'div',
            { class: 'flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-700/40 dark:bg-green-900/20' },
            [
              h(CheckCircleIcon, { class: 'w-5 h-5 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5', 'aria-hidden': 'true' }),
              h('div', { class: 'min-w-0' }, [
                h('p', { class: 'text-sm font-semibold text-green-900 dark:text-green-200' }, t('ventas.emailModal.sentTitle')),
                h(
                  'p',
                  { class: 'text-xs text-green-800 dark:text-green-300 mt-0.5 leading-snug break-all' },
                  t('ventas.emailModal.sentBody', { label: props.invoiceLabel, email: sentToEmail.value }),
                ),
              ]),
            ],
          ),
          h('div', { class: 'flex flex-col sm:flex-row gap-2 sm:justify-end' }, [
            h(
              'button',
              {
                onClick: cancel,
                class: 'order-2 sm:order-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors',
              },
              t('common.close'),
            ),
            h(
              'button',
              {
                onClick: sendAnother,
                class: 'order-1 sm:order-2 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
              },
              t('ventas.emailModal.sendAnother'),
            ),
          ]),
        ])
      : null,

    // ─── Form (idle / sending / error) ──────────────────────────────────────
    state.value !== 'sent'
      ? h('div', { class: 'space-y-4' }, [
          h(
            'div',
            { class: 'rounded-xl border border-border bg-surface-secondary/60 p-3' },
            [
              h('p', { class: 'text-sm font-semibold text-text-primary' }, t('ventas.emailModal.invoiceLabel', { label: props.invoiceLabel })),
              h(
                'p',
                { class: 'text-xs text-text-secondary mt-1 leading-snug' },
                t('ventas.emailModal.intro'),
              ),
            ],
          ),

          // Generic-customer hint banner
          isGenericCustomer.value
            ? h(
                'div',
                { class: 'flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/40 dark:bg-amber-900/20' },
                [
                  h(ExclamationTriangleIcon, { class: 'w-4 h-4 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5', 'aria-hidden': 'true' }),
                  h(
                    'p',
                    { class: 'text-xs text-amber-800 dark:text-amber-300 leading-snug' },
                    t('ventas.emailModal.genericCustomer'),
                  ),
                ],
              )
            : null,

          // Option 1 — customer email (real customers only)
          !isGenericCustomer.value
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: () => { mode.value = 'customer' },
                  class: [
                    'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all min-h-[44px]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    mode.value === 'customer'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/30 hover:bg-surface-secondary/60',
                  ],
                  'aria-pressed': mode.value === 'customer',
                },
                [
                  h(
                    'span',
                    {
                      class: [
                        'mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors',
                        mode.value === 'customer' ? 'border-primary bg-primary' : 'border-border bg-background',
                      ],
                      'aria-hidden': 'true',
                    },
                  ),
                  h('div', { class: 'min-w-0 flex-1' }, [
                    h('p', { class: 'text-sm font-semibold text-text-primary' }, t('ventas.emailModal.customerEmail')),
                    h(
                      'p',
                      { class: 'text-xs text-text-secondary mt-0.5 break-all' },
                      customerEmail.value,
                    ),
                  ]),
                ],
              )
            : null,

          // Option 2 — custom email
          !isGenericCustomer.value
            ? h(
                'button',
                {
                  type: 'button',
                  onClick: () => { mode.value = 'custom' },
                  class: [
                    'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all min-h-[44px]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    mode.value === 'custom'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/30 hover:bg-surface-secondary/60',
                  ],
                  'aria-pressed': mode.value === 'custom',
                },
                [
                  h(
                    'span',
                    {
                      class: [
                        'mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 transition-colors',
                        mode.value === 'custom' ? 'border-primary bg-primary' : 'border-border bg-background',
                      ],
                      'aria-hidden': 'true',
                    },
                  ),
                  h('div', { class: 'min-w-0 flex-1' }, [
                    h('p', { class: 'text-sm font-semibold text-text-primary' }, t('ventas.emailModal.accountingEmail')),
                    h(
                      'p',
                      { class: 'text-xs text-text-secondary mt-0.5' },
                      t('ventas.emailModal.otherRecipient'),
                    ),
                  ]),
                ],
              )
            : null,

          // Custom input (visible when custom mode OR generic customer)
          mode.value === 'custom' || isGenericCustomer.value
            ? h('div', { class: 'flex flex-col gap-1.5' }, [
                h(
                  'label',
                  { for: 'invoice-email-custom', class: 'text-sm font-medium text-text-primary' },
                  'Correo del destinatario',
                ),
                h('input', {
                  id: 'invoice-email-custom',
                  type: 'email',
                  inputmode: 'email',
                  autocomplete: 'email',
                  placeholder: 'contador@empresa.com',
                  value: customEmail.value,
                  onInput: (e: Event) => { customEmail.value = (e.target as HTMLInputElement).value },
                  class: 'min-h-[44px] px-3 py-2 border border-border rounded-xl text-sm bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                }),
              ])
            : null,

          // Error
          state.value === 'error' && errorMessage.value
            ? h(
                'div',
                { class: 'flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-destructive', role: 'alert' },
                [
                  h(ExclamationTriangleIcon, { class: 'w-4 h-4 flex-shrink-0 mt-0.5', 'aria-hidden': 'true' }),
                  h('p', { class: 'text-xs leading-snug break-words' }, errorMessage.value),
                ],
              )
            : null,

          // Actions
          h('div', { class: 'flex flex-col sm:flex-row gap-2 sm:justify-end pt-2' }, [
            h(
              'button',
              {
                onClick: cancel,
                disabled: state.value === 'sending',
                class: 'order-2 sm:order-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold bg-surface border border-border text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              },
              t('ventas.emailModal.cancel'),
            ),
            h(
              'button',
              {
                onClick: submit,
                disabled: !canSubmit.value,
                class: 'order-1 sm:order-2 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
              },
              state.value === 'sending'
                ? t('ventas.emailModal.sending')
                : [h(EnvelopeIcon, { class: 'w-4 h-4', 'aria-hidden': 'true' }), t('ventas.emailModal.send')],
            ),
          ]),
        ])
      : null,
  ])
</script>
