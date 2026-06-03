<template>
  <div class="rounded-2xl border-2 border-violet-200 bg-violet-50/80 p-5 theme-transition dark:border-violet-800/50 dark:bg-violet-950/20">

    <!-- Header: badge + name/status + price -->
    <div class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
        {{ orderNumber }}
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p class="text-lg font-bold leading-7 text-text-primary">{{ item.product.name }}</p>

          <span
            v-if="item.fulfillmentStatus === 'new' && showFulfillmentStatus"
            class="rounded px-3 py-0.5 text-sm font-semibold uppercase tracking-tight text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
          >Sin enviar</span>
          <span
            v-else-if="item.fulfillmentStatus && item.fulfillmentStatus !== 'new'"
            class="rounded px-3 py-0.5 text-sm font-semibold uppercase tracking-tight"
            :class="{
              'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': item.fulfillmentStatus === 'sent',
              'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400': item.fulfillmentStatus === 'preparing',
              'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400': item.fulfillmentStatus === 'ready',
              'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400': item.fulfillmentStatus === 'delivered' || item.fulfillmentStatus === 'cancelled',
            }"
          >
            {{
              item.fulfillmentStatus === 'sent' ? 'En cocina' :
              item.fulfillmentStatus === 'preparing' ? 'Preparando' :
              item.fulfillmentStatus === 'ready' ? 'Listo' :
              item.fulfillmentStatus === 'delivered' ? 'Entregado' : item.fulfillmentStatus
            }}
          </span>

          <span
            v-if="promoLabel"
            class="rounded px-3 py-0.5 text-sm font-semibold text-white bg-emerald-500 flex-shrink-0"
            :title="promoTitle || promoLabel"
          >{{ promoLabel }}</span>
        </div>

        <p v-if="item.sentAt" class="mt-0.5 text-xs text-text-tertiary">Fuego: {{ formatTime(item.sentAt) }}</p>

        <div class="mt-1 flex flex-wrap items-center gap-2">
          <template v-if="promoSavings > 0 && item.quantity > 0">
            <span class="text-base line-through text-text-tertiary tabular-nums">{{ formatCurrency(unitGross) }}</span>
            <span class="text-base font-semibold text-text-secondary tabular-nums">{{ formatCurrency(unitNet) }} c/u</span>
          </template>
          <span v-else class="text-base font-semibold text-text-secondary tabular-nums">
            {{ formatCurrency(Number(item.product.price)) }} c/u
          </span>
        </div>

        <div v-if="item.modifiers.length > 0 || item.notes" class="mt-1.5 space-y-0.5">
          <div v-for="mod in item.modifiers" :key="mod.id" class="flex justify-between gap-2 text-sm">
            <span class="text-text-tertiary">+ {{ mod.name }}<template v-if="(mod.quantity ?? 1) > 1"> ×{{ mod.quantity }}</template></span>
            <span class="shrink-0 tabular-nums text-text-secondary">{{ formatCurrency(Number(mod.price) * (mod.quantity ?? 1)) }}</span>
          </div>
          <p v-if="item.notes" class="text-sm italic text-text-tertiary">Nota: {{ item.notes }}</p>
        </div>
      </div>

      <div class="ml-1 flex shrink-0 flex-col items-end">
        <p
          v-if="promoSavings > 0"
          class="text-lg line-through text-text-tertiary tabular-nums"
        >{{ formatCurrency(displayGrossTotal) }}</p>
        <p class="text-2xl font-bold tabular-nums text-primary">{{ formatCurrency(netTotal) }}</p>
        <p
          v-if="promoSavings > 0"
          class="text-sm font-semibold tabular-nums text-emerald-500"
        >-{{ formatCurrency(promoSavings) }}</p>
      </div>
    </div>

    <!-- Controls: qty stepper + actions -->
    <div v-if="!hideLineControls" class="mt-3 flex items-center gap-2">
      <div class="flex items-center rounded-[14px] border-2 border-border bg-white p-0.5 dark:bg-surface">
        <button
          type="button"
          class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="item.quantity <= 1"
          aria-label="Reducir cantidad"
          @click.stop="$emit('decrement')"
        >
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <span class="min-w-[2.5rem] text-center text-xl font-bold tabular-nums text-text-primary">{{ item.quantity }}</span>
        <button
          v-if="!lockIncrement"
          type="button"
          class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-violet-50"
          aria-label="Aumentar cantidad"
          @click.stop="$emit('increment')"
        >
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div class="flex-1" />

      <div class="flex items-center gap-2">
        <button
          v-if="!hideDuplicate"
          type="button"
          class="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[14px] border-2 border-violet-200 bg-white text-primary transition-colors hover:bg-violet-50 dark:border-violet-800 dark:bg-surface"
          aria-label="Duplicar ítem"
          @click.stop="$emit('duplicate')"
        >
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
          </svg>
        </button>

        <button
          v-if="!hideEdit && !item.is_resale && !item.is_open_sale"
          type="button"
          class="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[14px] border-2 border-violet-200 bg-white text-primary transition-colors hover:bg-violet-50 dark:border-violet-800 dark:bg-surface"
          aria-label="Editar ítem"
          @click.stop="$emit('edit')"
        >
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </button>

        <button
          type="button"
          class="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[14px] border-2 border-red-200 bg-white text-red-500 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-surface"
          aria-label="Eliminar ítem"
          @click.stop="$emit('remove')"
        >
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface CartItem {
  product: {
    id: string
    name: string
    price: number
    image: string
    category: string
  }
  modifiers: Array<{ id: string; name: string; price: number; quantity?: number }>
  quantity: number
  notes?: string
  is_resale?: boolean
  is_open_sale?: boolean
  fulfillmentStatus?: 'new' | 'sent' | 'hold' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  sentAt?: string | null
}

interface Props {
  item: CartItem
  orderNumber: number
  showFulfillmentStatus?: boolean
  promoLabel?: string | null
  promoTitle?: string | null
  /** COP discount for this line (from API preview or client eval). */
  promoSavings?: number
  /** When set, overrides computed gross (e.g. mesa tab subtotal). */
  grossTotal?: number | null
  /** Tab lines: hide edit/duplicate (modifiers locked once on the tab). */
  hideEdit?: boolean
  hideDuplicate?: boolean
  /** @deprecated use hideEdit / hideDuplicate */
  hideEditDuplicate?: boolean
  /** Fired to kitchen: block qty + (edit/duplicate via hideEditDuplicate). */
  lockIncrement?: boolean
  /** Hide entire action row (e.g. delivered/cancelled). */
  hideLineControls?: boolean
}

interface Emits {
  (e: 'edit'): void
  (e: 'remove'): void
  (e: 'increment'): void
  (e: 'decrement'): void
  (e: 'duplicate'): void
}

const props = withDefaults(defineProps<Props>(), {
  showFulfillmentStatus: false,
  promoSavings: 0,
  grossTotal: null,
  hideEdit: false,
  hideDuplicate: false,
  hideEditDuplicate: false,
  lockIncrement: false,
  hideLineControls: false,
})
defineEmits<Emits>()

const hideEdit = computed(() => props.hideEdit || props.hideEditDuplicate)
const hideDuplicate = computed(() => props.hideDuplicate || props.hideEditDuplicate)

const itemTotal = computed(() => {
  const basePrice = Number(props.item.product.price) || 0
  const modifiersPrice = props.item.modifiers.reduce(
    (sum, mod) => sum + Number(mod.price) * (mod.quantity ?? 1),
    0,
  )
  return (basePrice + modifiersPrice) * Number(props.item.quantity)
})

const displayGrossTotal = computed(() =>
  props.grossTotal != null && props.grossTotal > 0 ? props.grossTotal : itemTotal.value,
)

const promoSavings = computed(() => Math.max(0, Number(props.promoSavings) || 0))

const netTotal = computed(() =>
  Math.max(0, displayGrossTotal.value - promoSavings.value),
)

const unitGross = computed(() => {
  const qty = Number(props.item.quantity) || 1
  return displayGrossTotal.value / qty
})

const unitNet = computed(() => {
  const qty = Number(props.item.quantity) || 1
  return netTotal.value / qty
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
