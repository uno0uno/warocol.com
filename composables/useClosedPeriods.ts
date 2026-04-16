/**
 * useClosedPeriods — monthly accounting period close
 * Fetches period status from the backend and exposes isOrderLocked().
 * Issue: https://github.com/uno0uno/warocol.com/issues/362
 */

export const useClosedPeriods = () => {
  // Set of 'YYYY-MM' strings for months that are closed
  const closedPeriods = ref<Set<string>>(new Set())

  /**
   * Returns true if the order's date falls in a closed monthly accounting period.
   */
  const isOrderLocked = (order: {
    order_date?: string
    orderDate?: string
    transactionDate?: string
    createdAt?: string
    created_at?: string
  }): boolean => {
    const dateStr = order.order_date ?? order.orderDate ?? order.transactionDate ?? order.createdAt ?? order.created_at
    if (!dateStr) return false
    const d = new Date(dateStr)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return closedPeriods.value.has(key)
  }

  /**
   * Fetch (or lazily create) the period record for the given year/month.
   * Updates the local closedPeriods set accordingly.
   * Returns 'open' | 'closed'.
   */
  const fetchPeriodStatus = async (year: number, month: number): Promise<string> => {
    try {
      const data = await $fetch<{ success: boolean; data: { status: string } }>(
        `/api/cierre/mensual/${year}/${month}/status`,
      )
      const status = data?.data?.status ?? 'open'
      const key = `${year}-${String(month).padStart(2, '0')}`
      if (status === 'closed') {
        closedPeriods.value = new Set([...closedPeriods.value, key])
      } else {
        const next = new Set(closedPeriods.value)
        next.delete(key)
        closedPeriods.value = next
      }
      return status
    } catch {
      return 'open'
    }
  }

  /**
   * Close the given month. Updates local state immediately.
   */
  const closePeriod = async (year: number, month: number, notes?: string): Promise<void> => {
    await $fetch(`/api/cierre/mensual/${year}/${month}/close`, {
      method: 'POST',
      body: { notes: notes ?? null },
    })
    const key = `${year}-${String(month).padStart(2, '0')}`
    closedPeriods.value = new Set([...closedPeriods.value, key])
  }

  return { closedPeriods, isOrderLocked, fetchPeriodStatus, closePeriod }
}
