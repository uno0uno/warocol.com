<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const leadModal = useLeadModal()

interface CtaContent {
  headline: string
  body: string
  button: string
}

const ctaContent = computed<CtaContent>(() => {
  const s = props.slug

  // Nómina y equipo
  if (/nomina|liquidacion|desprendible|prima-de-servicios|mesero|brigada/.test(s)) {
    return {
      headline: '¿Cuánto te cuesta realmente tu equipo?',
      body: 'WARO calcula nómina, horas extra y prestaciones automáticamente según la ley colombiana 2026. Sin errores, sin multas.',
      button: 'Quiero ver la demo',
    }
  }

  // Precios y planes
  if (/precio|gratis|free|full|open-source/.test(s)) {
    return {
      headline: 'El mejor precio es el que más retorna.',
      body: 'WARO desde $9.000 COP/mes. POS + inventario + nómina + food cost en un solo lugar. Sin sorpresas.',
      button: 'Ver planes de WARO',
    }
  }

  // Costos, finanzas y operaciones
  if (/food-cost|punto-de-equilibrio|arqueo|inventario|mise-en-place/.test(s)) {
    return {
      headline: 'Deja de calcular en Excel.',
      body: 'Food cost, punto de equilibrio e inventario en tiempo real. WARO hace los números por ti para que te concentres en cocinar.',
      button: 'Ver WARO en acción',
    }
  }

  // Software y POS
  if (/software|pos|pdv|tpv|sistema-pos|contable/.test(s)) {
    return {
      headline: '¿Ya comparaste todos los software? Ahora conoce el colombiano.',
      body: 'WARO nació en Colombia para restaurantes colombianos. POS, facturación DIAN y control de costos en un solo lugar.',
      button: 'Ver cómo funciona WARO',
    }
  }

  // Administración y menú
  if (/administrar|ingenieria-de-menu|cocinas|corrientazo|gastrobar|nombres/.test(s)) {
    return {
      headline: 'Del menú a la caja, todo bajo control.',
      body: 'WARO conecta cada parte de tu operación para que tomes decisiones con datos reales, no con intuición.',
      button: 'Quiero una demo',
    }
  }

  // Default — informacionales (comensal, comanda, brigada, etc.)
  return {
    headline: '¿Tu restaurante todavía trabaja a ciegas?',
    body: 'WARO centraliza ventas, nómina, inventario y costos en un panel. Te mostramos cómo en 15 minutos.',
    button: 'Quiero mi demostración gratis',
  }
})
</script>

<template>
  <div class="blog-cta-banner">
    <div class="blog-cta-inner">
      <div class="blog-cta-text">
        <p class="blog-cta-headline">{{ ctaContent.headline }}</p>
        <p class="blog-cta-body">{{ ctaContent.body }}</p>
      </div>
      <button
        class="blog-cta-button"
        @click="leadModal.open(`blog:${slug}`)"
      >
        {{ ctaContent.button }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.blog-cta-banner {
  margin-top: 3rem;
  border-radius: 0.875rem;
  background-color: hsl(var(--crocus-50));
  border: 1px solid hsl(var(--crocus-200));
}

.blog-cta-inner {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: flex-start;
}

@media (min-width: 640px) {
  .blog-cta-inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 1.75rem 2rem;
  }
}

.blog-cta-text {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
}

.blog-cta-headline {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  color: hsl(var(--crocus-900));
  margin: 0;
}

@media (min-width: 640px) {
  .blog-cta-headline {
    font-size: 1.0625rem;
  }
}

.blog-cta-body {
  font-size: 0.875rem;
  line-height: 1.55;
  color: hsl(var(--crocus-700));
  margin: 0;
}

.blog-cta-button {
  flex-shrink: 0;
  min-height: 40px;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  background-color: hsl(var(--crocus-600));
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 120ms ease, transform 80ms ease;
  font-family: inherit;
}

.blog-cta-button:hover {
  background-color: hsl(var(--crocus-700));
}

.blog-cta-button:active {
  transform: scale(0.97);
}

.blog-cta-button:focus-visible {
  outline: 2px solid hsl(var(--crocus-600));
  outline-offset: 3px;
}
</style>
