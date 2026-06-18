export const thermalReceiptPrintConfig = {
  paperWidthMm: 80,
  printableWidthMm: 72,
  pageMarginMm: 0,
  contentPaddingTopMm: 0,
  contentPaddingXMm: 2,
  contentPaddingBottomMm: 2,
  fontSizePt: 9,
  lineHeight: 1.2,
  logoMaxWidthMm: 66,
  logoMaxHeightMm: 24,
  logoTopOffsetMm: -4,
  logoBottomMarginMm: 1,
}

export function buildReceiptLogoStyle() {
  const cfg = thermalReceiptPrintConfig
  return {
    '--receipt-logo-max-width': `${cfg.logoMaxWidthMm}mm`,
    '--receipt-logo-max-height': `${cfg.logoMaxHeightMm}mm`,
    '--receipt-logo-margin': `${cfg.logoTopOffsetMm}mm auto ${cfg.logoBottomMarginMm}mm`,
  }
}
