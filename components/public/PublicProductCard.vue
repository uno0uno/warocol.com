<template>
  <div
    class="product-card group cursor-pointer bg-card border border-border"
    :class="{ 'product-card--unavailable': !product.is_available }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="product-card__media bg-muted h-fit w-full">
      <img
        v-if="product.image_url && product.image_url.startsWith('http')"
        :src="product.image_url"
        :alt="product.name"
        class="product-card__photo max-w-none"
        loading="lazy"
        decoding="async"
      >
      <div v-else class="product-card__emoji">
        {{ product.image_url || '🍽️' }}
      </div>

      <div v-if="!product.is_available" class="product-card__media-badge">
        No disponible
      </div>
    </div>

    <div class="product-card__body">
      <div class="product-card__main">
        <h3 class="product-card__title">
          {{ product.name }}
        </h3>

        <p v-if="product.description" class="product-card__description">
          {{ product.description }}
        </p>

        <p v-if="product.has_modifiers || product.preparation_time" class="product-card__meta">
          <span v-if="product.has_modifiers" class="product-card__badge">Personalizable</span>
          <span v-if="product.has_modifiers && product.preparation_time"> · </span>
          <span v-if="product.preparation_time">{{ product.preparation_time }} min</span>
        </p>
      </div>

      <div class="product-card__footer">
        <span class="product-card__price">{{ formatPrice(product.price) }}</span>

        <div class="product-card__actions" @click.stop>
          <button
            v-if="!isInCart"
            type="button"
            class="product-card__cart-btn"
            :disabled="!product.is_available || restaurantClosed"
            aria-label="Agregar al carrito"
            @click.stop="handleClick"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <div v-else class="product-card__qty">
            <button
              type="button"
              class="product-card__qty-btn product-card__qty-btn--minus"
              :disabled="cartStore.isLoading"
              aria-label="Quitar uno"
              @click="decrease"
            >
              −
            </button>
            <span class="product-card__qty-value">{{ totalQtyInCart }}</span>
            <button
              type="button"
              class="product-card__qty-btn product-card__qty-btn--plus"
              :disabled="cartStore.isLoading || !product.is_available || restaurantClosed"
              aria-label="Agregar uno más"
              @click="increase"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOnlineCartStore } from '~/stores/online_cart'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  restaurantClosed: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

const cartStore = useOnlineCartStore()

const cartItemsForProduct = computed(() =>
  cartStore.items.filter(i => i.product_id === props.product.id),
)

const totalQtyInCart = computed(() =>
  cartItemsForProduct.value.reduce((sum, i) => sum + i.quantity, 0),
)

const isInCart = computed(() => totalQtyInCart.value > 0)

const decrease = async () => {
  const item = cartItemsForProduct.value.at(-1)
  if (!item) return
  try {
    await cartStore.updateItemQuantity(item.id, item.quantity - 1)
  } catch (e) {
    console.error('Error al quitar producto:', e)
  }
}

const increase = () => {
  emit('click', props.product)
}

function handleClick() {
  if (!props.product.is_available) return
  if (props.restaurantClosed) return
  emit('click', props.product)
}

function formatPrice(price: string | number) {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice)
}
</script>

<style scoped>
/* Mobile: width from parent (2/5), image container hugs content */
.product-card {
  display: grid;
  grid-template-columns: 2fr 3fr;
  align-items: stretch;
  gap: 0.875rem;
  padding: 0.875rem;
  border-radius: 1rem;
  box-shadow: 0 1px 3px hsl(var(--foreground) / 0.05);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.product-card:active {
  border-color: hsl(var(--border));
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.08);
}

.product-card:focus-visible {
  outline: 2px solid hsl(var(--badge-primary-text));
  outline-offset: 2px;
  border-radius: 0.5rem;
}

.product-card--unavailable {
  opacity: 0.55;
}

.product-card__media {
  position: relative;
  width: 100%;
  height: fit-content;
  align-self: start;
  border-radius: 0.75rem;
  overflow: hidden;
  background: hsl(var(--muted));
  line-height: 0;
}

.product-card__photo {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  object-position: center;
}

.product-card__emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  font-size: 1.75rem;
  line-height: 1;
}

.product-card__media-badge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
  background: hsl(var(--foreground) / 0.5);
  color: hsl(var(--surface));
}

.product-card__body {
  min-width: 0;
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.product-card__main {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.product-card__title {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  color: hsl(var(--text-primary));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.4375rem;
  border-radius: 999px;
  font-size: 0.625rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.01em;
  background: hsl(var(--surface-secondary));
  color: hsl(var(--badge-primary-text));
}

.product-card__description {
  margin-top: 0.125rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: hsl(var(--text-secondary));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__meta {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.3;
  color: hsl(var(--text-tertiary));
}

.product-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  margin-top: auto;
  padding-top: 0.5rem;
}

.product-card__price {
  font-size: 0.9375rem;
  font-weight: 700;
  color: hsl(var(--text-primary));
  letter-spacing: -0.01em;
}

.product-card__cart-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--text-primary));
  color: hsl(var(--surface));
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.product-card__cart-btn:hover:not(:disabled) {
  background: hsl(var(--action-primary-bg));
  color: hsl(var(--action-primary-text));
}

.product-card__cart-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.product-card__qty {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.product-card__qty-btn {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  border: none;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.product-card__qty-btn--minus {
  background: hsl(var(--surface-secondary));
  color: hsl(var(--text-primary));
}

.product-card__qty-btn--minus:hover:not(:disabled) {
  background: hsl(var(--icon-button-destructive-hover-bg));
  color: hsl(var(--icon-button-destructive-text));
}

.product-card__qty-btn--plus {
  background: hsl(var(--action-primary-bg));
  color: hsl(var(--action-primary-text));
}

.product-card__qty-btn--plus:hover:not(:disabled) {
  background: hsl(var(--action-primary-hover-bg));
}

.product-card__qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.product-card__qty-value {
  min-width: 1.125rem;
  text-align: center;
  font-size: 0.8125rem;
  font-weight: 600;
  color: hsl(var(--text-primary));
}

/* Desktop: photo tile */
@media (min-width: 768px) {
  .product-card {
    display: flex;
    flex-direction: column;
    grid-template-columns: none;
    gap: 0;
    padding: 0;
    border-radius: 0.75rem;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--card));
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .product-card:hover {
    border-color: hsl(var(--border));
    box-shadow: 0 4px 16px -8px hsl(var(--foreground) / 0.12);
  }

  .product-card__media {
    flex: none;
    width: 100%;
    height: 11rem;
    min-height: 11rem;
    line-height: normal;
    border-radius: 0;
  }

  .product-card__photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    object-fit: cover;
  }

  .product-card__emoji {
    position: absolute;
    inset: 0;
    width: auto;
    aspect-ratio: auto;
    font-size: 3rem;
  }

  .product-card__media-badge {
    inset: auto;
    top: 0.625rem;
    left: 0.625rem;
    right: auto;
    bottom: auto;
    width: auto;
    height: auto;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
  }

  .product-card__body {
    min-height: 0;
    padding: 0.875rem 1rem 1rem;
    gap: 0.625rem;
    justify-content: space-between;
  }

  .product-card__title {
    font-size: 1rem;
    -webkit-line-clamp: 2;
  }

  .product-card__description {
    font-size: 0.875rem;
    -webkit-line-clamp: 2;
  }

  .product-card__price {
    font-size: 1.125rem;
  }

  .product-card__cart-btn {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
  }

  .product-card__qty-btn {
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
  }
}
</style>
