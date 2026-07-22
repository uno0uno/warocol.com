/**
 * module-access.global.ts — Epic 4 (#557) + Starter plan gating (#695).
 *
 * Route-level enforcement for pages with `definePageMeta({ module })`.
 * Uses effective modules from GET /me/access (role ∩ plan). Starter tenants
 * are redirected to Mi Plan; role-only denials go to /403.
 *
 * Runs after auth.global.js (hydrates access store) and billing-gate.global.ts.
 */
import type { Module } from '~/stores/access'
import { getModuleAccessDenialRedirect } from '~/utils/internalAccess'

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) return

  const skipExact = ['/', '/bogota']
  const skipPrefixes = [
    '/auth/',
    '/proveedor/',
    '/blog',
    '/docs',
    '/403',
    '/gestion/billing',
  ]
  const skipLayouts = ['public-restaurant', 'customer-portal', 'kds']

  if (
    skipExact.includes(to.path) ||
    skipPrefixes.some((p) => to.path.startsWith(p)) ||
    skipLayouts.includes(to.meta?.layout as string) ||
    to.meta?.publicAccess === true
  ) return

  const moduleKey = to.meta.module as Module | undefined
  if (!moduleKey) return

  const accessStore = useAccessStore()
  if (!accessStore.isLoaded) {
    await accessStore.load()
  }

  if (!accessStore.can(moduleKey)) {
    return navigateTo(getModuleAccessDenialRedirect(accessStore))
  }
})
