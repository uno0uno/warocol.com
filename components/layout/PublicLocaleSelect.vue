<template>
  <div ref="rootEl" class="relative" :class="compact ? '' : 'min-w-[8.5rem]'">
    <label :id="`${id}-label`" class="sr-only">{{ t('shell.language') }}</label>
    <button
      :id="id"
      type="button"
      class="inline-flex min-h-9 w-full items-center justify-between gap-1.5 rounded-xl border border-titan-200 bg-titan-50 ps-2.5 pe-2 text-ebony-600 outline-none transition-colors hover:border-crocus-300 hover:bg-white focus-visible:border-crocus-400 focus-visible:ring-2 focus-visible:ring-crocus-200"
      :class="compact ? 'text-[12px] font-semibold py-[7px]' : 'text-[13px] font-medium py-[7px]'"
      :aria-labelledby="`${id}-label`"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :dir="localeDir"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="truncate">{{ compact ? currentCode : currentName }}</span>
      <svg
        class="h-3.5 w-3.5 shrink-0 text-ebony-400 transition-transform"
        :class="{ 'rotate-180': open }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <ul
      v-if="open"
      :id="`${id}-listbox`"
      role="listbox"
      :aria-labelledby="`${id}-label`"
      class="absolute end-0 z-[120] mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-titan-200 bg-white py-1 shadow-lg shadow-ebony-900/10"
      :class="compact ? 'start-0' : ''"
    >
      <li
        v-for="(definition, index) in localeOptions"
        :key="definition.code"
        role="option"
        :aria-selected="definition.code === modelValue"
        class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[13px] font-medium text-ebony-700 transition-colors"
        :class="[
          definition.code === modelValue ? 'bg-crocus-50 text-crocus-700' : 'hover:bg-titan-50',
          activeIndex === index ? 'bg-titan-50' : '',
        ]"
        :dir="definition.direction"
        @click="select(definition.code)"
        @mouseenter="activeIndex = index"
      >
        <span>{{ definition.name }}</span>
        <span
          v-if="definition.code === modelValue"
          class="text-crocus-600"
          aria-hidden="true"
        >✓</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import {
  APP_LOCALE_DEFINITIONS,
  getLocaleDirection,
  type AppLocaleCode,
} from '~/utils/appLocales'

const props = withDefaults(defineProps<{
  id?: string
  modelValue: AppLocaleCode
  compact?: boolean
}>(), {
  id: 'public-header-locale',
  compact: false,
})

const emit = defineEmits<{
  'update:modelValue': [locale: AppLocaleCode]
}>()

const { t } = useI18n({ useScope: 'global' })
const localeOptions = APP_LOCALE_DEFINITIONS.filter(definition => definition.enabled)
const open = ref(false)
const activeIndex = ref(0)
const rootEl = ref<HTMLElement | null>(null)

const currentDefinition = computed(
  () => localeOptions.find(definition => definition.code === props.modelValue) ?? localeOptions[0],
)
const currentName = computed(() => currentDefinition.value?.name ?? props.modelValue)
const currentCode = computed(() => (props.modelValue || 'es').toUpperCase())
const localeDir = computed(() => getLocaleDirection(props.modelValue))

function syncActiveIndex() {
  const index = localeOptions.findIndex(definition => definition.code === props.modelValue)
  activeIndex.value = index >= 0 ? index : 0
}

function toggle() {
  open.value = !open.value
  if (open.value) syncActiveIndex()
}

function close() {
  open.value = false
}

function select(code: AppLocaleCode) {
  emit('update:modelValue', code)
  close()
}

function onTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!open.value) {
      open.value = true
      syncActiveIndex()
      return
    }
    if (event.key === 'ArrowDown') {
      activeIndex.value = (activeIndex.value + 1) % localeOptions.length
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const next = localeOptions[activeIndex.value]
      if (next) select(next.code)
    }
  }
  if (event.key === 'Escape') {
    close()
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!open.value || !rootEl.value) return
  if (!rootEl.value.contains(event.target as Node)) close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})

watch(() => props.modelValue, syncActiveIndex)
</script>
