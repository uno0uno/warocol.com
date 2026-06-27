<template>
  <div class="overflow-hidden rounded-xl border border-border bg-surface theme-transition">

    <!-- Contenido -->
    <div class="px-3 pt-2.5 pb-2">
      <div class="flex items-start gap-2">
        <div class="inline-flex h-6 min-w-[1.5rem] flex-none items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none tabular-nums text-primary-foreground">
          {{ orderNumber }}
        </div>

        <div class="min-w-0 flex-1">
          <!-- Fila 1: nombre + badges inline | stack de precios -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <p class="text-sm font-medium leading-snug text-text-primary">
                  {{ item.product.name }}
                </p>
                <span
                  v-if="item.fulfillmentStatus === 'new' && showFulfillmentStatus"
                  class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-state-warning-text bg-state-warning-bg  "
                >Sin enviar</span>
                <span
                  v-else-if="item.fulfillmentStatus && item.fulfillmentStatus !== 'new'"
                  class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  :class="{
                    'bg-state-info-bg text-state-info-text  ': item.fulfillmentStatus === 'sent',
                    'bg-state-warning-bg text-state-warning-text': item.fulfillmentStatus === 'preparing',
                    'bg-state-success-bg text-state-success-text': item.fulfillmentStatus === 'ready',
                    'bg-status-chip-bg text-status-chip-text': item.fulfillmentStatus === 'delivered' || item.fulfillmentStatus === 'cancelled',
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
                  class="shrink-0 max-w-full rounded px-2 py-0.5 text-[10px] font-semibold leading-tight text-badge-success-text bg-badge-success-bg"
                  :title="promoTitle || promoLabel"
                >{{ promoLabel }}</span>
              </div>
              <p v-if="item.sentAt" class="mt-0.5 text-[10px] text-text-tertiary">Fuego: {{ formatTime(item.sentAt) }}</p>
            </div>

            <div class="shrink-0 text-right leading-tight">
              <p
                v-if="promoSavings > 0"
                class="text-[11px] line-through text-text-tertiary tabular-nums"
              >{{ formatCurrency(displayGrossTotal) }}</p>
              <p
                class="text-sm font-bold tabular-nums"
                :class="promoSavings > 0 ? 'text-primary' : 'text-text-primary'"
              >{{ formatCurrency(netTotal) }}</p>
              <p
                v-if="promoSavings > 0"
                class="mt-0.5 text-[10px] font-semibold tabular-nums text-state-success-text"
              >-{{ formatCurrency(promoSavings) }}</p>
            </div>
          </div>

          <!-- Fila 2: precio unitario (Figma: tachado + neto c/u) -->
          <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0 text-xs tabular-nums">
            <template v-if="promoSavings > 0 && item.quantity > 0">
              <span class="line-through text-text-tertiary">{{ formatCurrency(unitGross) }}</span>
              <span class="font-semibold text-text-secondary">{{ formatCurrency(unitNet) }} c/u</span>
            </template>
            <span v-else class="font-semibold text-text-secondary">{{ formatCurrency(Number(item.product.price)) }} c/u</span>
          </p>

          <div v-if="item.modifiers.length > 0 || item.notes" class="mt-1 space-y-0.5">
            <div v-for="mod in item.modifiers" :key="mod.id" class="flex justify-between gap-2 text-[11px]">
              <span class="min-w-0 truncate text-text-tertiary">+ {{ mod.name }}<template v-if="(mod.quantity ?? 1) > 1"> ×{{ mod.quantity }}</template></span>
              <span class="shrink-0 tabular-nums text-text-secondary">{{ formatCurrency(Number(mod.price) * (mod.quantity ?? 1)) }}</span>
            </div>
            <p v-if="item.notes" class="text-[11px] italic text-text-tertiary">Nota: {{ item.notes }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Barra de acciones -->
    <div
      v-if="!hideLineControls"
      class="flex items-center justify-between gap-2 border-t border-border bg-surface-secondary/30 px-2.5 py-1.5"
    >
      <div class="flex h-8 items-stretch rounded-lg border border-border bg-surface max-lg:h-11">
        <button
          type="button"
          class="cart-item-tool rounded-l-lg text-text-secondary transition-colors hover:bg-primary/5 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="item.quantity <= 1"
          aria-label="Reducir cantidad"
          @click.stop="$emit('decrement')"
        >
          <MinusIcon class="cart-item-icon" aria-hidden="true" />
        </button>
        <span class="flex min-w-[1.75rem] items-center justify-center border-x border-border px-1 text-xs font-semibold tabular-nums text-text-primary">
          {{ item.quantity }}
        </span>
        <button
          v-if="!lockIncrement"
          type="button"
          class="cart-item-tool rounded-r-lg text-text-secondary transition-colors hover:bg-primary/5 hover:text-text-primary"
          aria-label="Aumentar cantidad"
          @click.stop="$emit('increment')"
        >
          <PlusIcon class="cart-item-icon" aria-hidden="true" />
        </button>
        <span
          v-else
          class="cart-item-tool rounded-r-lg"
          aria-hidden="true"
        />
      </div>

      <div class="flex items-center gap-1">
        <button
          v-if="!hideDuplicate"
          type="button"
          class="cart-item-tool rounded-lg text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="Duplicar ítem"
          @click.stop="$emit('duplicate')"
        >
          <DocumentDuplicateIcon class="cart-item-icon" aria-hidden="true" />
        </button>

        <button
          v-if="!hideEdit && !item.is_resale && !item.is_open_sale"
          type="button"
          class="cart-item-tool rounded-lg text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
          aria-label="Editar ítem"
          @click.stop="$emit('edit')"
        >
          <PencilSquareIcon class="cart-item-icon" aria-hidden="true" />
        </button>

        <button
          type="button"
          class="cart-item-tool rounded-lg text-text-secondary transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Eliminar ítem"
          @click.stop="$emit('remove')"
        >
          <TrashIcon class="cart-item-icon" aria-hidden="true" />
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  MinusIcon,
  PlusIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'

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
  promoSavings?: number
  grossTotal?: number | null
  hideEdit?: boolean
  hideDuplicate?: boolean
  hideEditDuplicate?: boolean
  lockIncrement?: boolean
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

const { timezone } = useTenantTimezone()
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
    timeZone: timezone.value,
  })
}
</script>

<style scoped>
.cart-item-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
}

.cart-item-icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 1023px) {
  .cart-item-tool {
    width: 2.75rem;
    height: 2.75rem;
  }

  .cart-item-icon {
    width: 1.25rem;
    height: 1.25rem;
  }
}
</style>
