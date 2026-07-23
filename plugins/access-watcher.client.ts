/**
 * access-watcher.client.ts — Epic 4 (#562) + Starter plan gating (#695).
 *
 * Redirects when polling updates modules while the user is on a gated page.
 */
import type { Module } from '~/stores/access'
import { getModuleAccessDenialRedirect } from '~/utils/internalAccess'

export default defineNuxtPlugin(() => {
  const accessStore = useAccessStore()
  const route = useRoute()

  const canStayOnRoute = computed<boolean>(() => {
    if (route.path === '/403' || route.path.startsWith('/gestion/billing')) return true
    const moduleKey = route.meta.module as Module | undefined
    if (!moduleKey) return true
    if (!accessStore.isLoaded) return true
    return accessStore.can(moduleKey)
  })

  watch(canStayOnRoute, (allowed) => {
    if (!allowed) navigateTo(getModuleAccessDenialRedirect(accessStore))
  }, { flush: 'post' })
})
