<template>
  <div class="flex flex-col lg:w-96 border border-border rounded-xl bg-surface overflow-hidden">
    <!-- Cart Header -->
    <div class="p-4 border-b border-violet-200 bg-violet-100">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-bold text-violet-900 tracking-wide">Orden Actual</h2>
        <span class="px-2.5 py-1 text-xs rounded-full font-bold bg-violet-200 text-violet-800 border border-violet-300">
          {{ items.length }} {{ items.length === 1 ? 'producto' : 'productos' }}
        </span>
      </div>
    </div>

    <!-- Cart Items -->
    <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
      <!-- Empty State -->
      <div
        v-if="items.length === 0"
        class="text-center py-12"
      >
        <svg class="h-16 w-16 mx-auto text-text-secondary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        <p class="text-text-secondary">Carrito vacío</p>
        <p class="text-sm text-text-tertiary mt-1">Selecciona productos para agregar</p>
      </div>

      <!-- Cart Items -->
      <PosCartItem
        v-for="(item, index) in items"
        :key="index"
        :item="item"
        :order-number="index + 1"
        @edit="$emit('edit-item', index, item.product.id)"
        @remove="$emit('remove-item', index)"
        @increment="$emit('increment-item', index)"
        @decrement="$emit('decrement-item', index)"
        @duplicate="$emit('duplicate-item', index)"
      />
    </div>

    <!-- Cart Footer -->
    <div class="p-5 border-t border-border space-y-3">
      <!-- Total -->
      <div class="flex items-center justify-between py-2">
        <span class="text-sm font-semibold text-text-secondary uppercase tracking-wide">Total</span>
        <span class="text-2xl font-bold text-primary tabular-nums">{{ formatCurrency(total) }}</span>
      </div>

      <!-- Actions -->
      <div class="space-y-2">
        <UiButton
          variant="default"
          size="lg"
          class="w-full"
          :disabled="items.length === 0 || isDeleting"
          @click="$emit('process-order')"
        >
          <template v-if="isDeleting">
            <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Eliminando...
          </template>
          <template v-else>
            <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Procesar Orden
          </template>
        </UiButton>
        <UiButton
          variant="outline"
          size="default"
          class="w-full"
          :disabled="items.length === 0 || isDeleting"
          @click="$emit('clear-cart')"
        >
          <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          Limpiar Carrito
        </UiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePOSStore } from '~/stores/usePOSStore'
import { storeToRefs } from 'pinia'

interface CartItem {
  product: {
    id: string
    name: string
    price: number
    image: string
    category: string
  }
  modifiers: Array<{ id: string; name: string; price: number }>
  quantity: number
  notes?: string
  is_resale?: boolean
}

interface Props {
  items: CartItem[]
  total: number
}

interface Emits {
  (e: 'edit-item', index: number, productId: string): void
  (e: 'remove-item', index: number): void
  (e: 'increment-item', index: number): void
  (e: 'decrement-item', index: number): void
  (e: 'duplicate-item', index: number): void
  (e: 'process-order'): void
  (e: 'clear-cart'): void
}

defineProps<Props>()
defineEmits<Emits>()

// Obtener isDeleting directamente del store
const posStore = usePOSStore()
const { isDeleting } = storeToRefs(posStore)

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}
</script>
