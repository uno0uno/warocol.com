<template>
  <div class="min-h-screen" style="background: hsl(220, 14%, 97%);">
    <!-- Header -->
    <header class="header-main">
      <div class="header-content">
        <!-- Logo -->
        <div class="logo">
          <img src="/logo_waro_10_octubre.png" alt="Waro" class="logo-image-header">
        </div>

        <!-- Navigation -->
        <nav>
          <a
            href="mailto:hola@warolabs.com"
            class="support-link"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span class="hidden sm:inline">SOPORTE</span>
          </a>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      <slot />
    </main>

    <!-- Footer -->
    <footer class="footer-main">
      <div class="footer-content">
        <div class="footer-security">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Conexión segura - SSL encriptado</span>
        </div>

        <div class="footer-copyright">
          <p>&copy; {{ currentYear }} Warolabs. Todos los derechos reservados.</p>
        </div>

        <div class="footer-links">
          <a href="mailto:hola@warolabs.com">Contacto</a>
          <span>|</span>
          <a href="https://warolabs.com" target="_blank" rel="noopener">Sobre Warolabs</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
/* Header Styles (matching landing page) */
.header-main {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px 60px;
  background: hsla(0, 0%, 100%, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid hsl(220, 11%, 90%);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
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

.support-link {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: hsl(220, 13%, 28%);
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: color 0.3s;
}

.support-link:hover {
  color: hsl(262, 83%, 58%);
}

/* Main Content */
main {
  min-height: calc(100vh - 120px);
  padding: 20px;
}

/* Footer Styles */
.footer-main {
  background: hsla(0, 0%, 100%, 0.95);
  border-top: 1px solid hsl(220, 11%, 90%);
  padding: 24px 60px;
  margin-top: auto;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.footer-security {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: hsl(220, 13%, 46%);
}

.footer-copyright {
  font-size: 14px;
  color: hsl(220, 13%, 46%);
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: hsl(220, 13%, 46%);
}

.footer-links a {
  text-decoration: none;
  color: hsl(220, 13%, 46%);
  transition: color 0.3s;
}

.footer-links a:hover {
  color: hsl(262, 83%, 58%);
}

/* Responsive */
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

  .support-link {
    font-size: 12px;
  }

  .footer-main {
    padding: 20px;
  }

  .footer-content {
    gap: 12px;
  }
}

@media (min-width: 769px) {
  .footer-content {
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
