// Composable for online order status management (delivery, pickup, dine-in)
// Shared by: pages/domicilios/pedidos/index.vue and pages/domicilios/pedidos/[id]/index.vue
export const useOnlineOrderStatus = () => {
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      pending:   'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'En preparación',
      delivered: 'Entregado',
      completed: 'Completado',
      cancelled: 'Cancelado',
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
