<template>
  <div>
    <!-- Group cards -->
    <div class="grid gap-2 md:gap-3 grid-cols-2 md:grid-cols-4">
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
          class="border rounded-xl p-2.5 md:p-3 theme-transition h-full flex flex-col items-center gap-1.5 md:items-start"
          :class="[
            modelValue.slug === group.slug
              ? (group.triggersCartera
                  ? 'border-amber-500 bg-amber-50 shadow-sm dark:bg-amber-950/20'
                  : 'border-primary bg-primary/5 shadow-sm')
              : (group.triggersCartera
                  ? 'border-border hover:border-amber-400/40'
                  : 'border-border hover:border-primary/30'),
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ]"
        >
          <div class="flex items-center justify-between w-full">
            <!-- Per-slug icon -->
            <div
              v-if="group.slug === 'cash'"
              class="bg-green-100 text-green-700 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <svg class="h-4 w-4 md:h-5 md:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
            <div
              v-else-if="group.slug === 'card'"
              class="bg-blue-100 text-blue-700 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
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
              class="bg-amber-100 text-amber-700 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0"
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

            <!-- Selected checkmark (desktop) -->
            <svg
              class="h-4 w-4 transition-all hidden md:block"
              :class="[
                modelValue.slug === group.slug ? 'opacity-100' : 'opacity-0',
                group.triggersCartera ? 'text-amber-600' : 'text-primary',
              ]"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>

          <!-- Group name -->
          <div class="text-center md:text-left w-full">
            <div
              class="font-semibold text-xs md:text-sm leading-tight"
              :class="modelValue.slug === group.slug && group.triggersCartera ? 'text-amber-700' : 'text-text-primary'"
            >
              {{ group.name }}
            </div>
          </div>

          <!-- Mobile selected dot -->
          <div
            v-if="modelValue.slug === group.slug"
            class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full md:hidden"
            :class="group.triggersCartera ? 'bg-amber-500' : 'bg-primary'"
          />
        </div>
      </label>
    </div>

    <!-- Sub-method selector -->
    <div v-if="selectedGroup?.methods?.length" class="mt-3">
      <p class="text-xs font-semibold mb-2 flex items-center gap-1.5 text-text-secondary">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        ¿Con cuál método de {{ selectedGroup.name }}?
      </p>

      <!-- Search — only when > 10 methods -->
      <div v-if="selectedGroup.methods.length > 10" class="relative mb-2">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="methodSearch"
          type="text"
          placeholder="Buscar método..."
          class="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
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
          class="relative min-h-[48px] px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all text-center active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="modelValue.id === method.id
            ? (selectedGroup.triggersCartera
                ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                : 'border-primary bg-primary/10 text-primary shadow-sm')
            : 'border-border bg-background text-text-secondary hover:border-primary/30 hover:text-text-primary'"
          @click="onMethodToggle(method.id)"
        >
          {{ method.name }}
          <span
            v-if="modelValue.id === method.id"
            class="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
            :class="selectedGroup.triggersCartera ? 'bg-amber-500' : 'bg-primary'"
          />
        </button>
      </div>

      <!-- List mode (>6, scrollable) -->
      <div v-else class="rounded-xl border border-border bg-background overflow-hidden">
        <div class="max-h-[220px] overflow-y-auto divide-y divide-border">
          <button
            v-for="method in filteredMethods"
            :key="method.id"
            type="button"
            :disabled="disabled"
            class="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            :class="modelValue.id === method.id
              ? (selectedGroup.triggersCartera
                  ? 'bg-amber-50 text-amber-700 font-semibold'
                  : 'bg-primary/8 text-primary font-semibold')
              : 'text-text-primary hover:bg-surface-secondary/50'"
            @click="onMethodToggle(method.id)"
          >
            <span>{{ method.name }}</span>
            <svg
              v-if="modelValue.id === method.id"
              class="w-4 h-4 flex-shrink-0"
              :class="selectedGroup.triggersCartera ? 'text-amber-600' : 'text-primary'"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <div v-if="filteredMethods.length === 0" class="px-4 py-3 text-sm text-text-secondary text-center">
            Sin resultados para "{{ methodSearch }}"
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PosPaymentGroup } from '~/utils/paymentDefaults'

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
}

const props = withDefaults(defineProps<Props>(), {
  excludeCartera: false,
  disabled: false,
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

const filteredMethods = computed(() => {
  const methods = selectedGroup.value?.methods ?? []
  const q = methodSearch.value.trim().toLowerCase()
  if (!q) return methods
  return methods.filter((m: any) => m.name.toLowerCase().includes(q))
})

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
