<template>
  <div>
  <!-- Loading Global Overlay -->
  <Teleport to="body">
    <div v-if="isLoggingOut" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div class="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <div class="w-16 h-16 mb-4">
          <div class="w-16 h-16 border-4 border-crocus-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p class="text-lg font-medium text-ebony-900">Cerrando sesión...</p>
        <p class="text-sm text-titan-400 mt-2">Por favor espera</p>
      </div>
    </div>
  </Teleport>

  <UiBaseSidebar v-bind="$attrs">
    <!-- Navigation Links -->
    <template #navigation="{ collapsed }">

      <!-- ── OPERACIÓN (frecuente) ── -->
      <div class="space-y-0.5">
        <p v-if="!collapsed" class="nav-section-label">Operación</p>
        <NuxtLink
          v-for="item in primaryItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          :class="[
            'nav-item group',
            collapsed ? 'justify-center' : '',
            activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
          ]"
        >
          <component :is="item.icon" class="nav-icon" />
          <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">{{ item.label }}</span>
        </NuxtLink>
      </div>

      <!-- ── DIVIDER ── -->
      <div class="my-1.5 mx-1 border-t nav-divider" />

      <!-- ── HERRAMIENTAS ── -->
      <div class="space-y-0.5">
        <p v-if="!collapsed" class="nav-section-label">Herramientas</p>
        <NuxtLink
          v-for="item in secondaryItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          :class="[
            'nav-item',
            collapsed ? 'justify-center' : '',
            activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
          ]"
        >
          <component :is="item.icon" class="nav-icon" />
          <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">
            {{ item.label }}
            <span
              v-if="item.page === 'abastecimiento' && hasCriticalAlerts"
              class="inline-block w-1.5 h-1.5 rounded-full bg-destructive align-middle ml-1.5"
            />
          </span>
        </NuxtLink>
      </div>

      <!-- ── DIVIDER ── -->
      <div class="my-1.5 mx-1 border-t nav-divider" />

      <!-- ── APPS ── -->
      <div class="space-y-0.5">
        <p v-if="!collapsed" class="nav-section-label">Apps</p>
        <a
          href="https://warotickets.com/gestion/eventos"
          target="_blank"
          title="Eventos"
          :class="['nav-item nav-item--idle', collapsed ? 'justify-center' : '']"
        >
          <Squares2X2Icon class="nav-icon" />
          <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">Eventos</span>
        </a>
      </div>

      <!-- ── SPACER ── -->
      <div class="flex-1" style="min-height: 1rem;" />

      <!-- ── CUENTA (fondo) ── -->
      <div class="space-y-0.5">
        <p v-if="!collapsed" class="nav-section-label">Cuenta</p>
        <NuxtLink
          v-for="item in cuentaItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          :class="[
            'nav-item',
            collapsed ? 'justify-center' : '',
            activePage === item.page ? 'nav-item--active' : 'nav-item--idle',
          ]"
        >
          <component :is="item.icon" class="nav-icon" />
          <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">{{ item.label }}</span>
        </NuxtLink>
      </div>

    </template>

    <!-- Logout (siempre visible, fijo abajo) -->
    <template #bottom="{ collapsed }">
      <button
        @click="handleLogout"
        :disabled="isLoggingOut"
        :class="[
          'nav-item nav-item--idle group w-full text-titan-500 hover:bg-red-900/20 hover:text-red-400',
          collapsed ? 'justify-center' : '',
        ]"
        title="Cerrar sesión"
      >
        <ArrowRightOnRectangleIcon class="nav-icon" />
        <span class="nav-label-text" :class="collapsed ? 'nav-label-text--hidden' : ''">Cerrar sesión</span>
      </button>
    </template>

  </UiBaseSidebar>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

import { computed, nextTick, ref } from 'vue'
import { useTenantReactive } from '@/composables/useTenantReactive'
import {
  AdjustmentsHorizontalIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CheckIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CubeIcon,
  DocumentTextIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  QueueListIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  TruckIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

interface Props {
  activePage?: 'dashboard' | 'ventas' | 'pos' | 'despacho' | 'comandas' | 'financiero' | 'abastecimiento' | 'inventario' | 'menu' | 'pagos' | 'equipo' | 'integraciones' | 'analytics' | 'reportes' | 'configuracion' | 'admin' | 'negocio' | 'operaciones' | 'finanzas' | 'facturacion'
}
const props = withDefaults(defineProps<Props>(), { activePage: 'financiero' })

const isLoggingOut = ref(false)
const router = useRouter()

const { hasCriticalAlerts } = useDataQualityStatus()

const authStore = useAuthStore()

// ── Nav items ──────────────────────────────────────────────
const { businessProfile } = useTenantReactive()

const primaryItems = computed(() => {
  const items = [
    { to: '/pos',               page: 'pos',       label: 'POS',        icon: ComputerDesktopIcon },
    { to: '/ventas',            page: 'ventas',    label: 'Ventas',     icon: ShoppingCartIcon },
    { to: '/despacho/domicilios', page: 'despacho', label: 'Despacho', icon: MapPinIcon },

  ]
  return items
})

const secondaryItems = [
  { to: '/analitica',                        page: 'analytics',     label: 'Analítica Ventas', icon: ChartBarIcon },
  { to: '/finanzas/arqueo',                  page: 'finanzas',      label: 'Finanzas',       icon: BanknotesIcon },
  { to: '/facturacion',                      page: 'facturacion',   label: 'Facturación',    icon: DocumentTextIcon },
  { to: '/menu/productos',                   page: 'menu',          label: 'Menú',           icon: CubeIcon },
  { to: '/operaciones/comandas',             page: 'operaciones',   label: 'Operaciones',    icon: AdjustmentsHorizontalIcon },
  { to: '/abastecimiento/compras-directas',  page: 'abastecimiento',label: 'Abastecimiento', icon: TruckIcon },
  { to: '/equipo/miembros',                  page: 'equipo',        label: 'Equipo',         icon: UserGroupIcon },
  { to: '/integraciones',                    page: 'integraciones', label: 'Integraciones',  icon: KeyIcon },
]

const cuentaItems = [
  { to: '/negocio',         page: 'negocio', label: 'Mi Negocio', icon: BuildingStorefrontIcon },
  { to: '/gestion/billing', page: 'admin',   label: 'Mi Plan',    icon: CreditCardIcon },
]

const handleLogout = async () => {
  try {
    isLoggingOut.value = true
    await $fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
    authStore.clearAuth()
    if (typeof window !== 'undefined') { localStorage.clear(); sessionStorage.clear() }
    await router.push('/')
  } catch {
    authStore.clearAuth()
    await router.push('/')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<style scoped>
/*
  Jerarquía monochromática — misma familia crocus/titan, solo opacidad varía.
  ─────────────────────────────────────────────────────────────────────────
  Group label   titan-300/35   ← lo más tenue (espaciador visual)
  Icon idle     crocus-400/45  ← cohesión con el acento, no gris puro
  Label idle    titan-300/60   ← legible pero recede
  Icon hover    crocus-400/75
  Label hover   titan-300/85
  Bg hover      crocus-600/8   ← píldora muy sutil
  Icon active   crocus-400     ← 100%, único elemento a plena saturación
  Label active  titan-300      ← 100%, font-medium
  Bg active     crocus-600/15  ← píldora de posición
  Divider       titan-300/6
*/

/* ── Nav item base ── */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  transition: background-color 0.15s, color 0.15s;
  font-size: 0.9375rem;
  width: 100%;
  text-decoration: none;
}
/* Cuando colapsado: centrar ícono y eliminar gap del label invisible */
.nav-item.justify-center {
  gap: 0;
  padding-left: 0;
  padding-right: 0;
}
.nav-item--active {
  background-color: rgba(124, 58, 237, 0.15);
  font-weight: 500;
}
.nav-item--idle:hover {
  background-color: rgba(124, 58, 237, 0.08);
}

/* ── Nav icon ── */
.nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: color 0.15s;
}
.nav-item--active .nav-icon   { color: #A78BFA; }
.nav-item--idle .nav-icon     { color: rgba(167, 139, 250, 0.65); } /* 3.5:1 — pasa WCAG AA UI */
.nav-item--idle:hover .nav-icon { color: rgba(167, 139, 250, 0.85); }

/* ── Label text ── */
.nav-label-text {
  white-space: nowrap;
  overflow: hidden;
  transition: max-width 0.15s, opacity 0.15s;
  max-width: 200px;
  opacity: 1;
}
.nav-label-text--hidden { max-width: 0; opacity: 0; }

.nav-item--active .nav-label-text { color: #E0E5EB; }
.nav-item--idle .nav-label-text   { color: rgba(224, 229, 235, 0.60); }
.nav-item--idle:hover .nav-label-text { color: rgba(224, 229, 235, 0.90); }

/* ── Section label ── */
.nav-section-label {
  padding: 0.125rem 0.75rem 0.0625rem;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  white-space: nowrap;
  color: rgba(224, 229, 235, 0.30);
}

/* ── Dividers ── */
.nav-divider {
  border-color: rgba(224, 229, 235, 0.06);
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

/* ── Modal fade ── */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
</style>
