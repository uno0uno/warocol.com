<template>
  <div
    class="bg-card rounded-xl border border-border overflow-hidden cursor-pointer group"
    :class="{ 'opacity-50': !product.is_available }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <!-- Product Image/Emoji -->
    <div class="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
      <img
        v-if="product.image_url && product.image_url.startsWith('http')"
        :src="product.image_url"
        :alt="product.name"
        class="absolute inset-0 w-full h-full object-cover"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-7xl">
        {{ product.image_url || '🍽️' }}
      </div>

      <!-- Availability badge -->
      <div v-if="!product.is_available" class="absolute top-3 right-3">
        <span class="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-full">
          No disponible
        </span>
      </div>

      <!-- Modifier indicator -->
      <div v-if="product.has_modifiers" class="absolute top-3 left-3">
        <span class="px-2 py-1 text-xs font-medium bg-primary/80 text-primary-foreground rounded-full">
          Personalizable
        </span>
      </div>
    </div>

    <!-- Product Info -->
    <div class="p-4">
      <!-- Name -->
      <h3 class="text-lg font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
        {{ product.name }}
      </h3>

      <!-- Description -->
      <p v-if="product.description" class="text-base text-muted-foreground mb-3 line-clamp-2">
        {{ product.description }}
      </p>

      <!-- Footer: Price, Category, and Cart Controls -->
      <div class="flex items-center justify-between mt-auto">
        <!-- Price -->
        <div class="text-2xl font-bold text-foreground">
          {{ formatPrice(product.price) }}
        </div>

        <!-- NOT in cart → + button -->
        <button
          v-if="!isInCart"
          @click.stop="handleClick"
          :disabled="isAdding || !product.is_available"
          class="w-11 h-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
          aria-label="Agregar al carrito"
        >
          <span v-if="isAdding" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          <span v-else>+</span>
        </button>

        <!-- IN cart → − N + inline controls -->
        <div v-else class="flex items-center gap-1" @click.stop>
          <button
            @click="decrease"
            :disabled="cartStore.isLoading"
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-muted hover:bg-red-100 text-foreground hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold"
            aria-label="Quitar uno"
          >−</button>
          <span class="min-w-[1.5rem] text-center font-bold text-foreground text-sm">
            {{ totalQtyInCart }}
          </span>
          <button
            @click="increase"
            :disabled="cartStore.isLoading || !product.is_available"
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
            aria-label="Agregar uno más"
          >+</button>
        </div>
      </div>

      <!-- Category badge -->
      <div class="flex items-center justify-between mt-2">
        <div class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-xl">
          {{ product.category_name }}
        </div>

        <!-- Preparation time -->
        <div v-if="product.preparation_time" class="flex items-center gap-1 text-xs text-muted-foreground">
          <span>⏱️</span>
          <span>{{ product.preparation_time }} min</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useOnlineCartStore } from '~/stores/online_cart'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['click'])

const cartStore = useOnlineCartStore()

// All cart items that belong to this product
const cartItemsForProduct = computed(() =>
  cartStore.items.filter(i => i.product_id === props.product.id)
)

// Sum of quantities across all cart items for this product
const totalQtyInCart = computed(() =>
  cartItemsForProduct.value.reduce((sum, i) => sum + i.quantity, 0)
)

const isInCart = computed(() => totalQtyInCart.value > 0)

// Local loading state for the initial "add" action (before item appears in cart)
const isAdding = ref(false)

watch(isInCart, (nowInCart) => {
  if (nowInCart) isAdding.value = false
})

watch(() => cartStore.isLoading, (loading) => {
  if (!loading && !isInCart.value) isAdding.value = false
})

// Decrement: target the last item added (LIFO)
const decrease = async () => {
  const item = cartItemsForProduct.value.at(-1)
  if (!item) return
  try {
    await cartStore.updateItemQuantity(item.id, item.quantity - 1)
  } catch (e) {
    console.error('Error al quitar producto:', e)
  }
}

// Increment: for modifier products → open drawer; for plain products → increment first item
const increase = async () => {
  if (props.product.has_modifiers) {
    emit('click', props.product)
    return
  }
  const item = cartItemsForProduct.value[0]
  if (!item) return
  try {
    await cartStore.updateItemQuantity(item.id, item.quantity + 1)
  } catch (e) {
    console.error('Error al agregar producto:', e)
  }
}

function handleClick() {
  if (!props.product.is_available) return
  if (isInCart.value) return
  if (!props.product.has_modifiers) isAdding.value = true
  emit('click', props.product)
}

function formatPrice(price) {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numPrice)
}
</script>
