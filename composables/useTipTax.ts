/** warocol.com#740 — client-side tip tax preview (mirrors api tip_tax_service). */
export type TipTaxConfig = {
  inc_applicable?: boolean
  inc_rate?: number
  inc_included_in_price?: boolean
  iva_applicable?: boolean
  iva_rate?: number
  iva_included_in_price?: boolean
}

export function computeTipTaxAmount(
  tipAmount: number,
  tipTaxable: boolean,
  taxConfig: TipTaxConfig | null | undefined,
): number {
  if (!tipTaxable || !tipAmount || tipAmount <= 0 || !taxConfig) return 0
  const amount = Number(tipAmount)
  if (taxConfig.inc_applicable) {
    const rate = Number(taxConfig.inc_rate ?? 0.08)
    if (taxConfig.inc_included_in_price) return Math.round(amount * rate / (1 + rate))
    return Math.round(amount * rate)
  }
  if (taxConfig.iva_applicable) {
    const rate = Number(taxConfig.iva_rate ?? 0.19)
    if (taxConfig.iva_included_in_price) return Math.round(amount * rate / (1 + rate))
    return Math.round(amount * rate)
  }
  return 0
}

export function tipSettlementTotal(tipAmount: number, tipTaxAmount: number): number {
  return Number(tipAmount || 0) + Number(tipTaxAmount || 0)
}

/** Strip rate suffix from labels like "IVA 16%" → "IVA". */
export function shortTaxNameFromLabel(label: string | null | undefined): string {
  const raw = String(label || '').trim()
  if (!raw) return ''
  return raw.replace(/\s*\d+([.,]\d+)?\s*%?\s*$/u, '').trim()
}

/**
 * Country-aware tax names for Operaciones → Propinas help copy (warocol.com#1922).
 * Non-CO tenants must never see hard-coded "IVA o INC".
 */
export function tipHelpTaxNames(options: {
  countryCode?: string | null
  taxConfig?: TipTaxConfig | null
  primaryTaxLabel?: string | null
} = {}): string {
  const country = String(options.countryCode || '').toUpperCase()
  const cfg = options.taxConfig

  if (country === 'CO') {
    if (cfg?.inc_applicable && cfg?.iva_applicable) return 'IVA o INC'
    if (cfg?.inc_applicable) return 'INC'
    if (cfg?.iva_applicable) return 'IVA'
    return 'IVA o INC'
  }

  const fromLabel = shortTaxNameFromLabel(options.primaryTaxLabel)
  if (fromLabel) return fromLabel

  // Sensible fallbacks when preset/label is missing
  if (country === 'MX' || country === 'GT' || country === 'CR' || country === 'AR' || country === 'CL') {
    return 'IVA'
  }
  if (country === 'PA') return 'ITBMS'
  if (country === 'DO') return 'ITBIS'
  if (country === 'PE') return 'IGV'
  if (country === 'UY') return 'IVA'
  return 'IVA'
}

export function tipPreselectUsesColombiaLaw(countryCode?: string | null): boolean {
  return String(countryCode || '').toUpperCase() === 'CO'
}
