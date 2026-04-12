const _dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: '2-digit', year: '2-digit',
  timeZone: 'America/Bogota',
})

const _dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: '2-digit', year: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
  timeZone: 'America/Bogota',
})

export const useFormatters = () => {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No especificada'
    return _dateFormatter.format(new Date(dateString))
  }

  const formatDateShort = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    return _dateFormatter.format(new Date(dateString))
  }

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return '$0'
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return 'No especificada'
    return _dateTimeFormatter.format(new Date(dateString))
  }

  const formatRelativeDate = (dateString: string): string => {
    const diff = (new Date(dateString).getTime() - Date.now()) / 1000
    const rtf = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' })
    const abs = Math.abs(diff)
    if (abs < 60)   return rtf.format(Math.round(diff), 'second')
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
    if (abs < 2592000) return rtf.format(Math.round(diff / 86400), 'day')
    if (abs < 31536000) return rtf.format(Math.round(diff / 2592000), 'month')
    return rtf.format(Math.round(diff / 31536000), 'year')
  }

  return {
    formatDate,
    formatDateShort,
    formatCurrency,
    formatDateTime,
    formatRelativeDate,
  }
}
