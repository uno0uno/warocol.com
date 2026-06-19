export const thermalReceiptPrintConfig = {
  paperWidthMm: 80,
  printableWidthMm: 64,
  pageMarginMm: 0,
  contentPaddingTopMm: 0,
  contentPaddingXMm: 1.5,
  contentPaddingBottomMm: 14,
  fontSizePt: 9.5,
  lineHeight: 1.2,
  logoMaxWidthMm: 54,
  logoMaxHeightMm: 22,
  logoTopOffsetMm: 0,
  logoBottomMarginMm: 1,
  driverTopFeedCompensationMm: 0,
}

export function buildReceiptLogoStyle() {
  const cfg = thermalReceiptPrintConfig
  return {
    '--receipt-logo-max-width': `${cfg.logoMaxWidthMm}mm`,
    '--receipt-logo-max-height': `${cfg.logoMaxHeightMm}mm`,
    '--receipt-logo-margin': `${cfg.logoTopOffsetMm}mm auto ${cfg.logoBottomMarginMm}mm`,
  }
}
