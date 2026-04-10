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
})
