<template>
  <div class="page-layout">
    <div class="page-header">
      <div>
        <h1 class="page-title">Gestión de Pagos</h1>
        <p class="page-subtitle">Administra los pagos a proveedores y cuentas por pagar</p>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <!-- Total Pending -->
      <div class="bg-surface border-2 border-border rounded-lg p-6">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-text-secondary mb-2">Total Pendiente</p>
            <p class="text-2xl font-bold text-text-primary">$0</p>
            <p class="text-xs text-text-secondary mt-1">0 facturas pendientes</p>
          </div>
          <div class="bg-warning/10 p-3 rounded-lg">
            <svg class="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Due This Week -->
      <div class="bg-surface border-2 border-border rounded-lg p-6">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-text-secondary mb-2">Vencen Esta Semana</p>
            <p class="text-2xl font-bold text-text-primary">$0</p>
            <p class="text-xs text-text-secondary mt-1">0 facturas</p>
          </div>
          <div class="bg-destructive/10 p-3 rounded-lg">
            <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Paid This Month -->
      <div class="bg-surface border-2 border-border rounded-lg p-6">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-text-secondary mb-2">Pagado Este Mes</p>
            <p class="text-2xl font-bold text-text-primary">$0</p>
            <p class="text-xs text-text-secondary mt-1">0 facturas pagadas</p>
          </div>
          <div class="bg-success/10 p-3 rounded-lg">
            <svg class="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Coming Soon Message -->
    <div class="bg-surface border-2 border-border rounded-lg p-12 text-center">
      <svg class="w-16 h-16 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 class="text-xl font-bold text-text-primary mb-2">Módulo de Pagos</h3>
      <p class="text-text-secondary max-w-md mx-auto">
        Esta sección estará disponible próximamente. Aquí podrás gestionar todos los pagos a proveedores,
        cuentas por pagar, y generar reportes de pagos realizados.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Pagos - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de pagos a proveedores' }
  ]
})
</script>
