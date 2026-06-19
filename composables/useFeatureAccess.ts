import type { ComputedRef } from 'vue'
import type { AccessFeature } from '~/stores/access'

export const useFeatureAccess = () => {
  const store = useAccessStore()

  const features = computed(() => store.features)
  const isLoaded = computed(() => store.isLoaded)

  const hasFeature = (feature: AccessFeature): ComputedRef<boolean> =>
    computed(() => store.hasFeature(feature))

  return { features, isLoaded, hasFeature }
}
