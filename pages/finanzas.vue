<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <!-- Key by section (/finanzas/gastos, /finanzas/pagos, …) so create/edit
         within a section does not force a full remount of the shell. -->
    <NuxtPage :key="sectionKey" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const lastFinanzasPath = useState<string | null>('finanzas-last-path', () => null)

definePageMeta({
  layout: 'dashboard',
  module: 'finanzas',
})

// Same pattern as menu.vue: first 3 path segments = section root
// e.g. /finanzas/gastos/crear and /finanzas/gastos/:id share /finanzas/gastos
const sectionKey = computed(() => route.path.split('/').slice(0, 3).join('/'))

watch(
  () => route.fullPath,
  (_currentPath, previousPath) => {
    lastFinanzasPath.value = previousPath ?? null
  }
)

const navigationItems = computed(() => [
  { to: '/finanzas/arqueo', label: t('finanzas.nav.arqueo') },
  { to: '/finanzas/cierre-contable', label: t('finanzas.nav.cierre') },
  { to: '/finanzas/cartera', label: t('finanzas.nav.cartera') },
  { to: '/finanzas/gastos', label: t('finanzas.nav.gastos') },
  { to: '/finanzas/pagos', label: t('finanzas.nav.pagos') },
  { to: '/finanzas/metodos-pago', label: t('finanzas.nav.metodosPago') },
  { to: '/finanzas/conciliacion', label: t('finanzas.nav.conciliacion') },
  { to: '/finanzas/contabilidad/cuentas', label: t('finanzas.nav.cuentas'), matchPath: '/finanzas/contabilidad/cuentas' },
  { to: '/finanzas/contabilidad/asientos', label: t('finanzas.nav.asientos'), matchPath: '/finanzas/contabilidad/asientos' },
  { to: '/finanzas/contabilidad/balance-comprobacion', label: t('finanzas.nav.balance'), matchPath: '/finanzas/contabilidad/balance-comprobacion' },
  { to: '/finanzas/reportes/pl-mensual', label: t('finanzas.nav.plMensual'), matchPath: '/finanzas/reportes/pl-mensual' },
])

useHead({ title: () => t('finanzas.head.index') })
</script>
