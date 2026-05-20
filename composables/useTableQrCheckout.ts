import { computed, onMounted, ref, watch } from 'vue'
import type { PosPaymentGroup } from '~/utils/paymentDefaults'
import { useTableQrCartStore } from '~/stores/table_qr_cart'

/**
 * Client-only checkout for table QR — payment methods via useQuery.
 */
export function useTableQrCheckout() {
  const route = useRoute()
  const router = useRouter()
  const tenantSlug = computed(() => String(route.params.tenant ?? ''))
  const token = computed(() => String(route.params.token ?? ''))
  const cartStore = useTableQrCartStore()

  const isClientReady = ref(false)
  const cartChecked = ref(false)
  const cartValid = ref(false)

  onMounted(() => {
    isClientReady.value = true
    if (token.value) cartStore.setToken(token.value)
    if (cartStore.isEmpty) {
      cartValid.value = false
      router.replace(`/${tenantSlug.value}/mesa/${token.value}`)
    } else {
      cartValid.value = true
    }
    cartChecked.value = true
  })

  const { data: paymentData, status: paymentStatus } = useQuery({
    key: () => ['table-qr', token.value, 'payment-methods'],
    query: () =>
      $fetch<{ success: boolean; data: PosPaymentGroup[] }>(
        `/api/public/table-qr/${token.value}/payment-methods`,
      ),
    enabled: () => isClientReady.value && cartValid.value && !!token.value,
    staleTime: 60_000,
  })

  const paymentGroups = computed(() => paymentData.value?.data ?? [])

  const paymentSelection = ref<{ slug: string; id: string | null }>({ slug: '', id: null })

  watch(
    paymentGroups,
    (groups) => {
      if (!groups.length || paymentSelection.value.slug) return
      const first = groups.find(g => !g.triggersCartera)
      if (first) paymentSelection.value = { slug: first.slug, id: null }
    },
    { immediate: true },
  )

  const isInitialLoading = computed(() => {
    if (!isClientReady.value || !cartChecked.value) return true
    if (!cartValid.value) return true
    return paymentStatus.value === 'pending' && paymentData.value === undefined
  })

  return {
    tenantSlug,
    token,
    cartStore,
    paymentGroups,
    paymentSelection,
    isInitialLoading,
    paymentStatus,
  }
}
