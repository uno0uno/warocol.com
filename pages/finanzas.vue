<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiModuleNavigation :navigation-items="navigationItems" />
    <NuxtPage :key="route.fullPath" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'dashboard',
  module: 'finanzas',
})

const navigationItems = [
  { to: '/finanzas/arqueo',           label: 'Arqueo de caja' },
  { to: '/finanzas/cierre-contable',  label: 'Cierre contable' },
  { to: '/finanzas/cartera',          label: 'Cartera' },
  { to: '/finanzas/gastos',           label: 'Gastos' },
  { to: '/finanzas/metodos-pago',     label: 'Métodos de pago' },
  { to: '/finanzas/contabilidad/cuentas',             label: 'Cuentas',  matchPath: '/finanzas/contabilidad/cuentas' },
  { to: '/finanzas/contabilidad/asientos',            label: 'Asientos', matchPath: '/finanzas/contabilidad/asientos' },
  { to: '/finanzas/contabilidad/balance-comprobacion', label: 'Balance', matchPath: '/finanzas/contabilidad/balance-comprobacion' },
  { to: '/finanzas/reportes/pl-mensual', label: 'P&L Mensual', matchPath: '/finanzas/reportes/pl-mensual' },
]

useHead({ title: 'Finanzas - Warocol' })
</script>
