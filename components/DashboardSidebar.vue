<template>
  <div>
  <!-- Loading Global Overlay -->
  <Teleport to="body">
    <div v-if="isLoggingOut" class="logout-overlay fixed inset-0 flex items-center justify-center z-[9999]">
      <div class="logout-card rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <UiLoadingMatrix class="mb-4" size="9px" color="currentColor" />
        <p class="logout-title text-lg font-medium">{{ t('shell.loggingOut') }}</p>
        <p class="logout-message text-sm mt-2">{{ t('shell.pleaseWait') }}</p>
      </div>
    </div>
  </Teleport>

  <UiBaseSidebar
    :overlay="props.overlay"
    :toggle="props.toggle"
    v-bind="$attrs"
    @expanded-change="$emit('expanded-change', $event)"
  >
    <template #brand>
      <NuxtLink
        :to="dashboardHome"
        class="flex h-11 w-[7.25rem] min-w-0 items-center justify-center overflow-hidden"
        :aria-label="t('shell.goToDashboardHome')"
      >
        <img
          :key="route.fullPath"
          :src="sidebarLogoAnimationSrc"
          alt="WARO Colombia"
          class="h-7 w-full object-contain"
        />
      </NuxtLink>
    </template>

    <!-- Navigation Links -->
    <template #navigation="{ collapsed, close }">

      <!-- ── OPERACIÓN (frecuente) ── -->
      <template v-if="visiblePrimaryItems.length">
        <div class="space-y-0.5">
          <NuxtLink
            v-for="item in visiblePrimaryItems"
            :key="item.to"
            :to="item.to"
            :title="t(item.labelKey)"
            :class="[
              'nav-item group',
              collapsed ? 'justify-center' : '',
              activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
              isNavItemBlocked(item) ? 'nav-item--disabled' : '',
            ]"
            :aria-disabled="isNavItemBlocked(item)"
            :tabindex="isNavItemBlocked(item) ? -1 : undefined"
            @click="(event) => handleNavItemClick(event, item, close)"
          >
            <component :is="item.icon" class="nav-icon" />
            <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">{{ t(item.labelKey) }}</span>
          </NuxtLink>
        </div>
      </template>

      <!-- ── HERRAMIENTAS (with leading divider) ── -->
      <template v-if="visibleSecondaryItems.length">
        <div v-if="!collapsed" class="my-1.5 mx-1 border-t nav-divider" />
        <div class="space-y-0.5">
          <NuxtLink
            v-for="item in visibleSecondaryItems"
            :key="item.to"
            :to="item.to"
            :title="t(item.labelKey)"
            :class="[
              'nav-item',
              collapsed ? 'justify-center' : '',
              activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
              isNavItemBlocked(item) ? 'nav-item--disabled' : '',
            ]"
            :aria-disabled="isNavItemBlocked(item)"
            :tabindex="isNavItemBlocked(item) ? -1 : undefined"
            @click="(event) => handleNavItemClick(event, item, close)"
          >
            <component :is="item.icon" class="nav-icon" />
            <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">
              {{ t(item.labelKey) }}
              <span
                v-if="item.page === 'abastecimiento' && hasCriticalAlerts"
                class="inline-block w-1.5 h-1.5 rounded-full bg-destructive align-middle ms-1.5"
              />
            </span>
          </NuxtLink>
        </div>
      </template>

      <!-- ── APPS (with leading divider) — Eventos is owner-only — -->
      <template v-if="showEventos">
        <div v-if="!collapsed" class="my-1.5 mx-1 border-t nav-divider" />
        <div class="space-y-0.5">
          <p v-if="!collapsed" class="nav-section-label">{{ t('nav.apps') }}</p>
          <a
            href="https://warotickets.com/gestion/eventos"
            target="_blank"
            :title="t('nav.eventos')"
            :class="['nav-item nav-item--idle', collapsed ? 'justify-center' : '', props.billingBlocked ? 'nav-item--disabled' : '']"
            :aria-disabled="props.billingBlocked"
            :tabindex="props.billingBlocked ? -1 : undefined"
            @click="(event) => handleExternalNavClick(event, close)"
          >
            <Squares2X2Icon class="nav-icon" />
            <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">{{ t('nav.eventos') }}</span>
          </a>
        </div>
      </template>

      <!-- ── SPACER ── -->
      <div class="flex-1" style="min-height: 1rem;" />

      <!-- ── CUENTA (fondo) ── -->
      <template v-if="visibleCuentaItems.length">
        <div class="space-y-0.5">
          <NuxtLink
            v-for="item in visibleCuentaItems"
            :key="item.to"
            :to="item.to"
            :title="t(item.labelKey)"
            :class="[
              'nav-item',
              collapsed ? 'justify-center' : '',
              activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
              isNavItemBlocked(item) ? 'nav-item--disabled' : '',
            ]"
            :aria-disabled="isNavItemBlocked(item)"
            :tabindex="isNavItemBlocked(item) ? -1 : undefined"
            @click="(event) => handleNavItemClick(event, item, close)"
          >
            <component :is="item.icon" class="nav-icon" />
            <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">{{ t(item.labelKey) }}</span>
          </NuxtLink>
        </div>
      </template>

    </template>

    <!-- Logout (siempre visible, fijo abajo) -->
    <template #bottom="{ collapsed, close }">
      <button
        @click="() => { close(); handleLogout() }"
        :disabled="isLoggingOut"
        :class="[
          'nav-item nav-item--idle nav-item--logout group w-full',
          collapsed ? 'justify-center' : '',
        ]"
        :title="t('shell.logout')"
      >
        <ArrowRightOnRectangleIcon class="nav-icon" />
        <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">{{ t('shell.logout') }}</span>
      </button>
    </template>

  </UiBaseSidebar>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

import { computed, ref } from 'vue'
import {
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
} from '@heroicons/vue/24/outline'
import {
  dashboardCuentaItems,
  dashboardPrimaryItems,
  dashboardSecondaryItems,
  type ActivePage,
  type DashboardNavItem,
} from '~/constants/dashboardNavigation'
import { getDashboardHome } from '~/utils/internalAccess'

interface Props {
  activePage?: ActivePage
  overlay?: boolean
  toggle?: boolean
  billingBlocked?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  activePage: 'financiero',
  overlay: false,
  toggle: false,
  billingBlocked: false,
})

defineEmits<{
  (e: 'expanded-change', value: boolean): void
}>()

const isLoggingOut = ref(false)
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const sidebarLogoAnimationSrc = computed(() =>
  `/brand/waro-colombia-animated.svg?route=${encodeURIComponent(route.fullPath)}`,
)

const { hasCriticalAlerts } = useDataQualityStatus()

const authStore = useAuthStore()

// Epic 4 (#559): each item declares the backend module it requires.
// useModuleAccess().can() fails open while enforcementMode !== 'enforce',
// so today's sidebar (every module visible) is preserved until Epic 6
// flips a tenant.
const { can } = useModuleAccess()
const { hasFeature } = useFeatureAccess()
const accessStore = useAccessStore()

const dashboardHome = computed(() =>
  getDashboardHome(accessStore.modules, { isLoaded: accessStore.isLoaded }),
)

const canSeeNavItem = (item: DashboardNavItem) =>
  can(item.module).value && (!item.feature || hasFeature(item.feature).value)

const visiblePrimaryItems = computed(() =>
  dashboardPrimaryItems.filter(canSeeNavItem)
)
const visibleSecondaryItems = computed(() =>
  dashboardSecondaryItems.filter(canSeeNavItem)
)
const visibleCuentaItems = computed(() =>
  dashboardCuentaItems.filter(canSeeNavItem)
)

// Eventos is special: Module.EVENTOS was removed from the backend enum
// in api-warolabs#212 (Eventos lives in warotickets.com — external product).
// Gate by role directly. Owner-only.
const showEventos = computed(() => accessStore.role === 'owner')

const isNavItemBlocked = (item: DashboardNavItem) =>
  props.billingBlocked && item.to !== '/gestion/billing'

const handleNavItemClick = (event: MouseEvent, item: DashboardNavItem, close: () => void) => {
  if (isNavItemBlocked(item)) {
    event.preventDefault()
    return
  }
  close()
}

const handleExternalNavClick = (event: MouseEvent, close: () => void) => {
  if (props.billingBlocked) {
    event.preventDefault()
    return
  }
  close()
}

const handleLogout = async () => {
  try {
    isLoggingOut.value = true
    await $fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
    authStore.clearAuth()
    // #562: clear access store too — otherwise the polling setInterval keeps
    // firing after logout. Symmetric with the auth.global.js cleanup path.
    accessStore.clear()
    if (typeof window !== 'undefined') { localStorage.clear(); sessionStorage.clear() }
    await router.push('/')
  } catch {
    authStore.clearAuth()
    accessStore.clear()
    await router.push('/')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<style scoped>
.logout-overlay {
  background-color: hsl(var(--nav-overlay-bg) / 0.5);
}

.logout-card {
  background-color: hsl(var(--nav-overlay-card-bg));
}

.logout-title {
  color: hsl(var(--nav-overlay-title));
}

.logout-message {
  color: hsl(var(--nav-overlay-message));
}

/*
  Sidebar navigation states read semantic nav tokens. Alpha remains local here
  because the sidebar hierarchy depends on subtle idle/hover/active emphasis.
*/

/* ── Nav item base ── */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4375rem;
  transition: background-color 0.15s, color 0.15s, box-shadow 0.15s;
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: 500;
  width: 100%;
  text-decoration: none;
}
/* Cuando colapsado: centrar ícono y eliminar gap del label invisible */
.nav-item.justify-center {
  gap: 0;
  padding-left: 0;
  padding-right: 0;
  min-height: 2.75rem;
}
.nav-item--active {
  background-color: hsl(var(--nav-item-active-bg) / 0.10);
  font-weight: 650;
}
.nav-item--idle:hover {
  background-color: hsl(var(--nav-item-hover-bg) / 0.06);
}
.nav-item--disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
.nav-item--disabled:hover {
  background-color: transparent;
}
.nav-item--logout {
  color: hsl(var(--nav-logout-text));
}
.nav-item--logout:hover {
  background-color: hsl(var(--nav-logout-hover-bg) / 0.2);
  color: hsl(var(--nav-logout-hover-text));
}
.nav-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--nav-focus-ring) / 0.85);
}

/* ── Nav icon ── */
.nav-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  transition: color 0.15s;
}
.nav-item--active .nav-icon   { color: hsl(var(--nav-icon-active)); }
.nav-item--idle .nav-icon     { color: hsl(var(--nav-icon-idle) / 0.62); } /* 3.5:1 — pasa WCAG AA UI */
.nav-item--idle:hover .nav-icon { color: hsl(var(--nav-icon-hover) / 0.88); }
.nav-item--logout .nav-icon { color: hsl(var(--nav-logout-icon)); }
.nav-item--logout:hover .nav-icon { color: hsl(var(--nav-logout-hover-text)); }

/* ── Label text ── */
.nav-label-text {
  white-space: nowrap;
  overflow: hidden;
  transition: max-width 0.15s, opacity 0.15s;
  max-width: 200px;
  opacity: 1;
  letter-spacing: 0;
}
.nav-label-text--hidden { max-width: 0; opacity: 0; }

.nav-item--active .nav-label-text { color: hsl(var(--nav-label-active)); }
.nav-item--idle .nav-label-text   { color: hsl(var(--nav-label-idle) / 0.72); }
.nav-item--idle:hover .nav-label-text { color: hsl(var(--nav-label-hover) / 0.92); }

/* ── Section label ── */
.nav-section-label {
  padding: 0.5rem 0.625rem 0.1875rem;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  white-space: nowrap;
  color: hsl(var(--nav-section-label) / 0.48);
}

/* ── Dividers ── */
.nav-divider {
  border-color: hsl(var(--nav-divider) / 0.06);
}

/* ── Quitar focus ring nativo del input de búsqueda ── */
.tenant-search-input {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
.tenant-search-input:focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

@media (max-height: 820px) {
  .nav-item {
    min-height: 2.125rem;
    padding-block: 0.25rem;
    font-size: 0.90625rem;
    line-height: 1.125rem;
  }

  .nav-item.justify-center {
    min-height: 2.125rem;
  }

  .nav-icon {
    width: 21px;
    height: 21px;
  }

  .nav-section-label {
    padding-top: 0.3125rem;
    padding-bottom: 0.125rem;
    font-size: 10.5px;
  }
}

@media (max-height: 700px) {
  .nav-item {
    min-height: 1.75rem;
    padding-block: 0.125rem;
    font-size: 0.875rem;
    line-height: 1.0625rem;
  }

  .nav-item.justify-center {
    min-height: 1.75rem;
  }

  .nav-icon {
    width: 19px;
    height: 19px;
  }

  .nav-section-label {
    padding-top: 0.25rem;
    padding-bottom: 0.0625rem;
    font-size: 10px;
  }
}

/* ── Modal fade ── */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
</style>
