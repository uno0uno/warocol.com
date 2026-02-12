export default defineNuxtRouteMiddleware((to) => {
  // /abastecimiento/proveedores → /abastecimiento/lector-facturas
  if (to.path === '/abastecimiento/proveedores') {
    return navigateTo('/abastecimiento/lector-facturas', { redirectCode: 301 })
  }

  // /inventario/* → /abastecimiento/lector-facturas
  if (to.path === '/inventario' || to.path.startsWith('/inventario/')) {
    return navigateTo('/abastecimiento/lector-facturas', { redirectCode: 301 })
  }

  // /pagos/*, /gastos/*, /equipo/* → /menu/productos
  const redirectToMenu = ['/pagos', '/gastos', '/equipo']
  if (redirectToMenu.some(prefix => to.path === prefix || to.path.startsWith(prefix + '/'))) {
    return navigateTo('/menu/productos', { redirectCode: 301 })
  }
})
