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
      headline: 'Tu equipo, sin errores en nómina.',
      body: 'Desde $9.000/mes WARO calcula nómina, horas extra y prestaciones según la ley colombiana 2026. Automático, exacto y sin multas.',
      button: 'Quiero empezar ya',
    }
  }

  // Precios y comparativas
  if (/precio|gratis|free|full|open-source/.test(s)) {
    return {
      headline: 'El software más económico del mercado colombiano.',
      body: 'Desde $9.000/mes tienes POS, inventario, nómina y food cost en un solo lugar. Sin letras pequeñas.',
      button: 'Ver mis opciones',
    }
  }

  // Costos, finanzas y operaciones
  if (/food-cost|punto-de-equilibrio|arqueo|inventario|mise-en-place/.test(s)) {
    return {
      headline: 'Deja de perder plata calculando en Excel.',
      body: 'Desde $9.000/mes WARO te da food cost, punto de equilibrio e inventario en tiempo real. Toma decisiones con datos, no con intuición.',
      button: 'Quiero ver cómo funciona',
    }
  }

  // Software y POS
  if (/software|pos|pdv|tpv|sistema-pos|contable/.test(s)) {
    return {
      headline: 'El POS colombiano más económico del mercado.',
      body: 'Desde $9.000/mes: facturación DIAN, inventario y nómina en un solo sistema. Hecho en Colombia para restaurantes colombianos.',
      button: 'Ver demostración',
    }
  }

  // Administración y menú
  if (/administrar|ingenieria-de-menu|cocinas|corrientazo|gastrobar|nombres/.test(s)) {
    return {
      headline: 'Llena tu restaurante. Desde $9.000/mes.',
      body: 'WARO conecta caja, inventario, nómina y domicilios en un panel. El sistema más eficiente del mercado, hecho en Colombia.',
      button: 'Quiero mi demo gratis',
    }
  }

  // Default
  return {
    headline: 'Llena tu restaurante con WARO. Desde $9.000/mes.',
    body: 'El software colombiano más completo y económico para restaurantes. POS, nómina, inventario y food cost en un solo lugar.',
    button: 'Comenzar gratis',
  }
}
