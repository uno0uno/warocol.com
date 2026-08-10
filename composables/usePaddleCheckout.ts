/**
 * Paddle.js Billing overlay helper (#2205).
 * Opens an existing transaction via ?_ptxn= / Checkout.open({ transactionId }).
 */
const PADDLE_JS_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'
const DONE_KEY_PREFIX = 'waro_paddle_txn_done:'

type PaddleEvent = {
  name?: string
  type?: string
  data?: Record<string, unknown>
}

type PaddleCheckoutOpenOptions = {
  transactionId: string
  settings?: { displayMode?: 'overlay' | 'inline'; theme?: 'light' | 'dark' }
}

type PaddleApi = {
  Environment: { set: (env: 'sandbox' | 'production') => void }
  Initialize: (opts: {
    token: string
    eventCallback?: (event: PaddleEvent) => void
  }) => void
  Checkout: { open: (opts: PaddleCheckoutOpenOptions) => void }
}

declare global {
  interface Window {
    Paddle?: PaddleApi
  }
}

let scriptPromise: Promise<void> | null = null
let initializedToken: string | null = null

function loadPaddleScript (): Promise<void> {
  if (!import.meta.client) return Promise.resolve()
  if (window.Paddle) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PADDLE_JS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Paddle.js failed to load')))
      if (window.Paddle) resolve()
      return
    }
    const script = document.createElement('script')
    script.src = PADDLE_JS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Paddle.js failed to load'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

function txnDoneKey (transactionId: string) {
  return `${DONE_KEY_PREFIX}${transactionId}`
}

export function isPaddleTransactionMarkedDone (transactionId: string): boolean {
  if (!import.meta.client) return false
  try {
    return sessionStorage.getItem(txnDoneKey(transactionId)) === '1'
  } catch {
    return false
  }
}

export function markPaddleTransactionDone (transactionId: string) {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(txnDoneKey(transactionId), '1')
  } catch {
    /* ignore quota / private mode */
  }
}

export function usePaddleCheckout () {
  const config = useRuntimeConfig()

  const clientToken = computed(() => String(config.public.paddleClientToken || '').trim())
  const paddleEnv = computed(() => {
    const raw = String(config.public.paddleEnvironment || 'sandbox').trim().toLowerCase()
    return raw === 'production' || raw === 'live' ? 'production' : 'sandbox'
  })

  async function ensureInitialized (eventCallback?: (event: PaddleEvent) => void) {
    const token = clientToken.value
    if (!token) {
      throw new Error('missing_paddle_client_token')
    }
    await loadPaddleScript()
    const paddle = window.Paddle
    if (!paddle) throw new Error('paddle_js_unavailable')

    if (initializedToken !== token) {
      if (paddleEnv.value === 'sandbox') {
        paddle.Environment.set('sandbox')
      }
      paddle.Initialize({
        token,
        eventCallback,
      })
      initializedToken = token
    }
    return paddle
  }

  async function openTransactionCheckout (
    transactionId: string,
    handlers?: {
      onCompleted?: () => void
      onClosed?: () => void
      onError?: (message: string) => void
    },
  ) {
    if (!transactionId.startsWith('txn_')) {
      throw new Error('invalid_paddle_transaction_id')
    }
    if (isPaddleTransactionMarkedDone(transactionId)) {
      handlers?.onCompleted?.()
      return { opened: false as const, reason: 'already_done' as const }
    }

    const paddle = await ensureInitialized((event) => {
      const name = event.name || event.type || ''
      if (name === 'checkout.completed') {
        markPaddleTransactionDone(transactionId)
        handlers?.onCompleted?.()
      } else if (name === 'checkout.closed') {
        handlers?.onClosed?.()
      } else if (name === 'checkout.error' || name === 'checkout.warning') {
        const detail = String(event.data?.error || event.data?.message || name)
        handlers?.onError?.(detail)
      }
    })

    paddle.Checkout.open({
      transactionId,
      settings: { displayMode: 'overlay', theme: 'light' },
    })
    return { opened: true as const, reason: 'opened' as const }
  }

  return {
    clientToken,
    paddleEnv,
    openTransactionCheckout,
    isPaddleTransactionMarkedDone,
    markPaddleTransactionDone,
  }
}
