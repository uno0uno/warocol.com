// Composable para gestión de estados de compras
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

  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'destructive' | 'secondary' | 'primary' => {
    switch (status) {
      // 📋 Pre-compra (Gris - Neutral)
      case 'quotation':
        return 'secondary'

      // ⏳ Requiere acción (Amarillo/Naranja - Atención)
      case 'pending':
        return 'warning'

      // ✅ Confirmada (Primario - Importante pero en proceso)
      case 'confirmed':
        return 'primary'

      // 🔄 En preparación/tránsito (Azul - Informativo, en movimiento)
      case 'preparing':
      case 'shipped':
        return 'info'

      // 📦 Recibida (Verde claro - Éxito parcial)
      case 'received':
        return 'success'

      // ✅ Verificada (Verde - Éxito)
      case 'verified':
        return 'success'

      // 📄 Facturada (Gris - Neutral, esperando pago)
      case 'invoiced':
        return 'secondary'

      // 💰 Pagada (Verde - Completado exitosamente)
      case 'paid':
        return 'success'

      // ❌ Problemas (Rojo - Destructivo)
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
