import { describe, expect, it } from 'bun:test'
import {
  PRINTBRIDGE_DOWNLOADS,
  PRINTBRIDGE_RELEASE,
  preferredPrintBridgeDownloadId,
} from './printBridgeDownloads'

describe('printBridgeDownloads', () => {
  it('pins release assets under GitHub downloads', () => {
    expect(PRINTBRIDGE_DOWNLOADS.length).toBeGreaterThanOrEqual(5)
    for (const d of PRINTBRIDGE_DOWNLOADS) {
      expect(d.url).toContain(PRINTBRIDGE_RELEASE.tag)
      expect(d.url.startsWith('https://github.com/vergil-lai/print-bridge/releases/download/')).toBe(true)
    }
  })

  it('returns a known preferred id', () => {
    expect(PRINTBRIDGE_DOWNLOADS.some(d => d.id === preferredPrintBridgeDownloadId())).toBe(true)
  })
})
