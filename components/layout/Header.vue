<template>
  <header class="header-main">
    <div class="header-content">
      <div class="logo">
        <img src="/logo_waro_10_octubre.png" alt="Waro" class="logo-image-header">
      </div>
      <nav>
        <a href="#eventos">EVENTOS</a>
        <a href="#artistas">ARTISTAS</a>
        <a href="#restaurantes">RESTAURANTES</a>
        <a href="#blog">BLOG</a>
        <a href="/auth/login">INGRESAR</a>
        <button class="btn-get-started-header">COMENZAR</button>
      </nav>
    </div>
  </header>
</template>

<script setup>
// No necesitamos imports complejos para este header simple
</script>

<style scoped>
/* Header */
.header-main {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px 60px;
    background: hsla(0, 0%, 100%, 0.95); /* Blanco puro con transparencia */
    backdrop-filter: blur(10px);
    border-bottom: 1px solid hsl(220, 11%, 90%); /* Titan 300 - Borde sutil */
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 1000px;
}

.logo {
    display: flex;
    align-items: center;
    gap: 8px;
}

.logo-image-header {
    height: 40px;
    width: auto;
    object-fit: contain;
}

nav {
    display: flex;
    gap: 24px;
    align-items: center;
    flex-wrap: wrap;
}

nav a {
    text-decoration: none;
    color: hsl(220, 13%, 28%); /* Ebony 600 - Mejor contraste y legibilidad */
    font-size: 14px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: color 0.3s;
}

nav a:hover {
    color: hsl(262, 83%, 58%); /* Crocus 600 - Acento púrpura */
}

.btn-get-started-header {
    padding: 10px 24px;
    background: white;
    border: 2px solid hsl(262, 83%, 58%); /* Crocus 600 */
    color: hsl(262, 83%, 58%); /* Crocus 600 */
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;
}

.btn-get-started-header:hover {
    background: hsl(262, 83%, 58%); /* Crocus 600 */
    color: white;
}

@media (max-width: 768px) {
    .header-main {
        padding: 8px 20px;
    }

    .header-content {
        flex-direction: column;
        gap: 12px;
    }

    nav {
        gap: 16px;
        justify-content: center;
    }
    
    nav a {
        font-size: 12px;
    }
    
    .btn-get-started-header {
        padding: 8px 16px;
        font-size: 12px;
    }
}
</style>