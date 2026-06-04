export interface BlogCtaContent {
  headline: string
  body: string
  button: string
}

export function useBlogCta(slug: string): BlogCtaContent {
  const s = slug

  // Nómina y equipo
  if (/nomina|liquidacion|desprendible|prima-de-servicios|mesero|brigada/.test(s)) {
    return {
      headline: 'Evita errores de nómina antes de que cuesten plata.',
      body: 'Waro conecta turnos, ventas, propinas e inventario para que controles la operación completa del restaurante desde un solo lugar.',
      button: 'Ver cómo funciona',
    }
  }

  // Precios y comparativas
  if (/precio|gratis|free|full|open-source/.test(s)) {
    return {
      headline: 'Plan Pro anual desde $95.900.',
      body: 'POS, inventario, costos por plato y escaneo inteligente de facturas. Sin permanencia, cancela cuando quieras.',
      button: 'Ver mis opciones',
    }
  }

  // Costos, finanzas y operaciones
  if (/food-cost|punto-de-equilibrio|arqueo|inventario|mise-en-place/.test(s)) {
    return {
      headline: 'Deja de perder plata calculando en Excel.',
      body: 'Waro te muestra costos, inventario y rentabilidad por plato en tiempo real para decidir con datos, no con intuición.',
      button: 'Quiero ver cómo funciona',
    }
  }

  // Software y POS
  if (/software|pos|pdv|tpv|sistema-pos|contable/.test(s)) {
    return {
      headline: 'POS para restaurantes desde $95.900 al año.',
      body: 'Vende, controla mesas, inventario, costos y facturas de proveedores con IA. Hecho en Colombia para restaurantes colombianos.',
      button: 'Ver demostración',
    }
  }

  // Administración y menú
  if (/administrar|ingenieria-de-menu|cocinas|corrientazo|gastrobar|nombres/.test(s)) {
    return {
      headline: 'Ordena tu restaurante sin llenar más hojas de cálculo.',
      body: 'Waro conecta caja, inventario, costos, mesas y domicilios en un panel simple para operar con más control.',
      button: 'Quiero mi demo gratis',
    }
  }

  // Default
  return {
    headline: 'Controla tu restaurante con Waro.',
    body: 'POS, inventario, costos por plato y escaneo inteligente de facturas desde $95.900 al año.',
    button: 'Comenzar gratis',
  }
}
