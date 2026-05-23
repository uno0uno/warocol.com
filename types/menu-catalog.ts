/** Partial body for PUT /api/menu/products/:id (catalog bulk + edit save). */
export type MenuProductBulkPatch = {
  name?: string
  category_id?: string
  price?: number
  costo_percibido?: number | null
  is_available?: boolean
  is_available_online?: boolean
  is_available_table_qr?: boolean
  station_id?: string | null
}

export type MenuBulkSaveResult = {
  ok: number
  fail: number
  errors?: unknown[]
}

export type ProductDraft = {
  name: string
  category_id: string
  price: number
  costo_percibido: number | null
  is_available: boolean
  is_available_online: boolean
  is_available_table_qr: boolean
  station_id: string | null
  originalName: string
  originalCategoryId: string
  originalPrice: number
  originalCostoPercibido: number | null
  originalIsAvailable: boolean
  originalIsAvailableOnline: boolean
  originalIsAvailableTableQr: boolean
  originalStationId: string | null
}

export type ProductDraftSource = {
  id: string
  name: string
  is_resale?: boolean
  category_id?: string
  category_name?: string
  price: number
  costo_percibido?: number | string | null
  is_available?: boolean
  is_available_online?: boolean
  is_available_table_qr?: boolean
  station_id?: string | null
  open_priced?: boolean
}

export type MenuCatalogBulkFieldState = {
  bulkCategoryId: string
  bulkStationId: string
  bulkAvailability: string
  bulkInCatalog: string
  bulkOnline: string
  bulkQr: string
}
