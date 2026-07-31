/**
 * Official PrintBridge installer URLs (GitHub Releases).
 * Bump PRINTBRIDGE_RELEASE when upgrading the pinned agent build.
 */
export const PRINTBRIDGE_RELEASE = {
  tag: 'printbridge-v0.2.3',
  version: '0.2.3',
} as const

const BASE =
  `https://github.com/vergil-lai/print-bridge/releases/download/${PRINTBRIDGE_RELEASE.tag}`

export type PrintBridgeDownloadId =
  | 'windows'
  | 'macArm'
  | 'macIntel'
  | 'linuxDebAmd64'
  | 'linuxDebArm64'
  | 'linuxAppImageAmd64'

export type PrintBridgeDownload = {
  id: PrintBridgeDownloadId
  platform: 'windows' | 'mac' | 'linux'
  /** i18n key suffix under operaciones.impresoras.download.* */
  labelKey: string
  url: string
}

export const PRINTBRIDGE_DOWNLOADS: PrintBridgeDownload[] = [
  {
    id: 'windows',
    platform: 'windows',
    labelKey: 'windowsSetup',
    url: `${BASE}/PrintBridge_${PRINTBRIDGE_RELEASE.version}_x64-setup.exe`,
  },
  {
    id: 'macArm',
    platform: 'mac',
    labelKey: 'macArm',
    url: `${BASE}/PrintBridge_${PRINTBRIDGE_RELEASE.version}_aarch64.dmg`,
  },
  {
    id: 'macIntel',
    platform: 'mac',
    labelKey: 'macIntel',
    url: `${BASE}/PrintBridge_${PRINTBRIDGE_RELEASE.version}_x64.dmg`,
  },
  {
    id: 'linuxDebAmd64',
    platform: 'linux',
    labelKey: 'linuxDebAmd64',
    url: `${BASE}/PrintBridge_${PRINTBRIDGE_RELEASE.version}_amd64.deb`,
  },
  {
    id: 'linuxDebArm64',
    platform: 'linux',
    labelKey: 'linuxDebArm64',
    url: `${BASE}/PrintBridge_${PRINTBRIDGE_RELEASE.version}_arm64.deb`,
  },
  {
    id: 'linuxAppImageAmd64',
    platform: 'linux',
    labelKey: 'linuxAppImage',
    url: `${BASE}/PrintBridge_${PRINTBRIDGE_RELEASE.version}_amd64.AppImage`,
  },
]

export const PRINTBRIDGE_RELEASES_PAGE =
  'https://github.com/vergil-lai/print-bridge/releases'

/** Best-effort preferred download for this browser / OS. */
export function preferredPrintBridgeDownloadId(): PrintBridgeDownloadId {
  if (typeof navigator === 'undefined') return 'windows'
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const isMac = /Mac|iPhone|iPad/i.test(platform) || /Mac OS X/i.test(ua)
  const isWin = /Win/i.test(platform) || /Windows/i.test(ua)
  const isLinux = /Linux/i.test(platform) && !/Android/i.test(ua)

  if (isMac) {
    if (/Intel Mac OS X/i.test(ua) || /\(Intel/i.test(ua)) return 'macIntel'
    return 'macArm'
  }
  if (isWin) return 'windows'
  if (isLinux) {
    if (/aarch64|arm64/i.test(ua) || /aarch64|arm64/i.test(platform)) return 'linuxDebArm64'
    return 'linuxDebAmd64'
  }
  return 'windows'
}

export function openPrintBridgeDownload(url: string): void {
  if (typeof window === 'undefined') return
  window.open(url, '_blank', 'noopener,noreferrer')
}
