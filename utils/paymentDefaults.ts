import {
  BanknotesIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  CurrencyDollarIcon,
  WalletIcon,
} from '@heroicons/vue/24/outline'

export interface PosPaymentMethod {
  id: string
  name: string
  glAccountCode?: string | null
}

export interface PosPaymentGroup {
  id: string
  slug: string
  name: string
  triggersCartera: boolean
  /** COP prepayment wallet tender (api#369) */
  triggersWallet?: boolean
  glAccountCode?: string | null
  methods: PosPaymentMethod[]
}

export type ApiPaymentGroup = Omit<PosPaymentGroup, 'triggersCartera' | 'triggersWallet' | 'methods'> & {
  triggersCartera?: boolean
  triggersWallet?: boolean
  methods?: PosPaymentMethod[]
}

// POS contract: wallet is a payment tender slug, not a discount or WaRo redemption.
export const WALLET_PAYMENT_SLUG = 'customer_wallet'

export const PAYMENT_DEFAULTS: PosPaymentGroup[] = [
  { id: 'cash',    slug: 'cash',    name: 'Efectivo', triggersCartera: false, methods: [] },
  { id: 'card',    slug: 'card',    name: 'Datáfono', triggersCartera: false, methods: [] },
  { id: 'digital', slug: 'digital', name: 'QR',       triggersCartera: false, methods: [] },
  { id: 'credit',  slug: 'credit',  name: 'Crédito',  triggersCartera: true,  methods: [] },
  { id: 'customer_wallet', slug: WALLET_PAYMENT_SLUG, name: 'Saldo wallet', triggersCartera: false, triggersWallet: true, methods: [] },
]

/** Synthetic POS groups kept client-side (not stored in payment_method_groups). */
export const SYNTHETIC_POS_PAYMENT_SLUGS = [WALLET_PAYMENT_SLUG] as const

/** POS-only tenders that must not appear on supplier purchase payment pickers (#1823). */
export const PURCHASE_EXCLUDED_PAYMENT_SLUGS = ['credit', WALLET_PAYMENT_SLUG] as const

/** Till cash group slug (api-warolabs#786 / warocol.com#2135). */
export const CASH_PAYMENT_SLUG = 'cash'

export function isCashPaymentSlug(slug: string | null | undefined): boolean {
  return (slug || '').trim().toLowerCase() === CASH_PAYMENT_SLUG
}

/** UI: show de caja / fuera de caja only for cash tender (#2141). */
export function shouldShowCashDrawerToggle(slug: string | null | undefined): boolean {
  return isCashPaymentSlug(slug)
}

/** FormData for expense/purchase /pay when method is cash. */
export function appendCashDrawerFormField(
  payload: FormData,
  paymentMethodSlug: string | null | undefined,
  fromCashDrawer: boolean,
): void {
  if (!isCashPaymentSlug(paymentMethodSlug)) return
  payload.append('from_cash_drawer', String(fromCashDrawer))
}

/** Resolve group slug from a select value that may be a group slug or method UUID. */
export function resolvePaymentGroupSlug(
  value: string | null | undefined,
  groups: PosPaymentGroup[],
): string | null {
  if (!value) return null
  const v = String(value).trim()
  for (const group of groups) {
    if (group.slug === v) return group.slug
    if (group.methods.some(m => m.id === v)) return group.slug
  }
  return isCashPaymentSlug(v) ? CASH_PAYMENT_SLUG : v
}

export function isCashPaymentSelection(
  value: string | null | undefined,
  groups: PosPaymentGroup[],
): boolean {
  return isCashPaymentSlug(resolvePaymentGroupSlug(value, groups))
}

/** Normalize API camelCase / snake_case drawer flag (default true = left the till). */
export function readFromCashDrawer(
  record: Record<string, unknown> | null | undefined,
): boolean {
  if (!record) return true
  const raw = record.fromCashDrawer ?? record.from_cash_drawer
  if (raw === undefined || raw === null) return true
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    if (normalized === 'false' || normalized === '0') return false
    if (normalized === 'true' || normalized === '1') return true
  }
  return Boolean(raw)
}

/**
 * Merge tenant API payment groups with synthetic defaults (e.g. customer_wallet).
 * The wallet tender is handled in checkout logic but is not a DB-configured group.
 */
export function mergePosPaymentGroupsFromApi(
  apiGroups: ApiPaymentGroup[],
): PosPaymentGroup[] {
  if (!apiGroups.length) return [...PAYMENT_DEFAULTS]
  const merged: PosPaymentGroup[] = apiGroups.map(g => ({
    ...g,
    triggersCartera: g.triggersCartera ?? g.slug === 'credit',
    triggersWallet: g.triggersWallet ?? g.slug === WALLET_PAYMENT_SLUG,
    methods: g.methods ?? [],
  }))
  for (const fallback of PAYMENT_DEFAULTS) {
    if (
      SYNTHETIC_POS_PAYMENT_SLUGS.includes(fallback.slug as typeof SYNTHETIC_POS_PAYMENT_SLUGS[number])
      && !merged.some(g => g.slug === fallback.slug)
    ) {
      merged.push({ ...fallback })
    }
  }
  return merged
}

/** Drop wallet + credit groups from Compra Directa / supplier purchase UIs. POS unchanged. */
export function filterPurchasePaymentGroups(
  groups: PosPaymentGroup[],
): PosPaymentGroup[] {
  const excluded = new Set<string>(PURCHASE_EXCLUDED_PAYMENT_SLUGS)
  return groups.filter(g => !excluded.has(g.slug))
}

/** Map a payment group slug to a Heroicon component. Falls back to CurrencyDollarIcon. */
export const SLUG_ICON_MAP: Record<string, typeof CurrencyDollarIcon> = {
  cash:    BanknotesIcon,
  card:    CreditCardIcon,
  digital: DevicePhoneMobileIcon,
  credit:  ClockIcon,
  [WALLET_PAYMENT_SLUG]: WalletIcon,
}

export const SLUG_ICON_FALLBACK = CurrencyDollarIcon
