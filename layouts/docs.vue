<script setup lang="ts">
import Header from '~/components/layout/Header.vue'
import BottomNav from '~/components/layout/BottomNav.vue'
import { useDocsNav } from '~/composables/useDocsNav'
import { getLocaleDirection } from '~/utils/appLocales'
import {
  BookOpenIcon,
  CodeBracketIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CubeIcon,
  UserGroupIcon,
  ChartBarIcon,
  ShoppingCartIcon,
  TruckIcon,
  MapPinIcon,
  BanknotesIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  BuildingStorefrontIcon,
  CreditCardIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const { t, locale } = useI18n()

type NavSection = { sectionKey: string; path?: undefined; icon?: undefined; labelKey?: undefined }
type NavItem = { labelKey: string; path: string; icon: unknown; sectionKey?: undefined }
type NavEntry = NavSection | NavItem

const navEntries: NavEntry[] = [
  { labelKey: 'docs.nav.primerosPasos', path: '/docs/usuarios/primeros-pasos', icon: BookOpenIcon },

  { sectionKey: 'docs.section.principal' },
  { labelKey: 'docs.nav.pos', path: '/docs/usuarios/pos', icon: ComputerDesktopIcon },
  { labelKey: 'docs.nav.ventas', path: '/docs/usuarios/ventas', icon: ShoppingCartIcon },
  { labelKey: 'docs.nav.despacho', path: '/docs/usuarios/despacho', icon: MapPinIcon },

  { sectionKey: 'docs.section.herramientas' },
  { labelKey: 'docs.nav.analitica', path: '/docs/usuarios/analitica', icon: ChartBarIcon },
  { labelKey: 'docs.nav.finanzas', path: '/docs/usuarios/finanzas', icon: BanknotesIcon },
  { labelKey: 'docs.nav.facturacion', path: '/docs/usuarios/facturacion', icon: DocumentTextIcon },
  { labelKey: 'docs.nav.menu', path: '/docs/usuarios/menu', icon: CubeIcon },
  { labelKey: 'docs.nav.operaciones', path: '/docs/usuarios/operaciones', icon: AdjustmentsHorizontalIcon },
  { labelKey: 'docs.nav.abastecimiento', path: '/docs/usuarios/abastecimiento', icon: TruckIcon },
  { labelKey: 'docs.nav.equipo', path: '/docs/usuarios/equipo', icon: UserGroupIcon },

  { sectionKey: 'docs.section.cuenta' },
  { labelKey: 'docs.nav.negocio', path: '/docs/usuarios/negocio', icon: BuildingStorefrontIcon },
  { labelKey: 'docs.nav.miPlan', path: '/docs/usuarios/mi-plan', icon: CreditCardIcon },

  { sectionKey: 'docs.section.dev' },
  { labelKey: 'docs.nav.integraciones', path: '/docs/dev', icon: CodeBracketIcon },
  { labelKey: 'docs.nav.cli', path: '/docs/cli', icon: CommandLineIcon },
]

const nav = computed(() =>
  navEntries.map((item) => {
    if (item.sectionKey) {
      return { section: t(item.sectionKey), sectionKey: item.sectionKey }
    }
    return {
      label: t(item.labelKey!),
      labelKey: item.labelKey,
      path: item.path!,
      icon: item.icon,
    }
  }),
)

const docsDir = computed(() => getLocaleDirection(locale.value))

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
  <div class="docs-shell bg-surface" :dir="docsDir">
    <NuxtLoadingIndicator />

    <Header />

    <div class="docs-body public-page-container">

      <!-- Sidebar -->
      <aside class="docs-sidebar">
        <div class="docs-nav-card">
          <nav class="docs-nav">

            <template v-for="item in nav">
              <div v-if="'section' in item && item.section" :key="item.sectionKey" class="docs-nav-section">{{ item.section }}</div>
              <NuxtLink
                v-else-if="'path' in item && item.path"
                :key="item.path"
                :to="item.path"
                class="docs-nav-item"
                :class="{ active: isActive(item.path) }"
              >
                <component :is="item.icon" class="docs-nav-item-icon" />
                {{ item.label }}
              </NuxtLink>
            </template>

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
          <p class="docs-toc-title">{{ t('docs.tocTitle') }}</p>
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
    <UiBottomSheetModal v-model="showDocsNav" :title="t('docs.sheetTitle')" max-height="lg">
      <div class="sheet-v2">

        <!-- Nav grid — click navega directamente -->
        <div class="sheet-grid">
          <NuxtLink
            v-for="item in nav.filter((i): i is { label: string; path: string; icon: unknown; labelKey: string } => 'path' in i && !!i.path)"
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
  min-height: 100dvh;
  font-family: 'Lato', sans-serif;
}

/* ─── Header ─────────────────────────────────────────── */
.docs-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: hsl(var(--surface));
  border-bottom: 1px solid hsl(var(--border));
  box-shadow: 0 1px 3px hsl(var(--overlay-backdrop-bg) / 0.04);
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
  color: hsl(var(--text-secondary));
  background: hsl(var(--surface-secondary));
  border: 1px solid hsl(var(--border));
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
  color: hsl(var(--text-tertiary));
  pointer-events: none;
}

.docs-search-input {
  width: 100%;
  padding: 8px 48px 8px 40px;
  border: 1px solid hsl(var(--border));
  border-radius: 999px;
  background: hsl(var(--surface));
  font-size: 13.5px;
  color: hsl(var(--text-secondary));
  outline: none;
  cursor: default;
  font-family: inherit;
}
.docs-search-input::placeholder {
  color: hsl(var(--text-tertiary));
}

.docs-search-kbd {
  position: absolute;
  right: 12px;
  font-size: 11px;
  color: hsl(var(--text-tertiary));
  background: hsl(var(--surface-secondary));
  border: 1px solid hsl(var(--border));
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
  color: hsl(var(--text-secondary));
  text-decoration: none;
}
.docs-header-link:hover {
  color: hsl(var(--primary));
}

.docs-header-cta {
  font-size: 13px;
  font-weight: 700;
  color: hsl(var(--primary));
  background: transparent;
  border: 2px solid hsl(var(--primary));
  padding: 6px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}
.docs-header-cta:hover {
  background: hsl(var(--primary));
  color: hsl(var(--action-primary-text));
}

/* ─── Body ───────────────────────────────────────────── */
.docs-body {
  display: flex;
  flex: 1;
  width: 100%;
  --layout-docs-column-top: 20px;
}

/* ─── Sidebar ────────────────────────────────────────── */
.docs-sidebar {
  width: 256px;
  flex-shrink: 0;
  background: hsl(var(--surface));
  display: flex;
  flex-direction: column;
  position: sticky;
  top: var(--layout-public-header-offset);
  align-self: flex-start;
  height: calc(100dvh - var(--layout-public-header-offset));
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}
.docs-sidebar::-webkit-scrollbar { width: 4px; }
.docs-sidebar::-webkit-scrollbar-track { background: transparent; }
.docs-sidebar::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 10px;
}

@media (max-width: 1023px) {
  .docs-sidebar { display: none; }
  .docs-header-logo { width: auto; }
}

/* ─── Nav card ───────────────────────────────────────── */
.docs-nav-card {
  margin: var(--layout-docs-column-top) 12px 0;
  background: hsl(var(--surface));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  box-shadow: 0 1px 4px hsl(var(--overlay-backdrop-bg) / 0.04);
  overflow: hidden;
}

/* ─── Nav ────────────────────────────────────────────── */
.docs-nav {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.docs-nav-section {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: hsl(var(--text-tertiary));
  padding: 10px 12px 4px;
  margin-top: 4px;
}
.docs-nav-section:first-child {
  margin-top: 0;
}

.docs-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--text-secondary));
  text-decoration: none;
  line-height: 1.4;
  transition: background 0.1s, color 0.1s;
}
.docs-nav-item:hover {
  background: hsl(var(--surface-secondary));
  color: hsl(var(--text-primary));
}
.docs-nav-item.active {
  background: hsl(var(--badge-primary-bg));
  color: hsl(var(--action-primary-hover-bg));
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
  color: hsl(var(--primary));
}

/* ─── Sidebar footer ─────────────────────────────────── */
.docs-sidebar-footer {
  padding: 14px 20px 18px;
  border-top: 1px solid hsl(var(--surface-secondary));
  margin-top: auto;
}

.docs-back-link {
  font-size: 12.5px;
  font-weight: 500;
  color: hsl(var(--text-tertiary));
  text-decoration: none;
}
.docs-back-link:hover {
  color: hsl(var(--primary));
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
    color: hsl(var(--primary));
    background: hsl(var(--badge-primary-bg));
    border: 1px solid hsl(var(--badge-primary-border));
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
  }
  .docs-mobile-index-btn:hover {
    background: hsl(var(--badge-primary-hover-bg));
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
  background: hsl(var(--surface-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--text-secondary));
  border: 1.5px solid transparent;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.sheet-grid-item--active .sheet-grid-icon {
  background: hsl(var(--badge-primary-bg));
  color: hsl(var(--primary));
  border-color: hsl(var(--focus-ring-subtle));
}

.sheet-grid-item:active .sheet-grid-icon {
  background: hsl(var(--border));
}

.sheet-grid-label {
  font-size: 10px;
  font-weight: 500;
  color: hsl(var(--text-secondary));
  text-align: center;
  line-height: 1.3;
  letter-spacing: 0.01em;
  transition: color 0.12s;
}

.sheet-grid-item--active .sheet-grid-label {
  color: hsl(var(--primary));
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
  padding-top: var(--layout-docs-column-top);
  padding-bottom: 64px;
  background: hsl(var(--surface));
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 1023px) {
  .docs-main {
    padding-bottom: calc(64px + var(--layout-public-bottom-nav-height));
  }
}

/* Mobile — sin padding lateral, el card maneja su propio espacio */
@media (max-width: 639px) {
  .docs-body.public-page-container {
    max-width: none;
    padding-inline: 0;
  }

  .docs-main {
    padding-inline: 0;
    padding-bottom: calc(48px + var(--layout-public-bottom-nav-height));
    align-items: stretch;
  }
}

/* ─── TOC derecho ────────────────────────────────────── */
.docs-toc {
  width: 248px;
  flex-shrink: 0;
  display: none;
  padding: var(--layout-docs-column-top) 12px 0;
  background: hsl(var(--surface));
}

@media (min-width: 1280px) {
  .docs-toc {
    display: block;
  }
}

.docs-toc-inner {
  position: sticky;
  top: calc(var(--layout-public-header-offset) + 20px);
  background: hsl(var(--surface));
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  padding: 14px 16px 16px;
  max-height: calc(100dvh - var(--layout-public-header-offset) - 40px);
  overflow-y: auto;
  scrollbar-width: none;
  box-shadow: 0 1px 4px hsl(var(--overlay-backdrop-bg) / 0.04);
}
.docs-toc-inner::-webkit-scrollbar { display: none; }

.docs-toc-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: hsl(var(--text-tertiary));
  margin-bottom: 10px;
  padding-bottom: 9px;
  border-bottom: 1px solid hsl(var(--surface-secondary));
}

/* Rail izquierdo continuo */
.docs-toc-rail {
  display: flex;
  flex-direction: column;
  border-left: 1.5px solid hsl(var(--border));
}

.docs-toc-link {
  display: block;
  font-size: 14px;
  font-weight: 400;
  color: hsl(var(--text-secondary));
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
  color: hsl(var(--text-secondary));
}

.docs-toc-link:hover {
  color: hsl(var(--primary));
  border-start-color: hsl(var(--focus-ring-subtle));
}

.docs-toc-link--active {
  background: hsl(var(--badge-primary-bg));
  color: hsl(var(--action-primary-hover-bg));
  font-weight: 600;
  border-start-color: hsl(var(--primary));
}
</style>
