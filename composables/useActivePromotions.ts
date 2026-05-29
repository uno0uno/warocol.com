import { computed, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { $fetch } from 'ofetch'
import type { PromotionScheduleRow } from '~/utils/promotionPreview'
import { BOGOTA_TZ } from '~/utils/bogotaDate'

export interface ActivePromotionRow {
  id: string
  name: string
  promo_type: string
  scope_type: string
  schedules: PromotionScheduleRow[]
  is_currently_active?: boolean
}

const MIN_REFETCH_MS = 30_000
const MAX_REFETCH_MS = 5 * 60_000

function bogotaNowParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>
  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  const weekday = weekdayMap[parts.weekday] ?? 0
  const [hour, minute] = parts.hour.split(':').map(Number)
  return { weekday, minutes: hour * 60 + minute }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

/** Ms until the next schedule start/end in Bogotá (for mid-shift refresh). */
export function msUntilNextPromoBoundary(
  schedules: PromotionScheduleRow[],
  now = new Date(),
): number {
  if (schedules.length === 0) return MAX_REFETCH_MS

  const { weekday, minutes: nowMin } = bogotaNowParts(now)
  const todayBit = 1 << weekday
  let bestMs = MAX_REFETCH_MS

  for (const sched of schedules) {
    if (!(sched.days_of_week & todayBit)) continue
    const startMin = timeToMinutes(sched.start_time)
    const endMin = timeToMinutes(sched.end_time)

    if (sched.crosses_midnight) {
      if (nowMin >= startMin) {
        const minsUntilEnd = (24 * 60 - nowMin) + endMin
        bestMs = Math.min(bestMs, minsUntilEnd * 60_000)
      } else if (nowMin < endMin) {
        bestMs = Math.min(bestMs, (endMin - nowMin) * 60_000)
      } else {
        bestMs = Math.min(bestMs, (startMin - nowMin) * 60_000)
      }
      continue
    }

    if (nowMin >= startMin && nowMin < endMin) {
      bestMs = Math.min(bestMs, (endMin - nowMin) * 60_000)
    } else if (nowMin < startMin) {
      bestMs = Math.min(bestMs, (startMin - nowMin) * 60_000)
    }
  }

  return Math.max(MIN_REFETCH_MS, Math.min(bestMs, MAX_REFETCH_MS))
}

export function useActivePromotions(options?: {
  enabled?: Ref<boolean> | ComputedRef<boolean>
  onActivePromosChanged?: () => void
}) {
  const { currentTenant } = useTenantReactive()
  const activeSignature = ref('')
  let boundaryTimer: ReturnType<typeof setTimeout> | null = null

  const { data, asyncStatus, refetch } = useQuery({
    key: () => ['pos', 'active-promotions', currentTenant.value?.id],
    query: () =>
      $fetch<{ success: boolean; total: number; data: ActivePromotionRow[] }>(
        '/api/api/promotions/active',
        { query: { only_current: true, at: new Date().toISOString() } },
      ),
    enabled: () => !!currentTenant.value && (options?.enabled?.value ?? true),
    staleTime: 30_000,
  })

  const activePromos = computed(() => data.value?.data ?? [])
  const hasActivePromos = computed(() => activePromos.value.length > 0)

  const activePromoHint = computed(() => {
    const names = activePromos.value.map((p) => p.name).filter(Boolean)
    if (names.length === 0) return ''
    if (names.length === 1) return names[0]
    if (names.length === 2) return `${names[0]} y ${names[1]}`
    return `${names[0]} y ${names.length - 1} más`
  })

  function scheduleBoundaryRefetch() {
    if (boundaryTimer) clearTimeout(boundaryTimer)
    if (!hasActivePromos.value) return
    const allSchedules = activePromos.value.flatMap((p) => p.schedules ?? [])
    const delay = msUntilNextPromoBoundary(allSchedules)
    boundaryTimer = setTimeout(() => {
      refetch()
    }, delay)
  }

  watch(
    activePromos,
    (promos) => {
      const nextSig = promos.map((p) => p.id).sort().join(',')
      if (activeSignature.value && nextSig !== activeSignature.value) {
        options?.onActivePromosChanged?.()
      }
      activeSignature.value = nextSig
      scheduleBoundaryRefetch()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (boundaryTimer) clearTimeout(boundaryTimer)
  })

  return {
    activePromos,
    hasActivePromos,
    activePromoHint,
    activePromosStatus: asyncStatus,
    refetchActivePromos: refetch,
  }
}
