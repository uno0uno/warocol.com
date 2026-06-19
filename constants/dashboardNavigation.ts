import type { FunctionalComponent } from 'vue'
import {
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  CreditCardIcon,
  CubeIcon,
  DocumentTextIcon,
  KeyIcon,
  MapPinIcon,
  ReceiptPercentIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/vue/24/outline'
import type { AccessFeature, Module } from '~/stores/access'

export type ActivePage =
  | 'dashboard'
  | 'ventas' | 'propinas' | 'pos' | 'despacho' | 'comandas'
  | 'financiero' | 'finanzas' | 'facturacion'
  | 'abastecimiento' | 'inventario' | 'menu' | 'operaciones'
  | 'analytics' | 'analitica' | 'reportes' | 'pagos'
  | 'asistente'
  | 'equipo' | 'integraciones'
  | 'negocio' | 'admin' | 'configuracion'

export interface DashboardNavItem {
  to: string
  page: ActivePage
  label: string
  icon: FunctionalComponent
  module: Module
  feature?: AccessFeature
  showCriticalDot?: boolean
}

export const dashboardPrimaryItems: DashboardNavItem[] = [
  { to: '/pos', page: 'pos', label: 'POS', icon: ComputerDesktopIcon, module: 'pos' },
  { to: '/ventas', page: 'ventas', label: 'Ventas', icon: ShoppingCartIcon, module: 'ventas' },
  { to: '/despacho/domicilios', page: 'despacho', label: 'Despacho', icon: MapPinIcon, module: 'despacho' },
]

export const dashboardSecondaryItems: DashboardNavItem[] = [
  { to: '/analitica', page: 'analytics', label: 'Analítica Ventas', icon: ChartBarIcon, module: 'analitica' },
  { to: '/asistente/kali', page: 'asistente', label: 'Kali', icon: SparklesIcon, module: 'analitica', feature: 'kali_enabled' },
  { to: '/finanzas/arqueo', page: 'finanzas', label: 'Finanzas', icon: BanknotesIcon, module: 'finanzas' },
  { to: '/facturacion', page: 'facturacion', label: 'Facturación', icon: DocumentTextIcon, module: 'facturacion' },
  { to: '/menu/productos', page: 'menu', label: 'Menú', icon: CubeIcon, module: 'menu' },
  { to: '/operaciones/comandas', page: 'operaciones', label: 'Operaciones', icon: AdjustmentsHorizontalIcon, module: 'operaciones' },
  { to: '/abastecimiento/compras-directas', page: 'abastecimiento', label: 'Abastecimiento', icon: TruckIcon, module: 'abastecimiento' },
  { to: '/equipo/miembros', page: 'equipo', label: 'Equipo', icon: UserGroupIcon, module: 'equipo' },
  { to: '/integraciones', page: 'integraciones', label: 'Integraciones', icon: KeyIcon, module: 'integraciones' },
]

export const dashboardCuentaItems: DashboardNavItem[] = [
  { to: '/negocio', page: 'negocio', label: 'Mi Negocio', icon: BuildingStorefrontIcon, module: 'mi_negocio' },
  { to: '/gestion/billing', page: 'admin', label: 'Mi Plan', icon: CreditCardIcon, module: 'mi_plan' },
]

export const dashboardMobileGridItems: DashboardNavItem[] = [
  { to: '/ventas', page: 'ventas', label: 'Ventas', icon: ShoppingCartIcon, module: 'ventas' },
  { to: '/pos', page: 'pos', label: 'POS', icon: ComputerDesktopIcon, module: 'pos' },
  { to: '/abastecimiento/compras-directas', page: 'abastecimiento', label: 'Abastecimiento', icon: DocumentTextIcon, module: 'abastecimiento', showCriticalDot: true },
  { to: '/menu/productos', page: 'menu', label: 'Menú', icon: CubeIcon, module: 'menu' },
  { to: '/operaciones/comandas', page: 'operaciones', label: 'Operaciones', icon: AdjustmentsHorizontalIcon, module: 'operaciones' },
  { to: '/analitica', page: 'analytics', label: 'Analítica', icon: ChartBarIcon, module: 'analitica' },
  { to: '/asistente/kali', page: 'asistente', label: 'Kali', icon: SparklesIcon, module: 'analitica', feature: 'kali_enabled' },
  { to: '/finanzas/cartera', page: 'finanzas', label: 'Finanzas', icon: BanknotesIcon, module: 'finanzas' },
  { to: '/facturacion', page: 'facturacion', label: 'Facturación', icon: ReceiptPercentIcon, module: 'facturacion' },
  { to: '/equipo/miembros', page: 'equipo', label: 'Equipo', icon: UserGroupIcon, module: 'equipo' },
  { to: '/integraciones', page: 'integraciones', label: 'Integraciones', icon: KeyIcon, module: 'integraciones' },
  { to: '/despacho/domicilios', page: 'despacho', label: 'Domicilios', icon: MapPinIcon, module: 'despacho' },
  { to: '/negocio', page: 'negocio', label: 'Mi Negocio', icon: BuildingStorefrontIcon, module: 'mi_negocio' },
  { to: '/gestion/billing', page: 'admin', label: 'Mi Plan', icon: CreditCardIcon, module: 'mi_plan' },
]
