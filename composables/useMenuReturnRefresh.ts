import { computed, onMounted } from 'vue'

export const useMenuReturnRefresh = (
  sectionRoot: string,
  refresh: () => void | Promise<void>,
  stateKey = 'menu-last-path',
  returnPrefixes?: string[]
) => {
  const route = useRoute()
  const lastMenuPath = useState<string | null>(stateKey, () => null)
  const allowedReturnPrefixes = returnPrefixes?.length
    ? returnPrefixes
    : [`${sectionRoot}/`]

  const isReturningFromSectionChild = computed(() => {
    const previousPath = lastMenuPath.value

    if (!previousPath || route.path !== sectionRoot) {
      return false
    }

    if (previousPath === sectionRoot) {
      return false
    }

    return allowedReturnPrefixes.some(prefix => previousPath.startsWith(prefix))
  })

  onMounted(() => {
    if (isReturningFromSectionChild.value) {
      void refresh()
    }
  })
}
