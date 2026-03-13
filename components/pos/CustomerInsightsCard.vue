<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  customerId: string | null
}>()

interface CustomerInsights {
  orders_count: number
  last_order_date: string | null
  avg_ticket: number | null
  top_product_name: string | null
  top_product_count: number | null
  avg_days_between_visits: number | null
}

const insights = ref<CustomerInsights | null>(null)
const loading = ref(false)
const showSkeleton = ref(false)

const { formatCurrency, formatRelativeDate } = useFormatters()

const fetchInsights = async (id: string | null) => {
  insights.value = null
  loading.value = false
  showSkeleton.value = false

  if (!id) return

  loading.value = true

  // Anti-flash: only show skeleton if fetch takes > 200ms
  const skeletonTimer = setTimeout(() => {
    if (loading.value) showSkeleton.value = true
  }, 200)

  try {
    const res = await $fetch<{ success: boolean; data: CustomerInsights }>(
      `/api/customers/${id}/insights`
    )
    insights.value = res.data
  } catch {
    insights.value = null
  } finally {
    clearTimeout(skeletonTimer)
    loading.value = false
    showSkeleton.value = false
  }
}

watch(() => props.customerId, fetchInsights, { immediate: true })

const hasData = computed(() => insights.value !== null && insights.value.orders_count > 0)
</script>

<template>
  <!-- Only render when there's actual purchase history -->
  <div v-if="showSkeleton || hasData" class="mb-5">

    <!-- Skeleton state -->
    <div v-if="showSkeleton" class="grid grid-cols-3 gap-2">
      <UiSkeleton v-for="i in 3" :key="i" shape="rounded" class="h-16" />
    </div>

    <!-- Data state: orders_count > 0 -->
    <div v-else-if="hasData && insights">
      <!-- 3-tile grid -->
      <div class="grid grid-cols-3 gap-2 mb-2">

        <!-- Visitas -->
        <div class="bg-surface-secondary rounded-xl p-3 flex flex-col gap-1">
          <div class="flex items-center gap-1.5">
            <!-- chart-bar icon -->
            <svg class="h-3.5 w-3.5 text-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
            <span class="text-[10px] text-text-tertiary font-medium leading-none">Visitas</span>
          </div>
          <span class="text-lg font-bold text-text-primary leading-none">{{ insights.orders_count }}</span>
        </div>

        <!-- Ticket promedio -->
        <div class="bg-surface-secondary rounded-xl p-3 flex flex-col gap-1">
          <div class="flex items-center gap-1.5">
            <!-- banknotes icon -->
            <svg class="h-3.5 w-3.5 text-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            <span class="text-[10px] text-text-tertiary font-medium leading-none">T. prom.</span>
          </div>
          <span class="text-sm font-bold text-text-primary leading-none">
            {{ insights.avg_ticket ? formatCurrency(insights.avg_ticket) : '—' }}
          </span>
        </div>

        <!-- Más pide -->
        <div class="bg-surface-secondary rounded-xl p-3 flex flex-col gap-1">
          <div class="flex items-center gap-1.5">
            <!-- star icon -->
            <svg class="h-3.5 w-3.5 text-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <span class="text-[10px] text-text-tertiary font-medium leading-none">Más pide</span>
          </div>
          <span class="text-sm font-bold text-text-primary leading-none truncate" :title="insights.top_product_name ?? ''">
            {{ insights.top_product_name ?? '—' }}
          </span>
        </div>
      </div>

      <!-- Secondary row: Última visita + Frecuencia -->
      <div class="flex items-center gap-3 px-1">
        <span v-if="insights.last_order_date" class="text-xs text-text-tertiary">
          {{ formatRelativeDate(insights.last_order_date) }}
        </span>
        <span v-if="insights.last_order_date && insights.avg_days_between_visits" class="text-text-tertiary/40 text-xs">·</span>
        <span v-if="insights.avg_days_between_visits" class="text-xs text-text-tertiary">
          cada {{ Math.round(insights.avg_days_between_visits) }} días
        </span>
      </div>
    </div>

  </div>
</template>
