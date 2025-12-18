<template>
  <header class="header-main" :class="{ 'header-dark': isDarkHeader }">
    <div class="header-content" :style="{ maxWidth: headerMaxWidth }">
      <div class="logo">
        <NuxtLink to="/">
          <img 
            src="/logo_waro_10_octubre.png" 
            alt="Waro" 
            class="logo-image-header"
            :class="{ 'invert-logo': isDarkHeader }"
          >
        </NuxtLink>
      </div>
      <nav :class="{ 'nav-dark': isDarkHeader }">
        <NuxtLink to="/blog">BLOG</NuxtLink>
        <button 
          class="btn-get-started-header"
          :class="{ 'btn-dark': isDarkHeader }"
        >
          COMENZAR
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup>
const route = useRoute()

const headerMaxWidth = computed(() => {
  if (route.path.startsWith('/blog')) {
    return '1280px'
  }
  return '1000px'
})

const isDarkHeader = computed(() => {
  return route.path.startsWith('/blog')
})
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
    background: hsla(0, 0%, 100%, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid hsl(220, 11%, 90%);
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.header-main.header-dark {
    background: hsl(262, 47%, 18%); /* crocus-900 */
    border-bottom: 1px solid hsl(262, 47%, 25%); /* crocus-800 */
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    transition: max-width 0.3s ease;
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
    transition: filter 0.3s ease;
}

.logo-image-header.invert-logo {
    filter: brightness(0) invert(1);
}

nav {
    display: flex;
    gap: 24px;
    align-items: center;
    flex-wrap: wrap;
}

nav a {
    text-decoration: none;
    color: hsl(220, 13%, 28%);
    font-size: 14px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: color 0.3s;
}

nav a:hover {
    color: hsl(262, 83%, 58%);
}

/* Dark Nav Links */
nav.nav-dark a {
    color: white;
}

nav.nav-dark a:hover {
    color: hsl(262, 83%, 85%); /* crocus-200 */
}

/* Specific override for dark header links handled in template via class, 
   but we can also add a scoped class if preferred. 
   Using utility classes in template for simplicity. */

.btn-get-started-header {
    padding: 10px 24px;
    background: white;
    border: 2px solid hsl(262, 83%, 58%);
    color: hsl(262, 83%, 58%);
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;
}

.btn-get-started-header:hover {
    background: hsl(262, 83%, 58%);
    color: white;
}

.btn-get-started-header.btn-dark {
    background: transparent;
    border-color: white;
    color: white;
}

.btn-get-started-header.btn-dark:hover {
    background: white;
    color: hsl(262, 47%, 18%); /* crocus-900 */
}

@media (max-width: 768px) {
    .header-main {
        padding: 8px 20px;
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