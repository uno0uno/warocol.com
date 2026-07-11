// Composable for online order status management (delivery, pickup, dine-in)
// Shared by: pages/domicilios/pedidos/index.vue and pages/domicilios/pedidos/[id]/index.vue
export const useOnlineOrderStatus = () => {
  const { t } = useI18n({ useScope: 'global' })

  const getStatusText = (status: string, orderType?: string): string => {
    if (status === 'completed' && orderType === 'delivery') return t('despacho.orderStatuses.accepted')
    const statusMap: Record<string, string> = {
      pending:   t('despacho.orderStatuses.pending'),
      confirmed: t('despacho.orderStatuses.confirmed'),
      preparing: t('despacho.orderStatuses.preparing'),
      delivered: t('despacho.orderStatuses.delivered'),
      completed: t('despacho.orderStatuses.completed'),
      cancelled: t('despacho.orderStatuses.cancelled'),
    }
    return statusMap[status] || status
  }

  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'destructive' | 'secondary' | 'primary' => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'confirmed':
        return 'primary'
      case 'preparing':
        return 'info'
      case 'delivered':
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return {
    getStatusText,
    getStatusVariant,
  }
}
