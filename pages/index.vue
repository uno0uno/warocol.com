<template>
  <div class="index-page animate-fade-in">
    <!-- Animated Food Background -->
    <div class="food-bg">
        <div class="food-item">🍞</div>
        <div class="food-item">🥖</div>
        <div class="food-item">🥐</div>
        <div class="food-item">🍕</div>
        <div class="food-item">🍔</div>
        <div class="food-item">🌮</div>
        <div class="food-item">🍟</div>
        <div class="food-item">🥪</div>
        <div class="food-item">🌭</div>
        <div class="food-item">🍖</div>
        <div class="food-item">🥙</div>
        <div class="food-item">🍗</div>
        <div class="food-item">🥓</div>
        <div class="food-item">🥩</div>
        <div class="food-item">🍳</div>
        <div class="food-item">🧀</div>
        <div class="food-item">🥚</div>
        <div class="food-item">🍱</div>
        <div class="food-item">🥗</div>
        <div class="food-item">🍝</div>
        <div class="food-item">🍜</div>
        <div class="food-item">🍲</div>
        <div class="food-item">🍛</div>
        <div class="food-item">🍣</div>
        <div class="food-item">🍤</div>
        <div class="food-item">🥟</div>
        <div class="food-item">🥡</div>
        <div class="food-item">🦐</div>
        <div class="food-item">🦞</div>
        <div class="food-item">🦀</div>
        <div class="food-item">🐟</div>
        <div class="food-item">🥘</div>
        <div class="food-item">🍚</div>
        <div class="food-item">🥫</div>
        <div class="food-item">🧆</div>
        <div class="food-item">🥧</div>
        <div class="food-item">🧁</div>
        <div class="food-item">🍰</div>
        <div class="food-item">🎂</div>
        <div class="food-item">🍪</div>
    </div>


    <!-- Hero Section -->
    <section class="hero">
        <h1 class="font-quantico">CERO MISTERIO EN TU RESTAURANTE.</h1>
        <p class="subtitle">Desde el precio de un plato hasta el turno de un empleado. Ponemos a tu alcance la tecnología que convierte tus datos en decisiones certeras. <em>Nosotros te guiamos para que sea fácil.</em></p>
        
        <div class="cta-buttons">
            <button class="btn btn-secondary">HABLA CON NOSOTROS</button>
        </div>
    </section>

    <!-- Trust Section -->
    <section class="trust-section">
        <div class="trust-title">MARCAS QUE HAN CONFIADO EN NOSOTROS</div>
        <div class="logos">
            <div class="logo-item">
                <img src="https://www.publicrelations-germany.com/wp-content/uploads/2013/10/Logo-Selina-1170x658.png" alt="Selina" class="logo-image">
            </div>
            <div class="logo-item">
                <img src="https://spotty.yurbban.com/wp-content/uploads/2024/02/Logo-SPOTTY-principal-.png" alt="Spotty" class="logo-image">
            </div>
            <div class="logo-item">
                <img src="/logo_01.png" alt="Armelo Perro" class="logo-image">
            </div>
            <div class="logo-item">
                <img src="/logo-02.png" alt="Sonidero Bogotano" class="logo-image">
            </div>
            <div class="logo-item">
                <img src="/logo-03.png" alt="DJ CAS" class="logo-image">
            </div>
        </div>
    </section>
  </div>
</template>

<script setup>
const route = useRoute()
const { public: config } = useRuntimeConfig()

const canonicalUrl = computed(() => {
  const baseUrl = config.siteUrl || 'https://warocol.com'
  return `${baseUrl}${route.path === '/' ? '' : route.path}`
})

useHead({
  title: config.seoTitle,
  meta: [
    { name: 'description', content: config.seoDescription },
    { property: 'og:title', content: config.ogTitle },
    { property: 'og:description', content: config.ogDescription },
    { property: 'og:url', content: canonicalUrl },
    { name: 'twitter:title', content: config.twitterTitle },
    { name: 'twitter:description', content: config.twitterDescription }
  ],
  link: [
    { rel: 'canonical', href: canonicalUrl }
  ]
})
</script>

<style scoped>
.index-page {
    position: relative;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: hsl(220, 14%, 97%); /* Titan 100 - Fondo claro neutral */
    color: hsl(250, 30%, 16%); /* Ebony 900 - Texto oscuro con alto contraste */
    overflow-x: hidden;
}

/* Animated Food Background */
.food-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    z-index: 1;
    pointer-events: none;
}

.food-item {
    position: absolute;
    font-size: 50px;
    opacity: 0.08;
    filter: grayscale(100%) brightness(0.7);
}

/* Patrón de cuadrícula tipo papel de restaurante */
.food-item:nth-child(1) { left: 5%; top: 10%; }
.food-item:nth-child(2) { left: 15%; top: 10%; }
.food-item:nth-child(3) { left: 25%; top: 10%; }
.food-item:nth-child(4) { left: 35%; top: 10%; }
.food-item:nth-child(5) { left: 45%; top: 10%; }
.food-item:nth-child(6) { left: 55%; top: 10%; }
.food-item:nth-child(7) { left: 65%; top: 10%; }
.food-item:nth-child(8) { left: 75%; top: 10%; }
.food-item:nth-child(9) { left: 85%; top: 10%; }
.food-item:nth-child(10) { left: 95%; top: 10%; }

.food-item:nth-child(11) { left: 5%; top: 25%; }
.food-item:nth-child(12) { left: 15%; top: 25%; }
.food-item:nth-child(13) { left: 25%; top: 25%; }
.food-item:nth-child(14) { left: 35%; top: 25%; }
.food-item:nth-child(15) { left: 45%; top: 25%; }
.food-item:nth-child(16) { left: 55%; top: 25%; }
.food-item:nth-child(17) { left: 65%; top: 25%; }
.food-item:nth-child(18) { left: 75%; top: 25%; }
.food-item:nth-child(19) { left: 85%; top: 25%; }
.food-item:nth-child(20) { left: 95%; top: 25%; }

.food-item:nth-child(21) { left: 5%; top: 40%; }
.food-item:nth-child(22) { left: 15%; top: 40%; }
.food-item:nth-child(23) { left: 25%; top: 40%; }
.food-item:nth-child(24) { left: 35%; top: 40%; }
.food-item:nth-child(25) { left: 45%; top: 40%; }
.food-item:nth-child(26) { left: 55%; top: 40%; }
.food-item:nth-child(27) { left: 65%; top: 40%; }
.food-item:nth-child(28) { left: 75%; top: 40%; }
.food-item:nth-child(29) { left: 85%; top: 40%; }
.food-item:nth-child(30) { left: 95%; top: 40%; }

.food-item:nth-child(31) { left: 5%; top: 55%; }
.food-item:nth-child(32) { left: 15%; top: 55%; }
.food-item:nth-child(33) { left: 25%; top: 55%; }
.food-item:nth-child(34) { left: 35%; top: 55%; }
.food-item:nth-child(35) { left: 45%; top: 55%; }
.food-item:nth-child(36) { left: 55%; top: 55%; }
.food-item:nth-child(37) { left: 65%; top: 55%; }
.food-item:nth-child(38) { left: 75%; top: 55%; }
.food-item:nth-child(39) { left: 85%; top: 55%; }
.food-item:nth-child(40) { left: 95%; top: 55%; }

@keyframes float-food {
    0%, 100% {
        transform: translateY(0px) rotate(0deg);
    }
    50% {
        transform: translateY(-5px) rotate(2deg);
    }
}


/* Hero Section */
.hero {
    position: relative;
    z-index: 5;
    text-align: center;
    padding: 60px 20px 60px;
    max-width: 1200px;
    margin: 0 auto;
}

h1 {
    font-size: clamp(2.5rem, 5vw, 5rem);
    font-weight: 900;
    color: hsl(250, 30%, 16%); /* Ebony 900 */
    letter-spacing: -2px;
    margin-bottom: 24px;
    text-transform: uppercase;
    line-height: 0.95;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.subtitle {
    font-size: clamp(1.1rem, 2.5vw, 1.25rem);
    color: hsl(220, 13%, 28%); /* Ebony 600 - Texto medio con buen contraste */
    margin-bottom: 40px;
    font-weight: 400;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
    opacity: 0.9;
}

.subtitle em {
    color: hsl(250, 30%, 16%); /* Ebony 900 - Resaltar texto en cursiva */
    font-style: italic;
}

/* CTA Buttons */
.cta-buttons {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-bottom: 80px;
    flex-wrap: wrap;
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
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    min-width: 160px;
}

.btn-primary {
    background: hsl(250, 30%, 16%); /* Ebony 900 - Negro profundo */
    color: white;
}

.btn-primary:hover {
    background: hsl(243, 26%, 23%); /* Ebony 800 - Ligeramente más claro al hover */
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.btn-secondary {
    background: transparent;
    color: hsl(262, 83%, 58%); /* Crocus 600 */
    border: 2px solid hsl(262, 83%, 58%); /* Crocus 600 */
}

.btn-secondary:hover {
    background: hsl(262, 83%, 58%); /* Crocus 600 */
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(141, 54, 235, 0.2);
}

/* Trust Section */
.trust-section {
    position: relative;
    z-index: 5;
    text-align: center;
    max-width: 1200px;
    margin: 0 auto;
}

.trust-title {
    font-size: 12px;
    color: hsl(220, 8%, 51%); /* Ebony 400 - Mayor contraste para legibilidad */
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
    color: hsl(220, 13%, 28%); /* Ebony 600 - Mejor contraste */
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
    .hero {
        padding: 40px 16px 40px;
    }
    
    .trust-section {
        padding: 30px 16px 40px;
    }

    .cta-buttons {
        gap: 12px;
    }
    
    .btn {
        padding: 12px 24px;
        min-width: 140px;
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