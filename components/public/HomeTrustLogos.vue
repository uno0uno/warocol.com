<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })

const logos = [
  {
    name: 'Selina',
    src: 'https://www.publicrelations-germany.com/wp-content/uploads/2013/10/Logo-Selina-1170x658.png',
  },
  {
    name: 'Spotty',
    src: '/logo_spotty.png',
    light: true,
  },
  {
    name: 'Armelo Perro',
    src: '/logo_01.png',
  },
  {
    name: 'Sonidero Bogotano',
    src: '/logo-02.png',
  },
  {
    name: 'DJ CAS',
    src: '/logo-03.png',
  },
]

/** Duplicate track for seamless X-axis loop. */
const carouselLogos = [...logos, ...logos]
</script>

<template>
  <section :key="locale" class="trust-section">
    <div class="trust-title">{{ t('home.trustTitle') }}</div>
    <div class="carousel" role="region" :aria-label="t('home.trustTitle')">
      <div class="carousel-track">
        <div
          v-for="(logo, index) in carouselLogos"
          :key="`${logo.name}-${index}`"
          class="logo-item"
          :aria-hidden="index >= logos.length"
        >
          <img
            :src="logo.src"
            :alt="index < logos.length ? logo.name : ''"
            class="logo-image"
            :class="{ 'logo-image--light': logo.light }"
          >
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trust-section {
  position: relative;
  z-index: 5;
  text-align: center;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 0 clamp(0.75rem, 2vh, 1.5rem);
  flex-shrink: 0;
}

.trust-title {
  font-size: 12px;
  color: hsl(220, 8%, 51%);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: clamp(0.75rem, 2vh, 1.25rem);
  font-weight: 600;
  padding-inline: 1rem;
}

.carousel {
  overflow: hidden;
  width: 100%;
  mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
}

.carousel-track {
  display: flex;
  width: max-content;
  align-items: center;
  gap: clamp(2rem, 5vw, 3.5rem);
  padding-block: 0.25rem;
  animation: trust-marquee 28s linear infinite;
}

.carousel:hover .carousel-track {
  animation-play-state: paused;
}

.logo-item {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-width: 14rem;
}

.logo-image {
  height: clamp(110px, 16vh, 168px);
  width: auto;
  max-width: 320px;
  object-fit: contain;
  filter: grayscale(100%) brightness(0.55) contrast(1.1);
  opacity: 0.85;
  transition: opacity 0.25s ease, transform 0.25s ease, filter 0.25s ease;
}

/* White/light logos (Spotty): invert so they stay visible on white home bg. */
.logo-image--light {
  filter: grayscale(100%) invert(1) brightness(0.88) contrast(1.05);
}

.logo-item:hover .logo-image {
  opacity: 1;
  transform: scale(1.05);
  filter: grayscale(100%) brightness(0.35) contrast(1.15);
}

.logo-item:hover .logo-image--light {
  filter: grayscale(100%) invert(1) brightness(1) contrast(1.08);
}

@keyframes trust-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .carousel-track {
    animation: none;
    justify-content: center;
    width: 100%;
    flex-wrap: wrap;
    gap: 1.25rem;
    padding-inline: 1rem;
  }

  .logo-item[aria-hidden='true'] {
    display: none;
  }
}

@media (max-width: 768px) {
  .trust-section {
    padding-bottom: 0.5rem;
  }

  .trust-title {
    margin-bottom: 0.65rem;
    font-size: 11px;
  }

  .carousel {
    mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
  }

  .logo-item {
    min-width: 5.25rem;
    height: 2.75rem;
  }

  .logo-image {
    height: 40px;
    max-width: 96px;
  }

  .carousel-track {
    gap: 1.25rem;
    animation-duration: 20s;
    padding-block: 0;
  }

  /* Softer treatment on small screens — avoid harsh invert artifacts. */
  .logo-image--light {
    filter: grayscale(100%) invert(1) brightness(0.82) contrast(1.02);
    opacity: 0.9;
  }
}
</style>
