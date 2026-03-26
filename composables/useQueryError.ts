/**
 * Extracts a human-readable error message from a $fetch error.
 * Follows the pattern used across all composables in this project.
 *
 * Usage:
 *   catch (err) {
 *     toast.error(extractApiError(err, 'No se pudo guardar'))
 *   }
 */
export function extractApiError(err: unknown, fallback = 'Error inesperado'): string {
  const e = err as { data?: { detail?: string }; message?: string }
  return e?.data?.detail || e?.message || fallback
}
