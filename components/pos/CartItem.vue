<template>
  <div class="flex items-start gap-3 p-4 border border-border rounded-xl bg-surface-secondary theme-transition hover:border-primary/20 hover:bg-surface">
    <!-- Order Number -->
    <div class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
      {{ orderNumber }}
    </div>

    <!-- Item Details -->
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-start">
        <p class="text-sm font-semibold text-text-primary truncate">{{ item.product.name }}</p>
        <p class="text-sm font-bold text-primary ml-2">{{ formatCurrency(itemTotal) }}</p>
      </div>
      <p class="text-xs text-text-secondary">{{ formatCurrency(Number(item.product.price)) }} c/u</p>

      <!-- Show modifiers with prices -->
      <div v-if="item.modifiers && item.modifiers.length > 0" class="mt-1.5 space-y-0.5">
        <div v-for="mod in item.modifiers" :key="mod.id" class="flex justify-between text-xs">
          <span class="text-text-tertiary">+ {{ mod.name }}</span>
          <span class="text-text-secondary">{{ formatCurrency(Number(mod.price)) }}</span>
        </div>
      </div>

      <!-- Show notes if any -->
      <div v-if="item.notes" class="mt-1">
        <p class="text-xs text-text-tertiary italic">
          Nota: {{ item.notes }}
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1.5 ml-2">
      <!-- Quantity Controls -->
      <div class="flex items-center border border-border rounded-lg bg-surface">
        <button
          class="w-6 h-6 flex items-center justify-center text-text-secondary hover:bg-surface-secondary rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="item.quantity <= 1"
          @click.stop="$emit('decrement')"
          title="Reducir cantidad"
        >
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <span class="w-5 text-center text-xs font-medium text-text-primary">{{ item.quantity }}</span>
        <button
          class="w-6 h-6 flex items-center justify-center text-text-secondary hover:bg-surface-secondary rounded-r-lg"
          @click.stop="$emit('increment')"
          title="Aumentar cantidad"
        >
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <!-- Duplicate Button -->
      <button
        class="w-7 h-7 flex items-center justify-center rounded bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-primary-foreground theme-transition"
        @click.stop="$emit('duplicate')"
        title="Duplicar item"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
        </svg>
      </button>
      <!-- Edit Button (hidden for resale products) -->
      <button
        v-if="!item.is_resale"
        class="w-7 h-7 flex items-center justify-center rounded bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-primary-foreground theme-transition"
        @click.stop="$emit('edit')"
        title="Editar"
      >
        <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      </button>
      <!-- Delete Button -->
      <button
        class="w-7 h-7 flex items-center justify-center rounded bg-destructive/10 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground theme-transition"
        @click.stop="$emit('remove')"
        title="Eliminar"
      >
        <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
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
  modifiers: Array<{ id: string; name: string; price: number }>
  quantity: number
  notes?: string
  is_resale?: boolean
}

interface Props {
  item: CartItem
  orderNumber: number
}

interface Emits {
  (e: 'edit'): void
  (e: 'remove'): void
  (e: 'increment'): void
  (e: 'decrement'): void
  (e: 'duplicate'): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const itemTotal = computed(() => {
  const basePrice = Number(props.item.product.price) || 0
  const modifiersPrice = props.item.modifiers.reduce((sum, mod) => sum + Number(mod.price), 0)
  return (basePrice + modifiersPrice) * Number(props.item.quantity)
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}
</script>
