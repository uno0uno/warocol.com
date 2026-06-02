/**
 * POS checkout / customer / cart diagnostics.
 * Enabled when `import.meta.dev` or `localStorage.setItem('waro_pos_debug', '1')`.
 * Filter DevTools console with: `[pos-debug]`
 */
export function isPosDebugEnabled(): boolean {
  if (import.meta.dev) return true
  if (import.meta.server) return false
  try {
    return localStorage.getItem('waro_pos_debug') === '1'
  } catch {
    return false
  }
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    const data = e.data
    return {
      message: e.message ?? String(error),
      status: e.statusCode ?? e.status,
      ...(data && typeof data === 'object' ? { data } : {}),
    }
  }
  return { message: String(error) }
}

export function posDebugLog(
  scope: string,
  event: string,
  payload?: Record<string, unknown>,
): void {
  if (!isPosDebugEnabled()) return
  const line = payload ? { scope, event, ...payload } : { scope, event }
  console.info('[pos-debug]', line)
}

export { serializeError as posDebugSerializeError }
