<script setup lang="ts">
const route = useRoute()

const nav = [
  {
    label: 'Empezar',
    items: [
      { label: 'Primeros pasos', path: '/docs/usuarios/primeros-pasos' },
    ]
  },
  {
    label: 'Menú',
    items: [
      { label: 'Recetas', path: '/docs/usuarios/menu/recetas' },
      { label: 'Productos', path: '/docs/usuarios/menu/crear-producto' },
      { label: 'Modificadores', path: '/docs/usuarios/menu/modificadores' },
    ]
  },
  {
    label: 'POS',
    items: [
      { label: 'Procesar una venta', path: '/docs/usuarios/pos/procesar-venta' },
    ]
  },
  {
    label: 'Compras',
    items: [
      { label: 'Gestionar proveedores', path: '/docs/usuarios/compras/gestionar-proveedores' },
      { label: 'Registrar compra con IA', path: '/docs/usuarios/compras/crear-orden-compra' },
    ]
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Registrar ajuste', path: '/docs/usuarios/inventario/registrar-ajuste' },
      { label: 'Ver movimientos', path: '/docs/usuarios/inventario/ver-movimientos' },
    ]
  },
  {
    label: 'Equipo',
    items: [
      { label: 'Agregar empleado', path: '/docs/usuarios/equipo/agregar-empleado' },
      { label: 'Registrar pago', path: '/docs/usuarios/equipo/registrar-pago' },
    ]
  },
  {
    label: 'Analítica',
    items: [
      { label: 'Leer el dashboard', path: '/docs/usuarios/analitica/leer-dashboard' },
    ]
  },
]

function isActive(path: string) {
  return route.path === path
}

import Header from '~/components/layout/Header.vue'
import BottomNav from '~/components/layout/BottomNav.vue'
import { useDocsNav } from '~/composables/useDocsNav'

const { showDocsNav } = useDocsNav()
function isGroupActive(items: { path: string }[]) {
  return items.some(item => route.path === item.path)
}
</script>

<template>
  <div class="docs-shell">
    <NuxtLoadingIndicator />

    <Header />

    <div class="docs-body">

      <!-- Sidebar -->
      <aside class="docs-sidebar">
        <nav class="docs-nav">

          <div
            v-for="section in nav"
            :key="section.label"
            class="docs-nav-section"
          >
            <span
              class="docs-section-label"
              :class="{ 'docs-section-label--active': isGroupActive(section.items) }"
            >
              {{ section.label }}
            </span>
            <ul>
              <li v-for="item in section.items" :key="item.path">
                <NuxtLink
                  :to="item.path"
                  class="docs-nav-item"
                  :class="{ active: isActive(item.path) }"
                >
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>

        </nav>

        <div class="docs-sidebar-footer">
        </div>
      </aside>

      <!-- Main -->
      <main class="docs-main">
        <slot />
      </main>

    </div>

    <!-- Bottom sheet nav — solo mobile -->
    <UiBottomSheetModal v-model="showDocsNav" title="Contenido" max-height="lg">
      <div class="docs-sheet-nav">
        <div v-for="section in nav" :key="section.label" class="docs-nav-section">
          <span
            class="docs-section-label"
            :class="{ 'docs-section-label--active': isGroupActive(section.items) }"
          >
            {{ section.label }}
          </span>
          <ul>
            <li v-for="item in section.items" :key="item.path">
              <NuxtLink
                :to="item.path"
                class="docs-nav-item"
                :class="{ active: isActive(item.path) }"
                @click="showDocsNav = false"
              >
                <span class="flex items-center justify-between w-full">
                  {{ item.label }}
                  <svg class="w-4 h-4 opacity-30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </UiBottomSheetModal>

    <BottomNav />
  </div>
</template>

<style scoped>
/* ─── Shell ─────────────────────────────────────────── */
.docs-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #fff;
  font-family: 'Lato', sans-serif;
}

/* ─── Header ─────────────────────────────────────────── */
.docs-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1px solid hsl(var(--titan-200));
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.docs-header-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 24px;
  height: 58px;
  max-width: 100%;
}

/* Logo */
.docs-header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
  width: 256px;
}

.docs-header-img {
  height: 26px;
  width: auto;
  object-fit: contain;
}

.docs-header-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: hsl(var(--ebony-500));
  background: hsl(var(--titan-100));
  border: 1px solid hsl(var(--titan-200));
  padding: 2px 8px;
  border-radius: 4px;
}

/* Search */
.docs-search-wrap {
  margin-left: auto;
  max-width: 260px;
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
}

.docs-search-icon {
  position: absolute;
  left: 14px;
  width: 16px;
  height: 16px;
  color: hsl(var(--ebony-400));
  pointer-events: none;
}

.docs-search-input {
  width: 100%;
  padding: 8px 48px 8px 40px;
  border: 1px solid hsl(var(--titan-200));
  border-radius: 999px;
  background: hsl(var(--titan-50));
  font-size: 13.5px;
  color: hsl(var(--ebony-600));
  outline: none;
  cursor: default;
  font-family: inherit;
}
.docs-search-input::placeholder {
  color: hsl(var(--ebony-400));
}

.docs-search-kbd {
  position: absolute;
  right: 12px;
  font-size: 11px;
  color: hsl(var(--ebony-400));
  background: hsl(var(--titan-100));
  border: 1px solid hsl(var(--titan-200));
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

/* Nav derecha */
.docs-header-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.docs-header-link {
  font-size: 13.5px;
  font-weight: 600;
  color: hsl(var(--ebony-600));
  text-decoration: none;
}
.docs-header-link:hover {
  color: hsl(var(--crocus-600));
}

.docs-header-cta {
  font-size: 13px;
  font-weight: 700;
  color: hsl(var(--crocus-600));
  background: transparent;
  border: 2px solid hsl(var(--crocus-600));
  padding: 6px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}
.docs-header-cta:hover {
  background: hsl(var(--crocus-600));
  color: #fff;
}

/* ─── Body ───────────────────────────────────────────── */
.docs-body {
  display: flex;
  flex: 1;
  width: 100%;
}

/* ─── Sidebar ────────────────────────────────────────── */
.docs-sidebar {
  width: 256px;
  flex-shrink: 0;
  background: hsl(var(--titan-100));
  border-right: 1px solid hsl(var(--titan-200));
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 58px;
  align-self: flex-start;
  height: calc(100vh - 58px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--titan-200)) transparent;
}
.docs-sidebar::-webkit-scrollbar { width: 4px; }
.docs-sidebar::-webkit-scrollbar-track { background: transparent; }
.docs-sidebar::-webkit-scrollbar-thumb {
  background: hsl(var(--titan-200));
  border-radius: 10px;
}

@media (max-width: 1023px) {
  .docs-sidebar { display: none; }
  .docs-header-logo { width: auto; }
}

/* ─── Nav ────────────────────────────────────────────── */
.docs-nav {
  flex: 1;
  padding: 16px 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.docs-nav-home {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  font-size: 15px;
  border: 1px solid hsl(var(--titan-200));
}
.docs-nav-home:hover {
  background: hsl(var(--crocus-50));
  color: hsl(var(--ebony-900));
  border-color: hsl(var(--crocus-200));
}
.docs-nav-home.active {
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-700));
  font-weight: 700;
  border-color: hsl(var(--crocus-200));
}

.docs-nav-section {
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid hsl(var(--titan-200));
  border-radius: 10px;
  overflow: hidden;
}

.docs-section-label {
  display: block;
  padding: 9px 14px 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: hsl(var(--ebony-400));
  background: hsl(var(--titan-50));
  border-bottom: 1px solid hsl(var(--titan-100));
}
.docs-section-label--active {
  color: hsl(var(--crocus-500));
  background: hsl(var(--crocus-50));
  border-bottom-color: hsl(var(--crocus-100));
}

.docs-nav-section ul {
  list-style: none;
  margin: 0;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.docs-nav-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 400;
  color: hsl(var(--ebony-600));
  text-decoration: none;
  line-height: 1.4;
}
.docs-nav-item:hover {
  background: hsl(var(--titan-100));
  color: hsl(var(--ebony-900));
}
.docs-nav-item.active {
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-700));
  font-weight: 600;
}

/* ─── Sidebar footer ─────────────────────────────────── */
.docs-sidebar-footer {
  padding: 14px 20px 18px;
  border-top: 1px solid hsl(var(--titan-100));
  margin-top: auto;
}

.docs-back-link {
  font-size: 12.5px;
  font-weight: 500;
  color: hsl(var(--ebony-400));
  text-decoration: none;
}
.docs-back-link:hover {
  color: hsl(var(--crocus-600));
}

/* ─── Mobile index button ────────────────────────────── */
.docs-mobile-index-btn {
  display: none;
}
@media (max-width: 1023px) {
  .docs-mobile-index-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 20px;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--crocus-600));
    background: hsl(var(--crocus-50));
    border: 1px solid hsl(var(--crocus-200));
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
  }
  .docs-mobile-index-btn:hover {
    background: hsl(var(--crocus-100));
  }
}

/* ─── Sheet nav ──────────────────────────────────────── */
.docs-sheet-nav {
  padding: 8px 0 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  /* 100dvh - header del sheet (56px) - bottom nav (58px) - margen (16px) */
  max-height: calc(100dvh - 130px);
}

/* Dentro del sheet: quitar el card border de cada sección */
.docs-sheet-nav .docs-nav-section {
  background: none;
  border: none;
  border-radius: 0;
  margin-bottom: 0;
}

/* Separador entre secciones — hairline superior */
.docs-sheet-nav .docs-nav-section + .docs-nav-section {
  border-top: 1px solid hsl(var(--titan-100));
  margin-top: 4px;
  padding-top: 4px;
}

.docs-sheet-nav .docs-section-label {
  background: none;
  border: none;
  padding: 10px 20px 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  /* ebony-500 — legible pero subordinado a los items */
  color: hsl(var(--ebony-400));
}

.docs-sheet-nav .docs-section-label--active {
  color: hsl(var(--crocus-600));
  background: none;
}

.docs-sheet-nav ul {
  padding: 2px 0;
  gap: 0;
}

.docs-sheet-nav .docs-nav-item {
  padding: 10px 16px 10px 20px;
  font-size: 14.5px;
  font-weight: 500;               /* 500 — legible sin ser bold */
  color: hsl(var(--ebony-700));
  border-radius: 0;
  border-left: 3px solid transparent;
  display: flex;
  align-items: center;
  letter-spacing: -0.01em;
}

/* Chevron — por defecto muy tenue */
.docs-sheet-nav .docs-nav-item svg {
  opacity: 0.2;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.docs-sheet-nav .docs-nav-item:hover {
  background: hsl(var(--titan-50));
  color: hsl(var(--ebony-900));
}

.docs-sheet-nav .docs-nav-item:hover svg {
  opacity: 0.4;
}

.docs-sheet-nav .docs-nav-item.active {
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-700));
  font-weight: 600;
  border-left-color: hsl(var(--crocus-500));
}

/* Chevron activo — crocus visible */
.docs-sheet-nav .docs-nav-item.active svg {
  opacity: 1;
  color: hsl(var(--crocus-400));
}

/* ─── H1 de artículos — fuente Quantico como en el root ── */
.docs-main :deep(.article-style h1) {
  font-family: 'Quantico', monospace;
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

/* ─── Main ───────────────────────────────────────────── */
.docs-main {
  flex: 1;
  min-width: 0;
  padding: 24px 32px 64px;
  background: hsl(var(--titan-100));
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Tablet */
@media (max-width: 1023px) {
  .docs-main {
    padding: 16px 12px calc(64px + 58px);
  }
}

/* Mobile — sin padding lateral, el card maneja su propio espacio */
@media (max-width: 639px) {
  .docs-main {
    padding: 0 0 calc(48px + 58px);
    background: #fff;
    align-items: stretch;
  }
}
</style>
