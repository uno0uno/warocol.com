<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <!-- Key by section (/finanzas/gastos, /finanzas/pagos, …) so create/edit
         within a section does not force a full remount of the shell. -->
    <NuxtPage :key="sectionKey" />
  </div>
</template>

<script setup lang="ts">
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

const navigationItems = [
  { to: '/finanzas/arqueo',           label: 'Arqueo de caja' },
  { to: '/finanzas/cierre-contable',  label: 'Cierre contable' },
  { to: '/finanzas/cartera',          label: 'Cartera' },
  { to: '/finanzas/gastos',           label: 'Gastos' },
  { to: '/finanzas/pagos',            label: 'Pagos' },
  { to: '/finanzas/metodos-pago',     label: 'Métodos de pago' },
  { to: '/finanzas/conciliacion',     label: 'Conciliación' },
  { to: '/finanzas/contabilidad/cuentas',             label: 'Cuentas',  matchPath: '/finanzas/contabilidad/cuentas' },
  { to: '/finanzas/contabilidad/asientos',            label: 'Asientos', matchPath: '/finanzas/contabilidad/asientos' },
  { to: '/finanzas/contabilidad/balance-comprobacion', label: 'Balance', matchPath: '/finanzas/contabilidad/balance-comprobacion' },
  { to: '/finanzas/reportes/pl-mensual', label: 'P&L Mensual', matchPath: '/finanzas/reportes/pl-mensual' },
]

useHead({ title: 'Finanzas - Warocol' })
</script>
