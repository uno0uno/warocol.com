/**
 * Expediter / mesero alert when cocina marks a comanda ready (SSE).
 * Separate from KDS and Despacho sounds — uses public/sounds/comanda-ready.wav.
 */
import { readonly } from 'vue'

const STORAGE_KEY = 'comanda_ready_sound_enabled'
const SOUND_URL = '/sounds/comanda-ready.wav'

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
    /* fail silently */
  }
}

export const useComandaReadyAudio = () => {
  const enabled = useState<boolean>('comanda-ready-sound-enabled', getEnabledFromStorage)

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
      gain.gain.value = 0.75
      src.connect(gain)
      gain.connect(_audioCtx.destination)
      src.start()
    } catch {
      /* autoplay blocked */
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
