<script setup lang="ts">
const route = useRoute()

import Header from '~/components/layout/Header.vue'
import BottomNav from '~/components/layout/BottomNav.vue'
import { useDocsNav } from '~/composables/useDocsNav'
import {
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CubeIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  TruckIcon,
  MapPinIcon,
} from '@heroicons/vue/24/outline'

const nav = [
  { label: 'Primeros pasos', path: '/docs/usuarios/primeros-pasos',               icon: BookOpenIcon },
  { label: 'Menú',           path: '/docs/usuarios/menu',                         icon: CubeIcon },
  { label: 'POS',            path: '/docs/usuarios/pos/procesar-venta',           icon: ComputerDesktopIcon },
  { label: 'Ventas',         path: '/docs/usuarios/ventas',                       icon: ShoppingCartIcon },
  { label: 'Compras',        path: '/docs/usuarios/compras',                      icon: TruckIcon },
  { label: 'Pagos',          path: '/docs/usuarios/pagos/pagos-proveedores',      icon: CreditCardIcon },
  { label: 'Gastos',         path: '/docs/usuarios/gastos',                       icon: BanknotesIcon },
  { label: 'Inventario',     path: '/docs/usuarios/inventario',                   icon: ClipboardDocumentListIcon },
  { label: 'Domicilios',     path: '/docs/usuarios/domicilios/gestionar-domicilios', icon: MapPinIcon },
  { label: 'Equipo',         path: '/docs/usuarios/equipo',                       icon: UserGroupIcon },
  { label: 'Analítica',      path: '/docs/usuarios/analitica/leer-dashboard',     icon: ChartBarIcon },
]

function isActive(path: string) {
  return route.path === path
}

const { showDocsNav } = useDocsNav()

// TOC
const { headings } = useDocsToc()
const activeHeading = ref('')

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeHeading.value = entry.target.id
          break
        }
      }
    },
    { rootMargin: '0px 0px -60% 0px', threshold: 0 }
  )

  watch(headings, (list) => {
    observer.disconnect()
    nextTick(() => {
      list.forEach(h => {
        const el = document.getElementById(h.id)
        if (el) observer.observe(el)
      })
    })
  }, { immediate: true })

  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <div class="docs-shell">
    <NuxtLoadingIndicator />

    <Header />

    <div class="docs-body">

      <!-- Sidebar -->
      <aside class="docs-sidebar">
        <div class="docs-nav-card">
          <nav class="docs-nav">

            <NuxtLink
              v-for="item in nav"
              :key="item.path"
              :to="item.path"
              class="docs-nav-item"
              :class="{ active: isActive(item.path) }"
            >
              <component :is="item.icon" class="docs-nav-item-icon" />
              {{ item.label }}
            </NuxtLink>

          </nav>
        </div>

        <div class="docs-sidebar-footer">
        </div>
      </aside>

      <!-- Main -->
      <main class="docs-main">
        <slot />
      </main>

      <!-- TOC derecho — solo desktop cuando hay headings -->
      <aside v-if="headings.length > 0" class="docs-toc">
        <div class="docs-toc-inner">
          <p class="docs-toc-title">En esta página</p>
          <nav class="docs-toc-rail">
            <a
              v-for="h in headings"
              :key="h.id"
              :href="`#${h.id}`"
              class="docs-toc-link"
              :class="[
                h.level === 3 ? 'docs-toc-link--h3' : '',
                activeHeading === h.id ? 'docs-toc-link--active' : '',
              ]"
            >{{ h.text }}</a>
          </nav>
        </div>
      </aside>

    </div>

    <!-- Bottom sheet nav — solo mobile -->
    <UiBottomSheetModal v-model="showDocsNav" title="Contenido" max-height="lg">
      <div class="sheet-v2">

        <!-- Nav grid — click navega directamente -->
        <div class="sheet-grid">
          <NuxtLink
            v-for="item in nav"
            :key="item.path"
            :to="item.path"
            class="sheet-grid-item"
            :class="{ 'sheet-grid-item--active': isActive(item.path) }"
            @click="showDocsNav = false"
          >
            <div class="sheet-grid-icon">
              <component :is="item.icon" class="w-6 h-6" />
            </div>
            <span class="sheet-grid-label">{{ item.label }}</span>
          </NuxtLink>
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

/* ─── Nav card ───────────────────────────────────────── */
.docs-nav-card {
  margin: 24px 12px 0;
  background: #fff;
  border: 1px solid hsl(var(--titan-200));
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  overflow: hidden;
}

/* ─── Nav ────────────────────────────────────────────── */
.docs-nav {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.docs-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--ebony-600));
  text-decoration: none;
  line-height: 1.4;
  transition: background 0.1s, color 0.1s;
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

.docs-nav-item-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.65;
}
.docs-nav-item.active .docs-nav-item-icon {
  opacity: 1;
  color: hsl(var(--crocus-600));
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

/* ─── Sheet v2 ───────────────────────────────────────── */
.sheet-v2 {
  padding: 16px;
}

.sheet-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.sheet-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.sheet-grid-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: hsl(var(--titan-100));
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--ebony-500));
  border: 1.5px solid transparent;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.sheet-grid-item--active .sheet-grid-icon {
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-600));
  border-color: hsl(var(--crocus-300));
}

.sheet-grid-item:active .sheet-grid-icon {
  background: hsl(var(--titan-200));
}

.sheet-grid-label {
  font-size: 10px;
  font-weight: 500;
  color: hsl(var(--ebony-500));
  text-align: center;
  line-height: 1.3;
  letter-spacing: 0.01em;
  transition: color 0.12s;
}

.sheet-grid-item--active .sheet-grid-label {
  color: hsl(var(--crocus-600));
  font-weight: 600;
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
  padding: 24px 24px 64px 32px;
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

/* ─── TOC derecho ────────────────────────────────────── */
.docs-toc {
  width: 248px;
  flex-shrink: 0;
  display: none;
  padding: 24px 20px 0 0;
  background: hsl(var(--titan-100));
}

@media (min-width: 1280px) {
  .docs-toc {
    display: block;
  }
}

.docs-toc-inner {
  position: sticky;
  top: calc(58px + 24px);
  background: #fff;
  border: 1px solid hsl(var(--titan-200));
  border-radius: 10px;
  padding: 14px 16px 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  scrollbar-width: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.docs-toc-inner::-webkit-scrollbar { display: none; }

.docs-toc-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: hsl(var(--ebony-400));
  margin-bottom: 10px;
  padding-bottom: 9px;
  border-bottom: 1px solid hsl(var(--titan-100));
}

/* Rail izquierdo continuo */
.docs-toc-rail {
  display: flex;
  flex-direction: column;
  border-left: 1.5px solid hsl(var(--titan-200));
}

.docs-toc-link {
  display: block;
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--ebony-600));
  text-decoration: none;
  padding: 6px 8px 6px 12px;
  border-radius: 0 6px 6px 0;
  line-height: 1.4;
  margin-left: -1.5px;
  border-left: 1.5px solid transparent;
  transition: color 0.12s, background 0.12s, border-color 0.12s;
}

.docs-toc-link--h3 {
  padding-left: 22px;
  font-size: 13px;
  color: hsl(var(--ebony-500));
}

.docs-toc-link:hover {
  color: hsl(var(--crocus-600));
  border-left-color: hsl(var(--crocus-300));
}

.docs-toc-link--active {
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-700));
  font-weight: 600;
  border-left-color: hsl(var(--crocus-500));
}
</style>
