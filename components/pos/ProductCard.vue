<template>
  <button
    class="flex flex-col items-center p-3 md:p-4 border-2 border-border rounded-lg bg-surface hover:bg-surface-secondary hover:border-primary theme-transition hover:shadow-titan hover:scale-105 cursor-pointer active:scale-100"
    @click="$emit('select', product)"
  >
    <div class="text-3xl md:text-4xl mb-2">{{ product.image }}</div>
    <p class="text-xs md:text-sm font-medium text-text-primary text-center">
      {{ product.name }}
    </p>
    <p class="text-base md:text-lg font-bold text-primary mt-1">
      {{ formatCurrency(product.price) }}
    </p>
  </button>
</template>

<script setup lang="ts">
interface Product {
  id: string
  name: string
  price: number
  category: string
  image: string
  available: boolean
}

interface Props {
  product: Product
}

interface Emits {
  (e: 'select', product: Product): void
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
