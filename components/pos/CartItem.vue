<template>
  <div class="p-3 border border-violet-200 rounded-xl bg-violet-50 theme-transition hover:border-violet-300">

    <!-- Fila 1: badge + nombre + total -->
    <div class="flex items-start gap-2.5">
      <div class="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
        {{ orderNumber }}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm font-semibold text-slate-800 leading-snug">{{ item.product.name }}</p>
          
          <!-- Status Badge: 'Sin enviar' pill for new items (only when showFulfillmentStatus) -->
          <span
            v-if="item.fulfillmentStatus === 'new' && showFulfillmentStatus"
            class="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight rounded-md border bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
          >Sin enviar</span>
          <!-- Status Badge for sent/ready/delivered/cancelled -->
          <span
            v-else-if="item.fulfillmentStatus && item.fulfillmentStatus !== 'new'"
            class="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight rounded-md border"
            :class="{
              'bg-blue-50 text-blue-600 border-blue-200': item.fulfillmentStatus === 'sent',
              'bg-violet-50 text-violet-600 border-violet-200': item.fulfillmentStatus === 'preparing',
              'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm': item.fulfillmentStatus === 'ready',
              'bg-slate-50 text-slate-500 border-slate-200': item.fulfillmentStatus === 'delivered' || item.fulfillmentStatus === 'cancelled'
            }"
          >
            {{
              item.fulfillmentStatus === 'sent' ? 'En cocina' :
              item.fulfillmentStatus === 'preparing' ? 'Preparando' :
              item.fulfillmentStatus === 'ready' ? 'Listo' :
              item.fulfillmentStatus === 'delivered' ? 'Entregado' : item.fulfillmentStatus
            }}
          </span>
        </div>
        <p v-if="item.sentAt" class="text-[9px] text-slate-400 mt-0.5">Fuego: {{ formatTime(item.sentAt) }}</p>
      </div>
      <p class="text-sm font-bold text-violet-700 tabular-nums flex-shrink-0 ml-1">{{ formatCurrency(itemTotal) }}</p>
    </div>

    <!-- Fila 2: precio c/u + modificadores -->
    <div class="mt-1.5 pl-[2.125rem] space-y-0.5">
      <p class="text-xs text-slate-500">{{ formatCurrency(Number(item.product.price)) }} c/u</p>
      <div v-for="mod in item.modifiers" :key="mod.id" class="flex justify-between text-xs gap-2">
        <span class="text-slate-400">+ {{ mod.name }}</span>
        <span class="text-slate-500 tabular-nums flex-shrink-0">{{ formatCurrency(Number(mod.price)) }}</span>
      </div>
      <p v-if="item.notes" class="text-xs text-slate-400 italic">Nota: {{ item.notes }}</p>
    </div>

    <!-- Fila 3: controles de cantidad + acciones -->
    <div class="mt-2.5 pl-[2.125rem] flex items-center gap-2">
      <!-- Cantidad -->
      <div class="flex items-center border border-violet-200 rounded-lg bg-white">
        <button
          class="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:bg-violet-50 rounded-l-lg disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="item.quantity <= 1"
          aria-label="Reducir cantidad"
          @click.stop="$emit('decrement')"
        >
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
          </svg>
        </button>
        <span class="w-6 text-center text-xs font-medium text-text-primary">{{ item.quantity }}</span>
        <button
          class="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:bg-violet-50 rounded-r-lg"
          aria-label="Aumentar cantidad"
          @click.stop="$emit('increment')"
        >
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div class="flex-1" />

      <!-- Duplicar -->
      <button
        class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-violet-50 border border-violet-300 text-violet-600 hover:bg-violet-100 theme-transition"
        aria-label="Duplicar ítem"
        @click.stop="$emit('duplicate')"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
        </svg>
      </button>

      <!-- Editar (oculto para reventa y venta libre) -->
      <button
        v-if="!item.is_resale && !item.is_open_sale"
        class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-violet-50 border border-violet-300 text-violet-600 hover:bg-violet-100 theme-transition"
        aria-label="Editar ítem"
        @click.stop="$emit('edit')"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      </button>

      <!-- Eliminar -->
      <button
        class="min-w-[44px] min-h-[44px] flex items-center justify-center rounded bg-red-50 border border-red-300 text-red-500 hover:bg-red-100 theme-transition"
        aria-label="Eliminar ítem"
        @click.stop="$emit('remove')"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
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
  is_open_sale?: boolean
  fulfillmentStatus?: 'new' | 'sent' | 'hold' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  sentAt?: string | null
}

interface Props {
  item: CartItem
  orderNumber: number
  showFulfillmentStatus?: boolean
}

interface Emits {
  (e: 'edit'): void
  (e: 'remove'): void
  (e: 'increment'): void
  (e: 'decrement'): void
  (e: 'duplicate'): void
}

const props = withDefaults(defineProps<Props>(), { showFulfillmentStatus: false })
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

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
