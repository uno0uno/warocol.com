<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })

interface TopProduct {
  name: string
  count: number
}

interface CustomerInsights {
  orders_count: number
  last_order_date: string | null
  avg_ticket: number | null
  top_products: TopProduct[] | null
  avg_days_between_visits: number | null
}

defineProps<{
  insights: CustomerInsights
}>()

const formatCurrency = (value: number | null) => {
  if (value === null) return '—'
  return new Intl.NumberFormat(locale.value === 'en' ? 'en-US' : 'es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

const formatRelativeDate = (dateString: string | null): string => {
  if (!dateString) return '—'
  const rtf = new Intl.RelativeTimeFormat(locale.value === 'en' ? 'en' : 'es', { numeric: 'auto' })
  const diffMs = new Date(dateString).getTime() - Date.now()
  const diffDays = Math.round(diffMs / 86400000)
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / 3600000)
    return Math.abs(diffHours) < 1 ? t('pos.customerInsights.justNow') : rtf.format(diffHours, 'hour')
  }
  return rtf.format(diffDays, 'day')
}

const frequencyLabel = (days: number | null) =>
  days ? t('pos.customerInsights.everyDays', { count: Math.round(days) }) : '—'
</script>

<template>
  <div>
  <!-- 2×2 metric tiles -->
  <div class="p-4 grid grid-cols-2 gap-2.5">

    <!-- Visitas -->
    <div class="bg-surface-secondary rounded-xl p-4 flex flex-col gap-2">
      <svg class="h-4 w-4 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
      <div>
        <p class="text-2xl font-bold text-text-primary leading-none">{{ insights.orders_count }}</p>
        <p class="text-xs text-text-tertiary mt-1 leading-none">{{ t('pos.customerInsights.visits') }}</p>
      </div>
    </div>

    <!-- Ticket promedio -->
    <div class="bg-surface-secondary rounded-xl p-4 flex flex-col gap-2">
      <svg class="h-4 w-4 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
      <div>
        <p class="text-base font-bold text-text-primary leading-tight">{{ formatCurrency(insights.avg_ticket) }}</p>
        <p class="text-xs text-text-tertiary mt-1 leading-none">{{ t('pos.customerInsights.avgTicket') }}</p>
      </div>
    </div>

    <!-- Última visita -->
    <div class="bg-surface-secondary rounded-xl p-4 flex flex-col gap-2">
      <svg class="h-4 w-4 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
      <div>
        <p class="text-sm font-bold text-text-primary leading-tight">{{ formatRelativeDate(insights.last_order_date) }}</p>
        <p class="text-xs text-text-tertiary mt-1 leading-none">{{ t('pos.customerInsights.lastVisit') }}</p>
      </div>
    </div>

    <!-- Frecuencia -->
    <div class="bg-surface-secondary rounded-xl p-4 flex flex-col gap-2">
      <svg class="h-4 w-4 text-text-tertiary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
      <div>
        <p class="text-sm font-bold text-text-primary leading-tight">
          {{ frequencyLabel(insights.avg_days_between_visits) }}
        </p>
        <p class="text-xs text-text-tertiary mt-1 leading-none">{{ t('pos.customerInsights.frequency') }}</p>
      </div>
    </div>

  </div>

  <!-- Top productos -->
  <div v-if="insights.top_products && insights.top_products.length > 0" class="px-4 pb-4">
    <p class="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
      <svg class="h-3.5 w-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
      </svg>
      {{ t('pos.customerInsights.topProducts') }}
    </p>
    <div class="space-y-1.5">
      <div
        v-for="(product, index) in insights.top_products"
        :key="index"
        class="flex items-center gap-2.5 px-3 py-2 rounded-lg"
        :class="index === 0 ? 'bg-primary/5 border border-primary/15' : 'bg-surface-secondary'"
      >
        <span
          class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          :class="index === 0 ? 'bg-primary/15 text-primary' : 'bg-surface text-text-tertiary'"
        >
          {{ index + 1 }}
        </span>
        <span class="flex-1 text-sm font-medium text-text-primary truncate leading-tight">{{ product.name }}</span>
        <span class="text-xs text-text-tertiary flex-shrink-0">{{ product.count }}×</span>
      </div>
    </div>
  </div>
  </div>
</template>
