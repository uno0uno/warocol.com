<template>
  <div class="h-screen flex flex-col lg:flex-row overflow-hidden">
    <!-- Dashboard Sidebar - Desktop Only -->
    <DashboardSidebar :active-page="activePage" class="hidden lg:flex" />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 h-screen md:h-auto">
      <!-- Main Content Header -->
      <header class="bg-surface border-b border-border px-4 py-3 md:px-8 md:py-4 flex-shrink-0">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 sm:gap-4 min-w-0">
            <!-- Back Button (if dynamic back is enabled) -->
            <button
              v-if="showBackBtn && backBtnHandler"
              @click="backBtnHandler"
              class="flex-shrink-0 p-2 hover:bg-surface-secondary rounded-lg transition-colors"
            >
              <svg class="h-5 w-5 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>

            <div class="min-w-0">
              <h1 class="text-lg sm:text-xl md:text-3xl font-bold text-text-primary leading-tight truncate">
                {{ animatedDisplayTitle }}
                <span v-if="isTypingTitle" class="title-caret" aria-hidden="true"></span>
              </h1>
              <p v-if="dynamicLastUpdateText || displaySubtitle" class="text-xs text-muted-foreground mt-0.5 truncate">{{ dynamicLastUpdateText || displaySubtitle }}</p>
            </div>
          </div>

          <TransitionGroup
            name="header-actions"
            tag="div"
            class="relative flex items-center gap-1.5 md:gap-2 flex-shrink-0"
          >
            <!-- Notification Bell — desktop only -->
            <NotificationsNotificationBell key="notifications-bell" class="hidden lg:flex" />

            <!-- Global Header Actions -->
            <NuxtLink
              key="upload-invoice"
              to="/abastecimiento/compras-directas/crear"
              class="flex items-center gap-1 md:gap-2 h-11 bg-primary text-primary-foreground px-2 md:px-4 rounded-xl font-medium hover:bg-primary/90 transition-all"
              title="Cargar Factura IA"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>
              <span class="hidden sm:inline">Cargar Factura IA</span>
            </NuxtLink>

            <button
              key="pos-link"
              type="button"
              @click="navigateToPOS"
              class="flex items-center gap-1 md:gap-2 h-11 bg-card border border-border text-foreground px-2 md:px-4 rounded-xl font-medium hover:bg-accent transition-all"
              title="Venta POS"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              <span class="hidden sm:inline">Venta POS</span>
            </button>

            <!-- Portal Target for Custom Actions (pages can still inject extra actions) -->
            <div key="portal-actions" id="dashboard-header-actions" class="flex items-center"></div>

            <!-- Header Action Button (e.g., Print) -->
            <button
              v-if="dynamicHeaderAction"
              key="dynamic-header-action"
              @click="dynamicHeaderAction.handler"
              class="h-11 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg v-if="dynamicHeaderAction.icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {{ dynamicHeaderAction.label }}
            </button>

            <!-- Status Badge -->
            <span
              v-if="dynamicStatus"
              key="dynamic-status"
              :class="['h-11 flex items-center px-3 rounded-lg text-sm font-medium', dynamicStatus.color]"
            >
              {{ dynamicStatus.label }}
            </span>

            <!-- Restaurant open/close toggle -->
            <DashboardBusinessStatusToggle key="business-status-toggle" />

            <div
              v-if="isProgressiveLoading"
              key="progressive-loading"
              class="hidden md:flex items-center gap-2 h-11 px-3 rounded-lg bg-surface-secondary text-primary transition-all"
              aria-live="polite"
            >
              <UiLoadingDots size="9px" class="text-primary" />
              <span class="text-sm font-medium whitespace-nowrap">
                {{ headerLoadingPhrase }}
              </span>
            </div>

            <!-- Refresh Button (Desktop only) - always visible -->
            <button
              key="refresh-button"
              @click="handleRefresh"
              :disabled="isRefreshing"
              aria-label="Refrescar datos"
              class="hidden md:flex w-11 h-11 items-center justify-center bg-surface-secondary border-0 rounded-lg text-primary transition-all focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refrescar">
              <UiLoadingMatrix v-if="isRefreshing" size="5.5px" />
              <svg v-else
                class="w-5 h-5 transition-transform duration-300 hover:rotate-180"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                </path>
              </svg>
            </button>

            <!-- Back Button — text label on desktop only (mobile uses the left arrow icon) -->
            <button
              v-if="backButton"
              key="back-button"
              @click="goBack"
              class="hidden md:inline-flex btn-secondary px-4 py-2 rounded-lg text-sm font-semibold"
            >
              {{ backButton.label }}
            </button>
          </TransitionGroup>
        </div>
      </header>

      <!-- Subscription Banner -->
      <SubscriptionBanner
        v-if="accessStatus && (accessStatus.level === 'full_with_warning' || accessStatus.level === 'read_only')"
        :level="accessStatus.level"
        :message="accessStatus.message || (accessStatus.level === 'read_only' ? 'Tu suscripción está vencida. El acceso es de solo lectura.' : 'Tu suscripción vence pronto.')"
        :grace-days-remaining="accessStatus.grace_days_remaining"
      />

      <!-- Content Area with Overflow -->
      <div class="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div class="p-4 sm:p-6 md:p-8">
          <!-- Breadcrumb (if provided) -->
          <nav v-if="showBreadcrumb" class="flex mb-6" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 md:space-x-3">
              <li class="inline-flex items-center">
                <NuxtLink to="/financiero"
                  class="text-sm font-medium text-titan-600 hover:text-crocus-600 transition-colors">
                  Financiero
                </NuxtLink>
              </li>
              <li v-if="breadcrumbPage">
                <div class="flex items-center">
                  <ChevronRightIcon class="w-4 h-4 text-titan-400" />
                  <span class="ml-1 text-sm font-medium text-ebony-800">{{ breadcrumbPage }}</span>
                </div>
              </li>
            </ol>
          </nav>

          <!-- Page Content -->
          <slot />
        </div>
      </div>
    </main>

    <!-- Bottom Navigation - Mobile Only -->
    <DashboardBottomNav
      :active-page="activePage"
      :show-cart-button="route.path === '/pos'"
      :cart-items-count="posCartItemsCount"
      :notifications-count="notificationsUnreadCount"
      @open-cart="posOpenCartModal"
    />

    <!-- Mobile Order Toast — client-only to avoid SSR/Teleport hydration mismatch -->
    <ClientOnly>
      <NotificationsMobileOrderToast />
    </ClientOnly>

    <!-- Global Purchase Action Bar -->
    <!-- <PurchasesGlobalPurchaseActionBar /> -->
  </div>
</template>

<script setup lang="ts">
import { provide, inject, ref, computed, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import {
  ChevronRightIcon
} from '@heroicons/vue/24/outline'
import { useNotifications } from '~/composables/useNotifications'
import { useBilling } from '~/composables/useBilling'

// Notifications — init here so SSE starts on all screen sizes (not just when bell mounts)
const { unreadCount: notificationsUnreadCount, init: initNotifications, disconnect: disconnectNotifications } = useNotifications()

// Billing access status — drives banner and blocked redirect
const { accessStatus, fetchAccessStatus } = useBilling()

// Get route-based configuration
const route = useRoute()
const router = useRouter()

// Go back function
const goBack = () => {
  // Special handling for POS sub-pages - always go back to POS
  if (route.path.startsWith('/pos/producto/') || route.path.startsWith('/pos/checkout')) {
    router.push('/pos')
  } else {
    // Default: browser back (includes /pos main page)
    router.back()
  }
}

// Determine configuration based on route
const getPageConfig = () => {
  const path = route.path

  if (path === '/financiero' || path === '/dashboard') {
    return {
      pageTitle: 'Dashboard',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar métricas financieras...',
      activePage: 'financiero' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/financiero/tir') {
    return {
      pageTitle: 'Análisis TIR',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar métricas TIR...',
      activePage: 'financiero' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/financiero/analisis') {
    return {
      pageTitle: 'Análisis de Productos',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar productos...',
      activePage: 'financiero' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/financiero/obstaculos') {
    return {
      pageTitle: 'Obstáculos del TIR',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar obstáculos...',
      activePage: 'financiero' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento' || path === '/abastecimiento/') {
    return {
      pageTitle: 'Dashboard - Abastecimiento',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar en abastecimiento...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/proveedores') {
    return {
      pageTitle: 'Gestión de Proveedores',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar proveedores...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/calidad-datos') {
    return {
      pageTitle: 'Calidad de Datos',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  // } else if (path === '/abastecimiento/precios') {
  //   return {
  //     pageTitle: 'Lista de Precios',
  //     pageSubtitle: undefined,
  //     searchPlaceholder: 'Buscar precios...',
  //     activePage: 'abastecimiento' as const,
  //     showBreadcrumb: false,
  //     breadcrumbPage: undefined,
  //     backButton: undefined
  //   }
  } else if (path === '/abastecimiento/compras-directas' || path === '/abastecimiento/compras-directas/') {
    return {
      pageTitle: 'Compras Directas',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar compras...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/compras-directas/crear') {
    return {
      pageTitle: 'Nueva Compra Directa',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: { label: 'Volver' }
    }
  } else if (path.startsWith('/abastecimiento/compras-directas/')) {
    return {
      pageTitle: 'Compra Directa',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: { label: 'Volver' }
    }
  } else if (path.startsWith('/abastecimiento/ajustes')) {
    return {
      pageTitle: 'Ajustes de Abastecimiento',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: { label: 'Volver' }
    }
  } else if (path === '/abastecimiento/stock') {
    return {
      pageTitle: 'Stock',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar stock...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/ingredientes-propios') {
    return {
      pageTitle: 'Ingredientes Personalizados',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar ingredientes...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/compras') {
    return {
      pageTitle: 'Órdenes de Compra',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar órdenes...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/abastecimiento/compra/') && path.includes('/acciones')) {
    return {
      pageTitle: 'Acciones de la Orden',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path.includes('/abastecimiento/compra/') && path.includes('/transicion')) {
    // Transition pages open in new window, no back button needed
    return {
      pageTitle: 'Historial de Cambios',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/abastecimiento/compra/crear') {
    return {
      pageTitle: 'Crear Nueva Orden de Compra',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/abastecimiento/proveedor/crear') {
    return {
      pageTitle: 'Crear Proveedor',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path.startsWith('/abastecimiento/proveedor/') && path !== '/abastecimiento/proveedor/crear') {
    return {
      pageTitle: 'Editar Proveedor',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path.startsWith('/abastecimiento/compra/')) {
    return {
      pageTitle: 'Editar Orden de Compra',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/pagos/registrar') {
    return {
      pageTitle: 'Registrar Pago',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'pagos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/pagos' || path === '/pagos/') {
    return {
      pageTitle: 'Gestión de Pagos',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar pagos...',
      activePage: 'pagos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.startsWith('/mesas')) {
    return {
      pageTitle: 'Mesas',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'mesas' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.startsWith('/equipo')) {
    return {
      pageTitle: 'Equipo',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'equipo' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/integraciones') {
    return {
      pageTitle: 'Integraciones Dashboard',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'integraciones' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/analitica/rentabilidad')) {
    return {
      pageTitle: 'Rentabilidad',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar métricas...',
      activePage: 'analytics' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/analitica/clientes')) {
    return {
      pageTitle: 'Clientes',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar clientes...',
      activePage: 'analytics' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/analitica/puntos')) {
    return {
      pageTitle: 'Puntos Waros',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'analytics' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/analytics') || path.includes('/analitica')) {
    return {
      pageTitle: 'Mis Ventas',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar métricas...',
      activePage: 'analytics' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/reportes')) {
    return {
      pageTitle: 'Dashboard - Reportes',
      pageSubtitle: 'Generación y gestión de reportes',
      searchPlaceholder: 'Buscar reportes...',
      activePage: 'reportes' as const,
      showBreadcrumb: true,
      breadcrumbPage: 'Reportes',
      backButton: undefined
    }
  } else if (path.includes('/configuracion')) {
    return {
      pageTitle: 'Dashboard - Configuración',
      pageSubtitle: 'Configuración del sistema',
      searchPlaceholder: 'Buscar configuración...',
      activePage: 'configuracion' as const,
      showBreadcrumb: true,
      breadcrumbPage: 'Configuración',
      backButton: undefined
    }
  } else if (path.includes('/gestion/billing')) {
    return {
      pageTitle: 'Mi Plan',
      pageSubtitle: 'Gestión de tu suscripción y facturación',
      searchPlaceholder: 'Buscar en billing...',
      activePage: 'admin' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.includes('/admin')) {
    return {
      pageTitle: 'Admin',
      pageSubtitle: 'Panel de administración del sistema',
      searchPlaceholder: 'Buscar en administración...',
      activePage: 'admin' as const,
      showBreadcrumb: true,
      breadcrumbPage: 'Administración',
      backButton: undefined
    }
  } else if (path.includes('/pos/producto/')) {
    return {
      pageTitle: 'Personalizar Producto',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'pos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/pos/checkout') {
    return {
      pageTitle: 'Confirmar Orden',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'pos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/pos' || path.includes('/pos')) {
    return {
      pageTitle: 'Punto de Venta',
      pageSubtitle: undefined,
      searchPlaceholder: undefined,
      activePage: 'pos' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: {
        label: 'Volver'
      }
    }
  } else if (path === '/ventas' || path === '/ventas/') {
    return {
      pageTitle: 'Ventas',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar ventas...',
      activePage: 'ventas' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu/productos') {
    return {
      pageTitle: 'Productos',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar productos...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu/recetas') {
    return {
      pageTitle: 'Recetas',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar recetas...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu/modificadores') {
    return {
      pageTitle: 'Modificadores',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar modificadores...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/menu' || path === '/menu/') {
    return {
      pageTitle: 'Menú',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/inventario/stock') {
    return {
      pageTitle: 'Stock de Inventario',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar ingredientes...',
      activePage: 'inventario' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/inventario/movimientos') {
    return {
      pageTitle: 'Movimientos de Inventario',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar movimientos...',
      activePage: 'inventario' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.startsWith('/inventario/ajustes/crear')) {
    return {
      pageTitle: 'Ajustar Inventario',
      pageSubtitle: 'Registra ajustes manuales al inventario',
      searchPlaceholder: undefined,
      activePage: 'inventario' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/inventario/ajustes') {
    return {
      pageTitle: 'Ajustes de Inventario',
      pageSubtitle: 'Resumen e historial de ajustes manuales',
      searchPlaceholder: 'Buscar ajustes...',
      activePage: 'inventario' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/inventario' || path === '/inventario/') {
    return {
      pageTitle: 'Inventario',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar...',
      activePage: 'inventario' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.startsWith('/domicilios')) {
    return {
      pageTitle: 'Domicilios',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar pedidos...',
      activePage: 'domicilios' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path === '/negocio') {
    return {
      pageTitle: 'Mi Negocio',
      pageSubtitle: 'Información y configuración de tu negocio',
      searchPlaceholder: 'Buscar en negocio...',
      activePage: 'negocio' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.startsWith('/ventas')) {
    return {
      pageTitle: 'Ventas',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar ventas...',
      activePage: 'ventas' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.startsWith('/menu')) {
    return {
      pageTitle: 'Menú',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar en menú...',
      activePage: 'menu' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.startsWith('/integraciones')) {
    return {
      pageTitle: 'Integraciones',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar integraciones...',
      activePage: 'integraciones' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  } else if (path.startsWith('/abastecimiento')) {
    return {
      pageTitle: 'Abastecimiento',
      pageSubtitle: undefined,
      searchPlaceholder: 'Buscar en abastecimiento...',
      activePage: 'abastecimiento' as const,
      showBreadcrumb: false,
      breadcrumbPage: undefined,
      backButton: undefined
    }
  }

  return {
    pageTitle: 'Dashboard',
    pageSubtitle: undefined,
    searchPlaceholder: 'Buscar...',
    activePage: 'dashboard' as const,
    showBreadcrumb: false,
    breadcrumbPage: undefined,
    backButton: undefined
  }
}

const config = computed(() => getPageConfig())
const pageTitle = computed(() => config.value.pageTitle)
const pageSubtitle = computed(() => config.value.pageSubtitle)
const searchPlaceholder = computed(() => config.value.searchPlaceholder)
const activePage = computed(() => config.value.activePage)
const showBreadcrumb = computed(() => config.value.showBreadcrumb)
const breadcrumbPage = computed(() => config.value.breadcrumbPage)
const backButton = computed(() => config.value.backButton)

// Date and time functionality
const currentDateTime = ref('')

const updateDateTime = () => {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota'
  }
  currentDateTime.value = now.toLocaleDateString('es-CO', options)
}

// Update time immediately and then every minute
let dateTimeInterval: ReturnType<typeof setInterval> | null = null

// Redirect to blocked page when subscription is expired
watch(accessStatus, (status) => {
  if (status?.level === 'blocked' && !route.path.startsWith('/billing/')) {
    navigateTo('/billing/renovar')
  }
}, { immediate: true })

onMounted(() => {
  updateDateTime()
  dateTimeInterval = setInterval(updateDateTime, 60000)
  if (process.client) initNotifications()
  fetchAccessStatus()
})

onUnmounted(() => {
  if (dateTimeInterval) clearInterval(dateTimeInterval)
  disconnectNotifications()
})

// Refresh handler - shared via composable (provide/inject unreliable in Nuxt 3 layout↔page)
const {
  refreshHandler,
  isRefreshing,
  isProgressiveLoading,
  lastUpdateText: composableLastUpdateText,
  triggerRefresh
} = useLayoutActions()
const handleRefresh = triggerRefresh
const {
  currentPhrase: rotatingHeaderLoadingPhrase,
  start: startHeaderLoadingPhrases,
  stop: stopHeaderLoadingPhrases
} = useLoadingPhrases([
  'Actualizando...',
  'Sincronizando...',
  'Cargando cambios...'
])
const headerLoadingPhrase = computed(() => rotatingHeaderLoadingPhrase.value)

watch(isProgressiveLoading, (loading) => {
  if (loading) {
    startHeaderLoadingPhrases()
  } else {
    stopHeaderLoadingPhrases()
  }
}, { immediate: true })

// Dynamic title - can be set by child pages
const dynamicTitle = ref<string | undefined>(undefined)

// Provide title setter for child pages
provide('setPageTitle', (title: string | undefined) => {
  dynamicTitle.value = title
})

// Dynamic subtitle - can be set by child pages
const dynamicSubtitle = ref<string | undefined>(undefined)

// Provide subtitle setter for child pages
provide('setPageSubtitle', (subtitle: string | undefined) => {
  dynamicSubtitle.value = subtitle
})

// Last update text - shared via composable
const dynamicLastUpdateText = composableLastUpdateText

// Dynamic status badge - can be set by child pages
const dynamicStatus = ref<{ label: string; color: string } | undefined>(undefined)

// Provide status setter for child pages
provide('setPageStatus', (status: { label: string; color: string } | undefined) => {
  dynamicStatus.value = status
})

// Dynamic back button - can be set by child pages
const dynamicBackButton = ref<boolean>(false)
const dynamicBackHandler = ref<(() => void) | undefined>(undefined)

// Provide back button setters for child pages
provide('setShowBackButton', (show: boolean) => {
  dynamicBackButton.value = show
})

provide('setBackHandler', (handler: (() => void) | undefined) => {
  dynamicBackHandler.value = handler
})

// Dynamic header action (like print button) - can be set by child pages
const dynamicHeaderAction = ref<{ label: string; icon?: boolean; handler: () => void } | undefined>(undefined)

// Provide header action setter for child pages
provide('setHeaderAction', (action: { label: string; icon?: boolean; handler: () => void } | undefined) => {
  dynamicHeaderAction.value = action
})

// Combined values (dynamic takes precedence)
const displayTitle = computed(() => dynamicTitle.value || pageTitle.value)
const displaySubtitle = computed(() => dynamicSubtitle.value || pageSubtitle.value)
const showBackBtn = computed(() => dynamicBackButton.value || !!backButton.value)
const backBtnHandler = computed(() => dynamicBackHandler.value || (backButton.value ? goBack : undefined))

const animatedDisplayTitle = ref(displayTitle.value)
const isTypingTitle = ref(false)
let titleTypingTimeout: ReturnType<typeof setTimeout> | null = null

const clearTitleTypingTimeout = () => {
  if (titleTypingTimeout) {
    clearTimeout(titleTypingTimeout)
    titleTypingTimeout = null
  }
}

const typeTitle = (nextTitle: string) => {
  clearTitleTypingTimeout()

  if (!nextTitle) {
    animatedDisplayTitle.value = ''
    isTypingTitle.value = false
    return
  }

  animatedDisplayTitle.value = ''
  isTypingTitle.value = true
  let index = 0

  const step = () => {
    index += 1
    animatedDisplayTitle.value = nextTitle.slice(0, index)

    if (index >= nextTitle.length) {
      isTypingTitle.value = false
      titleTypingTimeout = null
      return
    }

    titleTypingTimeout = setTimeout(step, 22)
  }

  titleTypingTimeout = setTimeout(step, 22)
}

watch(displayTitle, (nextTitle, previousTitle) => {
  if (!previousTitle || nextTitle === previousTitle) {
    animatedDisplayTitle.value = nextTitle
    isTypingTitle.value = false
    clearTitleTypingTimeout()
    return
  }

  typeTitle(nextTitle)
}, { immediate: true })

// Inject cart data from POS page
const posCartItemsCount = inject<ComputedRef<number> | Ref<number>>('posCartItemsCount', ref(0))
const posOpenCartModal = inject<() => void>('posOpenCartModal', () => {})

const navigateToPOS = () => navigateTo('/pos')

// Meta tags for dashboard
useHead({
  titleTemplate: '%s - Warocol Dashboard',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }, // Dashboard pages shouldn't be indexed
  ]
})

onUnmounted(() => {
  clearTitleTypingTimeout()
})
</script>

<style>
.title-caret {
  display: inline-block;
  width: 0.08em;
  height: 0.9em;
  margin-left: 0.08em;
  vertical-align: -0.08em;
  background-color: currentColor;
  animation: title-caret-blink 1s steps(1) infinite;
}

@keyframes title-caret-blink {
  0%, 50% {
    opacity: 1;
  }

  50.01%, 100% {
    opacity: 0;
  }
}

/* Hide empty portal target to prevent extra flex gaps */
#dashboard-header-actions {
  position: relative;
}

#dashboard-header-actions:empty {
  display: none;
}

#dashboard-header-actions > * {
  animation: dashboard-header-portal-in 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes dashboard-header-portal-in {
  from {
    opacity: 0;
    transform: translateX(14px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>

<style scoped>
/* Smooth sidebar navigation animation */
.sidebar-nav {
  transition: all 0.2s ease-in-out;
}

/* Content fade-in animation for better UX */
@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(-15px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-container {
  animation: contentFadeIn 0.5s ease-out;
}

/* Header action transitions */
.header-actions-move,
.header-actions-enter-active,
.header-actions-leave-active {
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.24s ease,
    filter 0.24s ease;
}

.header-actions-enter-from {
  opacity: 0;
  filter: blur(2px);
  transform: translateX(14px);
}

.header-actions-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateX(-10px);
}

.header-actions-leave-active {
  position: absolute;
  pointer-events: none;
}
</style>

<style scoped>
/* Custom scrollbar for main content */
main::-webkit-scrollbar {
  width: 8px;
}

main::-webkit-scrollbar-track {
  background: hsl(var(--titan-100));
}

main::-webkit-scrollbar-thumb {
  background: hsl(var(--titan-300));
  border-radius: 4px;
}

main::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--titan-400));
}
</style>
