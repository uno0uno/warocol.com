export const thermalReceiptPrintConfig = {
  paperWidthMm: 80,
  printableWidthMm: 72,
  pageMarginMm: 0,
  contentPaddingTopMm: 0,
  contentPaddingXMm: 2,
  contentPaddingBottomMm: 8,
  fontSizePt: 10,
  lineHeight: 1.2,
  logoMaxWidthMm: 60,
  logoMaxHeightMm: 22,
  logoTopOffsetMm: -2,
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
