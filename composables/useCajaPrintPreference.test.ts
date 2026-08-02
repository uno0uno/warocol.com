import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import {
  CAJA_PRINT_FORCE_BROWSER_KEY,
  __resetCajaPrintPreferenceRefsForTests,
  clearCajaPrintForceBrowser,
  enableCajaPrintForceBrowser,
  isCajaPrintForceBrowser,
  useCajaPrintPreference,
} from './useCajaPrintPreference'

function installMemoryLocalStorage() {
  const store = new Map<string, string>()
  const memoryStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, String(value)) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: memoryStorage },
    configurable: true,
    writable: true,
  })
}

describe('useCajaPrintPreference', () => {
  beforeEach(() => {
    installMemoryLocalStorage()
    __resetCajaPrintPreferenceRefsForTests()
    localStorage.removeItem(CAJA_PRINT_FORCE_BROWSER_KEY)
  })

  afterEach(() => {
    __resetCajaPrintPreferenceRefsForTests()
    localStorage.removeItem(CAJA_PRINT_FORCE_BROWSER_KEY)
  })

  it('defaults to not forcing browser', () => {
    expect(isCajaPrintForceBrowser()).toBe(false)
  })

  it('persists enable/clear in localStorage', () => {
    enableCajaPrintForceBrowser()
    expect(localStorage.getItem(CAJA_PRINT_FORCE_BROWSER_KEY)).toBe('1')
    expect(isCajaPrintForceBrowser()).toBe(true)

    clearCajaPrintForceBrowser()
    expect(localStorage.getItem(CAJA_PRINT_FORCE_BROWSER_KEY)).toBe(null)
    expect(isCajaPrintForceBrowser()).toBe(false)
  })

  it('keeps reactive banner flag in sync across composable instances', () => {
    const a = useCajaPrintPreference()
    const b = useCajaPrintPreference()
    expect(a.forceBrowser.value).toBe(false)

    a.enableForceBrowser()
    expect(a.forceBrowser.value).toBe(true)
    expect(b.forceBrowser.value).toBe(true)

    b.clearForceBrowser()
    expect(a.forceBrowser.value).toBe(false)
    expect(b.forceBrowser.value).toBe(false)
  })
})
