import { ref } from 'vue'

/** Enum values for GET purchases `date_filter` (matches legacy FiltersBar + API). */
export const purchaseDateFilterOptions = [
  { label: 'Período', value: '' },
  { label: 'Hoy', value: 'today' },
  { label: 'Ayer', value: 'yesterday' },
  { label: 'Semana pasada', value: 'last_week' },
  { label: 'Últimos 15 días', value: '15_days' },
  { label: 'Último mes', value: '1_month' },
  { label: 'Últimos 3 meses', value: '3_months' },
] as const

export function usePurchaseDateFilter() {
  const dateFilter = ref('')

  const clearPurchaseDateFilter = () => {
    dateFilter.value = ''
  }

  return {
    dateFilter,
    purchaseDateFilterOptions,
    clearPurchaseDateFilter,
  }
}
