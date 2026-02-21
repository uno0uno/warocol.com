<template>
  <div>
    <div class="text-center mb-6">
      <h4 class="text-xl font-semibold text-foreground">How would you like to receive your order?</h4>
      <p class="text-sm text-muted-foreground mt-1">Choose an option to continue</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <button
        v-for="type in availableOrderTypes"
        :key="type.value"
        type="button"
        class="flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 text-center"
        :class="[
          cartStore.orderType === type.value
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:border-primary/50',
          !isAvailable(type.value) && 'opacity-40 cursor-not-allowed pointer-events-none'
        ]"
        :disabled="!isAvailable(type.value)"
        @click="select(type.value)"
      >
        <span class="text-5xl">{{ type.icon }}</span>
        <div>
          <p class="font-semibold text-base">{{ type.label }}</p>
          <p class="text-xs mt-0.5" :class="cartStore.orderType === type.value ? 'text-primary/80' : 'text-muted-foreground'">
            {{ type.desc }}
          </p>
        </div>
        <!-- Selected indicator -->
        <div
          v-if="cartStore.orderType === type.value"
          class="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
        >
          <Icon name="heroicons:check" class="w-3 h-3 text-primary-foreground" />
        </div>
        <div v-else class="w-5 h-5 rounded-full border-2 border-border" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'

const props = defineProps<{
  availableTypes?: Array<'delivery' | 'pickup' | 'dine-in'>
}>()

const cartStore = useOnlineCartStore()

const orderTypes = [
  { value: 'delivery' as const, icon: '🛵', label: 'Delivery',  desc: 'Receive at your door' },
  { value: 'pickup'   as const, icon: '🏪', label: 'Pickup',    desc: 'Pick up at the store' },
  { value: 'dine-in'  as const, icon: '🍽️', label: 'Dine-in',  desc: 'Order from your table' },
]

const availableOrderTypes = computed(() =>
  props.availableTypes
    ? orderTypes.filter(t => props.availableTypes!.includes(t.value))
    : orderTypes
)

function isAvailable(value: 'delivery' | 'pickup' | 'dine-in') {
  return !props.availableTypes || props.availableTypes.includes(value)
}

function select(value: 'delivery' | 'pickup' | 'dine-in') {
  cartStore.setOrderType(value)
}
</script>
