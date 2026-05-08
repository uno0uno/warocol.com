/**
 * Expediter audio cue helper — issue #537.
 *
 * Plays a short chime when a comanda transitions to `ready` so the waiter
 * is alerted without watching the screen. Browser autoplay policy requires
 * the first user interaction to "unlock" audio playback — this composable
 * lazily creates the AudioContext on the first user-driven call to play().
 *
 * The enabled flag is persisted in localStorage so the operator's choice
 * survives page reloads.
 */

const STORAGE_KEY = 'waro:expediter:audio-enabled'

let audioCtx: AudioContext | null = null

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
    return audioCtx
  } catch {
    return null
  }
}

const playChime = () => {
  const ctx = getAudioContext()
  if (!ctx) return
  // Some browsers start the context in a "suspended" state until the first
  // user gesture. Resume() inside a click handler is what unlocks it.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})

  const now = ctx.currentTime
  // Two-tone gentle chime (G5 → C6) — pleasant, attention-getting but not alarming.
  const tones = [
    { freq: 784, start: 0,    duration: 0.12 },   // G5
    { freq: 1046, start: 0.13, duration: 0.18 },  // C6
  ]
  for (const t of tones) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(t.freq, now + t.start)
    gain.gain.setValueAtTime(0, now + t.start)
    gain.gain.linearRampToValueAtTime(0.18, now + t.start + 0.02)
    gain.gain.linearRampToValueAtTime(0, now + t.start + t.duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + t.start)
    osc.stop(now + t.start + t.duration)
  }
}

export const useExpediterAudio = () => {
  const initial =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_KEY) !== 'false' // default ON
      : true
  const enabled = useState<boolean>('expediter-audio-enabled', () => initial)

  const setEnabled = (value: boolean) => {
    enabled.value = value
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
    }
  }

  const playReadyChime = () => {
    if (!enabled.value) return
    playChime()
  }

  return { enabled, setEnabled, playReadyChime }
}
