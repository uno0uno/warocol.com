export interface BlogCtaContent {
  headline: string
  body: string
  button: string
}

export function useBlogCta(slug: string): BlogCtaContent {
  const s = slug

  if (/nomina|liquidacion|desprendible|prima-de-servicios|mesero|brigada/.test(s)) {
    return {
      headline: '¿Cuánto te cuesta realmente tu equipo?',
      body: 'WARO calcula nómina, horas extra y prestaciones automáticamente según la ley colombiana 2026. Sin errores, sin multas.',
      button: 'Quiero ver la demo',
    }
  }

  if (/precio|gratis|free|full|open-source/.test(s)) {
    return {
      headline: 'El mejor precio es el que más retorna.',
      body: 'WARO desde $9.000 COP/mes. POS + inventario + nómina + food cost en un solo lugar. Sin sorpresas.',
      button: 'Ver planes de WARO',
    }
  }

  if (/food-cost|punto-de-equilibrio|arqueo|inventario|mise-en-place/.test(s)) {
    return {
      headline: 'Deja de calcular en Excel.',
      body: 'Food cost, punto de equilibrio e inventario en tiempo real. WARO hace los números por ti para que te concentres en cocinar.',
      button: 'Ver WARO en acción',
    }
  }

  if (/software|pos|pdv|tpv|sistema-pos|contable/.test(s)) {
    return {
      headline: '¿Ya comparaste todos los software? Ahora conoce el colombiano.',
      body: 'WARO nació en Colombia para restaurantes colombianos. POS, facturación DIAN y control de costos en un solo lugar.',
      button: 'Ver cómo funciona WARO',
    }
  }

  if (/administrar|ingenieria-de-menu|cocinas|corrientazo|gastrobar|nombres/.test(s)) {
    return {
      headline: 'Del menú a la caja, todo bajo control.',
      body: 'WARO conecta cada parte de tu operación para que tomes decisiones con datos reales, no con intuición.',
      button: 'Quiero una demo',
    }
  }

  return {
    headline: '¿Tu restaurante todavía trabaja a ciegas?',
    body: 'WARO centraliza ventas, nómina, inventario y costos en un panel. Te mostramos cómo en 15 minutos.',
    button: 'Quiero mi demostración gratis',
  }
}
