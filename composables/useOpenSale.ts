import { computed, type ComputedRef, type Ref } from 'vue'
import type { ActiveTableSession, CartItem } from '~/stores/usePOSStore'

export interface OpenSaleProduct {
  id: string
  name: string
}

const MAX_OPEN_SALE_AMOUNT = 99_999_999

export function useOpenSale(options: {
  settingsData: Ref<{ success?: boolean; data?: { open_sale_product?: OpenSaleProduct | null } } | undefined>
  isMesaMode: Ref<boolean> | ComputedRef<boolean>
  activeTableSession: Ref<ActiveTableSession | null>
}) {
  const openSaleProduct = computed(
    () => options.settingsData.value?.data?.open_sale_product ?? null,
  )

  /** Counter, or bar session — excludes real mesa tab mode (#797). */
  const showOpenSaleButton = computed(() => {
    if (options.isMesaMode.value) {
      return !!options.activeTableSession.value?.isBar
    }
    return true
  })

  const openSaleEnabled = computed(() => !!openSaleProduct.value)

  const openSaleDisabledReason = computed(() => {
    if (openSaleProduct.value) return null
    return 'Configura un producto de venta libre en el menú (marca open_priced en un producto).'
  })

  const validateOpenSaleAmount = (raw: string | number): number => {
    const amount = Math.round(Number(raw))
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Ingresa un monto mayor a cero')
    }
    if (amount > MAX_OPEN_SALE_AMOUNT) {
      throw new Error('El monto es demasiado alto')
    }
    return amount
  }

  const buildOpenSaleCartLine = (
    amount: number,
    description?: string,
  ): Omit<CartItem, 'quantity'> & { quantity: number } => {
    const shell = openSaleProduct.value
    if (!shell) {
      throw new Error('No hay producto de venta libre configurado')
    }
    const trimmed = description?.trim()
    const displayName = trimmed || shell.name
    const notes = trimmed ? `VARIOS: ${trimmed}` : undefined

    return {
      product: {
        id: shell.id,
        name: displayName,
        price: amount,
        image: '💵',
        category: 'Venta libre',
      },
      quantity: 1,
      modifiers: [],
      notes,
      is_open_sale: true,
    }
  }

  return {
    openSaleProduct,
    showOpenSaleButton,
    openSaleEnabled,
    openSaleDisabledReason,
    validateOpenSaleAmount,
    buildOpenSaleCartLine,
  }
}
