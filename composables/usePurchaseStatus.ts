export const usePurchaseStatus = () => {
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      quotation: 'Cotización',
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      preparing: 'En Preparación',
      shipped: 'Enviada',
      received: 'Recibida',
      verified: 'Verificada',
      invoiced: 'Facturada',
      paid: 'Pagada',
      cancelled: 'Cancelada',
      overdue: 'Vencida'
    }
    return statusMap[status] || status
  }

  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'quotation':
        return 'info'
      case 'pending':
        return 'warning'
      case 'confirmed':
      case 'preparing':
      case 'shipped':
        return 'info'
      case 'received':
      case 'verified':
      case 'paid':
        return 'success'
      case 'invoiced':
        return 'secondary'
      case 'cancelled':
      case 'overdue':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getPaymentTypeText = (paymentType: string): string => {
    const typeMap: Record<string, string> = {
      contado: 'Contado',
      credito: 'Crédito'
    }
    return typeMap[paymentType] || paymentType
  }

  return {
    getStatusText,
    getStatusVariant,
    getPaymentTypeText
  }
}
