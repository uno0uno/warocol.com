<script setup lang="ts">
import { Menu, X, Home } from 'lucide-vue-next'

const sidebarOpen = ref(false)
const route = useRoute()

const nav = [
  {
    label: 'Empezar',
    items: [
      { label: 'Primeros pasos', path: '/docs/usuarios/primeros-pasos', icon: '🚀' },
    ]
  },
  {
    label: 'Menú',
    items: [
      { label: 'Recetas', path: '/docs/usuarios/menu/recetas', icon: '📋' },
      { label: 'Productos', path: '/docs/usuarios/menu/crear-producto', icon: '🍽️' },
      { label: 'Modificadores', path: '/docs/usuarios/menu/modificadores', icon: '🔧' },
    ]
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Registrar ajuste', path: '/docs/usuarios/inventario/registrar-ajuste', icon: '📦' },
      { label: 'Ver movimientos', path: '/docs/usuarios/inventario/ver-movimientos', icon: '📊' },
    ]
  },
  {
    label: 'Compras',
    items: [
      { label: 'Gestionar proveedores', path: '/docs/usuarios/compras/gestionar-proveedores', icon: '🤝' },
      { label: 'Crear orden de compra', path: '/docs/usuarios/compras/crear-orden-compra', icon: '🛒' },
    ]
  },
  {
    label: 'Equipo',
    items: [
      { label: 'Agregar empleado', path: '/docs/usuarios/equipo/agregar-empleado', icon: '👤' },
      { label: 'Registrar pago', path: '/docs/usuarios/equipo/registrar-pago', icon: '💳' },
    ]
  },
  {
    label: 'Analítica',
    items: [
      { label: 'Leer el dashboard', path: '/docs/usuarios/analitica/leer-dashboard', icon: '📈' },
    ]
  },
  {
    label: 'POS — Punto de venta',
    items: [
      { label: 'Procesar una venta', path: '/docs/usuarios/pos/procesar-venta', icon: '🧾' },
    ]
  },
]

function isActive(path: string) {
  return route.path === path
}

function isGroupActive(items: { path: string }[]) {
  return items.some(item => route.path === item.path)
}

watch(() => route.path, () => {
  sidebarOpen.value = false
})
</script>

<template>
  <div class="docs-shell">
    <NuxtLoadingIndicator />
    <Header />

    <div class="docs-body">

      <!-- Mobile overlay -->
      <Transition name="overlay">
        <div
          v-if="sidebarOpen"
          class="docs-overlay"
          @click="sidebarOpen = false"
        />
      </Transition>

      <!-- Sidebar -->
      <aside :class="['docs-sidebar', { 'docs-sidebar--open': sidebarOpen }]">

        <!-- Mobile close + title -->
        <div class="docs-sidebar-header">
          <span class="docs-sidebar-title">Documentación</span>
          <button class="docs-sidebar-close lg:hidden" @click="sidebarOpen = false">
            <X :size="18" />
          </button>
        </div>

        <nav class="docs-nav">
          <!-- Index -->
          <NuxtLink
            to="/docs"
            class="docs-nav-home"
            :class="{ active: route.path === '/docs' }"
          >
            <Home :size="13" />
            Índice general
          </NuxtLink>

          <!-- Sections -->
          <div
            v-for="section in nav"
            :key="section.label"
            class="docs-nav-section"
            :class="{ 'is-active': isGroupActive(section.items) }"
          >
            <span class="docs-section-label">{{ section.label }}</span>
            <ul>
              <li v-for="item in section.items" :key="item.path">
                <NuxtLink
                  :to="item.path"
                  class="docs-nav-item"
                  :class="{ active: isActive(item.path) }"
                >
                  <span aria-hidden="true">{{ item.icon }}</span>
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- Mobile sidebar toggle (floating) -->
      <button
        class="docs-fab lg:hidden"
        @click="sidebarOpen = true"
        aria-label="Abrir menú de documentación"
      >
        <Menu :size="20" />
      </button>

      <!-- Main content -->
      <main class="docs-main">
        <slot />
      </main>

    </div>

    <Footer />
  </div>
</template>

<style scoped>
/* ─── Shell ──────────────────────────────────────────────── */
.docs-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: hsl(var(--titan-100));
  font-family: 'Lato', sans-serif;
}

/* ─── Body ───────────────────────────────────────────────── */
.docs-body {
  display: flex;
  flex: 1;
  position: relative;
  /* Align content with the app's max-width container */
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 0 16px;
  gap: 0;
}

/* ─── Overlay (mobile) ───────────────────────────────────── */
.docs-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgb(0 0 0 / 0.4);
  backdrop-filter: blur(3px);
}

/* ─── Sidebar ────────────────────────────────────────────── */
.docs-sidebar {
  width: 256px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid hsl(var(--titan-300));
  /* Sticky below the header */
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: calc(100vh - 64px); /* approx header height */
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--titan-400)) transparent;
  border-radius: 0 0 12px 0;
}

/* Mobile: off-screen */
@media (max-width: 1023px) {
  .docs-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100dvh;
    width: 280px;
    z-index: 35;
    border-radius: 0;
    border-right: 1px solid hsl(var(--titan-300));
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 8px 0 32px rgb(0 0 0 / 0.12);
  }
  .docs-sidebar--open {
    transform: translateX(0);
  }
}

/* ─── Sidebar header ─────────────────────────────────────── */
.docs-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 12px;
  border-bottom: 1px solid hsl(var(--titan-200));
  margin-bottom: 8px;
}

.docs-sidebar-title {
  font-family: 'Quantico', monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: hsl(var(--ebony-700));
  text-transform: uppercase;
}

.docs-sidebar-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: hsl(var(--ebony-400));
  transition: background 0.12s;
}
.docs-sidebar-close:hover {
  background: hsl(var(--titan-200));
}

/* ─── Nav ────────────────────────────────────────────────── */
.docs-nav {
  padding: 4px 10px 40px;
}

.docs-nav-home {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--ebony-500));
  text-decoration: none;
  margin-bottom: 12px;
  transition: background 0.12s, color 0.12s;
}
.docs-nav-home:hover {
  background: hsl(var(--titan-100));
  color: hsl(var(--ebony-800));
}
.docs-nav-home.active {
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-700));
}

.docs-nav-section {
  margin-bottom: 20px;
}

.docs-section-label {
  display: block;
  padding: 2px 10px 5px;
  font-family: 'Quantico', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: hsl(var(--titan-900));
  transition: color 0.12s;
}

.docs-nav-section.is-active .docs-section-label {
  color: hsl(var(--crocus-600));
}

.docs-nav-section ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.docs-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: hsl(var(--ebony-500));
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
  line-height: 1.3;
}
.docs-nav-item:hover {
  background: hsl(var(--titan-100));
  color: hsl(var(--ebony-800));
}
.docs-nav-item.active {
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-700));
  font-weight: 700;
}

/* ─── Floating toggle (mobile) ───────────────────────────── */
.docs-fab {
  position: fixed;
  bottom: 24px;
  left: 20px;
  z-index: 25;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: hsl(var(--crocus-600));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgb(124 58 237 / 0.4);
  transition: background 0.15s, transform 0.15s;
}
.docs-fab:hover {
  background: hsl(var(--crocus-700));
  transform: scale(1.05);
}

/* ─── Main content ───────────────────────────────────────── */
.docs-main {
  flex: 1;
  min-width: 0;
  padding: 40px 0 80px 40px;
}

@media (max-width: 1023px) {
  .docs-main {
    padding: 32px 0 64px;
  }
  .docs-body {
    padding: 0;
  }
}

/* ─── Transitions ────────────────────────────────────────── */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
