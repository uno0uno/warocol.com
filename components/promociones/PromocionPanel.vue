<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-40 bg-black/40" @click="close" aria-hidden="true" />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        :aria-label="isEdit ? `Editar promoción: ${form.name}` : 'Crear promoción'"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-lg md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ isEdit ? 'Editar promoción' : 'Nueva promoción' }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ isEdit ? form.name || 'Descuento o regla para el menú' : 'Descuentos con horario y alcance en el menú' }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Cerrar panel"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="loadingPromotion" class="flex-1 flex items-center justify-center">
          <CommonsTheCustomLoader size="medium" />
        </div>

        <div v-else-if="loadError" class="flex-1 flex items-center justify-center px-6">
          <CommonsTheErrorState />
        </div>

        <template v-else>
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <p
              v-if="previewText"
              class="text-sm text-text-secondary bg-surface-secondary border border-border rounded-xl px-3 py-2 leading-relaxed"
            >
              {{ previewText }}
            </p>

            <div
              v-if="validationErrors.length"
              role="alert"
              class="text-sm text-status-critical-text bg-status-critical-bg border border-border rounded-xl px-3 py-2 space-y-1"
            >
              <p v-for="(err, i) in validationErrors" :key="i">{{ err }}</p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="promo-name" class="text-sm font-medium text-text-primary">
                Nombre <span class="text-destructive">*</span>
              </label>
              <input
                id="promo-name"
                v-model="form.name"
                type="text"
                maxlength="120"
                placeholder="Ej: Happy hour 20%"
                :class="inputClass"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-text-primary">Tipo</label>
              <div class="grid grid-cols-3 gap-2" role="group" aria-label="Tipo de promoción">
                <button
                  v-for="opt in promoTypeOptions"
                  :key="opt.value"
                  type="button"
                  :class="typeButtonClass(form.promo_type === opt.value)"
                  @click="form.promo_type = opt.value"
                >
                  <component :is="opt.icon" class="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span class="text-xs font-bold leading-tight">{{ opt.label }}</span>
                  <span :class="['text-[10px] leading-snug', form.promo_type === opt.value ? 'text-primary/80' : 'text-text-tertiary']">
                    {{ opt.hint }}
                  </span>
                </button>
              </div>
            </div>

            <div v-if="form.promo_type === 'percent_off'" class="flex flex-col gap-1.5">
              <label for="promo-percent" class="text-sm font-medium text-text-primary">Porcentaje</label>
              <UiDecimalInput
                id="promo-percent"
                v-model="form.percent"
                :min="0.01"
                :max="100"
                :precision="2"
                :class="inputClass"
              />
            </div>

            <div v-else-if="form.promo_type === 'fixed_off'" class="flex flex-col gap-1.5">
              <label for="promo-amount" class="text-sm font-medium text-text-primary">Monto (COP)</label>
              <UiDecimalInput
                id="promo-amount"
                v-model="form.amountCop"
                :min="1"
                :precision="2"
                :class="inputClass"
              />
            </div>

            <div v-else class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label for="promo-buy" class="text-sm font-medium text-text-primary">Compra (unidades)</label>
                <input id="promo-buy" v-model.number="form.buyQty" type="number" min="1" :class="inputClass" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label for="promo-get" class="text-sm font-medium text-text-primary">Lleva gratis</label>
                <input id="promo-get" v-model.number="form.getQty" type="number" min="1" :class="inputClass" />
              </div>
              <p class="col-span-2 text-xs text-text-tertiary">
                Ej. 3×2: Compra 2, Lleva gratis 1 (mín. 3 en carrito). Para 6×5: Compra 5, Lleva gratis 1.
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="promo-scope" class="text-sm font-medium text-text-primary">Alcance</label>
              <select id="promo-scope" v-model="form.scope_type" :class="inputClass">
                <option value="all_products">Todos los productos</option>
                <option value="categories">Categorías</option>
                <option value="products">Productos</option>
              </select>
            </div>

            <div v-if="form.scope_type === 'categories'" class="space-y-2">
              <label class="text-sm font-medium text-text-primary">Categorías</label>
              <UiCategorySearchInput placeholder="Buscar categoría…" @select="onCategorySelect" />
              <ul v-if="selectedCategories.length" class="flex flex-wrap gap-2">
                <li
                  v-for="cat in selectedCategories"
                  :key="cat.id"
                  class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1"
                >
                  {{ cat.name }}
                  <button type="button" class="hover:opacity-70 min-h-[24px] min-w-[24px]" :aria-label="`Quitar ${cat.name}`" @click="removeCategory(cat.id)">×</button>
                </li>
              </ul>
            </div>

            <div v-if="form.scope_type === 'products'" class="space-y-2">
              <label for="promo-product-search" class="text-sm font-medium text-text-primary">Productos</label>
              <UiProductSearchInput
                input-id="promo-product-search"
                placeholder="Buscar producto…"
                include-all-types
                :exclude-ids="selectedProducts.map((p) => p.id)"
                @select="onProductSelect"
              />
              <ul v-if="showProductChips" class="flex flex-wrap gap-2">
                <li
                  v-for="p in selectedProducts"
                  :key="p.id"
                  class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1"
                >
                  {{ p.name }}
                  <button type="button" class="hover:opacity-70 min-h-[24px] min-w-[24px]" :aria-label="`Quitar ${p.name}`" @click="removeProduct(p.id)">×</button>
                </li>
              </ul>
              <div v-else-if="showProductBulkSummary" class="flex flex-wrap items-center gap-2">
                <p class="text-sm text-text-secondary">{{ productScopeSummary }}</p>
                <button
                  type="button"
                  class="text-sm text-primary font-medium min-h-[44px] px-1"
                  @click="scopePickerOpen = true"
                >
                  Ver / editar lista
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-text-primary">Horarios</label>
                <button type="button" class="text-sm text-primary font-medium min-h-[44px] px-1" @click="addSchedule">
                  + Agregar horario
                </button>
              </div>
              <div
                v-for="(sched, idx) in form.schedules"
                :key="idx"
                class="border border-border rounded-xl p-3 space-y-2 bg-surface-secondary/20"
              >
                <div class="flex flex-wrap gap-2" role="group" aria-label="Días de la semana">
                  <label
                    v-for="day in dayOptions"
                    :key="day.bit"
                    :class="filterChipClass(!!(sched.days_of_week & day.bit))"
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      :checked="!!(sched.days_of_week & day.bit)"
                      :aria-label="day.label"
                      @change="toggleDay(sched, day.bit)"
                    />
                    <span class="font-semibold">{{ day.label }}</span>
                  </label>
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                  <input v-model="sched.start_time" type="time" :class="inputClass + ' w-auto flex-1 min-w-[120px]'" />
                  <span class="text-text-secondary text-sm">a</span>
                  <input v-model="sched.end_time" type="time" :class="inputClass + ' w-auto flex-1 min-w-[120px]'" />
                </div>
                <label class="flex items-center gap-2 min-h-[44px] cursor-pointer w-fit">
                  <UiBulkSelectCheckbox
                    :checked="sched.crosses_midnight"
                    @change="sched.crosses_midnight = !sched.crosses_midnight"
                  />
                  <span class="text-sm font-medium text-text-primary">Cruza medianoche</span>
                </label>
                <button
                  v-if="form.schedules.length > 1"
                  type="button"
                  class="text-xs text-destructive min-h-[36px]"
                  @click="form.schedules.splice(idx, 1)"
                >
                  Quitar horario
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <label for="promo-starts" class="text-sm font-medium text-text-primary">Válida desde (opcional)</label>
                <input id="promo-starts" v-model="form.startsAtDate" type="date" :class="inputClass" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label for="promo-ends" class="text-sm font-medium text-text-primary">Válida hasta (opcional)</label>
                <input id="promo-ends" v-model="form.endsAtDate" type="date" :class="inputClass" />
              </div>
            </div>

            <div class="rounded-xl border border-border px-4 py-3 bg-surface-secondary/30">
              <div class="flex flex-col gap-1.5">
                <label for="promo-priority" class="text-sm font-medium text-text-primary">Prioridad</label>
                <input
                  id="promo-priority"
                  v-model.number="form.priority"
                  type="number"
                  min="0"
                  max="32767"
                  step="1"
                  :class="inputClass"
                />
                <p class="text-xs text-text-tertiary leading-snug">
                  Si varias promociones aplican a la misma línea en checkout, gana la de mayor prioridad (0 = normal).
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between rounded-xl border border-border px-4 py-3 bg-surface-secondary/30">
              <div class="flex flex-col gap-0.5">
                <span class="text-sm font-medium text-text-primary">Promoción activa</span>
                <span class="text-xs text-text-tertiary">Desactivada no se aplica en el menú</span>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="form.is_active"
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  form.is_active ? 'bg-primary' : 'bg-border',
                ]"
                @click="form.is_active = !form.is_active"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
                    form.is_active ? 'translate-x-5' : 'translate-x-0',
                  ]"
                />
              </button>
            </div>
          </div>

          <div class="flex-shrink-0 bg-surface-secondary/40 border-t border-border px-6 py-4 flex flex-col gap-2">
            <div class="flex gap-3">
              <button
                type="button"
                class="h-11 px-5 rounded-lg border border-border bg-surface text-sm font-medium text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                @click="close"
              >
                Cancelar
              </button>
              <button
                type="button"
                :disabled="isSaving"
                class="flex-1 h-11 rounded-lg bg-primary text-sm font-semibold text-white transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shadow-primary/30"
                @click="onSubmit"
              >
                <span v-if="isSaving">Guardando…</span>
                <span v-else>{{ isEdit ? 'Guardar cambios' : 'Crear promoción' }}</span>
              </button>
            </div>
            <button
              v-if="isEdit"
              type="button"
              :disabled="isSaving"
              class="h-10 w-full rounded-lg border border-destructive/40 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/20 disabled:opacity-50"
              @click="onDelete"
            >
              Eliminar promoción
            </button>
          </div>
        </template>
      </div>
    </Transition>

    <PromocionesPromotionScopePickerModal
      v-model="scopePickerOpen"
      :products="selectedProducts"
      @remove="removeProduct"
      @clear-all="clearAllProducts"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'
import type { FunctionalComponent } from 'vue'
import {
  BanknotesIcon,
  GiftIcon,
  ReceiptPercentIcon,
} from '@heroicons/vue/24/outline'
import type { CategoryRow } from '~/composables/useCategorySearch'
import type { ProductRow } from '~/composables/useProductSearch'
import {
  buildPromotionPreview,
  findOverlappingScheduleIndices,
  formatScopeLabel,
  type PromotionScheduleRow,
} from '~/utils/promotionPreview'

/** Above this count, panel shows summary + modal instead of chips. */
const PRODUCT_CHIP_THRESHOLD = 15

interface OverlapWarning {
  promotion_id: string
  promotion_name: string
  priority: number
  shared_product_count: number
  risk: 'high' | 'medium'
}

interface PromotionSaveResponse {
  success: boolean
  data?: unknown
  overlap_warnings?: OverlapWarning[]
  requires_acknowledgment?: boolean
}

interface Props {
  modelValue: boolean
  promotionId?: string | null
}

interface Emits {
  (e: 'update:modelValue', v: boolean): void
  (e: 'saved'): void
  (e: 'deleted'): void
}

const props = withDefaults(defineProps<Props>(), {
  promotionId: null,
})
const emit = defineEmits<Emits>()

const toast = useToast()
const cache = useQueryCache()
const { currentTenant } = useTenantReactive()
const { combineDateAndTimeISO, dateAtNoon } = useTenantTimezone()

const isEdit = computed(() => !!props.promotionId)
const inputClass = 'h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

const promoTypeOptions: {
  value: 'percent_off' | 'fixed_off' | 'bogo'
  label: string
  hint: string
  icon: FunctionalComponent
}[] = [
  { value: 'percent_off', label: '% desc.', hint: 'Porcentaje', icon: ReceiptPercentIcon },
  { value: 'fixed_off', label: 'Fijo', hint: 'Monto COP', icon: BanknotesIcon },
  { value: 'bogo', label: '2×1', hint: 'Compra y lleva', icon: GiftIcon },
]

function typeButtonClass(active: boolean) {
  return [
    'flex flex-col items-start gap-1.5 py-3 px-3 rounded-xl border-2 transition-all focus:outline-none text-left min-h-[44px]',
    active
      ? 'border-primary bg-primary/8 text-primary shadow-md shadow-primary/10'
      : 'border-border bg-background text-text-tertiary hover:border-primary/30 hover:text-text-secondary hover:bg-surface-secondary/60',
  ].join(' ')
}

interface ScheduleFormRow {
  days_of_week: number
  start_time: string
  end_time: string
  crosses_midnight: boolean
}

const dayOptions = [
  { bit: 1, label: 'Lun' },
  { bit: 2, label: 'Mar' },
  { bit: 4, label: 'Mié' },
  { bit: 8, label: 'Jue' },
  { bit: 16, label: 'Vie' },
  { bit: 32, label: 'Sáb' },
  { bit: 64, label: 'Dom' },
] as const

const defaultSchedule = (): ScheduleFormRow => ({
  days_of_week: 62,
  start_time: '17:00',
  end_time: '20:00',
  crosses_midnight: false,
})

const form = reactive({
  name: '',
  promo_type: 'percent_off' as 'percent_off' | 'fixed_off' | 'bogo',
  percent: 10,
  amountCop: 5000,
  buyQty: 2,
  getQty: 1,
  scope_type: 'all_products' as 'all_products' | 'categories' | 'products',
  schedules: [defaultSchedule()] as ScheduleFormRow[],
  is_active: true,
  priority: 0,
  startsAtDate: '',
  endsAtDate: '',
})

const selectedCategories = ref<CategoryRow[]>([])
const selectedProducts = ref<{ id: string; name: string }[]>([])
const scopePickerOpen = ref(false)
const validationErrors = ref<string[]>([])
const isSaving = ref(false)
const loadError = ref(false)
const loadingPromotion = ref(false)

function resetForm() {
  form.name = ''
  form.promo_type = 'percent_off'
  form.percent = 10
  form.amountCop = 5000
  form.buyQty = 2
  form.getQty = 1
  form.scope_type = 'all_products'
  form.schedules = [defaultSchedule()]
  form.is_active = true
  form.priority = 0
  form.startsAtDate = ''
  form.endsAtDate = ''
  selectedCategories.value = []
  selectedProducts.value = []
  scopePickerOpen.value = false
  validationErrors.value = []
  loadError.value = false
}

async function loadPromotion(id: string) {
  loadingPromotion.value = true
  loadError.value = false
  try {
    const [promoRes, catsRes] = await Promise.all([
      $fetch<{ success: boolean; data: any }>(`/api/api/promotions/${id}`, {
        query: { at: new Date().toISOString() },
      }),
      $fetch<{ success: boolean; data: CategoryRow[] }>('/api/menu/categories', { query: { limit: 250 } }),
    ])
    const p = promoRes.data
    if (!p) {
      loadError.value = true
      return
    }
    form.name = p.name
    form.promo_type = p.promo_type
    form.scope_type = p.scope_type
    form.is_active = p.is_active
    form.priority = Number(p.priority ?? 0)
    if (p.promo_type === 'percent_off') form.percent = Number(p.value_json?.percent ?? 10)
    if (p.promo_type === 'fixed_off') form.amountCop = Number(p.value_json?.amount_cop ?? 0)
    if (p.promo_type === 'bogo') {
      form.buyQty = Number(p.value_json?.buy_qty ?? 2)
      form.getQty = Number(p.value_json?.get_qty ?? 1)
    }
    form.schedules =
      (p.schedules?.length ? p.schedules : [defaultSchedule()]).map((s: PromotionScheduleRow) => ({
        days_of_week: s.days_of_week,
        start_time: (s.start_time || '09:00').slice(0, 5),
        end_time: (s.end_time || '18:00').slice(0, 5),
        crosses_midnight: !!s.crosses_midnight,
      }))
    form.startsAtDate = p.starts_at ? p.starts_at.slice(0, 10) : ''
    form.endsAtDate = p.ends_at ? p.ends_at.slice(0, 10) : ''
    const cats = catsRes.data ?? []
    selectedCategories.value = (p.category_ids ?? [])
      .map((cid: string) => cats.find((c) => c.id === cid))
      .filter(Boolean) as CategoryRow[]
    selectedProducts.value = (p.product_ids ?? []).map((pid: string) => ({
      id: pid,
      name: `Producto ${pid.slice(0, 8)}…`,
    }))
    if (p.product_ids?.length) await hydrateProductNames(p.product_ids)
  } catch {
    loadError.value = true
  } finally {
    loadingPromotion.value = false
  }
}

watch(
  () => [props.modelValue, props.promotionId] as const,
  async ([open, id]) => {
    if (!open) return
    validationErrors.value = []
    if (id) {
      await loadPromotion(id)
    } else {
      resetForm()
    }
  },
)

const showProductChips = computed(
  () => selectedProducts.value.length > 0 && selectedProducts.value.length <= PRODUCT_CHIP_THRESHOLD,
)
const showProductBulkSummary = computed(() => selectedProducts.value.length > PRODUCT_CHIP_THRESHOLD)
const productScopeSummary = computed(() =>
  formatScopeLabel(
    'products',
    [],
    selectedProducts.value.map((p) => p.name),
    { productCount: selectedProducts.value.length, countOnlyThreshold: PRODUCT_CHIP_THRESHOLD },
  ),
)

const previewText = computed(() =>
  buildPromotionPreview({
    isActive: form.is_active,
    schedules: form.schedules.map(normalizeScheduleForPreview),
    scopeType: form.scope_type,
    categoryNames: selectedCategories.value.map((c) => c.name),
    productNames: selectedProducts.value.map((p) => p.name),
    categoryIds: selectedCategories.value.map((c) => c.id),
    productIds: selectedProducts.value.map((p) => p.id),
  }),
)

function normalizeScheduleForPreview(s: ScheduleFormRow): PromotionScheduleRow {
  return {
    days_of_week: s.days_of_week,
    start_time: s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time,
    end_time: s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time,
    crosses_midnight: s.crosses_midnight,
  }
}

function toggleDay(sched: ScheduleFormRow, bit: number) {
  sched.days_of_week ^= bit
}

function addSchedule() {
  form.schedules.push(defaultSchedule())
}

function onCategorySelect(cat: CategoryRow) {
  if (!selectedCategories.value.some((c) => c.id === cat.id)) {
    selectedCategories.value.push(cat)
  }
}

function removeCategory(id: string) {
  selectedCategories.value = selectedCategories.value.filter((c) => c.id !== id)
}

function onProductSelect(p: ProductRow) {
  if (!selectedProducts.value.some((x) => x.id === p.id)) {
    selectedProducts.value.push(p)
  }
}

function removeProduct(id: string) {
  selectedProducts.value = selectedProducts.value.filter((p) => p.id !== id)
}

function clearAllProducts() {
  selectedProducts.value = []
  scopePickerOpen.value = false
}

async function hydrateProductNames(ids: string[]) {
  if (!ids.length) {
    selectedProducts.value = []
    return
  }
  selectedProducts.value = await Promise.all(
    ids.map(async (id) => {
      try {
        const p = await $fetch<{ data?: { name?: string } }>(`/api/menu/products/${id}`)
        return { id, name: p?.data?.name ?? `Producto ${id.slice(0, 8)}…` }
      } catch {
        return { id, name: `Producto ${id.slice(0, 8)}…` }
      }
    }),
  )
}

function buildPayload() {
  const value_json: Record<string, unknown> = {}
  if (form.promo_type === 'percent_off') value_json.percent = form.percent
  else if (form.promo_type === 'fixed_off') value_json.amount_cop = form.amountCop
  else {
    value_json.buy_qty = form.buyQty
    value_json.get_qty = form.getQty
  }

  const schedules = form.schedules.map((s) => ({
    days_of_week: s.days_of_week,
    start_time: s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time,
    end_time: s.end_time.length === 5 ? `${s.end_time}:00` : s.end_time,
    crosses_midnight: s.crosses_midnight,
    sort_order: 0,
  }))

  let starts_at: string | null = null
  let ends_at: string | null = null
  if (form.startsAtDate) {
    starts_at = combineDateAndTimeISO(form.startsAtDate, '00:00') ?? dateAtNoon(form.startsAtDate).toISOString()
  }
  if (form.endsAtDate) {
    ends_at = combineDateAndTimeISO(form.endsAtDate, '23:59') ?? null
  }

  return {
    name: form.name.trim(),
    promo_type: form.promo_type,
    value_json,
    scope_type: form.scope_type,
    category_ids: form.scope_type === 'categories' ? selectedCategories.value.map((c) => c.id) : [],
    product_ids: form.scope_type === 'products' ? selectedProducts.value.map((p) => p.id) : [],
    schedules,
    is_active: form.is_active,
    starts_at,
    ends_at,
    priority: Math.min(32767, Math.max(0, Math.round(Number(form.priority) || 0))),
    stackable: false,
    overlap_acknowledged: true,
  }
}

function overlapToastDescription(warnings: OverlapWarning[]): string {
  const names = warnings.map((w) => w.promotion_name).filter(Boolean).slice(0, 2)
  if (names.length === 0) {
    return 'Comparte productos con otras promos activas. En checkout gana la de mayor prioridad.'
  }
  const suffix = warnings.length > 2 ? ' y otras' : ''
  return `Comparte productos con: ${names.join(', ')}${suffix}. En checkout gana la de mayor prioridad.`
}

function validate(): boolean {
  const errors: string[] = []
  if (!form.name.trim()) errors.push('El nombre es obligatorio.')
  const priority = Number(form.priority)
  if (!Number.isFinite(priority) || priority < 0 || priority > 32767 || !Number.isInteger(priority)) {
    errors.push('La prioridad debe ser un entero entre 0 y 32767.')
  }
  if (form.scope_type === 'categories' && !selectedCategories.value.length) {
    errors.push('Selecciona al menos una categoría.')
  }
  if (form.scope_type === 'products' && !selectedProducts.value.length) {
    errors.push('Selecciona al menos un producto.')
  }
  for (const s of form.schedules) {
    if (!s.days_of_week) errors.push('Cada horario debe incluir al menos un día.')
    if (!s.crosses_midnight && s.end_time <= s.start_time) {
      errors.push('La hora de fin debe ser posterior al inicio (o marca cruza medianoche).')
    }
  }
  const overlap = findOverlappingScheduleIndices(form.schedules.map(normalizeScheduleForPreview))
  if (overlap) errors.push(overlap)
  validationErrors.value = errors
  return errors.length === 0
}

async function invalidatePromotionCaches() {
  const tenantId = currentTenant.value?.id
  if (tenantId) {
    await cache.invalidateQueries({ key: ['tenant', 'promotions', tenantId] })
    await cache.invalidateQueries({ key: ['pos', 'active-promotions', tenantId] })
  } else {
    await cache.invalidateQueries({ key: ['tenant', 'promotions'] })
  }
  if (props.promotionId) {
    await cache.invalidateQueries({ key: ['tenant', 'promotion', props.promotionId] })
  }
}

function extractFetchDetail(e: any): string {
  const detail = e?.data?.detail ?? e?.response?._data?.detail ?? e?.message
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg ?? JSON.stringify(item)).join('; ')
  }
  return 'Error al guardar'
}

async function onSubmit() {
  if (!validate()) return
  isSaving.value = true
  validationErrors.value = []
  try {
    const body = buildPayload()
    let res: PromotionSaveResponse
    if (!isEdit.value) {
      res = await $fetch<PromotionSaveResponse>('/api/api/promotions', { method: 'POST', body })
    } else {
      res = await $fetch<PromotionSaveResponse>(`/api/api/promotions/${props.promotionId}`, { method: 'PATCH', body })
    }

    if (res.requires_acknowledgment && !res.data) {
      validationErrors.value = [
        'No se pudo guardar la promoción. Sube la prioridad por encima de 0 o revisa el formulario.',
      ]
      return
    }

    const warnings = res.overlap_warnings ?? []
    toast.success(isEdit.value ? 'Promoción actualizada' : 'Promoción creada')
    if (warnings.length > 0) {
      toast.warning(overlapToastDescription(warnings), { title: 'Superposición detectada' })
    }
    close()
    emit('saved')
  } catch (e: any) {
    const detail = extractFetchDetail(e)
    validationErrors.value = [detail]
    toast.error(detail, { title: 'No se pudo guardar' })
  } finally {
    isSaving.value = false
  }
}

async function onDelete() {
  if (!props.promotionId || !confirm('¿Eliminar esta promoción?')) return
  isSaving.value = true
  try {
    await $fetch(`/api/api/promotions/${props.promotionId}`, { method: 'DELETE' })
    toast.success('Promoción eliminada')
    await invalidatePromotionCaches()
    close()
    emit('deleted')
  } catch (e: any) {
    toast.error(e?.data?.detail ?? 'No se pudo eliminar', { title: 'Error' })
  } finally {
    isSaving.value = false
  }
}

function close() {
  scopePickerOpen.value = false
  emit('update:modelValue', false)
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
