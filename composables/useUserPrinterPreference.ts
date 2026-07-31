/**
 * Per-user single printer preference for auto-comanda print (warocol.com#1971).
 * localStorage only — max one printer name per profile id.
 */
const STORAGE_PREFIX = 'waro:user-printer:'

export function userPrinterStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId || 'anon'}`
}

export function getUserPrinterName(userId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(userPrinterStorageKey(userId))
    const name = (raw || '').trim()
    return name || null
  } catch {
    return null
  }
}

/** Persist at most one printer; empty/null clears. */
export function setUserPrinterName(userId: string, printerName: string | null | undefined): void {
  if (typeof window === 'undefined') return
  const key = userPrinterStorageKey(userId)
  const name = (printerName || '').trim()
  try {
    if (!name) localStorage.removeItem(key)
    else localStorage.setItem(key, name)
  } catch {
    /* ignore quota / private mode */
  }
}
