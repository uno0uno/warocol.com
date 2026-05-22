<template>
  <div class="flex flex-col lg:w-96 border border-border rounded-2xl bg-surface overflow-hidden shadow-sm">
    <!-- Cart Header -->
    <div class="px-4 py-3.5 border-b border-border bg-surface">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-text-primary tracking-wide">Orden Actual</h2>
        <span class="px-2.5 py-0.5 text-xs rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
          {{ displayItemCount }} {{ displayItemCount === 1 ? 'ítem' : 'ítems' }}
        </span>
      </div>
    </div>

    <!-- Issue #575 — Served by chip (bar + counter only, gated by
         waiter_attribution_enabled). Three states:
         - Skeleton while a tab is being loaded.
         - Hidden entirely when there's nothing to attribute (no current
           items, no tab items) — avoids a useless "Sin asignar" sitting on
           an empty cart.
         - Interactive picker when there are items in cart or tab. -->
    <div
      v-if="showServedByChip && isLoadingTabItems"
      class="px-4 py-2 border-b border-border bg-surface-secondary/40"
      aria-hidden="true"
    >
      <div class="flex items-center gap-2 animate-pulse">
        <div class="w-3.5 h-3.5 rounded-full bg-surface-secondary flex-shrink-0" />
        <div class="h-3 w-20 rounded bg-surface-secondary flex-shrink-0" />
        <div class="flex-1 min-h-[36px] rounded-lg bg-surface-secondary" />
      </div>
    </div>
    <div
      v-else-if="showServedByChip && (items.length > 0 || (tabItems && tabItems.length > 0))"
      class="px-4 py-2 border-b border-border bg-surface-secondary/40"
    >
      <div class="flex items-center gap-2">
        <svg class="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span class="text-[10px] font-bold text-text-tertiary uppercase tracking-wider flex-shrink-0">Servido por</span>
        <select
          :value="servedByMemberId || ''"
          class="flex-1 min-h-[36px] px-2.5 py-1 text-xs font-medium bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors outline-none text-text-primary cursor-pointer"
          aria-label="Atribuir esta orden a un mesero"
          @change="onServedByChange"
        >
          <option value="">Sin asignar</option>
          <option
            v-for="m in (members || [])"
            :key="m.id"
            :value="m.id"
          >
            {{ m.name }} ({{ m.role }})
          </option>
        </select>
      </div>
    </div>

    <!-- Items list: tab items (committed) + current cart items -->
    <div class="flex-1 overflow-y-auto p-4 space-y-2.5">

      <!-- Skeleton while loading tab items, adding to tab, or clearing -->
      <template v-if="isLoadingTabItems || isAddingToTab || isClearingTab">
        <div v-for="n in 3" :key="n" class="p-3 border border-border rounded-xl animate-pulse">
          <div class="flex items-start gap-2.5">
            <div class="w-6 h-6 rounded-full bg-surface-secondary flex-shrink-0" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3 bg-surface-secondary rounded w-3/4" />
              <div class="h-2.5 bg-surface-secondary rounded w-1/3" />
            </div>
            <div class="h-3 bg-surface-secondary rounded w-12 flex-shrink-0" />
          </div>
          <div class="mt-3 pl-[2.125rem] flex items-center gap-2">
            <div class="h-6 w-20 bg-surface-secondary rounded-lg" />
            <div class="flex-1" />
            <div class="h-7 w-7 bg-surface-secondary rounded" />
            <div class="h-7 w-7 bg-surface-secondary rounded" />
          </div>
        </div>
      </template>

      <!-- Tab items already on the mesa (only when not loading/adding/clearing) -->
      <template v-else-if="!isLoadingTabItems && !isAddingToTab && !isClearingTab">
      <div
        v-for="(item, idx) in tabItems"
        :key="item.orderItemId"
        class="relative"
      >
        <label
          v-if="comandasEnabled && item.fulfillmentStatus === 'new'"
          class="absolute top-2 left-2 z-10 flex items-center"
        >
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            :checked="selectedTabItemIds.includes(item.orderItemId)"
            :aria-label="`Seleccionar ${item.productName} para enviar a cocina`"
            @change="$emit('toggle-tab-selection', item.orderItemId)"
          />
        </label>
        <PosCartItem
          :item="{
            product: { id: item.orderItemId, name: item.productName, price: item.unitPrice, image: '🍽️', category: '' },
            modifiers: [],
            quantity: item.quantity,
            notes: item.notes ?? undefined,
            fulfillmentStatus: item.fulfillmentStatus,
            sentAt: item.sentAt
          }"
          :order-number="idx + 1"
          :show-fulfillment-status="comandasEnabled"
          :class="[
            pendingRemoveItemId === item.orderItemId ? 'opacity-40 pointer-events-none' : '',
            comandasEnabled && item.fulfillmentStatus === 'new' ? 'pl-8' : '',
          ]"
          @increment="$emit('increment-tab-item', item.orderItemId)"
          @decrement="$emit('decrement-tab-item', item.orderItemId)"
          @remove="$emit('remove-tab-item', item.orderItemId)"
          @duplicate="() => {}"
        />

        <!-- Loading overlay -->
        <div
          v-if="tabItemsLoading.has(item.orderItemId)"
          class="absolute inset-0 rounded-xl bg-surface/70 flex items-center justify-center backdrop-blur-[1px]"
        >
          <UiLoadingDots size="9px" />
        </div>
      </div>

      <!-- Divider when there are both tab items and new cart items -->
      <div v-if="mesaMode && tabItems.length > 0 && items.length > 0" class="flex items-center gap-2 py-1">
        <div class="flex-1 h-px bg-border" />
        <span class="text-[10px] font-bold text-text-tertiary uppercase tracking-widest flex-shrink-0">Por agregar</span>
        <div class="flex-1 h-px bg-border" />
      </div>

      <!-- Current cart items -->
      <PosCartItem
        v-for="(item, index) in items"
        :key="index"
        :item="item"
        :order-number="tabItems.length + index + 1"
        @edit="$emit('edit-item', index, item.product.id)"
        @remove="$emit('remove-item', index)"
        @increment="$emit('increment-item', index)"
        @decrement="$emit('decrement-item', index)"
        @duplicate="$emit('duplicate-item', index)"
      />

      <!-- Empty state: nothing at all -->
      <div
        v-if="tabItems.length === 0 && items.length === 0 && !isLoadingTabItems"
        class="text-center py-12"
      >
        <svg class="h-16 w-16 mx-auto text-text-secondary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        <p class="text-text-secondary">{{ mesaMode ? `${tableSingular} sin pedidos` : 'Carrito vacío' }}</p>
        <p class="text-sm text-text-tertiary mt-1">Selecciona productos para agregar</p>
      </div>
      </template>
    </div>

    <!-- Cart Footer -->
    <div class="px-4 py-4 border-t border-border space-y-3 bg-surface-secondary/40">
      <!-- Total -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-text-tertiary uppercase tracking-widest">Total</span>
        <span class="text-3xl font-black text-text-primary tabular-nums">{{ formatCurrency(mesaMode ? (tabTotal + total) : total) }}</span>
      </div>

      <!-- Actions — Mostrador / barra sin comandas -->
      <div v-if="!mesaMode" class="space-y-2">
        <template v-if="openSalePrimaryIdle && showOpenSale">
          <button
            type="button"
            :aria-disabled="!openSaleEnabled"
            :title="openSaleTooltip ?? undefined"
            class="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 shadow-sm"
            @click="$emit('open-sale')"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            Venta libre
          </button>
        </template>
        <template v-else>
          <button
            v-if="showOpenSale"
            type="button"
            :aria-disabled="!openSaleEnabled"
            :title="openSaleTooltip ?? undefined"
            class="w-full"
            :class="openSaleButtonClass"
            @click="$emit('open-sale')"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            Venta libre
          </button>
          <button
            v-if="hasCartItems && !hideProcessOrder"
            type="button"
            :disabled="isDeleting"
            class="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            @click="$emit('process-order')"
          >
            <svg v-if="isDeleting" class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            {{ isDeleting ? 'Procesando...' : 'Procesar Orden' }}
          </button>
          <button
            v-if="hasCartItems"
            type="button"
            :disabled="isDeleting"
            class="w-full min-h-[44px] rounded-xl border border-border text-text-secondary text-sm font-medium flex items-center justify-center gap-2 hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="$emit('clear-cart')"
          >
            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Limpiar Carrito
          </button>
        </template>
      </div>

      <!-- Actions — Mesa / barra con comandas -->
      <div v-else class="space-y-2">
        <template v-if="openSalePrimaryIdle && showOpenSale">
          <button
            type="button"
            :aria-disabled="!openSaleEnabled"
            :title="openSaleTooltip ?? undefined"
            class="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 shadow-sm"
            @click="$emit('open-sale')"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            Venta libre
          </button>
        </template>
        <template v-else>
        <button
          v-if="showOpenSale"
          type="button"
          :aria-disabled="!openSaleEnabled"
          :title="openSaleTooltip ?? undefined"
          class="w-full"
          :class="openSaleButtonClass"
          @click="$emit('open-sale')"
        >
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
          Venta libre
        </button>
        <!-- Barra + catálogo en carrito sin venta libre como flujo principal (#796, #806) -->
        <button
          v-if="showBarProcessOrder"
          type="button"
          :disabled="items.length === 0 || isDeleting"
          class="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          @click="$emit('process-order')"
        >
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Procesar Orden
        </button>
        <!-- 2-col grid: secondary actions (Liberar moved to the active-mesa banner) -->
        <div class="grid grid-cols-2 gap-2">
          <!-- Pedir cuenta -->
          <button
            type="button"
            :disabled="tabItems.length === 0"
            class="min-h-[44px] rounded-xl border border-border text-text-secondary text-xs font-medium flex items-center justify-center gap-1 hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Pedir la cuenta"
            @click="$emit('request-bill')"
          >
            <svg class="h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" />
            </svg>
            Pedir cuenta
          </button>
          <!-- Limpiar -->
          <button
            type="button"
            :disabled="(items.length === 0 && tabItems.length === 0) || isDeleting || isClearingTab"
            class="min-h-[44px] rounded-xl border border-border text-text-secondary text-xs font-medium flex items-center justify-center gap-1 hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
            @click="$emit('clear-cart')"
          >
            <UiLoadingDots v-if="isClearingTab" size="7px" />
            <template v-else>
              <svg class="h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Limpiar
            </template>
          </button>
        </div>


        <!-- #753 — Fire / print comandas when KDS enabled -->
        <template v-if="comandasEnabled">
          <div class="grid grid-cols-2 gap-2">
            <button
              v-if="unfiredCount > 0"
              type="button"
              :disabled="isFiringToKitchen || isAddingToTab"
              class="min-h-[44px] rounded-xl border border-primary/40 bg-primary/5 text-primary text-xs font-semibold flex items-center justify-center gap-1 hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
              :aria-label="fireToKitchenLabel"
              @click="$emit('fire-to-kitchen')"
            >
              <UiLoadingDots v-if="isFiringToKitchen" size="7px" />
              <template v-else>{{ fireToKitchenLabel }}</template>
            </button>
            <button
              type="button"
              :disabled="!canPrintComandas"
              class="min-h-[44px] rounded-xl border border-border text-text-secondary text-xs font-medium flex items-center justify-center gap-1 hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
              :class="unfiredCount === 0 ? 'col-span-2' : ''"
              aria-label="Imprimir comanda de cocina"
              @click="$emit('print-comandas')"
            >
              <svg class="h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18M6.72 13.829 6.34 18m10.94-4.171L17.66 18M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.75A2.25 2.25 0 0 1 5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75v6A2.25 2.25 0 0 1 18.75 18h-1.09M6.34 18h11.32" />
              </svg>
              Imprimir comanda
            </button>
          </div>
        </template>

        <!-- Primary: Add to tab — full width -->
        <button
          type="button"
          :disabled="items.length === 0 || isDeleting || isAddingToTab"
          class="w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          :aria-label="`Agregar items a la ${tableSingularLower}`"
          @click="$emit('add-to-tab')"
        >
          <UiLoadingDots v-if="isAddingToTab" size="9px" />
          <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ isAddingToTab ? 'Enviando...' : (comandasEnabled ? 'Agregar y enviar a cocina' : `Agregar a la ${tableSingularLower}`) }}
        </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePOSStore } from '~/stores/usePOSStore'
import { storeToRefs } from 'pinia'

const { singular: tableSingular } = useTableLabel()
const tableSingularLower = computed(() => tableSingular.value.toLowerCase())

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

interface TabItem {
  orderItemId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string | null
  fulfillmentStatus?: string
  sentAt?: string | null
}

interface Props {
  items: CartItem[]
  total: number
  mesaMode?: boolean
  isAddingToTab?: boolean
  isLoadingTabItems?: boolean
  isClearingTab?: boolean
  tabItems?: TabItem[]
  tabTotal?: number
  tabItemsLoading?: Set<string>
  comandasEnabled?: boolean
  unfiredCount?: number
  isFiringToKitchen?: boolean
  canPrintComandas?: boolean
  selectedTabItemIds?: string[]
  pendingRemoveItemId?: string | null
  // Issue #575 — per-order waiter attribution (bar + counter)
  showServedByChip?: boolean
  servedByMemberId?: string | null
  members?: Array<{ id: string; name: string; role: string }>
  showOpenSale?: boolean
  openSaleEnabled?: boolean
  openSalePrimaryIdle?: boolean
  hideProcessOrder?: boolean
  openSaleTooltip?: string | null
  showBarProcessOrder?: boolean
}

interface Emits {
  (e: 'edit-item', index: number, productId: string): void
  (e: 'remove-item', index: number): void
  (e: 'increment-item', index: number): void
  (e: 'decrement-item', index: number): void
  (e: 'duplicate-item', index: number): void
  (e: 'process-order'): void
  (e: 'open-sale'): void
  (e: 'clear-cart'): void
  (e: 'add-to-tab'): void
  (e: 'request-bill'): void
  (e: 'remove-tab-item', orderItemId: string): void
  (e: 'increment-tab-item', orderItemId: string): void
  (e: 'decrement-tab-item', orderItemId: string): void
  (e: 'fire-to-kitchen'): void
  (e: 'print-comandas'): void
  (e: 'toggle-tab-selection', orderItemId: string): void
  // Issue #575
  (e: 'update:served-by', memberId: string | null): void
}

const props = withDefaults(defineProps<Props>(), {
  mesaMode: false,
  isAddingToTab: false,
  isLoadingTabItems: false,
  isClearingTab: false,
  tabItems: () => [],
  tabTotal: 0,
  tabItemsLoading: () => new Set(),
  comandasEnabled: false,
  unfiredCount: 0,
  isFiringToKitchen: false,
  canPrintComandas: false,
  selectedTabItemIds: () => [],
  pendingRemoveItemId: null,
  showServedByChip: false,
  servedByMemberId: null,
  members: () => [],
  showOpenSale: false,
  openSaleEnabled: false,
  openSalePrimaryIdle: false,
  hideProcessOrder: false,
  openSaleTooltip: null,
  showBarProcessOrder: false,
})

const hasCartItems = computed(() => props.items.length > 0)
const hasTabItems = computed(() => (props.tabItems?.length ?? 0) > 0)

const openSaleButtonClass = computed(() => [
  'min-h-[44px] rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-pointer',
  props.openSaleEnabled
    ? 'border-dashed border-primary/50 text-primary hover:bg-primary/5'
    : 'border-dashed border-border text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary',
])

const fireToKitchenLabel = computed(() => {
  const n = props.selectedTabItemIds?.length ?? 0
  if (n > 0) return `Enviar ${n} a cocina`
  return 'Enviar a cocina'
})
const emit = defineEmits<Emits>()

// Issue warocol.com#708 — mesa tab lines live outside posStore.cart; count both buckets.
const displayItemCount = computed(() =>
  props.mesaMode ? props.tabItems.length + props.items.length : props.items.length
)

// Issue #575 — handler for the served_by select
const onServedByChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:served-by', target.value || null)
}

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
