<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-12">
    <!-- Loading state while access store hydrates -->
    <div v-if="!accessStore.isLoaded" class="text-center">
      <div
        class="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-label="Cargando"
      ></div>
      <p class="mt-4 text-base text-text-secondary">Verificando permisos...</p>
    </div>

    <!-- Access denied content -->
    <div
      v-else
      class="max-w-lg w-full bg-surface rounded-2xl border border-border p-8 md:p-12 text-center"
    >
      <!-- Icon: shield-exclamation, intentionally muted (not destructive — this is
           a permissions boundary, not a system error). -->
      <div
        class="mx-auto mb-6 w-14 h-14 rounded-full bg-surface-secondary flex items-center justify-center"
      >
        <ShieldExclamationIcon class="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>

      <!-- Heading -->
      <h1 class="text-2xl md:text-3xl font-bold text-text-primary mb-3">
        No tienes acceso a este módulo
      </h1>

      <!-- Description -->
      <p class="text-base leading-relaxed text-text-secondary mb-6 max-w-prose mx-auto">
        Tu rol actual no incluye permisos para esta sección. Si crees que deberías
        tener acceso, contacta al dueño del negocio.
      </p>

      <!-- Role badge -->
      <div
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-secondary mb-8"
      >
        <span class="text-sm text-text-secondary">Tu rol:</span>
        <span class="text-sm font-medium text-text-primary">{{ roleLabel }}</span>
      </div>

      <!-- Primary CTA — touch target 44px tall via h-11 -->
      <div>
        <NuxtLink
          :to="firstAccessibleHome"
          class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 transition-colors"
        >
          Ir al inicio
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldExclamationIcon } from '@heroicons/vue/24/outline'

/**
 * /403 — Epic 4 (warocol.com#489) sub-task #561.
 *
 * Friendly access-denied page. Reached when `module-access.global.ts` (#557)
 * detects the user lacks access to a page tagged with
 * `definePageMeta({ module })`.
 *
 * Renders inside the dashboard layout so the (filtered) sidebar is visible —
 * the user sees exactly what they CAN access right next to the denial.
 *
 * `/403` is in the skip-list of both auth.global.js (unauthenticated callers
 * get redirected away first) and module-access.global.ts (prevents infinite
 * redirect loop). So this page is only rendered for authenticated users.
 */
definePageMeta({ layout: 'dashboard' })

useHead({ title: 'Acceso denegado · Waro' })

const accessStore = useAccessStore()

// Friendly Spanish role labels. Includes legacy values (superuser, employee,
// member) that haven't been migrated to canonical names — Epic 6 will rename
// them in the database; until then this map handles both.
const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño/a',
  superuser: 'Dueño/a',
  admin: 'Administrador/a',
  supervisor: 'Supervisor/a',
  cashier: 'Cajero/a',
  employee: 'Cajero/a',
  member: 'Cajero/a',
  kitchen: 'Cocina',
  customer: 'Cliente',
}

const roleLabel = computed(() =>
  accessStore.role
    ? ROLE_LABELS[accessStore.role] ?? accessStore.role
    : 'Sin rol asignado'
)

// Module → landing-page URL. Mirrors DashboardSidebar.vue's item paths so
// "Ir al inicio" lands on the same page the user would hit from the sidebar.
const MODULE_HOMES: Record<string, string> = {
  pos: '/pos',
  ventas: '/ventas',
  despacho: '/despacho/domicilios',
  analitica: '/analitica',
  finanzas: '/finanzas/arqueo',
  facturacion: '/facturacion',
  menu: '/menu/productos',
  operaciones: '/operaciones/comandas',
  abastecimiento: '/abastecimiento/compras-directas',
  equipo: '/equipo/miembros',
  integraciones: '/integraciones',
  mi_negocio: '/negocio',
  mi_plan: '/gestion/billing',
}

// Priority order: operational pages first, admin last. Cashier lands on POS,
// kitchen on Despacho, owner on POS — everyone at their highest-frequency
// page rather than the alphabetically-first module.
const HOME_PRIORITY = [
  'pos',
  'ventas',
  'despacho',
  'analitica',
  'finanzas',
  'menu',
  'operaciones',
  'abastecimiento',
  'facturacion',
  'equipo',
  'integraciones',
  'mi_negocio',
  'mi_plan',
] as const

const firstAccessibleHome = computed(() => {
  const mods = new Set(accessStore.modules)
  for (const m of HOME_PRIORITY) {
    if (mods.has(m)) return MODULE_HOMES[m]
  }
  // Fallback for sessions with no modules (KDS-token, fresh-tenant owner
  // pre-membership). /  is the public homepage.
  return '/'
})
</script>
