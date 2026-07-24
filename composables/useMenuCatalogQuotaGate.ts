/**
 * Menú catalog create gating (warocol.com#1796 / #1798 / #1800).
 * Productos, Categorías, Modificadores, and Recetas each use their own growth quota.
 */
import type { BillingRemainingUsage, OperationalQuotaKey } from '~/composables/useBilling'
import {
  resolveOperationalQuota,
  useBilling,
} from '~/composables/useBilling'

export function useMenuCatalogQuotaGate() {
  const { t } = useI18n({ useScope: 'global' })
  const toast = useToast()
  const { getOperationalQuota, fetchBillingOverview } = useBilling()

  const menuProductsQuota = computed(() => getOperationalQuota('menu_products'))
  const menuCategoriesQuota = computed(() => getOperationalQuota('menu_categories'))
  const modifierGroupsQuota = computed(() => getOperationalQuota('modifier_groups'))
  const recipeBasesQuota = computed(() => getOperationalQuota('recipe_bases'))

  const isProductsCreateBlocked = computed(() => menuProductsQuota.value.blocked)
  /** Modificadores: own group cap OR shared catalog product cap exhausted. */
  const isModifiersCreateBlocked = computed(
    () => menuProductsQuota.value.blocked || modifierGroupsQuota.value.blocked,
  )
  const isRecipesCreateBlocked = computed(() => recipeBasesQuota.value.blocked)
  const isCategoriesCreateBlocked = computed(() => menuCategoriesQuota.value.blocked)
  /** Legacy shared gate: menu catalog product cap. */
  const isSharedCatalogCreateBlocked = computed(() => menuProductsQuota.value.blocked)

  const formatBlockedMessage = (resource: OperationalQuotaKey) => {
    const quota = getOperationalQuota(resource)
    const metric = quota.metric
    if (!metric || metric.limit === null) return quota.message
    return `${quota.message} Uso actual: ${metric.used.toLocaleString('es-CO')} de ${metric.limit.toLocaleString('es-CO')} ${quota.unit}. Revisa Mi Plan para ampliar tu cupo.`
  }

  const productsCreateBlockedMessage = computed(() => formatBlockedMessage('menu_products'))
  const categoriesCreateBlockedMessage = computed(() => formatBlockedMessage('menu_categories'))
  const modifiersCreateBlockedMessage = computed(() => {
    if (menuProductsQuota.value.blocked) return formatBlockedMessage('menu_products')
    return formatBlockedMessage('modifier_groups')
  })
  const recipesCreateBlockedMessage = computed(() => formatBlockedMessage('recipe_bases'))
  const sharedCatalogCreateBlockedMessage = computed(() => productsCreateBlockedMessage.value)

  const showBlockedToast = (message: string) => {
    toast.warning(message, {
      title: t('menu.common.quotaBlocked', 'Cupo del plan alcanzado'),
    })
  }

  const showProductsCreateBlocked = () => showBlockedToast(productsCreateBlockedMessage.value)
  const showCategoriesCreateBlocked = () => showBlockedToast(categoriesCreateBlockedMessage.value)
  const showModifiersCreateBlocked = () => showBlockedToast(modifiersCreateBlockedMessage.value)
  const showRecipesCreateBlocked = () => showBlockedToast(recipesCreateBlockedMessage.value)
  const showSharedCatalogCreateBlocked = () => showBlockedToast(sharedCatalogCreateBlockedMessage.value)

  const ensureBillingOverview = async () => {
    await fetchBillingOverview()
  }

  const fetchQuotaBlocked = async (resource: OperationalQuotaKey) => {
    try {
      await fetchBillingOverview()
      const usage = await $fetch<BillingRemainingUsage>('/api/billing/remaining-usage')
      const result = resolveOperationalQuota(resource, usage.quota_usage?.[resource] ?? null)
      return result.blocked
    } catch {
      // Fail open — API CREATE still enforces 429.
      return false
    }
  }

  const redirectIfProductsCreateBlocked = async (listPath = '/menu/productos') => {
    if (await fetchQuotaBlocked('menu_products')) {
      showProductsCreateBlocked()
      await navigateTo(listPath)
      return true
    }
    return false
  }

  const redirectIfModifiersCreateBlocked = async (listPath = '/menu/modificadores') => {
    const productsBlocked = await fetchQuotaBlocked('menu_products')
    const groupsBlocked = productsBlocked ? true : await fetchQuotaBlocked('modifier_groups')
    if (productsBlocked || groupsBlocked) {
      showModifiersCreateBlocked()
      await navigateTo(listPath)
      return true
    }
    return false
  }

  const redirectIfRecipesCreateBlocked = async (listPath = '/menu/recetas') => {
    if (await fetchQuotaBlocked('recipe_bases')) {
      showRecipesCreateBlocked()
      await navigateTo(listPath)
      return true
    }
    return false
  }

  const redirectIfSharedCatalogCreateBlocked = async (listPath: string) => {
    if (await fetchQuotaBlocked('menu_products')) {
      showSharedCatalogCreateBlocked()
      await navigateTo(listPath)
      return true
    }
    return false
  }

  return {
    menuProductsQuota,
    menuCategoriesQuota,
    modifierGroupsQuota,
    recipeBasesQuota,
    isProductsCreateBlocked,
    isCategoriesCreateBlocked,
    isModifiersCreateBlocked,
    isRecipesCreateBlocked,
    isSharedCatalogCreateBlocked,
    productsCreateBlockedMessage,
    categoriesCreateBlockedMessage,
    modifiersCreateBlockedMessage,
    recipesCreateBlockedMessage,
    sharedCatalogCreateBlockedMessage,
    showProductsCreateBlocked,
    showCategoriesCreateBlocked,
    showModifiersCreateBlocked,
    showRecipesCreateBlocked,
    showSharedCatalogCreateBlocked,
    ensureBillingOverview,
    redirectIfProductsCreateBlocked,
    redirectIfModifiersCreateBlocked,
    redirectIfRecipesCreateBlocked,
    redirectIfSharedCatalogCreateBlocked,
  }
}
