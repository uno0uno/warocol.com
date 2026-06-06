<template>
  <div>
    <div class="text-center mb-6">
      <h4 class="text-base font-semibold text-foreground">¿Cómo quieres recibir tu pedido?</h4>
      <p class="text-sm text-muted-foreground mt-1">Selecciona una opción para continuar</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup" aria-label="Tipo de pedido">
      <button
        v-for="type in availableOrderTypes"
        :key="type.value"
        type="button"
        role="radio"
        :aria-checked="cartStore.orderType === type.value"
        class="flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 text-center
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        :class="[
          cartStore.orderType === type.value
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:border-action-outline-focus-ring',
          !isAvailable(type.value) && 'opacity-40 cursor-not-allowed pointer-events-none'
        ]"
        :disabled="!isAvailable(type.value)"
        @click="select(type.value)"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="type.svg" />
        </svg>
        <div>
          <p class="font-semibold text-base">{{ type.label }}</p>
          <p class="text-xs mt-0.5" :class="cartStore.orderType === type.value ? 'text-primary/80' : 'text-muted-foreground'">
            {{ type.desc }}
          </p>
        </div>
        <!-- Indicador seleccionado -->
        <div
          v-if="cartStore.orderType === type.value"
          class="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
        >
          <svg class="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <div v-else class="w-5 h-5 rounded-full border-2 border-border" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useOnlineCartStore } from '~/stores/online_cart'

const props = defineProps<{
  availableTypes?: Array<'delivery' | 'pickup' | 'dine-in'>
}>()

const cartStore = useOnlineCartStore()

const orderTypes = [
  {
    value: 'delivery' as const,
    label: 'Domicilio',
    desc: 'Lo recibimos en tu puerta',
    svg: 'M8 16a3 3 0 01-3-3V7a3 3 0 013-3h8a3 3 0 013 3v6a3 3 0 01-3 3H8zm-4 0h1m14 0h1M1 10h2m18 0h2M5 20h14',
  },
  {
    value: 'pickup' as const,
    label: 'Recoger en tienda',
    desc: 'Recógelo en el local',
    svg: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    value: 'dine-in' as const,
    label: 'En mesa',
    desc: 'Pide desde tu mesa',
    svg: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  },
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
