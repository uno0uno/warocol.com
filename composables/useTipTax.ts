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
