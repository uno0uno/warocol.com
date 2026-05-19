import { usePOSStore } from '~/stores/usePOSStore'

export interface TableQrPaymentIntent {
  payment_method: string
  payment_method_id?: string | null
}

type TableSessionRefreshHandler = (tableId: string) => void | Promise<void>

let refreshHandler: TableSessionRefreshHandler | null = null
let mutationActiveChecker: (() => boolean) | null = null

function paymentIntentKey(tableId: string) {
  return `tableQrPaymentIntent:${tableId}`
}

/** POS index registers its refreshTableSession here (warocol.com#715). */
export function registerTableSessionRefresh(
  handler: TableSessionRefreshHandler,
  options?: { isMutationActive?: () => boolean },
) {
  refreshHandler = handler
  mutationActiveChecker = options?.isMutationActive ?? null

  onScopeDispose(() => {
    if (refreshHandler === handler) {
      refreshHandler = null
      mutationActiveChecker = null
    }
  })
}

export function storeTableQrPaymentIntent(tableId: string, intent: TableQrPaymentIntent) {
  if (!import.meta.client || !intent.payment_method) return
  sessionStorage.setItem(paymentIntentKey(tableId), JSON.stringify(intent))
}

/** Read payment intent set by Despacho after QR accept (does not clear). */
export function readTableQrPaymentIntent(tableId: string): TableQrPaymentIntent | null {
  if (!import.meta.client) return null
  const raw = sessionStorage.getItem(paymentIntentKey(tableId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as TableQrPaymentIntent
  } catch {
    return null
  }
}

export function clearTableQrPaymentIntent(tableId: string) {
  if (!import.meta.client) return
  sessionStorage.removeItem(paymentIntentKey(tableId))
}

/** Invalidate table session cache and refresh POS tab if that mesa is open. */
export async function notifyTableSessionUpdated(tableId: string) {
  const cache = useQueryCache()
  await cache.invalidateQueries({ key: ['tables', tableId, 'current'] })
  await cache.invalidateQueries({ key: ['tables'] })

  const posStore = usePOSStore()
  if (posStore.activeTableSession?.tableId !== tableId) return
  if (mutationActiveChecker?.()) return
  await refreshHandler?.(tableId)
}
