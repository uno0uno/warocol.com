import { buildReceiptEscpos, type EscposReceiptInput } from '~/utils/receiptEscpos'

declare global {
  interface Window {
    qz?: any
    __waroQzLoadPromise?: Promise<any>
  }
}

const QZ_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js'

function loadQz(): Promise<any> {
  if (!import.meta.client) return Promise.resolve(null)
  if (window.qz) return Promise.resolve(window.qz)
  if (window.__waroQzLoadPromise) return window.__waroQzLoadPromise

  window.__waroQzLoadPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = QZ_SCRIPT_URL
    script.async = true
    script.onload = () => resolve(window.qz ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })

  return window.__waroQzLoadPromise
}

async function connectQz(qz: any) {
  qz.api?.setPromiseType?.((resolver: any) => new Promise(resolver))
  qz.security?.setCertificatePromise?.((resolve: (cert: string) => void) => resolve(''))
  qz.security?.setSignaturePromise?.(() => (resolve: (signature: string) => void) => resolve(''))
  if (qz.websocket?.isActive?.()) return true
  await qz.websocket.connect({ retries: 1, delay: 300 })
  return qz.websocket?.isActive?.() === true
}

export function useQzTrayPrint() {
  const toast = useToast()

  const printReceiptViaQz = async (receipt: EscposReceiptInput): Promise<boolean> => {
    if (!import.meta.client) return false
    const qz = await loadQz()
    if (!qz) return false

    try {
      await connectQz(qz)
      const printer = await qz.printers.getDefault()
      if (!printer) return false
      const config = qz.configs.create(printer, { encoding: 'UTF-8' })
      await qz.print(config, [{
        type: 'raw',
        format: 'plain',
        data: buildReceiptEscpos(receipt),
      }])
      toast.success(`Enviado a ${printer}`, { title: 'Impresión térmica' })
      return true
    } catch (error: any) {
      console.warn('[qz-print] Falling back to browser print', error)
      toast.error('No se pudo imprimir directo con QZ Tray. Se abrirá la impresión del navegador.', {
        title: 'QZ Tray no disponible',
      })
      return false
    }
  }

  return { printReceiptViaQz }
}
