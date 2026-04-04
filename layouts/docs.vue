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
    label: 'Ventas',
    items: [
      { label: 'Ver ventas', path: '/docs/usuarios/ventas/lista-ventas' },
      { label: 'Registrar venta manual', path: '/docs/usuarios/ventas/registrar-venta' },
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
    label: 'Pagos',
    items: [
      { label: 'Pagos a proveedores', path: '/docs/usuarios/pagos/pagos-proveedores' },
    ]
  },
  {
    label: 'Gastos',
    items: [
      { label: 'Ver gastos', path: '/docs/usuarios/gastos/lista-gastos' },
      { label: 'Registrar gasto', path: '/docs/usuarios/gastos/registrar-gasto' },
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
    label: 'Domicilios',
    items: [
      { label: 'Gestionar pedidos', path: '/docs/usuarios/domicilios/gestionar-domicilios' },
    ]
  },
  {
    label: 'Equipo',
    items: [
      { label: 'Agregar empleado', path: '/docs/usuarios/equipo/agregar-empleado' },
      { label: 'Configurar salario', path: '/docs/usuarios/equipo/configurar-salario' },
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
import {
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
  ShoppingBagIcon,
  CubeIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  TruckIcon,
} from '@heroicons/vue/24/outline'

const { showDocsNav } = useDocsNav()
function isGroupActive(items: { path: string }[]) {
  return items.some(item => route.path === item.path)
}

const activeSheetSection = ref(nav[0].label)

const sectionIcon: Record<string, unknown> = {
  'Empezar': BookOpenIcon,
  'Menú': ClipboardDocumentListIcon,
  'POS': ComputerDesktopIcon,
  'Ventas': ShoppingCartIcon,
  'Compras': ShoppingBagIcon,
  'Pagos': BanknotesIcon,
  'Gastos': ReceiptPercentIcon,
  'Inventario': CubeIcon,
  'Domicilios': TruckIcon,
  'Equipo': UserGroupIcon,
  'Analítica': ChartBarIcon,
}

watch(showDocsNav, (open) => {
  if (open) {
    const active = nav.find(s => isGroupActive(s.items))
    activeSheetSection.value = active ? active.label : nav[0].label
  }
})

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

        <!-- Section grid — mismo estilo que DashboardBottomNav -->
        <div class="p-4 border-b border-titan-100">
          <div class="grid grid-cols-4 gap-3">
            <button
              v-for="section in nav"
              :key="section.label"
              class="flex flex-col items-center gap-1"
              @click="activeSheetSection = section.label"
            >
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                :class="activeSheetSection === section.label ? 'bg-crocus-100' : 'bg-titan-100'"
              >
                <component
                  :is="sectionIcon[section.label]"
                  class="w-6 h-6 transition-colors"
                  :class="activeSheetSection === section.label ? 'text-crocus-600' : 'text-titan-600'"
                />
              </div>
              <span
                class="text-[10px] transition-colors"
                :class="activeSheetSection === section.label ? 'text-crocus-600 font-semibold' : 'text-titan-600'"
              >{{ section.label }}</span>
            </button>
          </div>
        </div>

        <!-- Items for active section -->
        <div class="sheet-items">
          <template v-for="section in nav">
            <div v-if="activeSheetSection === section.label" :key="section.label" class="sheet-items-list">
              <NuxtLink
                v-for="item in section.items"
                :key="item.path"
                :to="item.path"
                class="sheet-item"
                :class="{ 'sheet-item--active': isActive(item.path) }"
                @click="showDocsNav = false"
              >
                <span class="sheet-item-label">{{ item.label }}</span>
                <svg class="sheet-item-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>
          </template>
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

/* ─── Sheet v2 ───────────────────────────────────────── */
.sheet-v2 {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: calc(100dvh - 130px);
  overflow: hidden;
}


/* Items list */
.sheet-items {
  flex: 1;
  overflow-y: auto;
  padding: 10px 16px 16px;
  overscroll-behavior: contain;
}

.sheet-items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sheet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px solid hsl(var(--titan-150, var(--titan-200)));
  background: #fff;
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  color: hsl(var(--ebony-700));
  letter-spacing: -0.01em;
  transition: background 0.12s, border-color 0.12s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.sheet-item:active {
  background: hsl(var(--titan-100));
}

.sheet-item-label {
  flex: 1;
}

.sheet-item-arrow {
  width: 16px;
  height: 16px;
  color: hsl(var(--ebony-300));
  flex-shrink: 0;
  transition: color 0.12s, transform 0.12s;
}

.sheet-item--active {
  background: #fff;
  border-color: hsl(var(--crocus-400));
  color: hsl(var(--crocus-700));
  box-shadow: none;
}

.sheet-item--active .sheet-item-arrow {
  color: hsl(var(--crocus-400));
  transform: translateX(2px);
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
  width: 216px;
  flex-shrink: 0;
  display: none;
  padding: 24px 16px 0 0;
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
  border-radius: 12px;
  padding: 16px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  scrollbar-width: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.docs-toc-inner::-webkit-scrollbar { display: none; }

.docs-toc-title {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: hsl(var(--ebony-400));
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid hsl(var(--titan-100));
}

/* Rail izquierdo continuo */
.docs-toc-rail {
  display: flex;
  flex-direction: column;
  border-left: 2px solid hsl(var(--titan-100));
  gap: 1px;
}

.docs-toc-link {
  display: block;
  font-size: 12.5px;
  font-weight: 400;
  color: hsl(var(--ebony-500));
  text-decoration: none;
  padding: 5px 8px 5px 12px;
  border-radius: 6px;
  line-height: 1.45;
  margin-left: -2px;
  border-left: 2px solid transparent;
  transition: color 0.12s, background 0.12s, border-color 0.12s;
}

.docs-toc-link--h3 {
  padding-left: 20px;
  font-size: 12px;
  color: hsl(var(--ebony-400));
}

.docs-toc-link:hover {
  background: hsl(var(--titan-50));
  color: hsl(var(--crocus-700));
  border-left-color: hsl(var(--crocus-300));
}

.docs-toc-link--active {
  background: hsl(var(--crocus-50));
  color: hsl(var(--crocus-700));
  font-weight: 600;
  border-left-color: hsl(var(--crocus-500));
}
</style>
