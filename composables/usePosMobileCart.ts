// composables/usePosMobileCart.ts
// Module-level singleton — layout ↔ POS page (same pattern as useLayoutActions).
import { readonly, ref } from 'vue'

const _itemCount = ref(0)
const _formattedTotal = ref('$0')
const _sheetOpen = ref(false)
let _openCartHandler: (() => void) | undefined

export const usePosMobileCart = () => {
  const setMobileCart = (itemCount: number, formattedTotal: string) => {
    _itemCount.value = itemCount
    _formattedTotal.value = formattedTotal
  }

  const setOpenCartHandler = (handler: (() => void) | undefined) => {
    _openCartHandler = handler
  }

  const openCart = () => {
    _openCartHandler?.()
  }

  const clearMobileCart = () => {
    _itemCount.value = 0
    _formattedTotal.value = '$0'
    _sheetOpen.value = false
    _openCartHandler = undefined
  }

  const setMobileCartSheetOpen = (open: boolean) => {
    _sheetOpen.value = open
  }

  return {
    itemCount: readonly(_itemCount),
    formattedTotal: readonly(_formattedTotal),
    sheetOpen: readonly(_sheetOpen),
    setMobileCart,
    setOpenCartHandler,
    setMobileCartSheetOpen,
    openCart,
    clearMobileCart,
  }
}
