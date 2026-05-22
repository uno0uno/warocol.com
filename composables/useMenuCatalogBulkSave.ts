import type { MenuBulkSaveResult } from '@/types/menu-catalog'

export type MenuSequentialRequest = {
  /** Optional label for logging */
  key?: string
  run: () => Promise<void>
}

/**
 * Runs async operations one after another; counts successes and failures.
 * Use for per-id PUT/POST/DELETE until #821 bulk endpoint exists.
 */
export async function runSequentialRequests(
  requests: MenuSequentialRequest[],
): Promise<MenuBulkSaveResult> {
  let ok = 0
  let fail = 0
  const errors: unknown[] = []

  for (const req of requests) {
    try {
      await req.run()
      ok++
    } catch (err) {
      fail++
      errors.push(err)
    }
  }

  return { ok, fail, errors: errors.length ? errors : undefined }
}

/**
 * Sequential PUT /api/menu/products/:id with the same or per-id body builder.
 */
export async function runSequentialProductPatches(
  ids: string[],
  buildBody: (id: string) => Record<string, unknown> | null | undefined,
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
        }),
    })
  }

  return runSequentialRequests(requests)
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
