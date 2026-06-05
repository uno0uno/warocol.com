<script setup lang="ts">
const logos = [
  {
    name: 'Selina',
    src: 'https://www.publicrelations-germany.com/wp-content/uploads/2013/10/Logo-Selina-1170x658.png',
  },
  {
    name: 'Spotty',
    src: 'https://spotty.yurbban.com/wp-content/uploads/2024/02/Logo-SPOTTY-principal-.png',
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
</script>

<template>
  <section class="trust-section">
    <div class="trust-title">MARCAS QUE HAN CONFIADO EN NOSOTROS</div>
    <div class="logos">
      <div v-for="logo in logos" :key="logo.name" class="logo-item">
        <img :src="logo.src" :alt="logo.name" class="logo-image">
      </div>
    </div>
  </section>
</template>

<style scoped>
.trust-section {
  position: relative;
  z-index: 5;
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
}

.trust-title {
  font-size: 12px;
  color: hsl(220, 8%, 51%);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 40px;
  font-weight: 600;
}

.logos {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: clamp(30px, 5vw, 50px);
  margin: 0 auto;
}

.logo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  color: hsl(220, 13%, 28%);
  font-weight: 600;
  opacity: 0.7;
}

.logo-image {
  height: clamp(60px, 8vw, 80px);
  width: auto;
  max-width: 120px;
  object-fit: contain;
  filter: grayscale(100%) brightness(0.6) contrast(1.1);
  opacity: 0.8;
  transition: all 0.3s ease;
}

.logo-item:hover .logo-image {
  opacity: 1;
  filter: grayscale(0%) brightness(1) contrast(1);
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .trust-section {
    padding: 30px 16px 40px;
  }

  .logos {
    gap: 20px;
  }

  .logo-image {
    height: 50px;
    max-width: 100px;
  }
}
</style>
