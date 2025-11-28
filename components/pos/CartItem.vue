<template>
  <div class="flex items-start gap-3 p-3 border border-border rounded-lg bg-surface-secondary theme-transition hover:shadow-titan">
    <!-- Order Number -->
    <div class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
      {{ orderNumber }}
    </div>

    <!-- Item Details (Clickable) -->
    <div
      class="flex-1 min-w-0 cursor-pointer hover:opacity-80 theme-transition"
      @click="$emit('edit')"
    >
      <p class="text-sm font-medium text-text-primary truncate">{{ item.product.name }}</p>
      <p class="text-xs text-text-secondary">{{ formatCurrency(item.product.price) }} c/u</p>

      <!-- Show modifiers if any -->
      <div v-if="item.modifiers && item.modifiers.length > 0" class="mt-1">
        <p class="text-xs text-text-tertiary">
          + {{ item.modifiers.map(m => m.name).join(', ') }}
        </p>
      </div>

      <!-- Show notes if any -->
      <div v-if="item.notes" class="mt-1">
        <p class="text-xs text-text-tertiary italic">
          Nota: {{ item.notes }}
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 ml-3">
      <button
        class="w-8 h-8 flex items-center justify-center rounded bg-destructive/10 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground theme-transition"
        @click="$emit('remove')"
        title="Eliminar"
      >
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
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
}

interface Props {
  item: CartItem
  orderNumber: number
}

interface Emits {
  (e: 'edit'): void
  (e: 'remove'): void
}

defineProps<Props>()
defineEmits<Emits>()

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}
</script>
