export default defineNuxtRouteMiddleware((to) => {
  // /inventario/* → /abastecimiento/*
  if (to.path === '/inventario' || to.path === '/inventario/stock') {
    return navigateTo('/abastecimiento/stock', { redirectCode: 301 })
  }
  if (to.path.startsWith('/inventario/ajustes')) {
    return navigateTo(to.path.replace('/inventario/ajustes', '/abastecimiento/ajustes'), { redirectCode: 301 })
  }
  if (to.path.startsWith('/inventario/')) {
    return navigateTo('/abastecimiento/stock', { redirectCode: 301 })
  }

  // /pagos/* → /menu/productos
  if (to.path === '/pagos' || to.path.startsWith('/pagos/')) {
    return navigateTo('/menu/productos', { redirectCode: 301 })
  }

  // /cartera/* → /finanzas/cartera (legacy)
  if (to.path === '/cartera' || to.path.startsWith('/cartera/')) {
    return navigateTo(to.path.replace('/cartera', '/finanzas/cartera'), { redirectCode: 301 })
  }

  // /gastos/* → /finanzas/gastos (legacy)
  if (to.path === '/gastos' || to.path.startsWith('/gastos/')) {
    return navigateTo(to.path.replace('/gastos', '/finanzas/gastos'), { redirectCode: 301 })
  }
})
