import type { MenuBulkSaveResult } from '@/types/menu-catalog'

export type MenuSequentialRequest = {
  /** Optional label for logging */
  key?: string
  run: () => Promise<void>
}

/** Default parallel in-flight requests per batch (#821). */
export const MENU_CATALOG_SAVE_CONCURRENCY = 8

/**
 * Practical max items per client batch (matches GET /menu/products limit=250).
 * Larger sets should be chunked in a follow-up.
 */
export const MENU_CATALOG_BATCH_MAX = 250

export type RunConcurrentOptions = {
  /** Max parallel requests; default {@link MENU_CATALOG_SAVE_CONCURRENCY}. */
  concurrency?: number
}

/**
 * Runs requests with bounded concurrency (Promise pool + per-item try/catch).
 * Returns aggregate ok/fail counts for catalog toasts.
 */
export async function runConcurrentRequests(
  requests: MenuSequentialRequest[],
  options: RunConcurrentOptions = {},
): Promise<MenuBulkSaveResult> {
  if (requests.length === 0) {
    return { ok: 0, fail: 0 }
  }

  const concurrency = Math.max(
    1,
    Math.min(options.concurrency ?? MENU_CATALOG_SAVE_CONCURRENCY, requests.length),
  )

  let ok = 0
  let fail = 0
  const errors: unknown[] = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < requests.length) {
      const current = nextIndex++
      const req = requests[current]
      try {
        await req.run()
        ok++
      } catch (err) {
        fail++
        errors.push(err)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  return { ok, fail, errors: errors.length ? errors : undefined }
}

/**
 * Bounded-concurrency batch helper (name kept for #823 callers).
 * Use {@link runConcurrentRequests} for explicit options.
 */
export async function runSequentialRequests(
  requests: MenuSequentialRequest[],
  options?: RunConcurrentOptions,
): Promise<MenuBulkSaveResult> {
  return runConcurrentRequests(requests, options)
}

/**
 * Parallel PUT /api/menu/products/:id with the same or per-id body builder.
 */
export async function runSequentialProductPatches(
  ids: string[],
  buildBody: (id: string) => Record<string, unknown> | null | undefined,
  options?: RunConcurrentOptions,
): Promise<MenuBulkSaveResult> {
  const requests: MenuSequentialRequest[] = []

  for (const id of ids) {
    const body = buildBody(id)
    if (body == null) continue
    requests.push({
      key: id,
      run: () =>
        $fetch(`/api/menu/products/${id}`, {
          method: 'PUT',
          body,
        }).then(() => undefined),
    })
  }

  return runConcurrentRequests(requests, options)
}

type ToastCatalogBulkOptions = {
  title: string
  /** e.g. "Actualizados" — noun phrase without count */
  successLabel?: string
  emptySuccessMessage?: string
  /** Toast title when some requests fail (default: `${title} parcial` or `Parcial` when title is Listo) */
  partialTitle?: string
  errorMessage?: string
}

/**
 * Standard toast copy for catalog bulk/update saves (productos / reventa).
 */
export function toastCatalogBulkResult(
  result: MenuBulkSaveResult,
  toast: ReturnType<typeof useToast>,
  options: ToastCatalogBulkOptions,
) {
  const { ok, fail } = result
  const label = options.successLabel ?? 'Actualizados'
  const title = options.title

  if (fail === 0) {
    if (ok > 0) {
      toast.success(`${label} ${ok} producto${ok !== 1 ? 's' : ''}`, { title })
    } else if (options.emptySuccessMessage) {
      toast.success(options.emptySuccessMessage, { title })
    }
  } else if (ok > 0) {
    const partialTitle =
      options.partialTitle ?? (title === 'Listo' ? 'Parcial' : `${title} parcial`)
    toast.warning(`${label} ${ok}, fallaron ${fail}`, { title: partialTitle })
  } else {
    toast.error(options.errorMessage ?? 'No se pudo guardar ningún producto', { title: 'Error' })
  }
}

type ToastCatalogDeleteOptions = {
  title?: string
}

export type MenuBulkDeleteResult = MenuBulkSaveResult & { archived: number }

/**
 * Toast for bulk DELETE with optional archive count from API.
 */
export function toastCatalogDeleteResult(
  result: MenuBulkDeleteResult,
  toast: ReturnType<typeof useToast>,
  options: ToastCatalogDeleteOptions = {},
) {
  const { ok, fail, archived } = result
  const title = options.title ?? 'Listo'

  if (fail === 0) {
    const msg =
      archived > 0
        ? `${ok} producto${ok !== 1 ? 's' : ''} procesado${ok !== 1 ? 's' : ''} (${archived} archivado${archived !== 1 ? 's' : ''})`
        : `${ok} producto${ok !== 1 ? 's' : ''} eliminado${ok !== 1 ? 's' : ''}`
    toast.success(msg, { title })
  } else if (ok > 0) {
    toast.warning(`Procesados ${ok}, fallaron ${fail}`, { title: 'Parcial' })
  } else {
    toast.error('Error al eliminar', { title: 'Error' })
  }
}
