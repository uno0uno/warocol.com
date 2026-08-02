/**
 * Sticky “print caja tickets via browser” preference (#2060).
 * Set when cashier chooses browser after an unconfirmed thermal print;
 * cleared explicitly when they switch back to the thermal printer.
 */
import { ref, type Ref } from 'vue'

export const CAJA_PRINT_FORCE_BROWSER_KEY = 'waro.cajaPrint.forceBrowser'

export function isCajaPrintForceBrowser(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(CAJA_PRINT_FORCE_BROWSER_KEY) === '1'
  } catch {
    return false
  }
}

export function enableCajaPrintForceBrowser(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CAJA_PRINT_FORCE_BROWSER_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
  syncForceBrowserRefs(true)
}

export function clearCajaPrintForceBrowser(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CAJA_PRINT_FORCE_BROWSER_KEY)
  } catch {
    /* ignore */
  }
  syncForceBrowserRefs(false)
}

/** Shared reactive flag so POS/ventas banners update when sticky mode toggles. */
const forceBrowserRefs = new Set<Ref<boolean>>()

function syncForceBrowserRefs(value: boolean): void {
  for (const r of forceBrowserRefs) r.value = value
}

export function useCajaPrintPreference() {
  const forceBrowser = ref(isCajaPrintForceBrowser())
  forceBrowserRefs.add(forceBrowser)

  function enableForceBrowser(): void {
    enableCajaPrintForceBrowser()
  }

  function clearForceBrowser(): void {
    clearCajaPrintForceBrowser()
  }

  return {
    forceBrowser,
    enableForceBrowser,
    clearForceBrowser,
  }
}

/** Test helper — drop reactive listeners between suites. */
export function __resetCajaPrintPreferenceRefsForTests(): void {
  forceBrowserRefs.clear()
}
