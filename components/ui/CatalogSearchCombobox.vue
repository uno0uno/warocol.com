<template>
  <div ref="anchorRef" class="relative">
    <input
      :id="resolvedInputId"
      :value="modelValue"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      :aria-expanded="dropdownOpen"
      :aria-activedescendant="activeDescendant"
      :class="inputClass"
      :placeholder="placeholder"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
    />

    <span class="absolute start-2.5 top-2.5 text-text-secondary pointer-events-none" aria-hidden="true">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </span>

    <span v-if="loading" class="absolute end-2.5 top-2.5 text-text-secondary pointer-events-none" aria-hidden="true">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </span>

    <Teleport to="body">
      <ul
        v-if="dropdownOpen"
        ref="panelRef"
        :id="listboxId"
        role="listbox"
        :aria-label="listboxLabel"
        :aria-busy="loading"
        :style="panelStyle"
        class="bg-surface border border-border rounded-lg shadow-lg overflow-x-hidden overflow-y-auto"
      >
        <li
          v-if="loading"
          role="presentation"
          class="px-3 py-2 text-sm text-text-secondary select-none"
        >
          <span role="status">{{ loadingLabel }}</span>
        </li>

        <li
          v-if="error"
          role="presentation"
          class="px-3 py-2 text-sm text-destructive bg-destructive/5 select-none"
        >
          <span role="alert">{{ errorLabel }}</span>
        </li>

        <template v-for="option in options" :key="optionKey(option)">
          <li
            v-if="option.kind === 'presentation'"
            role="presentation"
            aria-hidden="true"
            class="px-3 py-1 text-xs font-semibold text-text-secondary uppercase tracking-wide bg-surface-secondary/40 select-none"
          >
            <slot name="presentation" :option="option">
              {{ option.label }}
            </slot>
          </li>
          <li
            v-else
            :id="optionDomId(option.id)"
            role="option"
            :aria-selected="activeKey === option.id"
            :class="[
              'px-3 py-2 text-sm text-text-primary cursor-pointer min-h-[40px]',
              activeKey === option.id ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
              option.class,
            ]"
            @mouseenter="activeKey = option.id"
            @mousedown.prevent
            @click="chooseOption(option)"
          >
            <slot name="option" :option="option" :active="activeKey === option.id">
              {{ option.label }}
            </slot>
          </li>
        </template>

        <li
          v-if="showEmptyState"
          role="presentation"
          class="px-3 py-2 text-sm text-text-secondary/60 select-none"
        >
          <span role="status">{{ emptyLabel }}</span>
        </li>

        <li
          v-if="showCreate"
          :id="optionDomId(CREATE_KEY)"
          role="option"
          :aria-selected="activeKey === CREATE_KEY"
          :class="[
            'px-3 py-2 text-sm text-primary border-t border-border cursor-pointer flex items-start gap-1.5 min-h-[40px]',
            activeKey === CREATE_KEY ? 'bg-surface-secondary' : 'hover:bg-surface-secondary',
          ]"
          @mouseenter="activeKey = CREATE_KEY"
          @mousedown.prevent
          @click="chooseCreate"
        >
          <svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="min-w-0 flex-1 whitespace-normal break-words leading-snug">
            {{ resolvedCreateLabel }}
          </span>
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import {
  useCatalogSearchDropdownPlacement,
  type CatalogSearchPlacement,
} from '~/composables/useCatalogSearchDropdownPlacement'

export interface CatalogSearchOption {
  id: string
  label: string
  kind?: 'option' | 'presentation'
  class?: string
  raw?: any
}

interface Props {
  modelValue: string
  options: CatalogSearchOption[]
  placeholder?: string
  inputId?: string
  inputClass?: string
  listboxLabel?: string
  loading?: boolean
  error?: Error | string | null
  allowCreate?: boolean
  canCreate?: boolean
  loadingLabel?: string
  emptyLabel?: string
  errorLabel?: string
  createLabel?: string
  placement?: CatalogSearchPlacement
}

interface Emits {
  (event: 'update:modelValue', value: string): void
  (event: 'search', value: string): void
  (event: 'focus', value: string): void
  (event: 'select', option: CatalogSearchOption): void
  (event: 'create', value: string): void
  (event: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  inputId: undefined,
  inputClass: 'w-full px-3 py-2 ps-8 pe-8 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-primary bg-surface',
  listboxLabel: 'Search results',
  loading: false,
  error: null,
  allowCreate: false,
  canCreate: true,
  loadingLabel: 'Loading…',
  emptyLabel: 'No results',
  errorLabel: 'Could not load results',
  createLabel: '',
  placement: 'auto',
})

const emit = defineEmits<Emits>()
const CREATE_KEY = '__catalog-create__'
const generatedId = useId().replace(/:/g, '')
const resolvedInputId = computed(() => props.inputId || `catalog-search-${generatedId}`)
const listboxId = computed(() => `${resolvedInputId.value}-listbox`)
const anchorRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const showResults = ref(false)
const activeKey = ref<string | null>(null)

const selectableOptions = computed(() => props.options.filter(option => option.kind !== 'presentation'))
const trimmedValue = computed(() => props.modelValue.trim())
const showCreate = computed(
  () => props.allowCreate && props.canCreate && !!trimmedValue.value && !props.loading,
)
const selectableKeys = computed(() => [
  ...selectableOptions.value.map(option => option.id),
  ...(showCreate.value ? [CREATE_KEY] : []),
])
const dropdownOpen = computed(
  () => showResults.value && (
    props.loading
    || !!props.error
    || props.options.length > 0
    || showCreate.value
    || !!trimmedValue.value
  ),
)
const showEmptyState = computed(
  () => !props.loading && !props.error && selectableOptions.value.length === 0 && !showCreate.value,
)
const resolvedCreateLabel = computed(
  () => props.createLabel || `Create "${trimmedValue.value}"`,
)
const activeDescendant = computed(
  () => activeKey.value ? optionDomId(activeKey.value) : undefined,
)

const preferredPlacement = computed(() => props.placement)
const { panelStyle } = useCatalogSearchDropdownPlacement(
  anchorRef,
  panelRef,
  dropdownOpen,
  preferredPlacement,
)

function optionKey(option: CatalogSearchOption) {
  return option.kind === 'presentation' ? `presentation-${option.id}` : option.id
}

function optionDomId(key: string) {
  return `${listboxId.value}-option-${encodeURIComponent(key)}`
}

function firstSelectableKey() {
  return selectableKeys.value[0] ?? null
}

async function scrollActiveOptionIntoView() {
  await nextTick()
  if (!activeKey.value || typeof document === 'undefined') return
  document.getElementById(optionDomId(activeKey.value))?.scrollIntoView?.({ block: 'nearest' })
}

function open() {
  showResults.value = true
}

function close() {
  showResults.value = false
  activeKey.value = null
  emit('close')
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  emit('search', value)
  showResults.value = true
  activeKey.value = null
}

function onFocus() {
  open()
  emit('focus', props.modelValue)
}

function onBlur() {
  setTimeout(close, 0)
}

function moveActive(delta: number) {
  open()
  const keys = selectableKeys.value
  if (!keys.length) return
  const currentIndex = activeKey.value ? keys.indexOf(activeKey.value) : -1
  const fallbackIndex = delta > 0 ? 0 : keys.length - 1
  const nextIndex = currentIndex < 0
    ? fallbackIndex
    : Math.min(keys.length - 1, Math.max(0, currentIndex + delta))
  activeKey.value = keys[nextIndex]
  void scrollActiveOptionIntoView()
}

function chooseOption(option: CatalogSearchOption) {
  emit('update:modelValue', option.label)
  emit('select', option)
  close()
}

function chooseCreate() {
  if (!showCreate.value) return
  emit('update:modelValue', trimmedValue.value)
  emit('create', trimmedValue.value)
  close()
}

function chooseActive() {
  const key = activeKey.value ?? firstSelectableKey()
  if (!key) return
  if (key === CREATE_KEY) {
    chooseCreate()
    return
  }
  const option = selectableOptions.value.find(item => item.id === key)
  if (option) chooseOption(option)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter' && dropdownOpen.value) {
    event.preventDefault()
    chooseActive()
  } else if (event.key === 'Escape' && dropdownOpen.value) {
    event.preventDefault()
    close()
  } else if (event.key === 'Tab') {
    close()
  }
}

watch(
  [() => props.options, () => props.loading, () => props.error, showCreate],
  () => {
    if (showResults.value) {
      if (activeKey.value && !selectableKeys.value.includes(activeKey.value)) {
        activeKey.value = null
      }
    }
  },
  { deep: true },
)
</script>
