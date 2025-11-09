<template>
  <div>
    <!-- Header section matching warocol style -->
    <div class="bg-white">
      <div class="p-6">
        <!-- Navigation area -->
        <div class="">
          <nav class="flex space-x-8">
            <NuxtLink to="/abastecimiento/proveedores" :class="[
              $route.path === '/abastecimiento/proveedores'
                ? 'text-crocus-600 font-medium border-b-2 border-crocus-600 pb-3'
                : 'text-titan-600 hover:text-crocus-600 pb-3']"
              class="text-sm transition-colors">
              Proveedores
            </NuxtLink>
            <NuxtLink to="/abastecimiento/precios" :class="[
              $route.path.includes('/precios')
                ? 'text-crocus-600 font-medium border-b-2 border-crocus-600 pb-3'
                : 'text-titan-600 hover:text-crocus-600 pb-3']"
              class="text-sm transition-colors">
              Lista de Precios
            </NuxtLink>
            <NuxtLink to="/abastecimiento/compras" :class="[
              $route.path.includes('/compras')
                ? 'text-crocus-600 font-medium border-b-2 border-crocus-600 pb-3'
                : 'text-titan-600 hover:text-crocus-600 pb-3']"
              class="text-sm transition-colors">
              Órdenes de Compra
            </NuxtLink>
            <NuxtLink to="/abastecimiento/inventario" :class="[
              $route.path.includes('/inventario')
                ? 'text-crocus-600 font-medium border-b-2 border-crocus-600 pb-3'
                : 'text-titan-600 hover:text-crocus-600 pb-3']"
              class="text-sm transition-colors">
              Inventario
            </NuxtLink>
          </nav>
        </div>
      </div>
    </div>

    <!-- Content -->
    <Transition enter-active-class="transition-all duration-400 ease-out"
      enter-from-class="opacity-0 transform translate-y-[-20px]" 
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-300 ease-in" 
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-[-20px]" 
      mode="out-in">
      <NuxtPage />
    </Transition>
  </div>
</template>

<script setup>

definePageMeta({
  layout: 'dashboard'
})

// Meta tags
useHead({
  title: 'Abastecimiento - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de proveedores, compras e inventario para Warocol' }
  ]
})
</script>