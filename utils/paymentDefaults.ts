import {
  BanknotesIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  CurrencyDollarIcon,
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
  methods: PosPaymentMethod[]
}

export const PAYMENT_DEFAULTS: PosPaymentGroup[] = [
  { id: 'cash',    slug: 'cash',    name: 'Efectivo', triggersCartera: false, methods: [] },
  { id: 'card',    slug: 'card',    name: 'Datáfono', triggersCartera: false, methods: [] },
  { id: 'digital', slug: 'digital', name: 'QR',       triggersCartera: false, methods: [] },
  { id: 'credit',  slug: 'credit',  name: 'Crédito',  triggersCartera: true,  methods: [] },
]

/** Map a payment group slug to a Heroicon component. Falls back to CurrencyDollarIcon. */
export const SLUG_ICON_MAP: Record<string, typeof CurrencyDollarIcon> = {
  cash:    BanknotesIcon,
  card:    CreditCardIcon,
  digital: DevicePhoneMobileIcon,
  credit:  ClockIcon,
}

export const SLUG_ICON_FALLBACK = CurrencyDollarIcon
