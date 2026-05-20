/**
 * Despacho staff notification chime — issue #732.
 *
 * Plays when new notifications arrive (domicilio + mesa QR).
 * Uses the same asset as KDS but a separate localStorage flag so
 * muting comandas does not silence despacho alerts.
 */
import { readonly } from 'vue'

const STORAGE_KEY = 'despacho_notification_sound_enabled'
const SOUND_URL = '/sounds/kds-new-order.wav'

let _audioCtx: AudioContext | null = null
let _audioBuffer: AudioBuffer | null = null
let _prefetchStarted = false

const getEnabledFromStorage = (): boolean => {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) !== 'false'
}

const prefetchBuffer = async () => {
  if (typeof window === 'undefined') return
  if (_prefetchStarted && _audioBuffer) return
  _prefetchStarted = true
  try {
    if (!_audioCtx) _audioCtx = new AudioContext()
    if (!_audioBuffer) {
      const res = await fetch(SOUND_URL)
      if (!res.ok) return
      const raw = await res.arrayBuffer()
      _audioBuffer = await _audioCtx.decodeAudioData(raw)
    }
  } catch {
    /* network / decode — fail silently */
  }
}

export const useDespachoNotificationAudio = () => {
  const enabled = useState<boolean>('despacho-notification-sound-enabled', getEnabledFromStorage)

  const setEnabled = (value: boolean) => {
    enabled.value = value
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
    }
    if (value && _audioCtx?.state === 'suspended') {
      _audioCtx.resume().catch(() => {})
    }
  }

  const toggleEnabled = () => setEnabled(!enabled.value)

  /** Call inside a user gesture (bell click) to unlock AudioContext for autoplay. */
  const unlockFromGesture = () => {
    if (typeof window === 'undefined') return
    try {
      if (!_audioCtx) _audioCtx = new AudioContext()
      if (_audioCtx.state === 'suspended') {
        _audioCtx.resume().catch(() => {})
      }
      if (!_audioBuffer) prefetchBuffer()
    } catch {
      /* fail silently */
    }
  }

  const playChime = async () => {
    if (!enabled.value) return
    try {
      if (!_audioBuffer) await prefetchBuffer()
      if (!_audioCtx || !_audioBuffer) return
      if (_audioCtx.state === 'suspended') await _audioCtx.resume()
      if (_audioCtx.state !== 'running') return
      const src = _audioCtx.createBufferSource()
      src.buffer = _audioBuffer
      const gain = _audioCtx.createGain()
      gain.gain.value = 0.7
      src.connect(gain)
      gain.connect(_audioCtx.destination)
      src.start()
    } catch {
      /* autoplay blocked — fail silently */
    }
  }

  return {
    enabled: readonly(enabled),
    setEnabled,
    toggleEnabled,
    unlockFromGesture,
    playChime,
    prefetchBuffer,
  }
}
