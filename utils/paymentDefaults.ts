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

export const WALLET_PAYMENT_SLUG = 'customer_wallet'

export const PAYMENT_DEFAULTS: PosPaymentGroup[] = [
  { id: 'cash',    slug: 'cash',    name: 'Efectivo', triggersCartera: false, methods: [] },
  { id: 'card',    slug: 'card',    name: 'Datáfono', triggersCartera: false, methods: [] },
  { id: 'digital', slug: 'digital', name: 'QR',       triggersCartera: false, methods: [] },
  { id: 'credit',  slug: 'credit',  name: 'Crédito',  triggersCartera: true,  methods: [] },
  { id: 'customer_wallet', slug: WALLET_PAYMENT_SLUG, name: 'Saldo wallet', triggersCartera: false, triggersWallet: true, methods: [] },
]

/** Map a payment group slug to a Heroicon component. Falls back to CurrencyDollarIcon. */
export const SLUG_ICON_MAP: Record<string, typeof CurrencyDollarIcon> = {
  cash:    BanknotesIcon,
  card:    CreditCardIcon,
  digital: DevicePhoneMobileIcon,
  credit:  ClockIcon,
  [WALLET_PAYMENT_SLUG]: WalletIcon,
}

export const SLUG_ICON_FALLBACK = CurrencyDollarIcon
