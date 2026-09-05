<script setup lang="ts">
import { fireCtaClick } from '~/utils/trailBeacon'

const { t, locale } = useI18n({ useScope: 'global' })
const leadModal = useLeadModal()

const openLeadModal = () => {
  if (import.meta.client) {
    fireCtaClick(useCookie<string | null>('waro_visitor_key').value, '/', 'home')
  }
  leadModal.open('habla_con_nosotros')
}
</script>

<template>
  <section :key="locale" class="hero">
    <h1 class="font-display">{{ t('home.title') }}</h1>
    <p class="subtitle font-reading">
      {{ t('home.subtitle') }}
      <em>{{ t('home.emphasis') }}</em>
    </p>

    <div class="cta-buttons">
      <button
        class="btn btn-primary font-ui"
        type="button"
        aria-haspopup="dialog"
        @click="openLeadModal"
      >
        {{ t('home.button') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 5;
  text-align: center;
  padding: clamp(1.5rem, 4vh, 3rem) 1.25rem clamp(1rem, 2vh, 1.5rem);
  max-width: 1200px;
  margin: 0 auto;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

h1 {
  font-size: clamp(2rem, 4.5vw + 1vh, 4.5rem);
  font-weight: 400;
  color: hsl(250, 30%, 16%);
  letter-spacing: 0.04em;
  margin-bottom: clamp(0.75rem, 2vh, 1.5rem);
  text-transform: uppercase;
  line-height: 0.95;
  text-shadow: 0 2px 4px hsl(var(--overlay-backdrop-bg) / 0.1);
}

.subtitle {
  font-size: clamp(1rem, 1.5vw + 0.5vh, 1.25rem);
  color: hsl(220, 13%, 28%);
  margin-bottom: clamp(1.25rem, 3vh, 2rem);
  font-weight: 400;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.5;
  opacity: 0.9;
}

.subtitle em {
  color: hsl(250, 30%, 16%);
  font-style: italic;
}

.cta-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 0;
  flex-wrap: wrap;
}

.btn {
  padding: clamp(1rem, 2.2vh, 1.35rem) clamp(2rem, 5vw, 3.25rem);
  font-size: clamp(0.95rem, 1.2vw + 0.4vh, 1.15rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 18px hsl(var(--overlay-backdrop-bg) / 0.12);
  min-width: min(100%, 220px);
  min-height: 3.25rem;
}

.btn-primary {
  background: hsl(262, 83%, 58%);
  color: white;
  border: 2px solid hsl(262, 83%, 58%);
}

.btn-primary:hover {
  background: hsl(262, 83%, 52%);
  border-color: hsl(262, 83%, 52%);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px hsl(var(--action-primary-bg) / 0.25);
}

@media (max-width: 768px) {
  .hero {
    padding: 1.25rem 1rem;
  }

  .btn {
    width: 100%;
    max-width: 22rem;
    min-height: 3.5rem;
  }
}
</style>
