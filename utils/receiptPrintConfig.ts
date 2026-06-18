export const thermalReceiptPrintConfig = {
  paperWidthMm: 58,
  printableWidthMm: 52,
  pageMarginMm: 0,
  contentPaddingTopMm: 0,
  contentPaddingXMm: 1,
  contentPaddingBottomMm: 8,
  fontSizePt: 9.5,
  lineHeight: 1.2,
  logoMaxWidthMm: 46,
  logoMaxHeightMm: 20,
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
