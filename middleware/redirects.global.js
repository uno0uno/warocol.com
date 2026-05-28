const BLOG_SEO_REDIRECTS = {
  '/blog/software-pos-restaurantes-colombia': '/blog/mejores-software-restaurantes-colombia',
  '/blog/sistema-pos-colombia': '/blog/mejores-software-restaurantes-colombia',
  '/blog/software-para-restaurante': '/blog/mejores-software-restaurantes-colombia',
  '/blog/software-restaurantes-gratis-colombia': '/blog/software-para-restaurante-gratis',
  '/blog/software-open-source-restaurantes': '/blog/software-para-restaurante-gratis',
  '/blog/software-contable-restaurantes-gratis': '/blog/software-para-restaurante-gratis'
}

export default defineNuxtRouteMiddleware((to) => {
  const blogTarget = BLOG_SEO_REDIRECTS[to.path]
  if (blogTarget) {
    return navigateTo(blogTarget, { redirectCode: 301 })
  }

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
