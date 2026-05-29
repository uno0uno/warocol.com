<template>
  <div>
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="loadError" />

    <div v-else class="page-layout max-w-2xl">
      <div class="flex flex-col gap-4">
        <NuxtLink
          to="/operaciones/promociones"
          class="text-sm text-primary hover:underline inline-flex items-center min-h-[44px]"
        >
          ← Volver a promociones
        </NuxtLink>

        <h2 class="text-lg font-semibold text-text-primary">
          {{ isCreate ? 'Nueva promoción' : 'Editar promoción' }}
        </h2>

        <p
          v-if="previewText"
          class="text-sm text-text-secondary bg-surface-secondary border border-border rounded-lg px-3 py-2"
        >
          {{ previewText }}
        </p>

        <div
          v-if="validationErrors.length"
          role="alert"
          class="text-sm text-status-critical-text bg-status-critical-bg border border-border rounded-lg px-3 py-2 space-y-1"
        >
          <p v-for="(err, i) in validationErrors" :key="i">{{ err }}</p>
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Nombre</label>
            <input
              v-model="form.name"
              type="text"
              required
              maxlength="120"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Tipo</label>
            <select v-model="form.promo_type" class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface">
              <option value="percent_off">% descuento</option>
              <option value="fixed_off">Descuento fijo (COP)</option>
              <option value="bogo">2×1 / BOGO</option>
            </select>
          </div>

          <div v-if="form.promo_type === 'percent_off'">
            <label class="block text-sm font-medium text-text-primary mb-1">Porcentaje</label>
            <input
              v-model.number="form.percent"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface"
            />
          </div>

          <div v-else-if="form.promo_type === 'fixed_off'">
            <label class="block text-sm font-medium text-text-primary mb-1">Monto (COP)</label>
            <input
              v-model.number="form.amountCop"
              type="number"
              min="1"
              step="1"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface"
            />
          </div>

          <div v-else class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium text-text-primary mb-1">Compra (unidades)</label>
              <input
                v-model.number="form.buyQty"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface"
              />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-text-primary mb-1">Lleva gratis</label>
              <input
                v-model.number="form.getQty"
                type="number"
                min="1"
                class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-primary mb-1">Alcance</label>
            <select v-model="form.scope_type" class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface">
              <option value="all_products">Todos los productos</option>
              <option value="categories">Categorías</option>
              <option value="products">Productos</option>
            </select>
          </div>

          <div v-if="form.scope_type === 'categories'" class="space-y-2">
            <label class="block text-sm font-medium text-text-primary">Categorías</label>
            <UiCategorySearchInput
              placeholder="Buscar categoría…"
              @select="onCategorySelect"
            />
            <ul v-if="selectedCategories.length" class="flex flex-wrap gap-2">
              <li
                v-for="cat in selectedCategories"
                :key="cat.id"
                class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1"
              >
                {{ cat.name }}
                <button type="button" class="hover:opacity-70" @click="removeCategory(cat.id)">×</button>
              </li>
            </ul>
          </div>

          <div v-if="form.scope_type === 'products'" class="space-y-2">
            <label class="block text-sm font-medium text-text-primary">Productos</label>
            <input
              v-model="productSearch"
              type="search"
              placeholder="Buscar producto…"
              class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface"
            />
            <ul
              v-if="productResults.length && productSearch.trim()"
              class="border border-border rounded-lg max-h-40 overflow-y-auto"
            >
              <li
                v-for="p in productResults"
                :key="p.id"
                class="px-3 py-2 text-sm hover:bg-surface-secondary cursor-pointer"
                @click="addProduct(p)"
              >
                {{ p.name }}
              </li>
            </ul>
            <ul v-if="selectedProducts.length" class="flex flex-wrap gap-2">
              <li
                v-for="p in selectedProducts"
                :key="p.id"
                class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1"
              >
                {{ p.name }}
                <button type="button" class="hover:opacity-70" @click="removeProduct(p.id)">×</button>
              </li>
            </ul>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-text-primary">Horarios</label>
              <button
                type="button"
                class="text-sm text-primary font-medium min-h-[44px]"
                @click="addSchedule"
              >
                + Agregar horario
              </button>
            </div>
            <div
              v-for="(sched, idx) in form.schedules"
              :key="idx"
              class="border border-border rounded-lg p-3 space-y-2"
            >
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="day in dayOptions"
                  :key="day.bit"
                  class="text-xs flex items-center gap-1 min-h-[36px]"
                >
                  <input
                    type="checkbox"
                    :checked="!!(sched.days_of_week & day.bit)"
                    @change="toggleDay(sched, day.bit)"
                  />
                  {{ day.label }}
                </label>
              </div>
              <div class="flex gap-2 flex-wrap">
                <input
                  v-model="sched.start_time"
                  type="time"
                  class="px-2 py-2 border border-border rounded-lg text-sm bg-surface"
                />
                <span class="self-center text-text-secondary">a</span>
                <input
                  v-model="sched.end_time"
                  type="time"
                  class="px-2 py-2 border border-border rounded-lg text-sm bg-surface"
                />
              </div>
              <label class="text-xs flex items-center gap-1">
                <input v-model="sched.crosses_midnight" type="checkbox" />
                Cruza medianoche
              </label>
              <button
                v-if="form.schedules.length > 1"
                type="button"
                class="text-xs text-destructive"
                @click="form.schedules.splice(idx, 1)"
              >
                Quitar horario
              </button>
            </div>
          </div>

          <div class="flex gap-3 flex-wrap">
            <div class="flex-1 min-w-[140px]">
              <label class="block text-sm font-medium text-text-primary mb-1">Válida desde (opcional)</label>
              <input v-model="form.startsAtDate" type="date" class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface" />
            </div>
            <div class="flex-1 min-w-[140px]">
              <label class="block text-sm font-medium text-text-primary mb-1">Válida hasta (opcional)</label>
              <input v-model="form.endsAtDate" type="date" class="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface" />
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm min-h-[44px]">
            <input v-model="form.is_active" type="checkbox" class="rounded border-border" />
            Promoción activa
          </label>

          <div class="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              class="btn-primary px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]"
              :disabled="isSaving"
            >
              {{ isSaving ? 'Guardando…' : isCreate ? 'Crear' : 'Guardar' }}
            </button>
            <button
              v-if="!isCreate"
              type="button"
              class="px-4 py-2 rounded-lg text-sm font-medium border border-destructive text-destructive min-h-[44px]"
              :disabled="isSaving"
              @click="onDelete"
            >
              Eliminar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { useQueryCache } from '@pinia/colada'
import type { CategoryRow } from '~/composables/useCategorySearch'
import {
  buildPromotionPreview,
  findOverlappingScheduleIndices,
  type PromotionScheduleRow,
} from '~/utils/promotionPreview'
import { bogotaDateAtNoon, combineBogotaDateAndTimeISO } from '~/utils/bogotaDate'

definePageMeta({ layout: 'dashboard', module: 'mi_negocio' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const cache = useQueryCache()
const { currentTenant } = useTenantReactive()

const promotionId = computed(() => String(route.params.id))
const isCreate = computed(() => promotionId.value === 'nuevo')

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
  startsAtDate: '',
  endsAtDate: '',
})

const selectedCategories = ref<CategoryRow[]>([])
const selectedProducts = ref<{ id: string; name: string }[]>([])
const productSearch = ref('')
const productResults = ref<{ id: string; name: string }[]>([])
const validationErrors = ref<string[]>([])
const isSaving = ref(false)
const loadError = ref(false)

const { data: categoriesData } = useQuery({
  key: () => ['tenant', 'menu-categories', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: CategoryRow[] }>('/api/menu/categories', { query: { limit: 250 } }),
  enabled: () => !!currentTenant.value && !isCreate.value,
  staleTime: 60_000,
})

const { data: promotionData, asyncStatus: loadStatus, error: promoFetchError } = useQuery({
  key: () => ['tenant', 'promotion', promotionId.value],
  query: () =>
    $fetch<{ success: boolean; data: any }>(`/api/api/promotions/${promotionId.value}`, {
      query: { at: new Date().toISOString() },
    }),
  enabled: () => !!currentTenant.value && !isCreate.value,
})

watch(promoFetchError, (e) => {
  if (e) loadError.value = true
})

watch(promotionData, (payload) => {
  const p = payload?.data
  if (!p) return
  form.name = p.name
  form.promo_type = p.promo_type
  form.scope_type = p.scope_type
  form.is_active = p.is_active
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
  const cats = categoriesData.value?.data ?? []
  selectedCategories.value = (p.category_ids ?? [])
    .map((id: string) => cats.find((c) => c.id === id))
    .filter(Boolean) as CategoryRow[]
  selectedProducts.value = (p.product_ids ?? []).map((id: string) => ({
    id,
    name: `Producto ${id.slice(0, 8)}…`,
  }))
  if (p.product_ids?.length) hydrateProductNames(p.product_ids)
})

const isLoading = computed(
  () => !isCreate.value && loadStatus.value === 'loading' && !promotionData.value,
)

const previewText = computed(() =>
  buildPromotionPreview({
    isActive: form.is_active,
    schedules: form.schedules.map(normalizeScheduleForPreview),
    scopeType: form.scope_type,
    categoryNames: selectedCategories.value.map((c) => c.name),
    productNames: selectedProducts.value.map((p) => p.name),
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

function addProduct(p: { id: string; name: string }) {
  if (!selectedProducts.value.some((x) => x.id === p.id)) {
    selectedProducts.value.push(p)
  }
  productSearch.value = ''
  productResults.value = []
}

function removeProduct(id: string) {
  selectedProducts.value = selectedProducts.value.filter((p) => p.id !== id)
}

const searchProducts = useDebounceFn(async (q: string) => {
  if (!q.trim()) {
    productResults.value = []
    return
  }
  try {
    const res = await $fetch<{ success: boolean; data: any[]; total?: number }>(
      '/api/menu/products',
      { query: { search: q.trim(), limit: 20, page: 1 } },
    )
    const items = Array.isArray(res.data) ? res.data : []
    productResults.value = (items as any[]).map((p) => ({ id: p.id, name: p.name }))
  } catch {
    productResults.value = []
  }
}, 300)

watch(productSearch, (q) => searchProducts(q))

async function hydrateProductNames(ids: string[]) {
  try {
    const res = await $fetch<{ success: boolean; data: any }>('/api/menu/products', {
      query: { limit: 100, page: 1 },
    })
    const items = Array.isArray(res.data) ? res.data : []
    selectedProducts.value = ids.map((id) => {
      const found = (items as any[]).find((p) => p.id === id)
      return { id, name: found?.name ?? `Producto ${id.slice(0, 8)}…` }
    })
  } catch {
    /* keep placeholders */
  }
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
    starts_at = combineBogotaDateAndTimeISO(form.startsAtDate, '00:00') ?? bogotaDateAtNoon(form.startsAtDate).toISOString()
  }
  if (form.endsAtDate) {
    ends_at = combineBogotaDateAndTimeISO(form.endsAtDate, '23:59') ?? null
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
    priority: 0,
    stackable: false,
  }
}

function validate(): boolean {
  const errors: string[] = []
  if (!form.name.trim()) errors.push('El nombre es obligatorio.')
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
  const overlap = findOverlappingScheduleIndices(
    form.schedules.map(normalizeScheduleForPreview),
  )
  if (overlap) errors.push(overlap)
  validationErrors.value = errors
  return errors.length === 0
}

async function onSubmit() {
  if (!validate()) return
  isSaving.value = true
  try {
    const body = buildPayload()
    if (isCreate.value) {
      const res = await $fetch<{ success: boolean; data: { id: string } }>('/api/api/promotions', {
        method: 'POST',
        body,
      })
      toast.add({ title: 'Promoción creada', color: 'success' })
      cache.invalidateQueries({ key: ['tenant', 'promotions'] })
      await router.replace(`/operaciones/promociones/${res.data.id}`)
    } else {
      await $fetch(`/api/api/promotions/${promotionId.value}`, { method: 'PATCH', body })
      toast.add({ title: 'Promoción actualizada', color: 'success' })
      cache.invalidateQueries({ key: ['tenant', 'promotions'] })
      cache.invalidateQueries({ key: ['tenant', 'promotion', promotionId.value] })
    }
  } catch (e: any) {
    const detail = e?.data?.detail ?? e?.message ?? 'Error al guardar'
    validationErrors.value = [typeof detail === 'string' ? detail : JSON.stringify(detail)]
  } finally {
    isSaving.value = false
  }
}

async function onDelete() {
  if (!confirm('¿Eliminar esta promoción?')) return
  isSaving.value = true
  try {
    await $fetch(`/api/api/promotions/${promotionId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Promoción eliminada', color: 'success' })
    cache.invalidateQueries({ key: ['tenant', 'promotions'] })
    await router.push('/operaciones/promociones')
  } catch (e: any) {
    toast.add({ title: e?.data?.detail ?? 'No se pudo eliminar', color: 'error' })
  } finally {
    isSaving.value = false
  }
}

useHead(() => ({
  title: isCreate.value ? 'Nueva promoción' : 'Editar promoción',
}))
</script>
