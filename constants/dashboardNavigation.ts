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
  UsersIcon,
} from '@heroicons/vue/24/outline'
import type { AccessFeature, Module } from '~/stores/access'

export type ActivePage =
  | 'dashboard'
  | 'ventas' | 'propinas' | 'pos' | 'despacho' | 'comandas'
  | 'financiero' | 'finanzas' | 'facturacion'
  | 'abastecimiento' | 'inventario' | 'menu' | 'operaciones'
  | 'analytics' | 'analitica' | 'crm' | 'reportes' | 'pagos'
  | 'asistente'
  | 'equipo' | 'integraciones'
  | 'negocio' | 'admin' | 'configuracion'

export interface DashboardNavItem {
  to: string
  page: ActivePage
  /** i18n key under i18n/locales/{es,en}/shell.json (e.g. nav.ventas) */
  labelKey: string
  icon: FunctionalComponent
  module: Module
  feature?: AccessFeature
  showCriticalDot?: boolean
}

export const dashboardPrimaryItems: DashboardNavItem[] = [
  { to: '/pos', page: 'pos', labelKey: 'nav.pos', icon: ComputerDesktopIcon, module: 'pos' },
  { to: '/ventas', page: 'ventas', labelKey: 'nav.ventas', icon: ShoppingCartIcon, module: 'ventas' },
  { to: '/despacho/domicilios', page: 'despacho', labelKey: 'nav.despacho', icon: MapPinIcon, module: 'despacho' },
]

export const dashboardSecondaryItems: DashboardNavItem[] = [
  { to: '/crm/clientes', page: 'crm', labelKey: 'nav.crm', icon: UsersIcon, module: 'crm' },
  { to: '/analitica', page: 'analytics', labelKey: 'nav.analitica', icon: ChartBarIcon, module: 'analitica' },
  { to: '/asistente', page: 'asistente', labelKey: 'nav.asistente', icon: SparklesIcon, module: 'analitica', feature: 'kali_enabled' },
  { to: '/finanzas/arqueo', page: 'finanzas', labelKey: 'nav.finanzas', icon: BanknotesIcon, module: 'finanzas' },
  { to: '/facturacion', page: 'facturacion', labelKey: 'nav.facturacion', icon: DocumentTextIcon, module: 'facturacion' },
  { to: '/menu/productos', page: 'menu', labelKey: 'nav.menu', icon: CubeIcon, module: 'menu' },
  { to: '/operaciones/comandas', page: 'operaciones', labelKey: 'nav.operaciones', icon: AdjustmentsHorizontalIcon, module: 'operaciones' },
  { to: '/abastecimiento/compras-directas', page: 'abastecimiento', labelKey: 'nav.abastecimiento', icon: TruckIcon, module: 'abastecimiento' },
  { to: '/equipo/miembros', page: 'equipo', labelKey: 'nav.equipo', icon: UserGroupIcon, module: 'equipo' },
  { to: '/integraciones', page: 'integraciones', labelKey: 'nav.integraciones', icon: KeyIcon, module: 'integraciones' },
]

export const dashboardCuentaItems: DashboardNavItem[] = [
  { to: '/negocio', page: 'negocio', labelKey: 'nav.miNegocio', icon: BuildingStorefrontIcon, module: 'mi_negocio' },
  { to: '/gestion/billing', page: 'admin', labelKey: 'nav.miPlan', icon: CreditCardIcon, module: 'mi_plan' },
]

export const dashboardMobileGridItems: DashboardNavItem[] = [
  { to: '/ventas', page: 'ventas', labelKey: 'nav.ventas', icon: ShoppingCartIcon, module: 'ventas' },
  { to: '/pos', page: 'pos', labelKey: 'nav.pos', icon: ComputerDesktopIcon, module: 'pos' },
  { to: '/abastecimiento/compras-directas', page: 'abastecimiento', labelKey: 'nav.abastecimiento', icon: DocumentTextIcon, module: 'abastecimiento', showCriticalDot: true },
  { to: '/menu/productos', page: 'menu', labelKey: 'nav.menu', icon: CubeIcon, module: 'menu' },
  { to: '/operaciones/comandas', page: 'operaciones', labelKey: 'nav.operaciones', icon: AdjustmentsHorizontalIcon, module: 'operaciones' },
  { to: '/crm/clientes', page: 'crm', labelKey: 'nav.crm', icon: UsersIcon, module: 'crm' },
  { to: '/analitica', page: 'analytics', labelKey: 'nav.analitica', icon: ChartBarIcon, module: 'analitica' },
  { to: '/asistente', page: 'asistente', labelKey: 'nav.asistente', icon: SparklesIcon, module: 'analitica', feature: 'kali_enabled' },
  { to: '/finanzas/cartera', page: 'finanzas', labelKey: 'nav.finanzas', icon: BanknotesIcon, module: 'finanzas' },
  { to: '/facturacion', page: 'facturacion', labelKey: 'nav.facturacion', icon: ReceiptPercentIcon, module: 'facturacion' },
  { to: '/equipo/miembros', page: 'equipo', labelKey: 'nav.equipo', icon: UserGroupIcon, module: 'equipo' },
  { to: '/integraciones', page: 'integraciones', labelKey: 'nav.integraciones', icon: KeyIcon, module: 'integraciones' },
  { to: '/despacho/domicilios', page: 'despacho', labelKey: 'nav.domicilios', icon: MapPinIcon, module: 'despacho' },
  { to: '/negocio', page: 'negocio', labelKey: 'nav.miNegocio', icon: BuildingStorefrontIcon, module: 'mi_negocio' },
  { to: '/gestion/billing', page: 'admin', labelKey: 'nav.miPlan', icon: CreditCardIcon, module: 'mi_plan' },
]
