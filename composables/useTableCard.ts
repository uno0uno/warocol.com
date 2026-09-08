import { displayTableCode } from '~/composables/useTableDisplayCode'
import { tableSessionDisplayName, tableSessionHasAlias } from '~/utils/tableSessionDisplayName'

export type TableCardSecondaryPart = { text: string; bold?: boolean }

type AnyTable = {
  name: string
  status: string
  capacity?: unknown
  code?: string | null
  effective_waiter_member_name?: string | null
  session?: {
    custom_label?: string | null
    covers?: unknown
    capacity_snapshot?: unknown
    capacitySnapshot?: unknown
    running_total?: number | null
    opened_at?: string | null
    unfired_count?: number | null
    minimum_consumption?: {
      enabled?: boolean
      amount?: number | null
      remaining?: number | null
      covered?: boolean
    } | null
  } | null
}

/**
 * Shared POS table-card helpers (grid + canvas nodes).
 * Moved from MesasFloorPlan.vue without behavior change (uno0uno/warocol.com#2629).
 */
export function useTableCard() {
  const { t } = useI18n({ useScope: 'global' })
  const { formatCurrency } = useFormatters()
  const { singular: tableSingular } = useTableLabel()
  const tableSingularLower = computed(() => tableSingular.value.toLowerCase())

  const formatDuration = (openedAt: string): string => {
    const diffMs = Date.now() - new Date(openedAt).getTime()
    const totalMins = Math.floor(diffMs / 60_000)
    if (totalMins < 60) return `${totalMins}m`
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  const minimumConsumptionLabel = (table: AnyTable): string | null => {
    const state = table.session?.minimum_consumption
    if (!state?.enabled || !(Number(state.amount) > 0)) return null
    const remaining = Number(state.remaining) || 0
    if (state.covered || remaining <= 0) return t('pos.floor.minCovered')
    return t('pos.floor.remaining', { amount: formatCurrency(remaining) })
  }

  const badgeLabel = (status: string) => {
    if (status === 'open') return t('pos.floor.inService')
    if (status === 'bill_requested') return t('pos.floor.bill')
    return t('pos.floor.free')
  }

  /** Status theme — soft tint on body, stronger tint on footer (no left border). */
  const tableStatusTheme = (status: string) => {
    const panel = 'px-2.5 py-1.5 flex flex-col gap-0.5'
    const text = {
      title: 'text-text-primary',
      meta: 'text-text-secondary',
      amount: 'text-text-primary',
      time: 'text-text-secondary',
      waiter: 'text-text-tertiary',
    }
    const moveHover = 'hover:bg-black/5 focus-visible:ring-border/50'

    if (status === 'open') {
      return {
        card: 'border border-border/60 hover:border-border hover:shadow-sm',
        bodyPanel: 'table-card-body table-card-body--open',
        footerPanel: 'table-card-footer table-card-footer--open',
        focus: 'focus-visible:ring-border/40 focus-visible:ring-offset-surface',
        panel,
        divider: 'border-border/40',
        statusLabel: 'text-text-secondary',
        dot: 'bg-status-success-text/55',
        moveHover,
        ...text,
      }
    }
    if (status === 'bill_requested') {
      return {
        card: 'border border-border/60 hover:border-border hover:shadow-sm',
        bodyPanel: 'table-card-body table-card-body--bill',
        footerPanel: 'table-card-footer table-card-footer--bill',
        focus: 'focus-visible:ring-border/40 focus-visible:ring-offset-surface',
        panel,
        divider: 'border-border/40',
        statusLabel: 'text-text-secondary',
        dot: 'bg-status-warning-text/55',
        moveHover,
        ...text,
      }
    }
    return {
      card: 'border border-border/60 hover:border-border hover:shadow-sm',
      bodyPanel: 'table-card-body table-card-body--free',
      footerPanel: 'table-card-footer table-card-footer--free',
      focus: 'focus-visible:ring-border/40 focus-visible:ring-offset-surface',
      panel,
      divider: 'border-border/40',
      statusLabel: 'text-text-tertiary',
      dot: 'bg-status-info-text/45',
      moveHover,
      ...text,
    }
  }

  const cardClass = (status: string) => tableStatusTheme(status).card
  const focusRingClass = (status: string) => tableStatusTheme(status).focus
  const tableCardPanelClass = (status: string) => tableStatusTheme(status).panel
  const tableCardPanelDividerClass = (status: string) => tableStatusTheme(status).divider
  const tableCardBodyPanelClass = (status: string) =>
    `${tableCardPanelClass(status)} border-b ${tableCardPanelDividerClass(status)} ${tableStatusTheme(status).bodyPanel} flex-1 min-h-[3.75rem] text-start`
  const tableCardFooterPanelClass = (status: string) =>
    `${tableCardPanelClass(status)} border-t ${tableCardPanelDividerClass(status)} ${tableStatusTheme(status).footerPanel} shrink-0 text-start`
  const themeTitleClass = (status: string) => tableStatusTheme(status).title
  const themeMetaClass = (status: string) => tableStatusTheme(status).meta
  const themeAmountClass = (status: string) => tableStatusTheme(status).amount
  const themeTimeClass = (status: string) => tableStatusTheme(status).time
  const themeWaiterClass = (status: string) => tableStatusTheme(status).waiter
  const themeStatusLabelClass = (status: string) => tableStatusTheme(status).statusLabel
  const dotClass = (status: string) => tableStatusTheme(status).dot
  const moveButtonClass = (status: string) => tableStatusTheme(status).moveHover

  /** Shared row typography — same scale in body and footer panels. */
  const tableCardTitleTextClass = 'text-lg font-bold leading-tight'
  const tableCardPrimaryTextClass = 'text-sm font-bold tabular-nums leading-none'
  const tableCardSecondaryTextClass = 'text-xs font-medium tabular-nums leading-none'
  const tableCardTertiaryTextClass = 'text-xs font-normal leading-none truncate'

  const tableCardDisplayName = (table: { name: string; session?: { custom_label?: string | null } | null }) =>
    tableSessionDisplayName(table.name, table.session?.custom_label)

  const tableCardShowsCatalogName = (table: { name: string; session?: { custom_label?: string | null } | null }) =>
    tableSessionHasAlias(table.name, table.session?.custom_label)

  const parsePositiveInt = (value: unknown): number | null => {
    if (value == null || value === '') return null
    const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
    return Number.isFinite(n) && n >= 1 ? n : null
  }

  const tableCatalogCapacity = (table: { capacity?: unknown }) => parsePositiveInt(table.capacity)

  const sessionCapacitySnapshot = (session?: { capacity_snapshot?: unknown; capacitySnapshot?: unknown } | null) =>
    parsePositiveInt(session?.capacity_snapshot) ?? parsePositiveInt(session?.capacitySnapshot)

  const tableEffectiveCapacity = (table: {
    capacity?: unknown
    session?: { capacity_snapshot?: unknown; capacitySnapshot?: unknown } | null
  }) => sessionCapacitySnapshot(table.session) ?? tableCatalogCapacity(table)

  const tableListCapacityLabel = (table: {
    capacity?: unknown
    session?: { covers?: unknown; capacity_snapshot?: unknown; capacitySnapshot?: unknown } | null
  }): string | null => {
    const capacity = tableEffectiveCapacity(table)
    const covers = parsePositiveInt(table.session?.covers)

    if (covers != null && capacity != null) {
      return t('pos.floor.coversOfCapacity', { covers, capacity })
    }
    if (covers != null) {
      return String(covers)
    }
    if (capacity != null) {
      return String(capacity)
    }
    return null
  }

  const tableCardCapacityLabel = (table: {
    status: string
    capacity?: unknown
    session?: { covers?: unknown; capacity_snapshot?: unknown; capacitySnapshot?: unknown } | null
  }): string => tableListCapacityLabel(table) ?? '0'

  const tableCardTitle = (table: { name: string; session?: { custom_label?: string | null } | null }) =>
    tableCardDisplayName(table)

  const tableCardSecondaryParts = (table: {
    name: string
    status: string
    capacity?: unknown
    session?: { covers?: unknown; capacity_snapshot?: unknown; capacitySnapshot?: unknown; custom_label?: string | null } | null
  }): TableCardSecondaryPart[] => {
    const parts: TableCardSecondaryPart[] = []
    const code = displayTableCode(table)
    const title = tableCardTitle(table)
    if (code && code !== title && !title.includes(code)) parts.push({ text: code, bold: true })
    if (tableCardShowsCatalogName(table)) parts.push({ text: table.name })
    const capacity = tableCardCapacityLabel(table)
    parts.push({ text: capacity, bold: capacity !== '0' })
    const minLabel = minimumConsumptionLabel(table)
    if (minLabel) parts.push({ text: minLabel, bold: true })
    return parts
  }

  const tableCardWaiterLine = (table: { status: string; effective_waiter_member_name?: string | null }) => {
    if (table.status === 'free' && !table.effective_waiter_member_name) return null
    return table.effective_waiter_member_name || t('pos.floor.unassigned')
  }

  const tableCardAriaLabel = (table: { name: string; status: string; capacity?: number | null; session?: { custom_label?: string | null; covers?: unknown; capacity_snapshot?: unknown; capacitySnapshot?: unknown } | null }) => {
    const display = tableCardDisplayName(table)
    const capacity = tableCardCapacityLabel(table)
    const status = badgeLabel(table.status)
    if (tableCardShowsCatalogName(table)) {
      return capacity
        ? t('pos.floor.tableAriaWithAliasCapacity', { alias: display, name: table.name, status, capacity })
        : t('pos.floor.tableAriaWithAlias', { alias: display, name: table.name, status })
    }
    return capacity
      ? t('pos.floor.tableAriaWithCapacity', { name: display, status, capacity })
      : `${display} — ${status}`
  }

  const tableCardTotalLabel = (table: AnyTable): number =>
    table.status === 'free' ? 0 : Number(table.session?.running_total ?? 0)

  const moveAriaLabel = (table: { name: string }) =>
    `Mover ${table.name} a otra ${tableSingularLower.value}`

  return {
    formatDuration,
    formatCurrency,
    minimumConsumptionLabel,
    badgeLabel,
    cardClass,
    focusRingClass,
    tableCardBodyPanelClass,
    tableCardFooterPanelClass,
    themeTitleClass,
    themeMetaClass,
    themeAmountClass,
    themeTimeClass,
    themeWaiterClass,
    themeStatusLabelClass,
    dotClass,
    moveButtonClass,
    tableCardTitleTextClass,
    tableCardPrimaryTextClass,
    tableCardSecondaryTextClass,
    tableCardTertiaryTextClass,
    tableCardTitle,
    tableCardSecondaryParts,
    tableCardWaiterLine,
    tableCardAriaLabel,
    tableCardTotalLabel,
    tableListCapacityLabel,
    moveAriaLabel,
  }
}
