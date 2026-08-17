import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'

export const useDashboardPageConfig = () => {
  const route = useRoute()
  const { t } = useI18n({ useScope: 'global' })

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
    } else if (path === '/asistente') {
      return {
        pageTitle: t('nav.asistente'),
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'asistente' as const,
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
    } else if (path === '/abastecimiento/ajustes' || path.startsWith('/abastecimiento/ajustes/')) {
      // Legacy routes redirect to Movimientos (#1794); keep config aligned during redirect.
      return {
        pageTitle: 'Movimientos',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar movimientos...',
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
    } else if (path === '/abastecimiento/movimientos') {
      return {
        pageTitle: 'Movimientos',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar movimientos...',
        activePage: 'abastecimiento' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/abastecimiento/ingredientes-propios') {
      return {
        pageTitle: WAREHOUSE_COPY.warehouseCatalog,
        pageSubtitle: undefined,
        searchPlaceholder: WAREHOUSE_COPY.catalogSearchPlaceholder,
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
    } else if (path === '/finanzas/pagos/registrar') {
      return {
        pageTitle: 'Registrar Pago',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: {
          label: 'Volver'
        }
      }
    } else if (path === '/finanzas/pagos' || path === '/finanzas/pagos/') {
      return {
        pageTitle: 'Gestión de Pagos',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar pagos...',
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.startsWith('/operaciones/promociones')) {
      return {
        pageTitle: 'Promociones',
        pageSubtitle: 'Descuentos y reglas para el menú',
        searchPlaceholder: undefined,
        activePage: 'operaciones' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.startsWith('/operaciones')) {
      return {
        pageTitle: 'Operaciones',
        pageSubtitle: 'Comandas, cocina y mesas',
        searchPlaceholder: undefined,
        activePage: 'operaciones' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.startsWith('/equipo/miembros/') && path !== '/equipo/miembros' && path !== '/equipo/miembros/') {
      return {
        pageTitle: 'Perfil de mesero',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'equipo' as const,
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
    } else if (path.includes('/analitica/articulos-de-bodega') || path.includes('/analitica/ingredientes')) {
      return {
        pageTitle: 'Artículos de bodega',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar artículos de bodega...',
        activePage: 'analytics' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.includes('/crm/clientes')) {
      return {
        pageTitle: 'Clientes',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar clientes...',
        activePage: 'crm' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.includes('/crm/waros') || path.includes('/crm/puntos')) {
      return {
        pageTitle: 'Waros',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'crm' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.includes('/crm')) {
      return {
        pageTitle: 'CRM',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'crm' as const,
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
        pageTitle: 'Analítica',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar métricas...',
        activePage: 'analytics' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/finanzas' || path === '/finanzas/') {
      return {
        pageTitle: 'Finanzas',
        pageSubtitle: 'Gestión financiera del negocio',
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/finanzas/arqueo') {
      return {
        pageTitle: 'Arqueo de Caja',
        pageSubtitle: 'Cierre diario de efectivo',
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/finanzas/arqueo/nuevo') {
      return {
        pageTitle: 'Nuevo Arqueo',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path === '/finanzas/arqueo/x') {
      return {
        pageTitle: 'Corte X',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path === '/finanzas/arqueo/z') {
      return {
        pageTitle: 'Arqueo por turno u horario',
        pageSubtitle: 'Ventana personalizada de fechas y horas',
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path.startsWith('/finanzas/arqueo/')) {
      return {
        pageTitle: 'Detalle Arqueo',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path === '/finanzas/gastos') {
      return {
        pageTitle: 'Gastos',
        pageSubtitle: 'Control de egresos',
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/finanzas/gastos/crear') {
      return {
        pageTitle: 'Registrar Gasto',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path.startsWith('/finanzas/gastos/')) {
      return {
        pageTitle: 'Detalle Gasto',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path === '/finanzas/cartera') {
      return {
        pageTitle: 'Cartera',
        pageSubtitle: 'Cuentas por cobrar',
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/finanzas/metodos-pago') {
      return {
        pageTitle: 'Métodos de Pago',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.startsWith('/finanzas/metodos-pago/')) {
      return {
        pageTitle: 'Grupo de Pago',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path === '/finanzas/contabilidad/cuentas') {
      return {
        pageTitle: 'Plan de Cuentas',
        pageSubtitle: 'Contabilidad general',
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.startsWith('/finanzas/contabilidad/cuentas/')) {
      return {
        pageTitle: 'Detalle Cuenta',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path === '/finanzas/contabilidad/asientos') {
      return {
        pageTitle: 'Asientos Contables',
        pageSubtitle: 'Libro diario',
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/finanzas/contabilidad/asientos/crear') {
      return {
        pageTitle: 'Nuevo Asiento',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: { label: 'Volver' }
      }
    } else if (path === '/finanzas/contabilidad/balance-comprobacion') {
      return {
        pageTitle: 'Balance de Comprobación',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/finanzas/cierre-contable') {
      return {
        pageTitle: 'Cierre Contable',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/finanzas/reportes/pl-mensual') {
      return {
        pageTitle: 'P&L Mensual',
        pageSubtitle: 'Estado de resultados',
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path.startsWith('/finanzas')) {
      return {
        pageTitle: 'Finanzas',
        pageSubtitle: undefined,
        searchPlaceholder: undefined,
        activePage: 'finanzas' as const,
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
    } else if (path.startsWith('/despacho')) {
      return {
        pageTitle: 'Despacho',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar pedidos...',
        activePage: 'despacho' as const,
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
    } else if (path === '/operaciones/bitacora' || path === '/operaciones/bitacora/') {
      return {
        pageTitle: 'Bitácora de operaciones',
        pageSubtitle: 'Auditoría de acciones en POS — mesas, barra y mostrador',
        searchPlaceholder: undefined,
        activePage: 'operaciones' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/operaciones/turnos' || path === '/operaciones/turnos/') {
      return {
        pageTitle: 'Turnos',
        pageSubtitle: 'Horarios reutilizables para arqueos de caja',
        searchPlaceholder: undefined,
        activePage: 'operaciones' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/operaciones/propinas' || path === '/operaciones/propinas/') {
      return {
        pageTitle: 'Configuración de propinas',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar...',
        activePage: 'operaciones' as const,
        showBreadcrumb: false,
        breadcrumbPage: undefined,
        backButton: undefined
      }
    } else if (path === '/ventas/propinas' || path === '/ventas/propinas/') {
      return {
        pageTitle: 'Propinas',
        pageSubtitle: undefined,
        searchPlaceholder: 'Buscar propinas...',
        activePage: 'ventas' as const,
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

  return {
    config,
    pageTitle: computed(() => config.value.pageTitle),
    pageSubtitle: computed(() => config.value.pageSubtitle),
    searchPlaceholder: computed(() => config.value.searchPlaceholder),
    activePage: computed(() => config.value.activePage),
    showBreadcrumb: computed(() => config.value.showBreadcrumb),
    breadcrumbPage: computed(() => config.value.breadcrumbPage),
    backButton: computed(() => config.value.backButton),
  }
}
