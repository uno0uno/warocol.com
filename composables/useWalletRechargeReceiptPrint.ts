import { nextTick } from 'vue'
import { notifyCajaPrintResult, useCajaTicketPrint } from '~/composables/useCajaTicketPrint'
import { collectThermalTicketText } from '~/utils/receiptTicketPlainText'

const TICKET_ELEMENT_ID = 'wallet-recharge-print-ticket'
const BODY_PRINT_CLASS = 'printing-receipt-ticket'

export function useWalletRechargeReceiptPrint() {
  const { t } = useI18n({ useScope: 'global' })
  const toast = useToast()
  const { printElement: printTicketElement, getCachedCajaPrinterName } = useCajaTicketPrint()

  const printWalletRechargeTicket = async (options?: { auto?: boolean }) => {
    const cachedCaja = getCachedCajaPrinterName()
    if (options?.auto && !String(cachedCaja || '').trim()) {
      return
    }

    if (options?.auto === false && typeof cachedCaja !== 'undefined' && !String(cachedCaja || '').trim()) {
      document.body.classList.add(BODY_PRINT_CLASS)
      await nextTick()
      const earlyCleanup = () => {
        document.body.classList.remove(BODY_PRINT_CLASS)
        window.removeEventListener('afterprint', earlyCleanup)
      }
      window.addEventListener('afterprint', earlyCleanup)
      window.print()
      window.setTimeout(earlyCleanup, 1500)
      return
    }

    document.body.classList.add(BODY_PRINT_CLASS)
    await nextTick()
    const cleanup = () => {
      document.body.classList.remove(BODY_PRINT_CLASS)
      window.removeEventListener('afterprint', cleanup)
    }
    const syncBrowserPrint = typeof window !== 'undefined' ? window.print.bind(window) : () => {}
    let browserPrintFiredSync = false
    const skipBrowserFallback = options?.auto === true

    const printResult = await printTicketElement(TICKET_ELEMENT_ID, {
      browserPrint: () => {
        if (skipBrowserFallback) return
        browserPrintFiredSync = true
        syncBrowserPrint()
      },
      getElementHtml: () => {
        if (typeof document === 'undefined') return null
        return collectThermalTicketText(document.querySelector(`#${TICKET_ELEMENT_ID}`)) || null
      },
    })

    if (printResult.mode === 'bridge') {
      cleanup()
      if (!options?.auto) {
        notifyCajaPrintResult(printResult, {
          t,
          toast,
          onRetry: () => { void printWalletRechargeTicket() },
          onBrowserPrint: () => {
            document.body.classList.add(BODY_PRINT_CLASS)
            window.addEventListener('afterprint', cleanup)
            window.setTimeout(cleanup, 1500)
            syncBrowserPrint()
          },
        })
      }
      return
    }
    if (printResult.mode === 'skipped') {
      cleanup()
      return
    }
    if (!skipBrowserFallback) {
      window.addEventListener('afterprint', cleanup)
      if (!browserPrintFiredSync) syncBrowserPrint()
      window.setTimeout(cleanup, 1500)
    }
    else {
      cleanup()
    }
  }

  return { printWalletRechargeTicket }
}
