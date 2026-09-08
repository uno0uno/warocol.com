<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Draggable from 'vuedraggable'
import { $fetch } from 'ofetch'
import { displayTableCode } from '~/composables/useTableDisplayCode'
import {
  buildFreePositionPayload,
  buildZoneDropPayload,
  groupTablesByZona,
  sortTablesByPosition,
} from '~/composables/useTableZoneMatrix'
import {
  groupWallsByZona,
  isValidWallPayload,
  type FloorWall,
  type NewFloorWall,
} from '~/composables/useFloorWalls'
import { VueFlow, type NodeDragEvent } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import {
  NODE_PX,
  hasCoords,
  layoutUnplacedInMatrix,
  nodeToPayload,
  resolveTableCoords,
  type FloorPlanNode,
  type StagedCoords,
} from '~/composables/useFloorPlanNodes'
import { tableSessionDisplayName, tableSessionHasAlias } from '~/utils/tableSessionDisplayName'
import {
  shellHeaderToolButtonClass,
  shellHeaderToolButtonActiveClass,
  shellHeaderToolTextButtonClass,
} from '~/utils/shellHeaderToolClasses'

const { formatCurrency, formatDateTime } = useFormatters()

const props = defineProps<{
  comandasEnabled?: boolean
  /** Issue #574 — when true, render the effective-waiter line under each mesa card */
  waiterAttributionEnabled?: boolean
  /**
   * uno0uno/warocol.com#2624 —
   * pos: full POS behavior (grid/list + canvas editor when enabled).
   * order: canvas editor only, no session side-effects (Operaciones embed).
   * view: canvas read-only (POS with flag ON): no drag/edit, click opens.
   */
  mode?: 'pos' | 'order' | 'view'
}>()

const floorMode = computed(() => props.mode ?? 'pos')

const emit = defineEmits<{
  (e: 'enter-table', ctx: { tableId: string; sessionId: string; tableName: string; isBar?: boolean; gotoCheckout?: boolean }): void
  (e: 'no-tables'): void
  (e: 'move-table', ctx: { tableId: string; sessionId: string; tableName: string }): void
}>()

type FloorView = 'mesas' | 'barra' | 'domicilios'
type FloorLayout = 'grid' | 'list' | 'canvas'

interface PendingDeliveryRow {
  id: string
  order_number: number
  order_date: string | null
  total_amount: number
  status: string
  payment_status: string | null
  delivery_instructions: string | null
  address_label: string | null
  customer: { id: string | null; name: string | null; phone_number: string | null }
}

const { currentTenant } = useTenantReactive()

// ── Tables data ────────────────────────────────────────────────────────────
const { data: tablesData, status: tablesStatus, asyncStatus: tablesAsyncStatus, error: tablesError, refetch } = useQuery({
  key: () => ['tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/tables'),
  enabled: () => !!currentTenant.value,
  staleTime: 0,
})

const loadingTables = computed(() => {
  if (tablesError.value) return false
  // idle/no payload: keep loader so Mesas/Barra tabs never flash before first fetch
  if (tablesStatus.value === 'pending' || tablesStatus.value === 'idle') return true
  return tablesData.value == null
})
const isRefreshing = computed(() => tablesAsyncStatus.value === 'loading' && tablesData.value != null)

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const tables = computed(() => tablesData.value?.data ?? [])

const floorView = ref<FloorView>('mesas')
const floorLayouts = computed<FloorLayout[]>(() =>
  floorMode.value === 'pos' ? ['grid', 'list'] : ['canvas'],
)
const floorLayout = ref<FloorLayout>('grid')
watch(
  floorMode,
  (mode) => {
    floorLayout.value = mode === 'pos' ? 'grid' : 'canvas'
  },
  { immediate: true },
)
const floorLayoutToggleTarget = computed<FloorLayout>(() => {
  const layouts = floorLayouts.value
  return layouts[(layouts.indexOf(floorLayout.value) + 1) % layouts.length]!
})
const toggleFloorLayout = () => {
  floorLayout.value = floorLayoutToggleTarget.value
}

const setFloorView = (view: FloorView) => {
  floorView.value = view
}

const {
  data: pendingDeliveriesData,
  status: pendingDeliveriesStatus,
  asyncStatus: pendingDeliveriesAsyncStatus,
  error: pendingDeliveriesError,
  refetch: refetchPendingDeliveries,
} = useQuery({
  key: () => ['tables', 'pending-deliveries', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: PendingDeliveryRow[] }>('/api/tables/pending-deliveries'),
  enabled: () => !!currentTenant.value,
  staleTime: 0,
})

const pendingDeliveries = computed(() => pendingDeliveriesData.value?.data ?? [])
const loadingPendingDeliveries = computed(() => pendingDeliveriesStatus.value === 'pending')
const isRefreshingDeliveries = computed(() =>
  pendingDeliveriesAsyncStatus.value === 'loading' && pendingDeliveriesData.value != null,
)
const isFloorRefreshing = computed(() => isRefreshing.value || isRefreshingDeliveries.value)
registerProgressiveLoading(isFloorRefreshing)

const refreshFloor = async () => {
  if (isDraggingZone.value || isDraggingNode.value) return
  await Promise.all([refetch(), refetchPendingDeliveries()])
}

const handleDeliveryClick = (order: PendingDeliveryRow) => {
  navigateTo({ path: '/pos/checkout', query: { pendingOrder: order.id } })
}

const tableListColumns = computed(() => [
  { key: 'name', title: t('pos.floor.colTable'), sortable: false },
  { key: 'alias', title: t('pos.floor.colAlias'), sortable: false },
  { key: 'code', title: t('pos.floor.colCode'), sortable: false },
  { key: 'capacity', title: t('pos.floor.colCapacity'), sortable: false },
  { key: 'min', title: t('pos.floor.colMin'), sortable: false },
  { key: 'status', title: t('pos.floor.colStatus'), sortable: false },
  { key: 'total', title: t('pos.floor.colTotal'), sortable: false },
  { key: 'time', title: t('pos.floor.colTime'), sortable: false },
  ...(props.waiterAttributionEnabled
    ? [{ key: 'waiter', title: t('pos.floor.colWaiter'), sortable: false }]
    : []),
])

const filterAllLabel = computed(() => t('pos.floor.filterAll'))
const filterName = ref('')
const filterAlias = ref('')
const filterCode = ref('')
const filterCapacity = ref('')
const filterMin = ref('')
const filterStatus = ref('')
const filterWaiter = ref('')

const uniqueSortedLabels = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))

const nameFilterOptions = computed(() =>
  uniqueSortedLabels(regularTables.value.map((table: any) => table.name)).map((value) => ({ label: value, value })),
)

const aliasFilterOptions = computed(() => {
  const options: { label: string; value: string }[] = [
    { label: t('pos.floor.filterNoAlias'), value: '__none__' },
  ]
  const seen = new Set<string>()
  for (const table of regularTables.value) {
    const alias = table.session?.custom_label?.trim()
    if (!alias || !tableSessionHasAlias(table.name, alias) || seen.has(alias)) continue
    seen.add(alias)
    options.push({ label: alias, value: alias })
  }
  return options.sort((a, b) => (a.value === '__none__' ? -1 : b.value === '__none__' ? 1 : a.label.localeCompare(b.label, 'es')))
})

const codeFilterOptions = computed(() =>
  uniqueSortedLabels(
    regularTables.value.map((table: any) => tableListCode(table)).filter(Boolean) as string[],
  ).map((value) => ({ label: value, value })),
)

const capacityFilterOptions = computed(() =>
  uniqueSortedLabels(
    regularTables.value.map((table: any) => tableCardCapacityLabel(table)),
  ).map((value) => ({ label: value, value })),
)

const minFilterOptions = computed(() => [
  { label: t('pos.floor.filterMinNone'), value: '__none__' },
  { label: t('pos.floor.filterMinPending'), value: 'pending' },
  { label: t('pos.floor.filterMinCovered'), value: 'covered' },
])

const statusFilterOptions = computed(() => [
  { label: t('pos.floor.free'), value: 'free' },
  { label: t('pos.floor.inService'), value: 'open' },
  { label: t('pos.floor.bill'), value: 'bill_requested' },
])

const waiterFilterOptions = computed(() => {
  const options: { label: string; value: string }[] = [
    { label: t('pos.floor.filterUnassigned'), value: '__unassigned__' },
  ]
  const seen = new Set<string>()
  for (const table of regularTables.value) {
    const waiter = tableListWaiterName(table)
    if (!waiter || seen.has(waiter)) continue
    seen.add(waiter)
    options.push({ label: waiter, value: waiter })
  }
  return options.sort((a, b) => (a.value === '__unassigned__' ? -1 : b.value === '__unassigned__' ? 1 : a.label.localeCompare(b.label, 'es')))
})

const filteredRegularTables = computed(() =>
  regularTables.value.filter((table: any) => {
    if (filterName.value && table.name !== filterName.value) return false

    if (filterAlias.value) {
      const hasAlias = tableSessionHasAlias(table.name, table.session?.custom_label)
      if (filterAlias.value === '__none__' && hasAlias) return false
      if (filterAlias.value !== '__none__' && table.session?.custom_label?.trim() !== filterAlias.value) return false
    }

    if (filterCode.value && tableListCode(table) !== filterCode.value) return false
    if (filterCapacity.value && tableCardCapacityLabel(table) !== filterCapacity.value) return false

    if (filterMin.value) {
      const state = table.session?.minimum_consumption
      const hasMin = Boolean(state?.enabled && Number(state.amount) > 0)
      const pending = hasMin && Number(state.remaining) > 0 && !state.covered
      const covered = hasMin && !pending
      if (filterMin.value === '__none__' && hasMin) return false
      if (filterMin.value === 'pending' && !pending) return false
      if (filterMin.value === 'covered' && !covered) return false
    }

    if (filterStatus.value && table.status !== filterStatus.value) return false

    if (filterWaiter.value) {
      const waiter = tableListWaiterName(table)
      if (filterWaiter.value === '__unassigned__' && waiter) return false
      if (filterWaiter.value !== '__unassigned__' && waiter !== filterWaiter.value) return false
    }

    return true
  }),
)

const listChipClass = 'inline-flex max-w-full truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold'
const listMetaChipClass = `${listChipClass} list-meta-chip`
const listFilledChipClass = listMetaChipClass
const listEmptyChipClass = `${listChipClass} bg-badge-neutral-bg text-badge-neutral-text`

const tableListCatalogName = (table: { name: string }) => table.name

const tableListAlias = (table: { name: string; session?: { custom_label?: string | null } | null }) => {
  const alias = table.session?.custom_label?.trim()
  if (!alias || !tableSessionHasAlias(table.name, alias)) return null
  return alias
}

const tableListCode = (table: { name: string; code?: string | null; session?: { custom_label?: string | null } | null }) => {
  const code = displayTableCode(table)
  const title = table.name
  if (!code || code === title || title.includes(code)) return null
  return code
}

const tableListTotalLabel = (table: { status: string; session?: { running_total?: number } | null }) => {
  const amount = table.status === 'free' ? 0 : Number(table.session?.running_total ?? 0)
  return formatCurrency(amount)
}

const tableListTimeLabel = (table: { status: string; session?: { opened_at?: string } | null }) => {
  if (table.status === 'free' || !table.session?.opened_at) return null
  return formatDuration(table.session.opened_at)
}

const tableListStatusChipClass = (status: string) => {
  if (status === 'open') return `${listChipClass} list-status-chip list-status-chip--open`
  if (status === 'bill_requested') return `${listChipClass} list-status-chip list-status-chip--bill`
  return `${listChipClass} list-status-chip list-status-chip--free`
}

const tableListWaiterName = (table: { effective_waiter_member_name?: string | null }) =>
  table.effective_waiter_member_name?.trim() || null

const deliveryListColumns = computed(() => [
  { key: 'order_number', title: t('pos.floor.colOrderNumber'), sortable: false },
  { key: 'order_date', title: t('pos.floor.colOrderDate'), sortable: false },
  { key: 'customer', title: t('pos.floor.colCustomer'), sortable: false },
  { key: 'address', title: t('pos.floor.colAddress'), sortable: false },
  { key: 'total', title: t('pos.floor.colTotal'), sortable: false },
  { key: 'time', title: t('pos.floor.colTime'), sortable: false },
])

// Bar tile is always-on — separate from regular tables
const barTable = computed(() => tables.value.find((t: any) => t.is_bar))
const regularTables = computed(() => tables.value.filter((t: any) => !t.is_bar))

// ── Zone matrix (uno0uno/warocol.com#2610, free x/y #2613) ───────────────
// NULL/blank zona falls back to UNPLACED_ZONE in API (Operaciones) order;
// tables with stored x/y render sorted by (y, x).
const zoneGroups = computed(() =>
  groupTablesByZona(regularTables.value as any[]).map((zone) => ({
    zona: zone.zona,
    tables: sortTablesByPosition(zone.tables),
  })),
)

// ── Floor walls (uno0uno/warocol.com#2614, visual reference only) ────────
const { data: wallsData, refetch: refetchWalls } = useQuery({
  key: () => ['tables', 'walls', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: FloorWall[] }>('/api/tables/walls'),
  enabled: () => !!currentTenant.value,
  staleTime: 0,
})

const wallsByZona = computed(() => groupWallsByZona((wallsData.value?.data ?? []) as FloorWall[]))
const zoneWalls = (zona: string): FloorWall[] => wallsByZona.value.get(zona) ?? []
const isSavingWall = ref(false)
const wallError = ref('')
const editingWallId = ref<string | null>(null)
const wallDraft = ref({ x1: 0, y1: 0, x2: 4, y2: 0 })

const addWall = async (zona: string) => {
  const payload: NewFloorWall = { zona, x1: 0, y1: 0, x2: 4, y2: 0 }
  if (!isValidWallPayload(payload) || isSavingWall.value) return
  isSavingWall.value = true
  wallError.value = ''
  try {
    await $fetch('/api/tables/walls', { method: 'POST', body: payload })
    await refetchWalls()
  } catch {
    wallError.value = 'No se pudo agregar la pared'
  } finally {
    isSavingWall.value = false
  }
}

const removeWall = async (wallId: string) => {
  if (isSavingWall.value) return
  isSavingWall.value = true
  wallError.value = ''
  try {
    await $fetch(`/api/tables/walls/${wallId}`, { method: 'DELETE' })
    await refetchWalls()
  } catch {
    wallError.value = 'No se pudo quitar la pared'
  } finally {
    isSavingWall.value = false
  }
}

const startEditWall = (wall: FloorWall) => {
  editingWallId.value = wall.id
  wallDraft.value = { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 }
  wallError.value = ''
}

const saveWallEdit = async (wall: FloorWall) => {
  const payload = { ...wallDraft.value }
  if (isSavingWall.value) return
  if (!['x1', 'y1', 'x2', 'y2'].every((k) => Number.isFinite((payload as any)[k]))) {
    wallError.value = 'Coordenadas inválidas'
    return
  }
  isSavingWall.value = true
  wallError.value = ''
  try {
    await $fetch(`/api/tables/walls/${wall.id}`, { method: 'PATCH', body: payload })
    editingWallId.value = null
    await refetchWalls()
  } catch {
    wallError.value = 'No se pudo mover la pared'
  } finally {
    isSavingWall.value = false
  }
}
const isDraggingZone = ref(false)
const zoneDropTimers = new Map<string, ReturnType<typeof setTimeout>>()

const onZoneDragStart = () => {
  isDraggingZone.value = true
}

const onZoneDragEnd = () => {
  isDraggingZone.value = false
}

const persistZoneDrop = async (table: any, targetZona: string, newIndex?: number) => {
  const payload =
    typeof newIndex === 'number'
      ? buildFreePositionPayload(targetZona, newIndex)
      : buildZoneDropPayload(table, targetZona)
  try {
    await $fetch(`/api/tables/${table.id}/position`, { method: 'PATCH', body: payload })
  } finally {
    // Reload keeps layout (or reverts on error)
    await refetch()
  }
}

const scheduleZoneDrop = (table: any, targetZona: string, newIndex?: number) => {
  // Debounce: one PATCH per drop
  const prev = zoneDropTimers.get(table.id)
  if (prev) clearTimeout(prev)
  zoneDropTimers.set(
    table.id,
    setTimeout(() => {
      zoneDropTimers.delete(table.id)
      void persistZoneDrop(table, targetZona, newIndex)
    }, 300),
  )
}

const onZoneChange = (targetZona: string, evt: any) => {
  isDraggingZone.value = false
  // Free x/y grid (#2613): derive coordinates from the drop index,
  // both between zones (added) and within a zone (moved).
  const added = evt?.added
  if (added?.element?.id && typeof added.newIndex === 'number') {
    scheduleZoneDrop(added.element, targetZona, added.newIndex)
    return
  }
  const moved = evt?.moved
  if (moved?.element?.id && typeof moved.newIndex === 'number') {
    scheduleZoneDrop(moved.element, targetZona, moved.newIndex)
  }
}

// ── Free canvas (uno0uno/warocol.com#2617, Vue Flow) ─────────────────────
const canvasNodes = ref<FloorPlanNode[]>([])
const isDraggingNode = ref(false)
const stagedMoves = ref(new Map<string, StagedCoords>())

const syncCanvasNodes = () => {
  if (isDraggingNode.value) return
  const nodes: FloorPlanNode[] = []
  for (const table of regularTables.value as any[]) {
    const coords = resolveTableCoords(table, stagedMoves.value)
    if (!coords) continue
    nodes.push({
      id: String(table.id),
      type: 'mesa',
      position: { x: coords.pos_x * NODE_PX, y: coords.pos_y * NODE_PX },
      data: {
        tableId: String(table.id),
        title: String(table.name ?? table.id),
        status: String(table.status ?? 'free'),
        zona: coords.zona,
        runningTotal: Number(table.session?.running_total ?? 0),
        openedAt: (table.session?.opened_at as string | undefined) ?? null,
        waiterName: (table.effective_waiter_member_name as string | undefined)?.trim() || null,
      },
    })
  }
  canvasNodes.value = nodes
}

watch(regularTables, syncCanvasNodes, { immediate: true })

const unplacedTables = computed(() =>
  (regularTables.value as any[]).filter((t) => !hasCoords(t) && !stagedMoves.value.has(String(t.id))),
)

// ── Canvas draft (uno0uno/warocol.com#2620): drag stages locally,
// Guardar persists everything at once. No auto-PATCH on drop.
const hasUnsavedCanvas = computed(() => stagedMoves.value.size > 0)
const isSavingCanvas = ref(false)
const canvasError = ref('')

const onNodeDragStart = () => {
  isDraggingNode.value = true
}

const onNodeDragStop = (event: NodeDragEvent) => {
  isDraggingNode.value = false
  const node = (event as unknown as { node?: { id?: string; position?: { x: number; y: number } } }).node
  if (!node?.id || !node.position) return
  const payload = nodeToPayload({ position: node.position })
  const table = (regularTables.value as any[]).find((t) => String(t.id) === node.id)
  const next = new Map(stagedMoves.value)
  next.set(node.id, { ...payload, zona: table?.zona ?? null })
  stagedMoves.value = next
  syncCanvasNodes()
}

const saveCanvas = async () => {
  if (!stagedMoves.value.size || isSavingCanvas.value) return
  isSavingCanvas.value = true
  canvasError.value = ''
  try {
    for (const [tableId, coords] of stagedMoves.value) {
      await $fetch(`/api/tables/${tableId}/position`, { method: 'PATCH', body: coords })
    }
    stagedMoves.value = new Map()
    await refetch()
  } catch {
    canvasError.value = 'No se pudo guardar el plano'
  } finally {
    isSavingCanvas.value = false
  }
}

const discardCanvas = async () => {
  stagedMoves.value = new Map()
  canvasError.value = ''
  await refetch()
}

const onNodeCanvasClick = (event: { node?: { id?: string } }) => {
  if (floorMode.value === 'order') return
  const table = tableById(event.node?.id ?? '')
  if (table) void handleTableClick(table)
}

const tableById = (id: string): any | undefined =>
  (regularTables.value as any[]).find((t) => String(t.id) === String(id))

const placeOnCanvas = (table: any) => {
  const regs = regularTables.value as any[]
  stagedMoves.value = layoutUnplacedInMatrix([table], regs, stagedMoves.value)
  syncCanvasNodes()
}

const placeAllOnCanvas = () => {
  const regs = regularTables.value as any[]
  stagedMoves.value = layoutUnplacedInMatrix(
    regs.filter((t) => !hasCoords(t) && !stagedMoves.value.has(String(t.id))),
    regs,
    stagedMoves.value,
  )
  syncCanvasNodes()
}

type FloorTab = { id: FloorView; label: string; badge?: number }

const hasMesas = computed(() => regularTables.value.length > 0)

const floorTabs = computed((): FloorTab[] => {
  const deliveriesTab: FloorTab = {
    id: 'domicilios',
    label: t('pos.floor.viewDeliveries'),
    badge: pendingDeliveries.value.length || undefined,
  }
  if (hasMesas.value) {
    return [
      { id: 'mesas', label: t('pos.floor.viewTables') },
      deliveriesTab,
    ]
  }
  if (barTable.value) {
    return [
      { id: 'barra', label: t('pos.floor.bar') },
      deliveriesTab,
    ]
  }
  return [
    { id: 'mesas', label: t('pos.floor.viewTables') },
    deliveriesTab,
  ]
})

const showBarEntryCard = computed(
  () => !!barTable.value && (floorView.value === 'mesas' || floorView.value === 'barra'),
)

// When data loads and there are 0 *regular* tables and no bar, tell the parent to fall back to POS view.
watch(tablesStatus, (status) => {
  if (status === 'success' && regularTables.value.length === 0 && !barTable.value) {
    emit('no-tables')
  }
}, { immediate: true })

watch(hasMesas, (has) => {
  if (!has && barTable.value && floorView.value === 'mesas') {
    floorView.value = 'barra'
  } else if (has && floorView.value === 'barra') {
    floorView.value = 'mesas'
  }
}, { immediate: true })

watch(() => currentTenant.value?.id, () => { refetch() })

// ── 30-second polling ──────────────────────────────────────────────────────
let pollInterval: ReturnType<typeof setInterval> | null = null

// ── Open session ───────────────────────────────────────────────────────────
const openingTableId = ref<string | null>(null)

const handleTableClick = async (table: any) => {
  if (table.status === 'free') {
    if (openingTableId.value) return
    // Open the session directly; mesero assignment happens from the
    // banner chip in /pos (no pre-open prompt). If the mesa has a
    // default `assigned_member_id`, the resolver carries it through
    // automatically (#573 → #574 fallback chain).
    await doOpenTable(table, null)
  } else if (table.status === 'open') {
    emit('enter-table', {
      tableId: table.id,
      sessionId: table.session?.id,
      tableName: table.name,
    })
  } else if (table.status === 'bill_requested') {
    emit('enter-table', {
      tableId: table.id,
      sessionId: table.session?.id,
      tableName: table.name,
      gotoCheckout: true,
    })
  }
}

const doOpenTable = async (table: any, attendedByMemberId: string | null) => {
  openingTableId.value = table.id
  try {
    const result = await $fetch<{ success: boolean; data: { session_id: string } }>(
      `/api/tables/${table.id}/open`,
      {
        method: 'POST',
        body: attendedByMemberId ? { attended_by_member_id: attendedByMemberId } : undefined,
      },
    )
    await refetch()
    emit('enter-table', {
      tableId: table.id,
      sessionId: result?.data?.session_id,
      tableName: table.name,
    })
  } catch {
    await refetch()
    emit('enter-table', {
      tableId: table.id,
      sessionId: table.session?.id,
      tableName: table.name,
    })
  } finally {
    openingTableId.value = null
  }
}

// ── Bar click — session is always open, fetch current and enter ─────────────
const isEnteringBar = ref(false)

const handleBarClick = async () => {
  if (!barTable.value || isEnteringBar.value) return
  isEnteringBar.value = true
  try {
    emit('enter-table', {
      tableId: barTable.value.id,
      sessionId: barTable.value.session?.id ?? '',
      tableName: barTable.value.name,
      isBar: true,
    })
  } finally {
    isEnteringBar.value = false
  }
}

// ── Reopen session (subtle text link on free tables with last_closed_at) ────
const isReopeningTableId = ref<string | null>(null)

const handleReopenTable = async (tableId: string, event: Event) => {
  event.stopPropagation()
  isReopeningTableId.value = tableId
  try {
    await $fetch(`/api/tables/${tableId}/session/reopen`, { method: 'POST' })
    await refetch()
  } catch {
    // Non-critical — table state unchanged
  } finally {
    isReopeningTableId.value = null
  }
}

// ── Move table ────────────────────────────────────────────────────────────
const handleMoveTable = (table: any, event: Event) => {
  event.stopPropagation()
  emit('move-table', {
    tableId: table.id,
    sessionId: table.session?.id ?? '',
    tableName: table.name,
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────
const formatDuration = (openedAt: string): string => {
  const diffMs = Date.now() - new Date(openedAt).getTime()
  const totalMins = Math.floor(diffMs / 60_000)
  if (totalMins < 60) return `${totalMins}m`
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const minimumConsumptionLabel = (table: any): string | null => {
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

const freeCount = computed(() => regularTables.value.filter((t: any) => t.status === 'free').length)
const openCount = computed(() => regularTables.value.filter((t: any) => t.status === 'open').length)
const billCount = computed(() => regularTables.value.filter((t: any) => t.status === 'bill_requested').length)

const totalVentas = computed(() =>
  regularTables.value
    .filter((t: any) => t.status !== 'free' && t.session?.running_total)
    .reduce((sum: number, t: any) => sum + (t.session.running_total ?? 0), 0)
)

onMounted(() => {
  setRefreshHandler(refreshFloor)
  pollInterval = setInterval(refreshFloor, 30_000)
})

onUnmounted(() => {
  clearRefreshHandler(refreshFloor)
  if (pollInterval) clearInterval(pollInterval)
  for (const timer of zoneDropTimers.values()) clearTimeout(timer)
  zoneDropTimers.clear()
})
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="loadingTables || openingTableId" class="flex items-center justify-center min-h-[70vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="tablesError" />

    <!-- Content -->
    <div v-else>
      <ClientOnly>
        <Teleport to="#dashboard-header-pos-tools">
          <button
            v-if="floorView === 'mesas' && floorMode === 'pos'"
            type="button"
            :class="shellHeaderToolButtonClass"
            :aria-label="floorLayoutToggleTarget === 'list' ? t('pos.catalog.layoutSwitchToList') : t('pos.catalog.layoutSwitchToGrid')"
            :title="floorLayoutToggleTarget === 'list' ? t('pos.catalog.layoutList') : t('pos.catalog.layoutGrid')"
            @click="toggleFloorLayout"
          >
            <span class="inline-flex h-4 w-4 items-center justify-center">
              <Transition name="pos-layout-icon" mode="out-in">
                <svg
                  v-if="floorLayoutToggleTarget === 'list'"
                  key="icon-list"
                  class="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <svg
                  v-else
                  key="icon-grid"
                  class="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 8.25 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                </svg>
              </Transition>
            </span>
          </button>
        </Teleport>
      </ClientOnly>

      <div
        v-if="floorMode === 'pos' && floorTabs.length > 1"
        class="mb-4 flex flex-wrap items-center gap-2"
        role="tablist"
        :aria-label="t('pos.floor.mainPlan')"
      >
        <button
          v-for="tab in floorTabs"
          :key="tab.id"
          type="button"
          role="tab"
          :class="[
            shellHeaderToolTextButtonClass,
            floorView === tab.id ? shellHeaderToolButtonActiveClass : '',
          ]"
          :aria-selected="floorView === tab.id"
          @click="setFloorView(tab.id)"
        >
          <span>{{ tab.label }}</span>
          <span
            v-if="tab.badge"
            class="inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-shell-action-hover-bg text-[10px] font-bold tabular-nums leading-none"
          >
            {{ tab.badge > 9 ? '9+' : tab.badge }}
          </span>
        </button>
      </div>

      <button
        v-if="floorMode === 'pos' && showBarEntryCard"
        class="mb-4 w-full min-w-0 flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border bg-surface shadow-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border/50 focus-visible:ring-offset-2 hover:bg-surface-secondary/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="isEnteringBar"
        :aria-label="t('pos.floor.barEnterAria')"
        @click="handleBarClick"
      >
        <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-surface-secondary border border-border/70 text-text-secondary">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3h18v2l-7 9v7l-4-2v-5L3 5V3z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0 text-start">
          <p class="text-base font-semibold">{{ t('pos.floor.bar') }}</p>
          <p class="text-xs text-text-secondary mt-0.5 tabular-nums">
            <template v-if="barTable.session?.running_total > 0">
              {{ t('pos.floor.accumulated', { amount: formatCurrency(barTable.session.running_total) }) }} ·
              {{ formatDuration(barTable.session.opened_at) }}
            </template>
            <template v-else>
              {{ t('pos.banner.barHintDirect') }}
            </template>
          </p>
        </div>
        <svg class="w-5 h-5 opacity-50 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <Transition v-if="floorView !== 'barra'" name="pos-floor-view" mode="out-in">
      <div v-if="floorView === 'domicilios'" key="domicilios">
        <div v-if="loadingPendingDeliveries" class="flex items-center justify-center min-h-[40vh]">
          <CommonsTheCustomLoader size="large" />
        </div>
        <CommonsTheErrorState v-else-if="pendingDeliveriesError" />
        <div
          v-else-if="pendingDeliveries.length === 0"
          class="flex flex-col items-center justify-center min-h-[40vh] text-center px-4"
        >
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface-secondary border border-border/60 mb-4">
            <svg class="w-7 h-7 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <p class="text-base font-semibold text-text-primary">{{ t('pos.floor.deliveriesEmptyTitle') }}</p>
          <p class="text-sm text-text-secondary mt-1 max-w-sm">{{ t('pos.floor.deliveriesEmptyBody') }}</p>
        </div>
        <div v-else class="pos-floor-list">
        <UiResponsiveDataView
          :columns="deliveryListColumns"
          :data="pendingDeliveries"
          item-key="id"
          :empty-message="t('pos.floor.deliveriesEmptyTitle')"
          row-size="sm"
          @row-click="handleDeliveryClick"
        >
          <template #card="{ item }">
            <button
              type="button"
              class="flex w-full flex-col gap-2 border-b border-border px-3 py-3 text-left hover:bg-data-table-row-hover-bg"
              @click="handleDeliveryClick(item)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="min-w-0 truncate text-sm font-semibold text-text-primary">
                  <span class="text-text-primary tabular-nums">#{{ item.order_number }}</span>
                  <span class="text-text-secondary font-normal"> · {{ item.customer?.name || t('pos.floor.unknownCustomer') }}</span>
                </p>
                <span class="text-sm font-semibold tabular-nums">{{ formatCurrency(item.total_amount) }}</span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <span v-if="item.order_date" class="text-xs tabular-nums text-text-secondary">{{ formatDateTime(item.order_date) }}</span>
                <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noDate') }}</span>
                <span v-if="item.address_label" class="text-xs text-text-secondary">{{ item.address_label }}</span>
                <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noAddress') }}</span>
                <span v-if="item.order_date" class="text-xs tabular-nums text-text-secondary">{{ formatDuration(item.order_date) }}</span>
                <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noTime') }}</span>
              </div>
            </button>
          </template>
          <template #cell-order_number="{ item }">
            <span class="font-semibold tabular-nums text-text-primary">#{{ item.order_number }}</span>
          </template>
          <template #cell-order_date="{ item }">
            <span v-if="item.order_date" class="tabular-nums text-text-secondary whitespace-nowrap">{{ formatDateTime(item.order_date) }}</span>
            <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noDate') }}</span>
          </template>
          <template #cell-customer="{ item }">
            <span class="font-semibold">{{ item.customer?.name || t('pos.floor.unknownCustomer') }}</span>
          </template>
          <template #cell-address="{ item }">
            <span v-if="item.address_label" class="text-text-secondary">{{ item.address_label }}</span>
            <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noAddress') }}</span>
          </template>
          <template #cell-total="{ item }">
            <span class="tabular-nums">{{ formatCurrency(item.total_amount) }}</span>
          </template>
          <template #cell-time="{ item }">
            <span v-if="item.order_date" class="text-text-secondary">{{ formatDuration(item.order_date) }}</span>
            <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noTime') }}</span>
          </template>
        </UiResponsiveDataView>
        </div>
      </div>

      <div v-else key="mesas">
      <Transition name="pos-floor-layout" mode="out-in">
      <!-- Table grid — zone matrix (uno0uno/warocol.com#2610) -->
      <div v-if="floorLayout === 'grid'" key="tables-grid" class="flex flex-col gap-6 pb-32">
        <section v-for="zone in zoneGroups" :key="zone.zona" :aria-label="zone.zona">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="text-xs font-bold uppercase tracking-wide text-text-tertiary">{{ zone.zona }}</p>
            <button
              type="button"
              class="text-[11px] font-semibold text-text-tertiary hover:text-text-primary disabled:opacity-50"
              :disabled="isSavingWall"
              @click="addWall(zone.zona)"
            >
              + Pared
            </button>
          </div>
          <p v-if="wallError" class="mb-2 text-[11px] font-semibold text-state-danger-icon">{{ wallError }}</p>
          <svg
            v-if="zoneWalls(zone.zona).length"
            class="mb-2 h-16 w-full rounded-md border border-border/60 bg-surface-secondary/40"
            viewBox="0 0 4 3"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              v-for="wall in zoneWalls(zone.zona)"
              :key="wall.id"
              :x1="wall.x1"
              :y1="wall.y1"
              :x2="wall.x2"
              :y2="wall.y2"
              stroke="currentColor"
              stroke-width="0.12"
              stroke-linecap="round"
              class="text-text-primary"
            />
          </svg>
          <ul v-if="zoneWalls(zone.zona).length" class="mb-2 flex flex-col gap-1">
            <li
              v-for="wall in zoneWalls(zone.zona)"
              :key="wall.id"
              class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border/60 bg-surface-secondary/50 px-2 py-1 text-[11px] tabular-nums text-text-secondary"
            >
              <template v-if="editingWallId === wall.id">
                <label class="flex items-center gap-1">x1<input v-model.number="wallDraft.x1" type="number" step="0.5" class="w-12 rounded border border-border bg-surface px-1 py-0.5" /></label>
                <label class="flex items-center gap-1">y1<input v-model.number="wallDraft.y1" type="number" step="0.5" class="w-12 rounded border border-border bg-surface px-1 py-0.5" /></label>
                <label class="flex items-center gap-1">x2<input v-model.number="wallDraft.x2" type="number" step="0.5" class="w-12 rounded border border-border bg-surface px-1 py-0.5" /></label>
                <label class="flex items-center gap-1">y2<input v-model.number="wallDraft.y2" type="number" step="0.5" class="w-12 rounded border border-border bg-surface px-1 py-0.5" /></label>
                <button
                  type="button"
                  class="font-bold text-text-primary hover:underline disabled:opacity-50"
                  :disabled="isSavingWall"
                  @click="saveWallEdit(wall)"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  class="hover:text-text-primary disabled:opacity-50"
                  :disabled="isSavingWall"
                  @click="editingWallId = null"
                >
                  Cancelar
                </button>
              </template>
              <template v-else>
                <span>Pared ({{ wall.x1 }},{{ wall.y1 }})→({{ wall.x2 }},{{ wall.y2 }})</span>
                <button
                  type="button"
                  class="font-semibold hover:text-text-primary disabled:opacity-50"
                  :disabled="isSavingWall"
                  @click="startEditWall(wall)"
                >
                  Mover
                </button>
                <button
                  type="button"
                  class="font-bold hover:text-text-primary disabled:opacity-50"
                  :disabled="isSavingWall"
                  :aria-label="`Quitar pared en ${zone.zona}`"
                  @click="removeWall(wall.id)"
                >
                  ×
                </button>
              </template>
            </li>
          </ul>
          <Draggable
            :list="zone.tables"
            item-key="id"
            group="floor-zones"
            handle=".table-zone-handle"
            ghost-class="opacity-50"
            chosen-class="shadow-lg"
            class="pos-floor-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-stretch"
            @start="onZoneDragStart"
            @end="onZoneDragEnd"
            @change="onZoneChange(zone.zona, $event)"
          >
            <template #item="{ element: table }">
              <div class="h-full">

          <!-- Card — uniform height across grid (shared PosTableCard) -->
          <PosTableCard
            :table="table"
            :disabled="openingTableId === table.id"
            drag-handle
            show-move
            :comandas-enabled="props.comandasEnabled"
            :waiter-attribution-enabled="props.waiterAttributionEnabled"
            @open="handleTableClick"
            @move="({ table: t, event }) => handleMoveTable(t, event)"
          />

              </div>
            </template>
          </Draggable>
        </section>
      </div>

      <div v-else-if="floorLayout === 'list'" key="tables-list" class="pos-floor-list">
      <UiResponsiveDataView
        :columns="tableListColumns"
        :data="filteredRegularTables"
        item-key="id"
        :empty-message="t('pos.floor.free')"
        row-size="sm"
        @row-click="handleTableClick"
      >
        <template #header-name>
          <UiTableHeaderFilter
            v-model="filterName"
            :title="t('pos.floor.colTable')"
            filter-type="select"
            :options="nameFilterOptions"
            :all-label="filterAllLabel"
          />
        </template>
        <template #header-alias>
          <UiTableHeaderFilter
            v-model="filterAlias"
            :title="t('pos.floor.colAlias')"
            filter-type="select"
            :options="aliasFilterOptions"
            :all-label="filterAllLabel"
          />
        </template>
        <template #header-code>
          <UiTableHeaderFilter
            v-model="filterCode"
            :title="t('pos.floor.colCode')"
            filter-type="select"
            :options="codeFilterOptions"
            :all-label="filterAllLabel"
          />
        </template>
        <template #header-capacity>
          <UiTableHeaderFilter
            v-model="filterCapacity"
            :title="t('pos.floor.colCapacity')"
            filter-type="select"
            :options="capacityFilterOptions"
            :all-label="filterAllLabel"
          />
        </template>
        <template #header-min>
          <UiTableHeaderFilter
            v-model="filterMin"
            :title="t('pos.floor.colMin')"
            filter-type="select"
            :options="minFilterOptions"
            :all-label="filterAllLabel"
          />
        </template>
        <template #header-status>
          <UiTableHeaderFilter
            v-model="filterStatus"
            :title="t('pos.floor.colStatus')"
            filter-type="select"
            :options="statusFilterOptions"
            :all-label="filterAllLabel"
            align="center"
          />
        </template>
        <template v-if="waiterAttributionEnabled" #header-waiter>
          <UiTableHeaderFilter
            v-model="filterWaiter"
            :title="t('pos.floor.colWaiter')"
            filter-type="select"
            :options="waiterFilterOptions"
            :all-label="filterAllLabel"
          />
        </template>
        <template #card="{ item }">
          <button
            type="button"
            class="flex w-full flex-col gap-2 border-b border-border px-3 py-3 text-left hover:bg-data-table-row-hover-bg disabled:opacity-60"
            :disabled="openingTableId === item.id"
            @click="handleTableClick(item)"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="min-w-0 truncate text-sm font-semibold text-text-primary">{{ tableListCatalogName(item) }}</p>
              <span :class="tableListStatusChipClass(item.status)">{{ badgeLabel(item.status) }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span v-if="tableListAlias(item)" class="text-xs text-text-secondary">{{ tableListAlias(item) }}</span>
              <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noAlias') }}</span>
              <span v-if="tableListCode(item)" class="text-xs text-text-secondary">{{ tableListCode(item) }}</span>
              <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noCode') }}</span>
              <span v-if="tableListCapacityLabel(item)" class="text-xs tabular-nums text-text-secondary">{{ tableListCapacityLabel(item) }}</span>
              <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noCapacity') }}</span>
              <span v-if="minimumConsumptionLabel(item)" class="text-xs text-text-secondary">{{ minimumConsumptionLabel(item) }}</span>
              <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noMin') }}</span>
              <span class="text-sm font-semibold tabular-nums">{{ tableListTotalLabel(item) }}</span>
              <span v-if="tableListTimeLabel(item)" class="text-xs tabular-nums text-text-secondary">{{ tableListTimeLabel(item) }}</span>
              <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noTime') }}</span>
              <span
                v-if="waiterAttributionEnabled"
                :class="tableListWaiterName(item) ? listFilledChipClass : listEmptyChipClass"
              >
                {{ tableListWaiterName(item) || t('pos.floor.unassigned') }}
              </span>
            </div>
          </button>
        </template>
        <template #cell-name="{ item }">
          <span class="truncate font-semibold">{{ tableListCatalogName(item) }}</span>
        </template>
        <template #cell-alias="{ item }">
          <span v-if="tableListAlias(item)" class="text-text-secondary">{{ tableListAlias(item) }}</span>
          <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noAlias') }}</span>
        </template>
        <template #cell-code="{ item }">
          <span v-if="tableListCode(item)" class="text-text-secondary">{{ tableListCode(item) }}</span>
          <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noCode') }}</span>
        </template>
        <template #cell-capacity="{ item }">
          <span v-if="tableListCapacityLabel(item)" class="tabular-nums text-text-secondary">{{ tableListCapacityLabel(item) }}</span>
          <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noCapacity') }}</span>
        </template>
        <template #cell-min="{ item }">
          <span v-if="minimumConsumptionLabel(item)" class="text-text-secondary">{{ minimumConsumptionLabel(item) }}</span>
          <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noMin') }}</span>
        </template>
        <template #cell-status="{ item }">
          <span :class="tableListStatusChipClass(item.status)">{{ badgeLabel(item.status) }}</span>
        </template>
        <template #cell-total="{ item }">
          <span class="tabular-nums font-semibold">{{ tableListTotalLabel(item) }}</span>
        </template>
        <template #cell-time="{ item }">
          <span v-if="tableListTimeLabel(item)" class="tabular-nums text-text-secondary">{{ tableListTimeLabel(item) }}</span>
          <span v-else :class="listEmptyChipClass">{{ t('pos.floor.noTime') }}</span>
        </template>
        <template #cell-waiter="{ item }">
          <span :class="tableListWaiterName(item) ? listFilledChipClass : listEmptyChipClass">
            {{ tableListWaiterName(item) || t('pos.floor.unassigned') }}
          </span>
        </template>
      </UiResponsiveDataView>
      </div>
      <div v-else-if="floorLayout === 'canvas'" key="tables-canvas" class="flex flex-col gap-3 pb-32">
        <div v-if="unplacedTables.length" class="rounded-xl border border-border/60 bg-surface p-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="text-xs font-bold uppercase tracking-wide text-text-tertiary">Sin ubicar ({{ unplacedTables.length }})</p>
            <button
              v-if="floorMode === 'order'"
              type="button"
              class="rounded-md border border-border px-2 py-1 text-xs font-bold text-text-secondary hover:text-text-primary"
              @click="placeAllOnCanvas"
            >
              Colocar todas
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <template v-if="floorMode === 'order'">
              <button
                v-for="table in unplacedTables"
                :key="table.id"
                type="button"
                class="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-text-primary hover:bg-surface-secondary"
                :title="`Colocar ${table.name} en el plano`"
                @click="placeOnCanvas(table)"
              >
                + {{ table.name }}
              </button>
            </template>
            <template v-else>
              <span
                v-for="table in unplacedTables"
                :key="table.id"
                class="rounded-lg border border-border/60 px-3 py-1.5 text-sm text-text-secondary"
              >
                {{ table.name }}
              </span>
            </template>
          </div>
        </div>
        <div
          v-if="floorMode === 'order' && (hasUnsavedCanvas || canvasError)"
          class="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-surface p-3"
          role="status"
        >
          <p v-if="hasUnsavedCanvas" class="text-xs font-semibold text-text-secondary">
            {{ stagedMoves.size }} cambio(s) sin guardar
          </p>
          <p v-if="canvasError" class="text-xs font-semibold text-state-danger-icon">{{ canvasError }}</p>
          <div class="ms-auto flex gap-2">
            <button
              type="button"
              class="text-xs font-semibold text-text-tertiary hover:text-text-primary disabled:opacity-50"
              :disabled="isSavingCanvas"
              @click="discardCanvas"
            >
              Descartar
            </button>
            <button
              type="button"
              class="rounded-md bg-shell-action-hover-bg px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              :disabled="isSavingCanvas || !hasUnsavedCanvas"
              @click="saveCanvas"
            >
              {{ isSavingCanvas ? 'Guardando…' : 'Guardar plano' }}
            </button>
          </div>
        </div>
        <div class="overflow-hidden rounded-xl border border-border/60" style="height: 60vh; min-height: 480px;">
          <div v-if="loadingTables" class="flex h-full items-center justify-center">
            <CommonsTheCustomLoader size="large" />
          </div>
          <VueFlow
            v-else
            v-model:nodes="canvasNodes"
            :edges="[]"
            :nodes-draggable="floorMode === 'order'"
            :min-zoom="0.3"
            :max-zoom="2.5"
            :zoom-on-scroll="false"
            :zoom-on-pinch="true"
            :pan-on-drag="true"
            fit-view-on-init
            @node-drag-start="onNodeDragStart"
            @node-drag-stop="onNodeDragStop"
            @node-click="onNodeCanvasClick"
          >
            <Background variant="lines" :gap="28" />
            <Controls position="bottom-right" />
            <template #node-mesa="nodeProps">
              <div class="min-w-56">
                <PosTableCard
                  v-if="tableById(nodeProps.data.tableId)"
                  :table="tableById(nodeProps.data.tableId)"
                  :comandas-enabled="props.comandasEnabled"
                  :waiter-attribution-enabled="props.waiterAttributionEnabled"
                  @open="handleTableClick"
                  @move="({ table: t, event }) => handleMoveTable(t, event)"
                />
              </div>
            </template>
          </VueFlow>
          <p v-if="!loadingTables && !canvasNodes.length" class="p-3 text-xs text-text-tertiary">
            Sin mesas en el plano — colócalas desde Sin ubicar.
          </p>
        </div>
      </div>
      </Transition>
      </div>
      </Transition>
    </div>

  </div>
</template>

<style scoped>
.table-card {
  min-height: 8.75rem;
}

/* status-bg tokens are too faint + Tailwind /opacity doesn't apply to var() colors */
.table-card-body--free {
  background-color: color-mix(in oklch, var(--status-info-text) 5%, hsl(var(--surface)));
}

.table-card-footer--free {
  background-color: color-mix(in oklch, var(--status-info-text) 10%, hsl(var(--surface)));
}

.table-card-body--open {
  background-color: color-mix(in oklch, var(--status-success-text) 5%, hsl(var(--surface)));
}

.table-card-footer--open {
  background-color: color-mix(in oklch, var(--status-success-text) 10%, hsl(var(--surface)));
}

.table-card-body--bill {
  background-color: color-mix(in oklch, var(--status-warning-text) 6%, hsl(var(--surface)));
}

.table-card-footer--bill {
  background-color: color-mix(in oklch, var(--status-warning-text) 12%, hsl(var(--surface)));
}

.list-meta-chip {
  border: 1px solid color-mix(in oklch, var(--border) 80%, transparent);
  background-color: color-mix(in oklch, hsl(var(--surface-secondary)) 70%, hsl(var(--surface)));
  color: hsl(var(--text-secondary));
}

.list-status-chip {
  border: 1px solid transparent;
}

.list-status-chip--free {
  background-color: color-mix(in oklch, var(--status-info-text) 5%, hsl(var(--surface)));
  border-color: color-mix(in oklch, var(--status-info-text) 10%, transparent);
  color: color-mix(in oklch, var(--status-info-text) 45%, hsl(var(--text-secondary)));
}

.list-status-chip--open {
  background-color: color-mix(in oklch, var(--status-success-text) 5%, hsl(var(--surface)));
  border-color: color-mix(in oklch, var(--status-success-text) 10%, transparent);
  color: color-mix(in oklch, var(--status-success-text) 45%, hsl(var(--text-secondary)));
}

.list-status-chip--bill {
  background-color: color-mix(in oklch, var(--status-warning-text) 6%, hsl(var(--surface)));
  border-color: color-mix(in oklch, var(--status-warning-text) 10%, transparent);
  color: color-mix(in oklch, var(--status-warning-text) 45%, hsl(var(--text-secondary)));
}

.pos-layout-icon-enter-active,
.pos-layout-icon-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.pos-layout-icon-enter-from {
  opacity: 0;
  transform: rotate(-42deg) scale(0.72);
}

.pos-layout-icon-leave-to {
  opacity: 0;
  transform: rotate(42deg) scale(0.72);
}

@media (prefers-reduced-motion: no-preference) {
  .pos-floor-view-enter-active,
  .pos-floor-view-leave-active {
    transition: opacity 0.14s ease;
  }

  .pos-floor-view-enter-from,
  .pos-floor-view-leave-to {
    opacity: 0;
  }

  .pos-floor-layout-enter-active,
  .pos-floor-layout-leave-active {
    transition: opacity 0.12s ease;
  }

  .pos-floor-layout-enter-from,
  .pos-floor-layout-leave-to {
    opacity: 0;
  }

  .pos-floor-list :deep(thead th),
  .pos-floor-list :deep(tbody td) {
    animation: pos-floor-col-in 0.2s ease-out both;
  }

  .pos-floor-list :deep(th:nth-child(1)),
  .pos-floor-list :deep(td:nth-child(1)) { animation-delay: 0ms; }
  .pos-floor-list :deep(th:nth-child(2)),
  .pos-floor-list :deep(td:nth-child(2)) { animation-delay: 12ms; }
  .pos-floor-list :deep(th:nth-child(3)),
  .pos-floor-list :deep(td:nth-child(3)) { animation-delay: 24ms; }
  .pos-floor-list :deep(th:nth-child(4)),
  .pos-floor-list :deep(td:nth-child(4)) { animation-delay: 36ms; }
  .pos-floor-list :deep(th:nth-child(5)),
  .pos-floor-list :deep(td:nth-child(5)) { animation-delay: 48ms; }
  .pos-floor-list :deep(th:nth-child(6)),
  .pos-floor-list :deep(td:nth-child(6)) { animation-delay: 60ms; }
  .pos-floor-list :deep(th:nth-child(7)),
  .pos-floor-list :deep(td:nth-child(7)) { animation-delay: 72ms; }
  .pos-floor-list :deep(th:nth-child(8)),
  .pos-floor-list :deep(td:nth-child(8)) { animation-delay: 84ms; }
  .pos-floor-list :deep(th:nth-child(9)),
  .pos-floor-list :deep(td:nth-child(9)) { animation-delay: 96ms; }
  .pos-floor-list :deep(th:nth-child(10)),
  .pos-floor-list :deep(td:nth-child(10)) { animation-delay: 108ms; }

  .pos-floor-grid > * {
    animation: pos-floor-col-in 0.18s ease-out both;
  }

  .pos-floor-grid > *:nth-child(1) { animation-delay: 0ms; }
  .pos-floor-grid > *:nth-child(2) { animation-delay: 10ms; }
  .pos-floor-grid > *:nth-child(3) { animation-delay: 20ms; }
  .pos-floor-grid > *:nth-child(4) { animation-delay: 30ms; }
  .pos-floor-grid > *:nth-child(5) { animation-delay: 40ms; }
  .pos-floor-grid > *:nth-child(6) { animation-delay: 50ms; }
  .pos-floor-grid > *:nth-child(7) { animation-delay: 60ms; }
  .pos-floor-grid > *:nth-child(8) { animation-delay: 70ms; }
  .pos-floor-grid > *:nth-child(n + 9) { animation-delay: 80ms; }

  @keyframes pos-floor-col-in {
    from {
      opacity: 0.88;
      transform: translateY(3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .pos-layout-icon-enter-active,
  .pos-layout-icon-leave-active,
  .pos-floor-view-enter-active,
  .pos-floor-view-leave-active,
  .pos-floor-layout-enter-active,
  .pos-floor-layout-leave-active {
    transition: none;
  }

  .pos-floor-list :deep(thead th),
  .pos-floor-list :deep(tbody td),
  .pos-floor-grid > * {
    animation: none;
  }
}
</style>
