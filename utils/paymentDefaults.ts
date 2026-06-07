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
}

export interface PosPaymentGroup {
  id: string
  slug: string
  name: string
  triggersCartera: boolean
  /** COP prepayment wallet tender (api#369) */
  triggersWallet?: boolean
  methods: PosPaymentMethod[]
}

export type ApiPaymentGroup = Omit<PosPaymentGroup, 'triggersCartera' | 'triggersWallet' | 'methods'> & {
  triggersCartera?: boolean
  triggersWallet?: boolean
  methods?: PosPaymentMethod[]
}

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

/** Map a payment group slug to a Heroicon component. Falls back to CurrencyDollarIcon. */
export const SLUG_ICON_MAP: Record<string, typeof CurrencyDollarIcon> = {
  cash:    BanknotesIcon,
  card:    CreditCardIcon,
  digital: DevicePhoneMobileIcon,
  credit:  ClockIcon,
  [WALLET_PAYMENT_SLUG]: WalletIcon,
}

export const SLUG_ICON_FALLBACK = CurrencyDollarIcon
