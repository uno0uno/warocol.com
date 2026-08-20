<template>
  <div>
    <template v-if="layout === 'search'">
      <p
        v-if="canScrollMore"
        class="text-sm text-text-secondary mb-2"
      >
        {{ t('pos.checkout.subMethodScrollHint', { total: flattenedMethods.length }) }}
      </p>
      <div class="relative mb-2">
        <svg class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="methodSearch"
          type="search"
          :placeholder="t('pos.checkout.searchAllMethods')"
          class="w-full min-h-[44px] ps-9 pe-3 rounded-xl border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div class="relative rounded-xl border border-border bg-background overflow-hidden">
        <div
          ref="methodListEl"
          class="max-h-[11.5rem] overflow-y-auto overscroll-contain divide-y divide-border"
          @scroll="updateMethodListOverflow"
        >
          <button
            v-for="row in filteredFlatMethods"
            :key="row.key"
            type="button"
            :disabled="disabled"
            class="w-full flex items-center justify-between gap-3 min-h-[44px] px-4 py-2.5 text-start transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="isFlatRowSelected(row)
              ? (row.triggersCartera
                  ? 'bg-state-warning-bg text-state-warning-text'
                  : 'bg-crocus-50 text-primary')
              : 'text-text-primary hover:bg-surface-secondary/50'"
            @click="onFlatRowSelect(row)"
          >
            <span class="min-w-0 text-sm font-medium truncate">{{ row.name }}</span>
            <svg
              v-if="isFlatRowSelected(row)"
              class="w-4 h-4 flex-shrink-0"
              :class="row.triggersCartera ? 'text-state-warning-icon' : 'text-primary'"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <div v-if="filteredFlatMethods.length === 0" class="px-4 py-3 text-sm text-text-secondary text-center">
            {{ t('pos.checkout.noMethodResults', { query: methodSearch }) }}
          </div>
        </div>
        <div
          v-if="canScrollUp"
          class="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background to-transparent"
          aria-hidden="true"
        />
        <div
          v-if="canScrollMore"
          class="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-1"
          aria-hidden="true"
        >
          <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </template>

    <template v-else>
    <!-- Group cards -->
    <div
      :class="layout === 'list'
        ? 'flex flex-col gap-2.5'
        : layout === 'matrix'
          ? 'grid grid-cols-2 gap-2.5'
          : 'grid gap-2 md:gap-3 grid-cols-2 md:grid-cols-4'"
    >
      <label
        v-for="group in visibleGroups"
        :key="group.slug"
        class="cursor-pointer relative"
      >
        <input
          type="radio"
          :name="`payment-group-${uid}`"
          :value="group.slug"
          :checked="modelValue.slug === group.slug"
          class="sr-only"
          :disabled="disabled"
          @change="onGroupChange(group.slug)"
        />
        <div
          class="border rounded-xl theme-transition"
          :class="[
            layout === 'list'
              ? 'px-3.5 py-3 min-h-[52px]'
              : layout === 'matrix'
                ? 'px-3 py-3 min-h-[72px] h-full flex flex-col items-center justify-center gap-2'
                : 'p-2.5 md:p-3 h-full flex flex-col items-center gap-1.5 md:items-start',
            modelValue.slug === group.slug
              ? (group.triggersCartera
                  ? 'border-state-warning-border bg-state-warning-bg shadow-sm'
                  : 'border-primary bg-primary/5 shadow-sm')
              : (group.triggersCartera
                  ? 'border-border hover:border-state-warning-border/40'
                  : 'border-border hover:border-primary/30'),
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ]"
        >
          <div
            class="flex items-center w-full"
            :class="layout === 'list' ? 'gap-3 min-h-[36px]' : layout === 'matrix' ? 'justify-center' : 'justify-between'"
          >
            <!-- Per-slug icon -->
            <div
              v-if="group.slug === 'cash'"
              class="bg-state-success-bg text-state-success-icon w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg class="h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
            <div
              v-else-if="group.slug === 'card'"
              class="bg-state-info-bg text-state-info-icon w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg class="h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
            </div>
            <div
              v-else-if="group.slug === 'digital'"
              class="bg-state-info-bg text-state-info-icon w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg class="h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
              </svg>
            </div>
            <div
              v-else-if="group.triggersCartera"
              class="bg-state-warning-bg text-state-warning-icon w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg class="h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div
              v-else
              class="bg-primary/10 text-primary w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg class="h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
            </div>

            <div
              v-if="layout === 'list'"
              class="min-w-0 flex-1 font-semibold text-sm leading-tight"
              :class="modelValue.slug === group.slug && group.triggersCartera ? 'text-state-warning-text' : 'text-text-primary'"
            >
              {{ group.name }}
            </div>

            <!-- Selected checkmark (desktop) -->
            <svg
              class="h-4 w-4 transition-all flex-shrink-0 ms-auto"
              :class="[
                layout === 'list' ? '' : 'hidden',
                modelValue.slug === group.slug ? 'opacity-100' : 'opacity-0',
                group.triggersCartera ? 'text-state-warning-icon' : 'text-primary',
              ]"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>

          <!-- Group name -->
          <div
            v-if="layout !== 'list'"
            class="w-full"
            :class="layout === 'matrix' ? 'text-center' : 'text-center md:text-start'"
          >
            <div
              class="font-semibold leading-tight"
              :class="[
                layout === 'matrix' ? 'text-sm' : 'text-xs md:text-sm',
                modelValue.slug === group.slug && group.triggersCartera ? 'text-state-warning-text' : 'text-text-primary',
              ]"
            >
              {{ group.name }}
            </div>
          </div>

          <!-- Mobile selected dot -->
          <div
            v-if="layout !== 'list' && modelValue.slug === group.slug"
            class="absolute top-1.5 end-1.5 w-2 h-2 rounded-full"
            :class="group.triggersCartera ? 'bg-state-warning-icon' : 'bg-primary'"
          />
        </div>
      </label>
    </div>

    <!-- Sub-method selector -->
    <div v-if="selectedGroup?.methods?.length" class="mt-3">
      <p class="text-sm font-medium mb-1 text-text-primary">
        {{ t('pos.checkout.subMethodQuestion', { group: selectedGroup.name }) }}
      </p>
      <p
        v-if="methodListScrolls && canScrollMore"
        class="text-sm text-text-secondary mb-2"
      >
        {{ t('pos.checkout.subMethodScrollHint', { total: selectedGroup.methods.length }) }}
      </p>

      <div v-if="selectedGroup.methods.length > 6" class="relative mb-2">
        <svg class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="methodSearch"
          type="search"
          :placeholder="t('pos.checkout.searchMethod')"
          class="w-full min-h-[44px] ps-9 pe-3 rounded-xl border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <!-- Grid mode (≤6) -->
      <div
        v-if="selectedGroup.methods.length <= 6"
        class="grid gap-2"
        :class="selectedGroup.methods.length <= 2
          ? 'grid-cols-2'
          : selectedGroup.methods.length === 3
            ? 'grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-3'"
      >
        <button
          v-for="method in selectedGroup.methods"
          :key="method.id"
          type="button"
          :disabled="disabled"
          class="relative min-h-[48px] px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="modelValue.id === method.id
            ? (selectedGroup.triggersCartera
                ? 'border-state-warning-border bg-state-warning-bg text-state-warning-text shadow-sm'
                : 'border-crocus-200 bg-crocus-50 text-primary')
            : 'border-border bg-background text-text-secondary hover:border-crocus-200 hover:text-text-primary'"
          @click="onMethodToggle(method.id)"
        >
          {{ method.name }}
          <span
            v-if="modelValue.id === method.id"
            class="absolute top-1 end-1.5 w-1.5 h-1.5 rounded-full"
            :class="selectedGroup.triggersCartera ? 'bg-state-warning-icon' : 'bg-primary'"
          />
        </button>
      </div>

      <!-- List mode (>6): clip last row + fade + chevron so overflow is obvious -->
      <div v-else class="relative rounded-xl border border-border bg-background overflow-hidden">
        <div
          ref="methodListEl"
          class="max-h-[11.5rem] overflow-y-auto overscroll-contain divide-y divide-border"
          @scroll="updateMethodListOverflow"
        >
          <button
            v-for="method in filteredMethods"
            :key="method.id"
            type="button"
            :disabled="disabled"
            class="w-full flex items-center justify-between min-h-[44px] px-4 py-2.5 text-sm text-start transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="modelValue.id === method.id
              ? (selectedGroup.triggersCartera
                  ? 'bg-state-warning-bg text-state-warning-text font-semibold'
                  : 'bg-crocus-50 text-primary font-semibold')
              : 'text-text-primary hover:bg-surface-secondary/50'"
            @click="onMethodToggle(method.id)"
          >
            <span>{{ method.name }}</span>
            <svg
              v-if="modelValue.id === method.id"
              class="w-4 h-4 flex-shrink-0"
              :class="selectedGroup.triggersCartera ? 'text-state-warning-icon' : 'text-primary'"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <div v-if="filteredMethods.length === 0" class="px-4 py-3 text-sm text-text-secondary text-center">
            {{ t('pos.checkout.noMethodResults', { query: methodSearch }) }}
          </div>
        </div>
        <div
          v-if="canScrollUp"
          class="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background to-transparent"
          aria-hidden="true"
        />
        <div
          v-if="canScrollMore"
          class="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-1"
          aria-hidden="true"
        >
          <svg class="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PosPaymentGroup } from '~/utils/paymentDefaults'

const { t } = useI18n({ useScope: 'global' })

interface Selection {
  slug: string
  id: string | null
}

interface Props {
  modelValue: Selection
  groups: PosPaymentGroup[]
  /** Hide groups whose triggersCartera is true (cash-only contexts). */
  excludeCartera?: boolean
  disabled?: boolean
  /** `search` = one searchable list of every method. */
  layout?: 'grid' | 'list' | 'matrix' | 'search'
}

const props = withDefaults(defineProps<Props>(), {
  excludeCartera: false,
  disabled: false,
  layout: 'grid',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Selection): void
}>()

const uid = useId()
const methodSearch = ref('')

const visibleGroups = computed(() =>
  props.excludeCartera
    ? props.groups.filter((g) => !g.triggersCartera)
    : props.groups,
)

const selectedGroup = computed(() =>
  props.groups.find((g) => g.slug === props.modelValue.slug) ?? null,
)

interface FlatMethodRow {
  key: string
  slug: string
  id: string | null
  name: string
  groupName: string
  triggersCartera: boolean
}

const flattenedMethods = computed((): FlatMethodRow[] => {
  const rows: FlatMethodRow[] = []
  for (const group of visibleGroups.value) {
    if (!group.methods?.length) {
      rows.push({
        key: `group:${group.slug}`,
        slug: group.slug,
        id: null,
        name: group.name,
        groupName: group.name,
        triggersCartera: Boolean(group.triggersCartera),
      })
      continue
    }
    for (const method of group.methods) {
      rows.push({
        key: method.id,
        slug: group.slug,
        id: method.id,
        name: method.name,
        groupName: group.name,
        triggersCartera: Boolean(group.triggersCartera),
      })
    }
  }
  return rows
})

const filteredFlatMethods = computed(() => {
  const q = methodSearch.value.trim().toLowerCase()
  if (!q) return flattenedMethods.value
  return flattenedMethods.value.filter(row =>
    row.name.toLowerCase().includes(q) || row.groupName.toLowerCase().includes(q),
  )
})

const isFlatRowSelected = (row: FlatMethodRow) =>
  props.modelValue.slug === row.slug && (props.modelValue.id || null) === (row.id || null)

const onFlatRowSelect = (row: FlatMethodRow) => {
  if (props.disabled) return
  const same = isFlatRowSelected(row)
  emit('update:modelValue', same ? { slug: '', id: null } : { slug: row.slug, id: row.id })
}

const filteredMethods = computed(() => {
  const methods = selectedGroup.value?.methods ?? []
  const q = methodSearch.value.trim().toLowerCase()
  if (!q) return methods
  return methods.filter((m: any) => m.name.toLowerCase().includes(q))
})

const methodListEl = ref<HTMLElement | null>(null)
const canScrollMore = ref(false)
const canScrollUp = ref(false)
const methodListScrolls = computed(() => (selectedGroup.value?.methods?.length ?? 0) > 6)

function updateMethodListOverflow() {
  const el = methodListEl.value
  if (!el) {
    canScrollMore.value = false
    canScrollUp.value = false
    return
  }
  const maxScroll = el.scrollHeight - el.clientHeight
  canScrollUp.value = el.scrollTop > 6
  canScrollMore.value = maxScroll - el.scrollTop > 6
}

watch(
  () => [props.layout, selectedGroup.value?.slug, filteredMethods.value.length, filteredFlatMethods.value.length],
  async () => {
    await nextTick()
    updateMethodListOverflow()
  },
  { immediate: true },
)

const onGroupChange = (slug: string) => {
  if (props.disabled) return
  // Reset sub-method when the group flips
  methodSearch.value = ''
  emit('update:modelValue', { slug, id: null })
}

const onMethodToggle = (methodId: string) => {
  if (props.disabled) return
  emit('update:modelValue', {
    slug: props.modelValue.slug,
    id: props.modelValue.id === methodId ? null : methodId,
  })
}
</script>
