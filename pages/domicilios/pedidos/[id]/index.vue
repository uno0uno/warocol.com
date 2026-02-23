<script setup lang="ts">
definePageMeta({ layout: 'dashboard', ssr: false })
useHead({ title: 'Detalle Pedido — WARO' })

const route = useRoute()
const orderId = route.params.id as string
const { formatDate, formatDateTime, formatCurrency } = useFormatters()

const { data: orderResponse, pending: isLoading, error: fetchError } =
  useFetch(() => `/api/online/orders/${orderId}`, { server: false })

const order = computed(() => (orderResponse.value as any)?.data ?? null)

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'Domicilio',
  pickup: 'Recogida',
  'dine-in': 'En mesa',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const STATUS_VARIANTS: Record<string, string> = {
  pending: 'warning',
  confirmed: 'warning',
  preparing: 'info',
  delivered: 'success',
  completed: 'success',
  cancelled: 'destructive',
}
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar el pedido.</p>
        <p class="text-sm text-text-secondary mb-4">{{ fetchError.message }}</p>
        <NuxtLink
          to="/domicilios/pedidos"
          class="min-h-[44px] px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center"
        >
          Volver al Listado
        </NuxtLink>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="order" class="space-y-4 sm:space-y-6">

      <!-- ── Section 1: Header Cards ── -->
      <PurchasesPurchaseOrderHeader>
        <!-- Card 1: Order number + date -->
        <PurchasesPurchaseInfoCard
          label="Pedido"
          icon-path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        >
          <p class="text-lg font-semibold text-text-primary">#{{ order.order_number }}</p>
          <p class="text-sm text-text-secondary">{{ formatDate(order.order_date) }}</p>
        </PurchasesPurchaseInfoCard>

        <!-- Card 2: Customer + order type -->
        <PurchasesPurchaseInfoCard
          label="Cliente"
          icon-path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        >
          <p class="text-sm font-semibold text-text-primary break-all">{{ order.verified_email ?? '—' }}</p>
          <UiStatusBadge
            variant="info"
            format="text"
            class="mt-1 border-0"
          >
            {{ ORDER_TYPE_LABELS[order.order_type] ?? order.order_type }}
          </UiStatusBadge>
        </PurchasesPurchaseInfoCard>

        <!-- Card 3: Status -->
        <PurchasesPurchaseInfoCard
          label="Estado"
          icon-path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        >
          <UiStatusBadge
            :variant="(STATUS_VARIANTS[order.status] as any) ?? 'secondary'"
            format="text"
            size="lg"
            class="border-0"
          >
            {{ STATUS_LABELS[order.status] ?? order.status }}
          </UiStatusBadge>
        </PurchasesPurchaseInfoCard>
      </PurchasesPurchaseOrderHeader>

      <!-- ── Section 2: Items ── -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2 mb-4 sm:mb-6">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Productos ({{ order.items.length }})</span>
        </h3>

        <!-- Mobile: Cards -->
        <div class="md:hidden space-y-2">
          <div
            v-for="(item, index) in order.items"
            :key="item.id"
            class="rounded-xl border border-border bg-background overflow-hidden"
          >
            <!-- Card header -->
            <div class="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b border-border">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {{ index + 1 }}
                </span>
                <h4 class="text-sm font-semibold text-text-primary leading-tight">{{ item.product_name }}</h4>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0">
                <span class="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 tabular-nums">
                  {{ item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity }}
                </span>
                <span class="text-xs text-text-secondary">ud.</span>
              </div>
            </div>
            <!-- Card body -->
            <div class="px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p class="text-[11px] text-text-secondary mb-0.5 uppercase tracking-wide">Precio unit.</p>
                <p class="text-sm font-medium text-text-primary">{{ formatCurrency(item.unit_price) }}</p>
              </div>
              <div class="h-8 w-px bg-border" />
              <div class="text-right">
                <p class="text-[11px] text-text-secondary mb-0.5 uppercase tracking-wide">Subtotal</p>
                <p class="text-base font-bold text-text-primary">{{ formatCurrency(item.subtotal) }}</p>
              </div>
            </div>
            <!-- Modifiers -->
            <div v-if="item.modifiers.length > 0" class="px-4 pb-3 space-y-0.5">
              <p
                v-for="mod in item.modifiers"
                :key="mod.name"
                class="text-xs text-text-secondary"
              >
                + {{ mod.name }} <span class="tabular-nums">({{ formatCurrency(mod.price) }})</span>
              </p>
            </div>
          </div>

          <!-- Mobile total -->
          <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
            <span class="text-sm font-medium text-primary">Total del pedido</span>
            <span class="text-lg font-bold text-primary">{{ formatCurrency(order.total_amount) }}</span>
          </div>
        </div>

        <!-- Desktop: Table -->
        <div class="hidden md:block rounded-xl border border-border overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="bg-surface-secondary border-b border-border">
                <th class="w-8 px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">#</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">Producto</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider w-20 border-r border-dashed border-border/60">Cant.</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-dashed border-border/60">Precio unit.</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <template v-for="(item, index) in order.items" :key="item.id">
                <!-- Product row -->
                <tr class="bg-surface hover:bg-surface-secondary/60 transition-colors duration-100">
                  <td class="px-4 py-3.5 text-center border-r border-dashed border-border/60">
                    <span class="text-xs font-medium text-text-secondary tabular-nums">{{ index + 1 }}</span>
                  </td>
                  <td class="px-4 py-3.5 border-r border-dashed border-border/60">
                    <span class="text-sm font-semibold text-text-primary">{{ item.product_name }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-right border-r border-dashed border-border/60">
                    <span class="text-sm font-semibold text-text-primary tabular-nums">
                      {{ item.quantity % 1 === 0 ? item.quantity.toFixed(0) : item.quantity }}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-right border-r border-dashed border-border/60">
                    <span class="text-sm text-text-primary tabular-nums">{{ formatCurrency(item.unit_price) }}</span>
                  </td>
                  <td class="px-4 py-3.5 text-right">
                    <span class="text-sm font-bold text-text-primary tabular-nums">{{ formatCurrency(item.subtotal) }}</span>
                  </td>
                </tr>
                <!-- Modifier rows -->
                <tr
                  v-for="mod in item.modifiers"
                  :key="mod.name"
                  class="bg-surface-secondary/30"
                >
                  <td class="border-r border-dashed border-border/60" />
                  <td colspan="3" class="px-4 py-1.5 border-r border-dashed border-border/60">
                    <span class="text-xs text-text-secondary pl-4">↳ {{ mod.name }}</span>
                  </td>
                  <td class="px-4 py-1.5 text-right">
                    <span class="text-xs text-text-secondary tabular-nums">+{{ formatCurrency(mod.price) }}</span>
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr class="bg-primary/5 border-t-2 border-primary/20">
                <td colspan="4" class="px-4 py-3.5 text-sm font-semibold text-text-secondary text-right border-r border-dashed border-border/60">
                  Total del pedido
                </td>
                <td class="px-4 py-3.5 text-right">
                  <span class="text-base font-bold text-primary tabular-nums">{{ formatCurrency(order.total_amount) }}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- ── Section 3: Delivery / pickup info ── -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <!-- Delivery -->
        <template v-if="order.order_type === 'delivery'">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2 mb-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Dirección de entrega</span>
          </h3>
          <div v-if="order.delivery_address" class="space-y-1 text-sm text-text-primary">
            <p class="font-medium">
              {{ order.delivery_address.address_line1 }}
              <span v-if="order.delivery_address.address_line2">, {{ order.delivery_address.address_line2 }}</span>
            </p>
            <p class="text-text-secondary">{{ order.delivery_address.city }}</p>
            <p v-if="order.delivery_address.delivery_notes" class="text-text-secondary italic">
              {{ order.delivery_address.delivery_notes }}
            </p>
            <p v-if="order.delivery_address.label" class="text-xs text-text-secondary/70">
              {{ order.delivery_address.label }}
            </p>
          </div>
          <div
            v-if="order.delivery_instructions"
            class="mt-3 pt-3 border-t border-border"
          >
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Instrucciones de entrega</p>
            <p class="text-sm text-text-primary">{{ order.delivery_instructions }}</p>
          </div>
        </template>

        <!-- Pickup -->
        <template v-else-if="order.order_type === 'pickup'">
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2 mb-3">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Recogida en tienda</span>
          </h3>
          <p v-if="order.scheduled_time" class="text-sm text-text-secondary">
            Hora de recogida: <span class="font-medium text-text-primary">{{ formatDateTime(order.scheduled_time) }}</span>
          </p>
          <p v-else class="text-sm text-text-secondary">Sin hora programada — entrega inmediata</p>
          <div v-if="order.delivery_instructions" class="mt-3 pt-3 border-t border-border">
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Notas</p>
            <p class="text-sm text-text-primary">{{ order.delivery_instructions }}</p>
          </div>
        </template>

        <!-- Dine-in -->
        <template v-else>
          <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>En mesa</span>
          </h3>
        </template>
      </div>

      <!-- ── Section 4: Order summary ── -->
      <div class="bg-surface border-2 border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-text-primary flex items-center space-x-2 mb-4">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>Resumen del pedido</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-background rounded-lg p-3 border border-border">
            <p class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Hora programada</p>
            <p class="text-sm font-semibold text-text-primary">
              {{ order.scheduled_time ? formatDateTime(order.scheduled_time) : 'Inmediato' }}
            </p>
          </div>
          <div class="bg-primary/10 rounded-lg p-3 border border-primary/20">
            <p class="text-xs font-medium text-primary uppercase tracking-wide mb-1">Total del pedido</p>
            <p class="text-xl font-bold text-primary tabular-nums">{{ formatCurrency(order.total_amount) }}</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
