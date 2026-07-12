import { computed, ref } from 'vue'

/** Enum values for GET purchases `date_filter` (matches legacy FiltersBar + API). */
export function usePurchaseDateFilter() {
  const { t } = useI18n({ useScope: 'global' })
  const dateFilter = ref('')
  const purchaseDateFilterOptions = computed(() => [
    { label: t('common.period'), value: '' },
    { label: t('common.datePresets.today'), value: 'today' },
    { label: t('common.datePresets.yesterday'), value: 'yesterday' },
    { label: t('common.datePresets.lastWeek'), value: 'last_week' },
    { label: t('common.datePresets.last15'), value: '15_days' },
    { label: t('common.datePresets.lastMonth'), value: '1_month' },
    { label: t('common.datePresets.last90'), value: '3_months' },
  ])

  const clearPurchaseDateFilter = () => {
    dateFilter.value = ''
  }

  return {
    dateFilter,
    purchaseDateFilterOptions,
    clearPurchaseDateFilter,
  }
}
