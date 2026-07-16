export const ONBOARDING_WELCOME_STORAGE_KEY = 'waro:onboarding:welcome'
export const ONBOARDING_WELCOME_TTL_MS = 15 * 60 * 1000

type WelcomeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const markOnboardingWelcome = (
  storage: WelcomeStorage,
  now = Date.now(),
) => {
  storage.setItem(ONBOARDING_WELCOME_STORAGE_KEY, String(now))
}

export const clearOnboardingWelcome = (storage: WelcomeStorage) => {
  storage.removeItem(ONBOARDING_WELCOME_STORAGE_KEY)
}

export const hasOnboardingWelcome = (
  storage: WelcomeStorage,
  now = Date.now(),
) => {
  const createdAt = Number(storage.getItem(ONBOARDING_WELCOME_STORAGE_KEY))
  const isValid = Number.isFinite(createdAt)
    && createdAt > 0
    && now >= createdAt
    && now - createdAt <= ONBOARDING_WELCOME_TTL_MS

  if (!isValid) clearOnboardingWelcome(storage)
  return isValid
}

interface CountdownOptions {
  seconds: number
  onTick: (remaining: number) => void
  onComplete: () => void
  setIntervalFn?: typeof setInterval
  clearIntervalFn?: typeof clearInterval
}

export const createOnboardingWelcomeCountdown = ({
  seconds,
  onTick,
  onComplete,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}: CountdownOptions) => {
  let remaining = Math.max(0, Math.floor(seconds))
  let interval: ReturnType<typeof setInterval> | null = null
  let completed = false

  const clear = () => {
    if (interval === null) return
    clearIntervalFn(interval)
    interval = null
  }

  const cancel = () => {
    clear()
    completed = true
  }

  const finish = () => {
    if (completed) return
    completed = true
    clear()
    onComplete()
  }

  const start = () => {
    if (completed || interval !== null) return
    onTick(remaining)
    if (remaining === 0) {
      finish()
      return
    }
    interval = setIntervalFn(() => {
      if (completed) return
      remaining = Math.max(0, remaining - 1)
      onTick(remaining)
      if (remaining === 0) finish()
    }, 1000)
  }

  return { start, cancel }
}
