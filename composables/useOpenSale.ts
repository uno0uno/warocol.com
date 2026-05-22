import { computed, type ComputedRef, type Ref } from 'vue'
import type { ActiveTableSession, CartItem } from '~/stores/usePOSStore'

export interface OpenSaleProduct {
  id: string
  name: string
}

export interface OpenSaleSettings {
  open_sale_enabled?: boolean
  open_sale_product?: OpenSaleProduct | null
}

const MAX_OPEN_SALE_AMOUNT = 99_999_999

export function useOpenSale(options: {
  settingsData: Ref<{ success?: boolean; data?: OpenSaleSettings } | undefined>
  isMesaMode: Ref<boolean> | ComputedRef<boolean>
  activeTableSession: Ref<ActiveTableSession | null>
}) {
  const openSaleProduct = computed(
    () => options.settingsData.value?.data?.open_sale_product ?? null,
  )

  /** Master switch from Operaciones → Personalizar (#805). */
  const openSaleFeatureOn = computed(
    () => options.settingsData.value?.data?.open_sale_enabled === true,
  )

  /** Visible only when toggle ON and shell product is active. */
  const openSaleVisible = computed(
    () => openSaleFeatureOn.value && !!openSaleProduct.value,
  )

  /** Counter, or bar session — excludes real mesa tab mode (#797). */
  const showOpenSaleButton = computed(() => {
    if (!openSaleVisible.value) return false
    if (options.isMesaMode.value) {
      return !!options.activeTableSession.value?.isBar
    }
    return true
  })

  /** Real table session only (not bar) — warocol.com#797. */
  const showOpenSaleOnMesa = computed(
    () => openSaleVisible.value && options.isMesaMode.value,
  )

  const openSaleEnabled = computed(() => openSaleVisible.value)

  const openSaleDisabledReason = computed(() => null)

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

  const buildOpenSaleTabItem = (amount: number, description?: string) => {
    const shell = openSaleProduct.value
    if (!shell) {
      throw new Error('No hay producto de venta libre configurado')
    }
    const trimmed = description?.trim()
    const notes = trimmed ? `VARIOS: ${trimmed}` : null
    return {
      product_id: shell.id,
      quantity: 1,
      unit_price: amount,
      modifiers: [] as Array<{ id: string; name: string; price: number }>,
      notes,
    }
  }

  return {
    openSaleProduct,
    openSaleFeatureOn,
    openSaleVisible,
    showOpenSaleButton,
    showOpenSaleOnMesa,
    openSaleEnabled,
    openSaleDisabledReason,
    validateOpenSaleAmount,
    buildOpenSaleCartLine,
    buildOpenSaleTabItem,
  }
}
