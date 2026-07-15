<script setup lang="ts">
import { activatePublicCta, getPublicCta } from '~/utils/publicCta'

const router = useRouter()
const heroCta = getPublicCta('management', 'hero')
const startRegistration = () => router.push(activatePublicCta(
  heroCta,
  { source: 'home_hero', content: 'primary' },
  undefined,
  import.meta.client ? window.sessionStorage : null,
))
</script>

<template>
  <section class="hero">
    <h1 class="font-quantico">CERO MISTERIO EN TU RESTAURANTE.</h1>
    <p class="subtitle">
      Desde el precio de un plato hasta el turno de un empleado. Ponemos a tu alcance la tecnología que convierte tus datos en decisiones certeras.
      <em>Nosotros te guiamos para que sea fácil.</em>
    </p>

    <div class="cta-buttons">
      <button
        class="btn btn-secondary"
        type="button"
        @click="startRegistration"
      >
        {{ heroCta.button }}
      </button>
      <p class="cta-microcopy">{{ heroCta.microcopy }}</p>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 5;
  text-align: center;
  padding: 60px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  font-size: clamp(2.5rem, 5vw, 5rem);
  font-weight: 900;
  color: hsl(250, 30%, 16%);
  letter-spacing: -2px;
  margin-bottom: 24px;
  text-transform: uppercase;
  line-height: 0.95;
  text-shadow: 0 2px 4px hsl(var(--overlay-backdrop-bg) / 0.1);
}

.subtitle {
  font-size: clamp(1.1rem, 2.5vw, 1.25rem);
  color: hsl(220, 13%, 28%);
  margin-bottom: 40px;
  font-weight: 400;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
  opacity: 0.9;
}

.subtitle em {
  color: hsl(250, 30%, 16%);
  font-style: italic;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 80px;
  flex-wrap: wrap;
}

.cta-microcopy {
  flex-basis: 100%;
  margin: 0;
  color: hsl(220, 13%, 35%);
  font-size: 0.875rem;
  line-height: 1.5;
}

.btn {
  padding: 14px 32px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px hsl(var(--overlay-backdrop-bg) / 0.1);
  min-width: 160px;
}

.btn-secondary {
  background: transparent;
  color: hsl(262, 83%, 58%);
  border: 2px solid hsl(262, 83%, 58%);
}

.btn-secondary:hover {
  background: hsl(262, 83%, 58%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px hsl(var(--action-primary-bg) / 0.2);
}

@media (max-width: 768px) {
  .hero {
    padding: 40px 16px;
  }

  .cta-buttons {
    gap: 12px;
  }

  .btn {
    padding: 12px 24px;
    min-width: 140px;
  }
}
</style>
