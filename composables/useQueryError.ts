/**
 * Extracts a human-readable error message from a $fetch error.
 * Follows the pattern used across all composables in this project.
 *
 * Usage:
 *   catch (err) {
 *     toast.error(extractApiError(err, 'No se pudo guardar'))
 *   }
 */
import { isSessionAuthError } from './useSessionExpiry'

export function extractApiError(err: unknown, fallback = 'Error inesperado'): string {
  if (isSessionAuthError(err)) {
    return 'Tu sesion expiro. Inicia sesion de nuevo para continuar.'
  }

  const e = err as { data?: { detail?: string }; message?: string }
  return e?.data?.detail || e?.message || fallback
}
