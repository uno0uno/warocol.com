<template>
  <div class="px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
    <div class="flex gap-4 justify-between">

      <!-- Product Info -->
      <div class="flex-1 min-w-0">
        <h4 class="text-base font-semibold text-foreground mb-2">{{ item.product_name }}</h4>

        <!-- Modifiers -->
        <div v-if="item.modifiers.length > 0" class="flex flex-col space-y-0.5 mb-2">
          <div
            v-for="modifier in item.modifiers"
            :key="modifier.id"
            class="flex justify-between text-xs text-muted-foreground"
          >
            <span>
              + {{ modifier.name }}
              <span v-if="modifier.quantity && modifier.quantity > 1" class="font-medium">
                x{{ modifier.quantity }}
              </span>
            </span>
            <span class="ms-4" :class="modifierLineAmount(modifier) === 0 ? 'text-success' : ''">
              {{ modifierLineAmount(modifier) === 0 ? 'Gratis' : formatPrice(modifierLineAmount(modifier)) }}
            </span>
          </div>
        </div>

        <!-- Notes -->
        <p v-if="item.notes" class="text-sm text-muted-foreground italic mb-2">
          📝 {{ item.notes }}
        </p>

        <!-- Unit price -->
        <p class="text-sm text-muted-foreground">
          {{ formatPrice(item.unit_price) }} c/u
        </p>
      </div>

      <!-- Quantity Controls + Total + Remove -->
      <div class="flex flex-col items-end gap-2 flex-shrink-0">

        <!-- Quantity row -->
        <div class="flex items-center gap-1.5 bg-muted rounded-lg p-1">
          <button
            class="w-8 h-8 flex items-center justify-center bg-background rounded-md text-muted-foreground
                   hover:bg-action-primary-bg hover:text-action-primary-text transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :disabled="loading"
            aria-label="Disminuir cantidad"
            @click="decreaseQuantity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <span class="min-w-[1.5rem] text-center text-sm font-semibold text-foreground">
            {{ item.quantity }}
          </span>

          <button
            class="w-8 h-8 flex items-center justify-center bg-background rounded-md text-muted-foreground
                   hover:bg-action-primary-bg hover:text-action-primary-text transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :disabled="loading || restaurantClosed"
            aria-label="Aumentar cantidad"
            @click="increaseQuantity"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <!-- Item total -->
        <p class="text-base font-bold text-foreground">{{ formatPrice(item.total) }}</p>

        <!-- Remove button -->
        <button
          class="w-8 h-8 flex items-center justify-center bg-transparent border border-border rounded-md text-destructive
                 hover:bg-icon-button-destructive-hover-bg hover:border-action-destructive-border transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :disabled="loading"
          aria-label="Eliminar producto"
          @click="handleRemove"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { OnlineCartItem } from '~/stores/online_cart'
import { modifierLineTotal } from '~/utils/saleModifierOption'

const props = defineProps<{
  item: OnlineCartItem
  loading?: boolean
  restaurantClosed?: boolean
}>()

const emit = defineEmits<{
  (e: 'update-quantity', itemId: string, quantity: number): void
  (e: 'remove', itemId: string): void
  (e: 'customize-add', item: OnlineCartItem): void
}>()

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}

const modifierLineAmount = (modifier: OnlineCartItem['modifiers'][number]) =>
  modifierLineTotal(modifier)

const increaseQuantity = () => {
  if (props.item.has_modifiers) {
    emit('customize-add', props.item)
  } else {
    emit('update-quantity', props.item.id, props.item.quantity + 1)
  }
}

const decreaseQuantity = () => {
  if (props.item.quantity > 1) {
    emit('update-quantity', props.item.id, props.item.quantity - 1)
  } else {
    handleRemove()
  }
}

const handleRemove = () => {
  emit('remove', props.item.id)
}
</script>
